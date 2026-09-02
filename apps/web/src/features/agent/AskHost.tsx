import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ApiError } from '@/shared/api/httpClient';
import {
  askTurn,
  getAvailability,
  getConversation,
  isUnavailableCode,
  startConversation,
} from './api/agentApi';
import { AskPanel } from './AskPanel';
import { readStoredConversationId, writeStoredConversationId } from './conversationStorage';
import { isSamePageLocator, locatorHref, scrollToLearnBlock } from './locatorHref';
import { quoteFromSelection } from './quoteFromSelection';
import type {
  AgentAvailability,
  AgentCompletedTurn,
  AgentConversation,
  AgentHostContext,
  AgentLocator,
  AgentTurnRequest,
  MathBlockSource,
} from './types';
import { isPendingTurn, QUESTION_MAX_LENGTH, QUESTION_MIN_LENGTH, QUOTE_MAX_LENGTH } from './types';
import './agent.css';

const DESKTOP_QUERY = '(min-width: 960px)';
const POLL_MS = 1000;
const POLL_MAX_MS = 30000;

export interface AskOpenItem {
  alreadyStrong: boolean;
  onAsked?: () => void;
}

export interface AskHostProps {
  context: AgentHostContext;
  hostTitle: string;
  mathBlocks?: readonly MathBlockSource[];
  openItem?: AskOpenItem;
  onHighlightBlock?: (blockIndex: number) => void;
  onOpenChange?: (open: boolean) => void;
  enabled?: boolean;
  children: React.ReactNode;
}

type SubmitPhase = 'idle' | 'received' | 'working';

function useDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(DESKTOP_QUERY).matches
      : true,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function AskHost(props: AskHostProps): React.JSX.Element {
  const { context } = props;
  const contextKey = `${context.contextType}:${context.contextId}:${context.contextType === 'ITEM' ? context.sessionId : ''}`;
  return <AskHostSession key={contextKey} {...props} />;
}

function AskHostSession({
  context,
  hostTitle,
  mathBlocks = [],
  openItem,
  onHighlightBlock,
  onOpenChange,
  enabled = true,
  children,
}: AskHostProps): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const desktop = useDesktopLayout();
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pollTimer = useRef<number>(0);
  const phaseTimer = useRef<number>(0);
  const cancelledRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const contextRef = useRef(context);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const [availability, setAvailability] = useState<AgentAvailability | null>(null);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [composerLocked, setComposerLocked] = useState(false);
  const [question, setQuestion] = useState('');
  const [quote, setQuote] = useState<string | null>(null);
  const [pendingQuote, setPendingQuote] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<AgentTurnRequest | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);

  const available = availability?.available === true;
  const working = phase === 'working';
  const received = phase === 'received';
  const inFlight = received || working;
  const liveAnnouncement =
    phase === 'received'
      ? t('agent.liveReceived')
      : phase === 'working'
        ? t('agent.liveWorking')
        : liveMessage;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getAvailability(contextRef.current)
      .then((result) => {
        if (cancelled) return;
        setAvailability(result);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      window.clearTimeout(pollTimer.current);
      window.clearTimeout(phaseTimer.current);
    };
  }, []);

  const persistConversation = useCallback(
    (next: AgentConversation) => {
      setConversation(next);
      writeStoredConversationId(context.contextType, context.contextId, next.id);
    },
    [context.contextId, context.contextType],
  );

  const mapError = useCallback(
    (err: unknown): string => {
      if (!(err instanceof ApiError)) return t('agent.errorOffline');
      if (err.code === 'AGENT_DISABLED' || err.code === 'FORMAL_ASSISTANCE_DISABLED') {
        setAvailability({
          available: false,
          unavailableCode: err.code,
        });
        setComposerLocked(true);
        return t(
          err.code === 'FORMAL_ASSISTANCE_DISABLED'
            ? 'agent.unavailableFormal'
            : 'agent.unavailableDisabled',
        );
      }
      if (err.code === 'AGENT_BUDGET_EXCEEDED') {
        const seconds = err.retryAfterSeconds ?? 60;
        return t('agent.errorBudget', { seconds });
      }
      if (err.code === 'AGENT_PROVIDER_UNAVAILABLE') return t('agent.errorProvider');
      if (err.code === 'CONTEXT_CONFLICT') return t('agent.errorConflict');
      if (err.status === 404) return t('agent.errorNotFound');
      if (err.status === 403) return t('agent.errorForbidden');
      if (err.status === 401) return t('agent.errorOffline');
      return t('agent.errorGeneric');
    },
    [t],
  );

  const pollUntilSettled = useCallback(
    async (conversationId: string): Promise<AgentConversation> => {
      const started = Date.now();
      let latest = await getConversation(conversationId);
      if (cancelledRef.current) return latest;
      persistConversation(latest);
      while (latest.turns.some(isPendingTurn) && Date.now() - started < POLL_MAX_MS) {
        await new Promise((resolve) => {
          pollTimer.current = window.setTimeout(resolve, POLL_MS);
        });
        if (cancelledRef.current) return latest;
        latest = await getConversation(conversationId);
        if (cancelledRef.current) return latest;
        persistConversation(latest);
      }
      return latest;
    },
    [persistConversation],
  );

  const openPanel = useCallback(async () => {
    setOpen(true);
    onOpenChangeRef.current?.(true);
    setErrorMessage(null);
    try {
      if (available) {
        const started = await startConversation(context);
        persistConversation(started);
        if (started.turns.some(isPendingTurn)) {
          setPhase('working');
          setLiveMessage(t('agent.liveWorking'));
          await pollUntilSettled(started.id);
          setPhase('idle');
        }
        return;
      }
      const stored = readStoredConversationId(context.contextType, context.contextId);
      if (!stored) {
        setComposerLocked(true);
        return;
      }
      const existing = await getConversation(stored);
      persistConversation(existing);
      setComposerLocked(true);
    } catch (err) {
      if (err instanceof ApiError && isUnavailableCode(err.code)) {
        const stored = readStoredConversationId(context.contextType, context.contextId);
        if (stored) {
          try {
            persistConversation(await getConversation(stored));
          } catch {
            // History is optional when start is denied.
          }
        }
        setComposerLocked(true);
        setErrorMessage(mapError(err));
        return;
      }
      setErrorMessage(mapError(err));
    }
  }, [available, context, mapError, persistConversation, pollUntilSettled, t]);

  const closePanel = useCallback(() => {
    restoreFocusRef.current = true;
    setOpen(false);
    onOpenChangeRef.current?.(false);
    setConfirmOpen(false);
    setPendingQuote(null);
  }, []);

  useEffect(() => {
    if (open || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [open]);

  // AC-17: rail/sheet is not aria-modal and must not trap tab. Escape still dismisses.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      if (confirmOpen) {
        setConfirmOpen(false);
        return;
      }
      closePanel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closePanel, confirmOpen, open]);

  useEffect(() => {
    if (!open) return;
    function onSelectionChange(): void {
      const next = quoteFromSelection(window.getSelection(), hostRef.current, mathBlocks);
      setPendingQuote(next?.quote ?? null);
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [mathBlocks, open]);

  function validate(request: AgentTurnRequest): boolean {
    setQuestionError(null);
    setQuoteError(null);
    const text = request.questionText.trim();
    if (text.length < QUESTION_MIN_LENGTH || text.length > QUESTION_MAX_LENGTH) {
      setQuestionError(t('agent.validationQuestion'));
      return false;
    }
    if (
      request.quote != null &&
      (request.quote.length < 1 || request.quote.length > QUOTE_MAX_LENGTH)
    ) {
      setQuoteError(t('agent.validationQuote'));
      return false;
    }
    return true;
  }

  const sendTurn = useCallback(
    async (request: AgentTurnRequest, key: string) => {
      if (!conversation) return;
      setErrorMessage(null);
      setLastErrorCode(null);
      setPhase('received');
      setRetryRequest(request);
      setIdempotencyKey(key);
      window.clearTimeout(phaseTimer.current);
      phaseTimer.current = window.setTimeout(() => {
        if (cancelledRef.current) return;
        setPhase((current) => (current === 'received' ? 'working' : current));
      }, 200);
      try {
        const completed: AgentCompletedTurn = await askTurn(conversation.id, request, key);
        if (cancelledRef.current) return;
        persistConversation({
          ...conversation,
          turns: [...conversation.turns.filter((turn) => turn.id !== completed.id), completed],
          updatedAt: completed.createdAt,
        });
        setQuestion('');
        setQuote(null);
        setPhase('idle');
        setLiveMessage(t('agent.liveDone'));
        setRetryRequest(null);
        setIdempotencyKey(null);
        setLastErrorCode(null);
        openItem?.onAsked?.();
      } catch (err) {
        if (cancelledRef.current) return;
        if (err instanceof ApiError && err.code === 'CONCURRENT_TURN_PENDING') {
          setLiveMessage(t('agent.errorConcurrent'));
          try {
            await pollUntilSettled(conversation.id);
            if (cancelledRef.current) return;
            setPhase('idle');
            setLiveMessage(t('agent.liveDone'));
          } catch (pollErr) {
            if (cancelledRef.current) return;
            setPhase('idle');
            setLastErrorCode(pollErr instanceof ApiError ? (pollErr.code ?? null) : null);
            setErrorMessage(mapError(pollErr));
            setLiveMessage(t('agent.liveTimeout'));
          }
          return;
        }
        if (err instanceof ApiError && err.code === 'AGENT_VALIDATION_FAILED') {
          const paths = err.violations.map((row) => row.field);
          if (paths.some((path) => path.includes('quote'))) {
            setQuoteError(t('agent.validationQuote'));
          } else {
            setQuestionError(t('agent.validationQuestion'));
          }
          setLastErrorCode(err.code);
          setPhase('idle');
          return;
        }
        setPhase('idle');
        setLastErrorCode(err instanceof ApiError ? (err.code ?? null) : null);
        setErrorMessage(mapError(err));
        setLiveMessage(t('agent.liveTimeout'));
      }
    },
    [conversation, mapError, openItem, persistConversation, pollUntilSettled, t],
  );

  function currentRequest(): AgentTurnRequest {
    const request: AgentTurnRequest = { questionText: question.trim() };
    if (quote && quote.trim().length > 0) request.quote = quote;
    return request;
  }

  function handleSubmit(): void {
    if (inFlight || composerLocked || !conversation) return;
    const request = currentRequest();
    if (!validate(request)) return;
    if (openItem && !openItem.alreadyStrong && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    void sendTurn(request, idempotencyKey ?? newIdempotencyKey());
  }

  function handleFollowUp(text: string): void {
    if (inFlight || composerLocked || !conversation) return;
    const request: AgentTurnRequest = { questionText: text };
    if (!validate(request)) return;
    void sendTurn(request, newIdempotencyKey());
  }

  function handleRetry(): void {
    if (!retryRequest) {
      handleSubmit();
      return;
    }
    const key =
      idempotencyKey && lastErrorCode !== 'AGENT_PROVIDER_UNAVAILABLE'
        ? idempotencyKey
        : newIdempotencyKey();
    void sendTurn(retryRequest, key);
  }

  function handleLocator(locator: AgentLocator): void {
    if (!conversation) return;
    if (isSamePageLocator(locator, context) && locator.blockIndex != null) {
      onHighlightBlock?.(locator.blockIndex);
      scrollToLearnBlock(locator.blockIndex);
      return;
    }
    const href = locatorHref(locator, {
      subject: conversation.subject,
      sessionId: conversation.sessionId,
      contextType: conversation.contextType,
      contextId: conversation.contextId,
    });
    if (href) navigate(href);
  }

  const storedHistoryId = readStoredConversationId(context.contextType, context.contextId);
  const showCompact = enabled && availabilityReady && available && !open;
  const showHistory =
    enabled && availabilityReady && !available && Boolean(storedHistoryId) && !open;
  const showPanel = enabled && open;
  const composerDisabled = composerLocked || inFlight || !conversation || !available;

  return (
    <div
      className={`ask-shell${showPanel && desktop ? ' is-desktop-open' : ''}${showPanel && !desktop ? ' is-sheet-open' : ''}`}
    >
      {showPanel && desktop ? (
        <AskPanel
          variant="rail"
          hostTitle={hostTitle}
          conversation={conversation}
          question={question}
          quote={quote}
          questionError={questionError}
          quoteError={quoteError}
          submitDisabled={composerDisabled || question.trim().length === 0}
          composerDisabled={composerDisabled}
          working={working}
          received={received}
          errorMessage={errorMessage}
          liveMessage={liveAnnouncement}
          confirmOpen={confirmOpen}
          onQuestionChange={setQuestion}
          onRemoveQuote={() => setQuote(null)}
          onSubmit={handleSubmit}
          onFollowUp={handleFollowUp}
          onRetry={handleRetry}
          onClose={closePanel}
          onLocator={handleLocator}
          onConfirmAsk={() => {
            setConfirmOpen(false);
            void sendTurn(currentRequest(), idempotencyKey ?? newIdempotencyKey());
          }}
          onCancelConfirm={() => setConfirmOpen(false)}
        />
      ) : null}

      <div className="ask-shell-host" ref={hostRef} data-ask-selection-root="">
        {showCompact ? (
          <div className="ask-compact-bar">
            <button
              type="button"
              ref={triggerRef}
              className="ask-compact"
              onClick={() => void openPanel()}
              aria-label={t('agent.askAria')}
            >
              <MessageCircle size={18} aria-hidden="true" />
              <span>{t('agent.ask')}</span>
            </button>
          </div>
        ) : null}
        {showHistory ? (
          <div className="ask-compact-bar">
            <button
              type="button"
              ref={triggerRef}
              className="ask-history"
              onClick={() => void openPanel()}
            >
              {t('agent.showHistory')}
            </button>
          </div>
        ) : null}
        {children}
      </div>

      {showPanel && !desktop ? (
        <AskPanel
          variant="sheet"
          hostTitle={hostTitle}
          conversation={conversation}
          question={question}
          quote={quote}
          questionError={questionError}
          quoteError={quoteError}
          submitDisabled={composerDisabled || question.trim().length === 0}
          composerDisabled={composerDisabled}
          working={working}
          received={received}
          errorMessage={errorMessage}
          liveMessage={liveAnnouncement}
          confirmOpen={confirmOpen}
          onQuestionChange={setQuestion}
          onRemoveQuote={() => setQuote(null)}
          onSubmit={handleSubmit}
          onFollowUp={handleFollowUp}
          onRetry={handleRetry}
          onClose={closePanel}
          onLocator={handleLocator}
          onConfirmAsk={() => {
            setConfirmOpen(false);
            void sendTurn(currentRequest(), idempotencyKey ?? newIdempotencyKey());
          }}
          onCancelConfirm={() => setConfirmOpen(false)}
        />
      ) : null}

      {showPanel && pendingQuote && pendingQuote !== quote ? (
        <div className="ask-add-toolbar">
          <button
            type="button"
            className="btn-secondary ask-add-to-chat"
            onClick={() => {
              setQuote(pendingQuote);
              setPendingQuote(null);
            }}
          >
            {t('agent.quoteAdd')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  CornerDownLeft,
  Lightbulb,
  MessageCircle,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KatexFormula } from '@/shared/content/KatexFormula';
import { MixedProse } from '@/shared/content/MixedProse';
import { parseAskBody } from './askBody';
import type {
  AgentCompletedTurn,
  AgentConversation,
  AgentLocator,
  AgentTraceStep,
  AgentTurn,
  AskOutgoingMessage,
} from './types';
import {
  dedupeLocators,
  isCompletedTurn,
  isFailedTurn,
  isPendingTurn,
  locatorKey,
  turnsOldestFirst,
  workedSeconds,
} from './types';

export type AskPanelVariant = 'rail' | 'sheet';

interface AskPanelProps {
  variant: AskPanelVariant;
  hostTitle: string;
  conversation: AgentConversation | null;
  question: string;
  quote: string | null;
  questionError: string | null;
  quoteError: string | null;
  submitDisabled: boolean;
  composerDisabled: boolean;
  working: boolean;
  received: boolean;
  outgoing: AskOutgoingMessage | null;
  errorMessage: string | null;
  liveMessage: string;
  confirmOpen: boolean;
  onQuestionChange: (value: string) => void;
  onRemoveQuote: () => void;
  onSubmit: () => void;
  onFollowUp: (text: string) => void;
  onRetry: () => void;
  onClose: () => void;
  onLocator: (locator: AgentLocator) => void;
  onConfirmAsk: () => void;
  onCancelConfirm: () => void;
}

export function AskPanel({
  variant,
  hostTitle,
  conversation,
  question,
  quote,
  questionError,
  quoteError,
  submitDisabled,
  composerDisabled,
  working,
  received,
  outgoing,
  errorMessage,
  liveMessage,
  confirmOpen,
  onQuestionChange,
  onRemoveQuote,
  onSubmit,
  onFollowUp,
  onRetry,
  onClose,
  onLocator,
  onConfirmAsk,
  onCancelConfirm,
}: AskPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const turns = conversation ? turnsOldestFirst(conversation.turns) : [];
  const lastCompleted = [...turns].reverse().find(isCompletedTurn) ?? null;
  const endRef = useRef<HTMLLIElement>(null);
  const inFlight = working || received;

  useEffect(() => {
    if (!outgoing && !inFlight) return;
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [outgoing, inFlight, turns.length]);

  return (
    <section className={`ask-panel ask-panel-${variant}`} aria-label={t('agent.regionLabel')}>
      <header className="ask-panel-header">
        <span className="ask-context-chip">{hostTitle}</span>
        <button
          type="button"
          className="ask-close"
          onClick={onClose}
          aria-label={t('agent.closeAria')}
        >
          <X size={18} aria-hidden="true" />
          <span>{t('agent.close')}</span>
        </button>
      </header>

      <div className="ask-panel-scroll">
        {turns.length === 0 && !outgoing && !inFlight ? (
          <p className="ask-empty">{t('agent.empty')}</p>
        ) : null}

        <ol className="ask-turns">
          {turns.map((turn) => (
            <li key={turn.id} className="ask-turn">
              <AskTurnView
                turn={turn}
                sessionId={conversation?.sessionId ?? null}
                onLocator={onLocator}
              />
            </li>
          ))}
          {outgoing ? (
            <li ref={endRef} className="ask-turn">
              <article className="ask-turn-card">
                <StudentUtterance questionText={outgoing.questionText} quote={outgoing.quote} />
                {received && !working ? <p className="ask-status">{t('agent.received')}</p> : null}
                {working ? <p className="ask-status">{t('agent.working')}</p> : null}
              </article>
            </li>
          ) : (
            <>
              {received && !working ? (
                <li className="ask-turn">
                  <p className="ask-status">{t('agent.received')}</p>
                </li>
              ) : null}
              {working ? (
                <li className="ask-turn">
                  <p className="ask-status">{t('agent.working')}</p>
                </li>
              ) : null}
            </>
          )}
        </ol>
        {errorMessage ? (
          <div className="ask-error" role="alert">
            <p>{errorMessage}</p>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              {t('agent.retry')}
            </button>
          </div>
        ) : null}

        {lastCompleted && lastCompleted.suggestedFollowUps.length > 0 && !working ? (
          <div className="ask-followups" role="group" aria-label={t('agent.followUpsLabel')}>
            {lastCompleted.suggestedFollowUps.map((chip) => (
              <button
                key={chip}
                type="button"
                className="ask-followup"
                disabled={composerDisabled}
                onClick={() => onFollowUp(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ask-composer">
        <p className="ask-disclaimer">{t('agent.disclaimer')}</p>
        {confirmOpen ? (
          <div className="ask-confirm" role="dialog" aria-labelledby="ask-confirm-title">
            <p id="ask-confirm-title" className="ask-confirm-title">
              {t('agent.openConfirmTitle')}
            </p>
            <p className="ask-confirm-body">{t('agent.openConfirmBody')}</p>
            <div className="ask-confirm-actions">
              <button type="button" className="btn-secondary" onClick={onCancelConfirm}>
                {t('agent.openConfirmCancel')}
              </button>
              <button type="button" className="btn-primary" onClick={onConfirmAsk}>
                {t('agent.openConfirmContinue')}
              </button>
            </div>
          </div>
        ) : null}
        {quote ? (
          <QuoteChip quote={quote} onRemove={onRemoveQuote} removeDisabled={composerDisabled} />
        ) : null}
        <label className="ask-composer-field">
          <span className="sr-only">{t('agent.composerLabel')}</span>
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
              event.preventDefault();
              if (!submitDisabled) onSubmit();
            }}
            placeholder={t('agent.composerPlaceholder')}
            disabled={composerDisabled}
            rows={2}
            maxLength={2000}
          />
        </label>
        {questionError ? (
          <p className="ask-field-error" role="alert">
            {questionError}
          </p>
        ) : null}
        {quoteError ? (
          <p className="ask-field-error" role="alert">
            {quoteError}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary ask-submit"
          onClick={onSubmit}
          disabled={submitDisabled}
        >
          <MessageCircle size={18} aria-hidden="true" />
          {working ? t('agent.submitting') : t('agent.submit')}
        </button>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </section>
  );
}

function QuoteChip({
  quote,
  onRemove,
  removeDisabled = false,
}: {
  quote: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className={`ask-quote-pill${onRemove ? ' ask-quote-composer' : ''}`}
      role="group"
      aria-label={`${t('agent.quoteLabel')}: ${quote}`}
    >
      <CornerDownLeft size={14} aria-hidden="true" />
      <span className="ask-quote-pill-text">{quote}</span>
      {onRemove ? (
        <button
          type="button"
          className="ask-quote-remove"
          onClick={onRemove}
          aria-label={t('agent.quoteRemove')}
          disabled={removeDisabled}
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function AskTurnView({
  turn,
  sessionId,
  onLocator,
}: {
  turn: AgentTurn;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <article className="ask-turn-card">
      <StudentUtterance questionText={turn.questionText} quote={turn.quote} />

      {isPendingTurn(turn) ? <p className="ask-status">{t('agent.pendingTurn')}</p> : null}
      {isFailedTurn(turn) ? <p className="ask-error-inline">{t('agent.failedTurn')}</p> : null}

      {isCompletedTurn(turn) ? (
        <CompletedTurnBody turn={turn} sessionId={sessionId} onLocator={onLocator} />
      ) : null}
    </article>
  );
}

function LocatorControl({
  locator,
  sessionId,
  onLocator,
  variant = 'chip',
}: {
  locator: AgentLocator;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
  variant?: 'chip' | 'row';
}): React.JSX.Element {
  const { t } = useTranslation();
  const label = locator.label || t('agent.locatorFallback');
  const clickable = locator.sourceKind !== 'ITEM' || Boolean(sessionId);
  const className = variant === 'row' ? 'ask-trace-result' : 'ask-locator';
  if (!clickable) {
    return <span className={`${className} is-static`}>{label}</span>;
  }
  return (
    <button type="button" className={className} onClick={() => onLocator(locator)}>
      {label}
    </button>
  );
}

function CompletedTurnBody({
  turn,
  sessionId,
  onLocator,
}: {
  turn: AgentCompletedTurn;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const locators = dedupeLocators(turn.locators);
  const provenance =
    turn.kind === 'REVIEWED_SOURCE'
      ? t('agent.provenance.reviewed', {
          kind: t(`agent.contextKind.${turn.locators[0]?.sourceKind ?? 'LESSON'}`),
        })
      : turn.kind === 'DERIVED_EXPLANATION'
        ? t('agent.provenance.derived')
        : t('agent.provenance.insufficient');

  return (
    <div className="ask-assistant">
      <p className="ask-provenance">{provenance}</p>
      <AskAnswerBody text={turn.body} />
      {locators.length > 0 ? (
        <ul className="ask-locators">
          {locators.map((locator) => (
            <li key={`${locator.sourceKind}:${locator.sourceId}:${locator.blockIndex ?? ''}`}>
              <LocatorControl locator={locator} sessionId={sessionId} onLocator={onLocator} />
            </li>
          ))}
        </ul>
      ) : null}
      <WorkedTrace turn={turn} sessionId={sessionId} onLocator={onLocator} />
    </div>
  );
}

function StudentUtterance({
  questionText,
  quote,
}: {
  questionText: string;
  quote: string | null;
}): React.JSX.Element {
  return (
    <div className="ask-student">
      {quote ? <QuoteChip quote={quote} /> : null}
      <p className="ask-question-bubble">{questionText}</p>
    </div>
  );
}

function WorkedTrace({
  turn,
  sessionId,
  onLocator,
}: {
  turn: AgentCompletedTurn;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toolSteps = turn.steps.filter((step) => step.kind === 'TOOL');
  const modelSteps = turn.steps.filter((step) => step.kind === 'MODEL');
  const checked = dedupeLocators(toolSteps.flatMap((step) => step.locators));

  return (
    <details className="ask-worked" open={open}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <span>{t('agent.workedFor', { seconds: workedSeconds(turn.latencyMs) })}</span>
        <ChevronRight className="ask-worked-chevron" size={16} aria-hidden="true" />
      </summary>
      {open ? (
        <>
          {checked.length > 0 ? (
            <p className="ask-trace-summary">
              <Search size={16} aria-hidden="true" />
              <span>{t('agent.traceChecked', { count: checked.length })}</span>
            </p>
          ) : null}
          {turn.steps.length > 0 ? (
            <ol className="ask-trace">
              {toolSteps.map((step, index) => (
                <TraceStepRow
                  key={`${step.kind}-${index}`}
                  step={step}
                  sessionId={sessionId}
                  onLocator={onLocator}
                />
              ))}
              {modelSteps.map((step, index) => (
                <TraceStepRow
                  key={`${step.kind}-model-${index}`}
                  step={step}
                  sessionId={sessionId}
                  onLocator={onLocator}
                />
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </details>
  );
}

function TraceStepRow({
  step,
  sessionId,
  onLocator,
}: {
  step: AgentTraceStep;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const locators = dedupeLocators(step.locators);
  const Icon = step.kind === 'MODEL' ? Lightbulb : locators.length > 0 ? Search : BookOpen;
  return (
    <li className="ask-trace-item">
      <Icon className="ask-trace-icon" size={16} aria-hidden="true" />
      <div className="ask-trace-body">
        <p className="ask-trace-label">{step.label}</p>
        {locators.length > 0 ? (
          <div className="ask-trace-results">
            <p className="ask-trace-results-count">
              {t('agent.traceResults', { count: locators.length })}
            </p>
            <ul>
              {locators.map((locator) => (
                <li key={locatorKey(locator)}>
                  <LocatorControl
                    locator={locator}
                    sessionId={sessionId}
                    onLocator={onLocator}
                    variant="row"
                  />
                  <span className="ask-trace-result-meta">
                    {t(`agent.contextKind.${locator.sourceKind}`)}
                    {locator.blockIndex != null
                      ? ` · ${t('agent.traceBlock', { index: locator.blockIndex })}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function AskAnswerBody({ text }: { text: string }): React.JSX.Element {
  const { t } = useTranslation();
  const segments = parseAskBody(text);
  return (
    <div className="ask-body">
      {segments.map((segment, index) =>
        segment.kind === 'display' ? (
          <KatexFormula
            key={`display-${index}`}
            latex={segment.latex}
            displayMode
            ariaLabel={t('content.inlineMathAria', { latex: segment.latex })}
            errorLabel={t('content.inlineMathError')}
          />
        ) : (
          <MixedProse key={`prose-${index}`} text={segment.text} as="div" />
        ),
      )}
    </div>
  );
}

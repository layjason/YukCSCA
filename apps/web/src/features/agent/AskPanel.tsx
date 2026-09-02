import { MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MixedProse } from '@/shared/content/MixedProse';
import type { AgentCompletedTurn, AgentConversation, AgentLocator, AgentTurn } from './types';
import {
  isCompletedTurn,
  isFailedTurn,
  isPendingTurn,
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
        {turns.length === 0 && !working && !received ? (
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
        </ol>

        {received && !working ? <p className="ask-status">{t('agent.received')}</p> : null}
        {working ? <p className="ask-status">{t('agent.working')}</p> : null}
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
          <div className="ask-quote-chip">
            <span className="ask-quote-label">{t('agent.quoteLabel')}</span>
            <code className="ask-quote-text">{quote}</code>
            <button
              type="button"
              className="ask-quote-remove"
              onClick={onRemoveQuote}
              aria-label={t('agent.quoteRemove')}
              disabled={composerDisabled}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
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
            rows={3}
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
      <p className="ask-question">{turn.questionText}</p>
      {turn.quote ? (
        <p className="ask-quoted">
          <span className="ask-quote-label">{t('agent.quoteLabel')}</span> {turn.quote}
        </p>
      ) : null}

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
}: {
  locator: AgentLocator;
  sessionId: string | null;
  onLocator: (locator: AgentLocator) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const label = locator.label || t('agent.locatorFallback');
  const clickable = locator.sourceKind !== 'ITEM' || Boolean(sessionId);
  if (!clickable) {
    return <span className="ask-locator is-static">{label}</span>;
  }
  return (
    <button type="button" className="ask-locator" onClick={() => onLocator(locator)}>
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
  const provenance =
    turn.kind === 'REVIEWED_SOURCE'
      ? t('agent.provenance.reviewed', {
          kind: t(`agent.contextKind.${turn.locators[0]?.sourceKind ?? 'LESSON'}`),
        })
      : turn.kind === 'DERIVED_EXPLANATION'
        ? t('agent.provenance.derived')
        : t('agent.provenance.insufficient');

  return (
    <>
      <p className="ask-provenance">{provenance}</p>
      <MixedProse text={turn.body} as="div" className="ask-body" />
      {turn.locators.length > 0 ? (
        <ul className="ask-locators">
          {turn.locators.map((locator) => (
            <li key={`${locator.sourceKind}:${locator.sourceId}:${locator.blockIndex ?? ''}`}>
              <LocatorControl locator={locator} sessionId={sessionId} onLocator={onLocator} />
            </li>
          ))}
        </ul>
      ) : null}
      <details className="ask-worked">
        <summary>{t('agent.workedFor', { seconds: workedSeconds(turn.latencyMs) })}</summary>
        {turn.steps.length > 0 ? (
          <ol className="ask-steps">
            {turn.steps.map((step, index) => (
              <li key={`${step.kind}-${index}`}>
                <p>{step.label}</p>
                {step.locators.length > 0 ? (
                  <ul className="ask-locators">
                    {step.locators.map((locator) => (
                      <li key={`${locator.sourceKind}:${locator.sourceId}:${index}`}>
                        <LocatorControl
                          locator={locator}
                          sessionId={sessionId}
                          onLocator={onLocator}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </details>
    </>
  );
}

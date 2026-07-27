import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { SupportTicketStatus } from '@/prototype/consumer/models/types';

const STATUS_KEY: Record<SupportTicketStatus, string> = {
  open: 'support.ticket.statusOpen',
  inProgress: 'support.ticket.statusInProgress',
  resolved: 'support.ticket.statusResolved',
  closed: 'support.ticket.statusClosed',
};

export function SupportTicketPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { state, dispatch } = useConsumer();

  const ticket = state.supportTickets.find((item) => item.id === ticketId);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  if (!ticket) {
    return (
      <div className="page-content support-page support-ticket-page">
        <h1>{t('support.ticket.title')}</h1>
        <p className="support-not-found" role="status">
          {t('support.notFound')}
        </p>
        <Link to="/support" className="btn-secondary">
          {t('support.backToList')}
        </Link>
      </div>
    );
  }

  const currentTicket = ticket;
  const isClosed = currentTicket.status === 'closed' || currentTicket.status === 'resolved';

  function handleReplySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!reply.trim()) {
      setReplyError(t('support.errors.replyRequired'));
      return;
    }
    setReplyError(null);
    dispatch({ type: 'SUPPORT_REPLY', ticketId: currentTicket.id, message: reply.trim() });
    setReply('');
  }

  return (
    <div className="page-content support-page support-ticket-page">
      <h1>{t('support.ticket.title')}</h1>

      <section className="support-ticket-detail" aria-labelledby="support-ticket-summary">
        <h2 id="support-ticket-summary" className="support-ticket-id">
          {currentTicket.id}
        </h2>
        <dl className="support-ticket-facts">
          <div className="support-ticket-fact">
            <dt>{t('support.ticket.category')}</dt>
            <dd>{t(`support.categories.${currentTicket.category}`)}</dd>
          </div>
          <div className="support-ticket-fact">
            <dt>{t('support.ticket.status')}</dt>
            <dd>
              <span className={`support-status support-status-${currentTicket.status}`}>
                {t(STATUS_KEY[currentTicket.status])}
              </span>
            </dd>
          </div>
          {currentTicket.contextLink && (
            <div className="support-ticket-fact">
              <dt>{t('support.ticket.contextLink')}</dt>
              <dd>{currentTicket.contextLink}</dd>
            </div>
          )}
        </dl>
        <p className="support-ticket-description">{currentTicket.description}</p>
      </section>

      <section className="support-ticket-thread" aria-labelledby="support-thread-heading">
        <h2 id="support-thread-heading">{t('support.ticket.replies')}</h2>
        {currentTicket.replies.length === 0 ? (
          <p className="support-thread-empty">{t('support.ticket.noReplies')}</p>
        ) : (
          <ol className="support-reply-list">
            {currentTicket.replies.map((entry, index) => (
              <li
                className={`support-reply support-reply-${entry.from}`}
                key={`${entry.at}-${index}`}
              >
                <span className="support-reply-from">
                  {t(
                    entry.from === 'user'
                      ? 'support.ticket.replyFromUser'
                      : 'support.ticket.replyFromSupport',
                  )}
                </span>
                <p className="support-reply-message">{entry.message}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isClosed ? (
        <p className="support-closed-note" role="status">
          {t('support.ticket.closedNote')}
        </p>
      ) : (
        <form onSubmit={handleReplySubmit} noValidate className="support-reply-form">
          <div className="form-group">
            <label htmlFor="support-reply">{t('support.ticket.replyPlaceholder')}</label>
            <textarea
              id="support-reply"
              rows={4}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              aria-invalid={!!replyError}
              aria-describedby={replyError ? 'support-reply-error' : undefined}
            />
            {replyError && (
              <p id="support-reply-error" className="field-error" role="alert">
                {replyError}
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary">
            {t('support.ticket.sendReply')}
          </button>
        </form>
      )}

      <Link to="/support" className="support-back-link">
        {t('support.backToList')}
      </Link>
    </div>
  );
}

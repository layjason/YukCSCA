import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import type { SupportTicketStatus } from '@/prototype/consumer/models/types';

const STATUS_KEY: Record<SupportTicketStatus, string> = {
  open: 'support.ticket.statusOpen',
  inProgress: 'support.ticket.statusInProgress',
  resolved: 'support.ticket.statusResolved',
  closed: 'support.ticket.statusClosed',
};

export function SupportPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = useConsumer();
  const tickets = state.supportTickets;

  return (
    <div className="page-content support-page">
      <h1>{t('support.title')}</h1>
      <p className="support-page-description">{t('support.description')}</p>

      <div className="support-page-actions">
        <Link to="/support/new" className="btn-primary">
          {t('support.newTicket')}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="support-empty" role="status">
          <p>{t('support.empty')}</p>
        </div>
      ) : (
        <ul className="support-ticket-list">
          {tickets.map((ticket) => (
            <li className="support-ticket-item" key={ticket.id}>
              <Link to={`/support/${ticket.id}`} className="support-ticket-link">
                <span className="support-ticket-category">
                  {t(`support.categories.${ticket.category}`)}
                </span>
                <span className="support-ticket-description">{ticket.description}</span>
                <span className="support-ticket-meta">
                  <span className={`support-status support-status-${ticket.status}`}>
                    {t(STATUS_KEY[ticket.status])}
                  </span>
                  <span className="support-ticket-id">{ticket.id}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

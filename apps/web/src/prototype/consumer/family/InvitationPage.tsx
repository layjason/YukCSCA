import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import {
  sampleValidInvitation,
  sampleExpiredInvitation,
  sampleLinkedStudent,
} from '@/prototype/consumer/fixtures';
import { formatDate } from '@/prototype/consumer/formatters';
import { localizeInvitationAccess } from '@/prototype/consumer/localizedFixtures';

export function InvitationPage(): React.JSX.Element {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { dispatch } = useConsumer();
  const navigate = useNavigate();

  if (invitationId === 'inv-fixture-01') {
    return (
      <ValidInvitation
        onAccept={() => {
          dispatch({ type: 'FAMILY_ACCEPT_INVITATION', student: sampleLinkedStudent });
          navigate('/parent/home');
        }}
      />
    );
  }

  if (invitationId === 'inv-fixture-02') {
    return <ExpiredInvitation />;
  }

  if (invitationId === 'inv-fixture-03') {
    return <MismatchedInvitation />;
  }

  if (invitationId === 'inv-fixture-04') {
    return <AlreadyUsedInvitation />;
  }

  return <NotFoundInvitation />;
}

function ValidInvitation({ onAccept }: { onAccept: () => void }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const invitation = sampleValidInvitation;

  return (
    <div className="invitation-page invitation-valid">
      <h1>{t('family.invitation.title')}</h1>

      <dl className="invitation-details">
        <dt>{t('family.invitation.studentName')}</dt>
        <dd>{invitation.studentName}</dd>
        <dt>{t('family.invitation.studentEmail')}</dt>
        <dd>{invitation.studentEmail}</dd>
      </dl>

      <section className="invitation-access" aria-labelledby="access-heading">
        <h2 id="access-heading">{t('family.invitation.allowedAccess')}</h2>
        <ul className="invitation-access-list">
          {localizeInvitationAccess(invitation.allowedAccess, t).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="invitation-expires">
        {t('family.invitation.expiresAt', {
          date: formatDate(invitation.expiresAt, i18n.language),
        })}
      </p>

      <button type="button" className="btn-primary" onClick={onAccept}>
        {t('family.invitation.accept')}
      </button>
    </div>
  );
}

function ExpiredInvitation(): React.JSX.Element {
  const { t } = useTranslation();
  const invitation = sampleExpiredInvitation;

  return (
    <div className="invitation-page invitation-expired">
      <h1>{t('family.invitation.title')}</h1>
      <p className="invitation-status-message" role="alert">
        {t('family.invitation.expired')}
      </p>
      <p className="invitation-student-context">
        {t('family.invitation.studentName')}: {invitation.studentName}
      </p>
      <Link to="/parent/family" className="btn-secondary">
        {t('family.invitation.backToFamily')}
      </Link>
    </div>
  );
}

function MismatchedInvitation(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="invitation-page invitation-mismatched">
      <h1>{t('family.invitation.title')}</h1>
      <p className="invitation-status-message" role="alert">
        {t('family.invitation.mismatched')}
      </p>
      <Link to="/parent/family" className="btn-secondary">
        {t('family.invitation.backToFamily')}
      </Link>
    </div>
  );
}

function AlreadyUsedInvitation(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="invitation-page invitation-used">
      <h1>{t('family.invitation.title')}</h1>
      <p className="invitation-status-message" role="alert">
        {t('family.invitation.alreadyUsed')}
      </p>
      <Link to="/parent/family" className="btn-secondary">
        {t('family.invitation.backToFamily')}
      </Link>
    </div>
  );
}

function NotFoundInvitation(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="invitation-page invitation-not-found">
      <h1>{t('family.invitation.title')}</h1>
      <p className="invitation-status-message" role="alert">
        {t('family.invitation.notFound')}
      </p>
      <Link to="/parent/family" className="btn-secondary">
        {t('family.invitation.backToFamily')}
      </Link>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { formatDate } from '@/prototype/consumer/formatters';

export function FamilyPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { state, dispatch } = useConsumer();
  const { familyLinkStatus, linkedStudent, pendingStudent } = state;

  return (
    <div className="family-page">
      <h1>{t('family.title')}</h1>

      {familyLinkStatus === 'noLink' && <NoLinkState />}
      {familyLinkStatus === 'pendingStudent' && pendingStudent && (
        <PendingStudentState
          studentName={pendingStudent.name}
          studentEmail={pendingStudent.email}
        />
      )}
      {familyLinkStatus === 'active' && linkedStudent && (
        <ActiveState
          studentName={linkedStudent.name}
          linkedAt={linkedStudent.linkedAt}
          onUnlinkReview={() => dispatch({ type: 'FAMILY_UNLINK_REVIEW' })}
        />
      )}
      {familyLinkStatus === 'unlinkReview' && linkedStudent && (
        <UnlinkReviewState
          onConfirm={() => dispatch({ type: 'FAMILY_UNLINK_CONFIRM' })}
          onCancel={() => dispatch({ type: 'FAMILY_UNLINK_CANCEL' })}
        />
      )}
      {familyLinkStatus === 'unlinked' && <UnlinkedState />}
    </div>
  );
}

function NoLinkState(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="family-no-link" aria-labelledby="no-link-heading">
      <h2 id="no-link-heading">{t('family.noLink.heading')}</h2>
      <p>{t('family.noLink.privacyExplanation')}</p>
      <div className="family-actions">
        <Link to="/parent/family/create-student" className="btn-primary">
          {t('family.noLink.createOption')}
        </Link>
        <Link to="/parent/invitations/inv-fixture-01" className="btn-secondary">
          {t('family.noLink.acceptOption')}
        </Link>
      </div>
    </section>
  );
}

function PendingStudentState({
  studentName,
  studentEmail,
}: {
  studentName: string;
  studentEmail: string;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="family-pending" aria-labelledby="pending-heading">
      <h2 id="pending-heading">{t('family.pending.heading')}</h2>
      <dl className="family-student-info">
        <dt>{t('family.pending.studentName')}</dt>
        <dd>{studentName}</dd>
        <dt>{t('family.pending.studentEmail')}</dt>
        <dd>{studentEmail}</dd>
      </dl>
      <p className="family-notice" role="status">
        {t('family.pending.notice')}
      </p>
      <p className="family-notice-secondary">{t('family.pending.noEmailSent')}</p>
    </section>
  );
}

function ActiveState({
  studentName,
  linkedAt,
  onUnlinkReview,
}: {
  studentName: string;
  linkedAt: string;
  onUnlinkReview: () => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <section className="family-active" aria-labelledby="active-heading">
      <h2 id="active-heading">{t('family.active.heading')}</h2>
      <dl className="family-student-info">
        <dt>{t('family.active.studentName')}</dt>
        <dd>{studentName}</dd>
        <dt>{t('family.active.linkedAt')}</dt>
        <dd>{formatDate(linkedAt, i18n.language)}</dd>
      </dl>

      <div className="family-permissions">
        <h3>{t('family.active.permissions')}</h3>
        <ul className="family-permissions-list">
          <li>{t('family.active.permissionSummary')}</li>
          <li>{t('family.active.permissionSyllabus')}</li>
          <li>{t('family.active.permissionMock')}</li>
          <li>{t('family.active.permissionAccess')}</li>
          <li>{t('family.active.permissionReport')}</li>
        </ul>
        <h3>{t('family.active.notVisible')}</h3>
        <ul className="family-permissions-list family-permissions-excluded">
          <li>{t('family.active.notVisibleConversations')}</li>
          <li>{t('family.active.notVisibleNotes')}</li>
          <li>{t('family.active.notVisibleHistory')}</li>
        </ul>
      </div>

      <button type="button" className="btn-danger" onClick={onUnlinkReview}>
        {t('family.active.unlink')}
      </button>
    </section>
  );
}

function UnlinkReviewState({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="family-unlink-review" aria-labelledby="unlink-heading">
      <h2 id="unlink-heading">{t('family.unlink.heading')}</h2>
      <p>{t('family.unlink.consequences')}</p>
      <ul className="family-unlink-consequences">
        <li>{t('family.unlink.consequence1')}</li>
        <li>{t('family.unlink.consequence2')}</li>
        <li>{t('family.unlink.consequence3')}</li>
        <li>{t('family.unlink.consequence4')}</li>
      </ul>
      <p className="family-unlink-preview-note">{t('family.unlink.previewNote')}</p>
      <div className="family-actions">
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {t('family.unlink.confirm')}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {t('family.unlink.cancel')}
        </button>
      </div>
    </section>
  );
}

function UnlinkedState(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="family-unlinked" aria-labelledby="unlinked-heading">
      <h2 id="unlinked-heading">{t('family.unlink.done')}</h2>
      <p>{t('family.unlink.consequence3')}</p>
      <Link to="/parent/family/create-student" className="btn-secondary">
        {t('family.noLink.createOption')}
      </Link>
    </section>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConsumer } from '../state/consumerContext';
import { PreviewBadge } from '@/shared/components/PreviewBadge';

type RoleChoice = 'student' | 'parent' | null;

export function RoleSelectionPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useConsumer();

  const [selected, setSelected] = useState<RoleChoice>(null);

  const isPreviewCredential = state.credentialSession.status === 'active';
  const showPreviewBadge = isPreviewCredential || selected === 'parent';

  function handleContinue(): void {
    if (!selected) return;

    if (selected === 'student') {
      if (isPreviewCredential) {
        dispatch({ type: 'SET_ROLE_INTENT', intent: 'student' });
        navigate('/onboarding/student/goals');
      } else {
        navigate('/onboarding/student');
      }
    } else if (selected === 'parent') {
      dispatch({ type: 'SET_ROLE_INTENT', intent: 'parent' });
      dispatch({ type: 'PARENT_ONBOARDING_STEP', step: 'profile' });
      navigate('/onboarding/parent');
    }
  }

  return (
    <div className="role-page">
      <header className="role-page-header">
        {showPreviewBadge && <PreviewBadge />}
        <h1>{t('role.title')}</h1>
        <p className="role-page-description">{t('role.description')}</p>
      </header>

      <fieldset className="role-fieldset">
        <legend className="role-legend">{t('role.legend')}</legend>

        <div className="role-cards">
          {/* Student card */}
          <label className={`role-card${selected === 'student' ? ' role-card-selected' : ''}`}>
            <input
              type="radio"
              name="role-choice"
              value="student"
              checked={selected === 'student'}
              onChange={() => setSelected('student')}
              className="role-card-input"
            />
            <span className="role-card-content">
              <span className="role-card-title">{t('role.student.title')}</span>
              <span className="role-card-description">{t('role.student.description')}</span>
              <span className="role-card-action">
                {isPreviewCredential ? t('role.student.previewNote') : t('role.student.googleNote')}
              </span>
            </span>
          </label>

          {/* Parent card */}
          <label className={`role-card${selected === 'parent' ? ' role-card-selected' : ''}`}>
            <input
              type="radio"
              name="role-choice"
              value="parent"
              checked={selected === 'parent'}
              onChange={() => setSelected('parent')}
              className="role-card-input"
            />
            <span className="role-card-content">
              <span className="role-card-title">{t('role.parent.title')}</span>
              <span className="role-card-description">{t('role.parent.description')}</span>
              <span className="role-card-note">{t('role.parent.previewNote')}</span>
            </span>
          </label>

          {/* Tutor card — unavailable signpost */}
          <div className="role-card role-card-disabled" aria-disabled="true">
            <input
              type="radio"
              name="role-choice"
              value="tutor"
              disabled
              className="role-card-input"
              aria-label={t('role.tutor.title')}
            />
            <span className="role-card-content">
              <span className="role-card-title">{t('role.tutor.title')}</span>
              <span className="role-card-description">{t('role.tutor.description')}</span>
              <span className="role-card-unavailable">{t('role.tutor.unavailable')}</span>
            </span>
          </div>
        </div>
      </fieldset>

      <button
        type="button"
        className="btn-primary role-continue-btn"
        disabled={!selected}
        onClick={handleContinue}
      >
        {t('role.continue')}
      </button>
    </div>
  );
}

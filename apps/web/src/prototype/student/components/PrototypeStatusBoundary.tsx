import { useTranslation } from 'react-i18next';
import { usePrototype } from '@/prototype/student/prototypeContext';

interface PrototypeStatusBoundaryProps {
  children: React.ReactNode;
}

export function PrototypeStatusBoundary({
  children,
}: PrototypeStatusBoundaryProps): React.JSX.Element {
  const { t } = useTranslation();
  const { state, dispatch } = usePrototype();

  if (state.loading) {
    return (
      <div className="preview-state-panel" role="status" aria-live="polite">
        <div className="preview-skeleton" aria-hidden="true" />
        <strong>{t('preview.loadingTitle')}</strong>
        <p>{t('preview.loadingDescription')}</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="preview-state-panel state-notice state-notice-danger" role="alert">
        <strong>{t('preview.errorTitle')}</strong>
        <p>{t(state.error)}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
        >
          {t('preview.retry')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

import { Trash2 } from 'lucide-react';

interface AdminRemoveButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Icon-only remove control for secondary destructive actions.
 * Uses Lucide (`Trash2`) so icons stay consistent across the app.
 */
export function AdminRemoveButton({
  label,
  onClick,
  disabled = false,
}: AdminRemoveButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="admin-icon-btn admin-icon-btn-danger"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Trash2 className="admin-icon-btn-svg" size={20} strokeWidth={2} aria-hidden />
    </button>
  );
}

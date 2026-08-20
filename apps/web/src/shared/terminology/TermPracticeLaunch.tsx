import { Layers } from 'lucide-react';
import './term-practice.css';

export function TermPracticeLaunch({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button type="button" className="term-practice-launch" onClick={onClick}>
      <p className="term-practice-launch-label">{label}</p>
      <span className="term-practice-launch-art" aria-hidden="true">
        <Layers size={28} strokeWidth={1.75} />
      </span>
    </button>
  );
}

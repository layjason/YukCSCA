import { AssessmentBlocks } from './AssessmentBlocks';
import type { SessionItemOption } from '../types';

interface OptionRadiogroupProps {
  options: readonly SessionItemOption[];
  name: string;
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
  correctKey?: string | null;
  showCorrectness?: boolean;
  selectedKey?: string | null;
}

export function OptionRadiogroup({
  options,
  name,
  value,
  onChange,
  disabled = false,
  correctKey = null,
  showCorrectness = false,
  selectedKey = null,
}: OptionRadiogroupProps): React.JSX.Element {
  return (
    <div className="assessment-options" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const checked = value === option.key;
        let stateClass = '';
        if (showCorrectness) {
          if (correctKey && option.key === correctKey) stateClass = ' is-correct';
          else if (selectedKey === option.key && option.key !== correctKey)
            stateClass = ' is-wrong';
        } else if (checked) {
          stateClass = ' is-selected';
        }
        return (
          <label
            key={option.key}
            className={`assessment-option${stateClass}${disabled ? ' is-disabled' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(option.key)}
            />
            <span className="assessment-option-key" aria-hidden="true">
              {option.key}
            </span>
            <AssessmentBlocks blocks={option.blocks} className="assessment-option-body" />
          </label>
        );
      })}
    </div>
  );
}

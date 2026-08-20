import { Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './term-practice.css';

export function TermLexemeRow({
  surface,
  subtitle,
  meta,
  href,
  linkState,
  audioAvailable = false,
  playing = false,
  onPlay,
}: {
  surface: string;
  subtitle?: string | null;
  meta?: string | null;
  href?: string;
  linkState?: unknown;
  audioAvailable?: boolean;
  playing?: boolean;
  onPlay?: (() => void) | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const body = (
    <>
      <p className="term-lexeme-surface" lang="zh">
        {surface}
      </p>
      {subtitle ? (
        <p className="term-lexeme-sub" aria-hidden="true">
          {subtitle}
        </p>
      ) : null}
      {meta ? <p className="term-lexeme-meta">{meta}</p> : null}
    </>
  );

  return (
    <div className="term-lexeme-row">
      {audioAvailable && onPlay ? (
        <button
          type="button"
          className={`term-lexeme-play${playing ? ' is-playing' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPlay();
          }}
          aria-label={t('terminology.playAria', { text: surface })}
          aria-busy={playing}
        >
          <Volume2 size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : (
        <span className="term-lexeme-play" aria-hidden="true" />
      )}
      {href ? (
        <Link to={href} state={linkState} className="term-lexeme-body">
          {body}
        </Link>
      ) : (
        <div className="term-lexeme-body">{body}</div>
      )}
    </div>
  );
}

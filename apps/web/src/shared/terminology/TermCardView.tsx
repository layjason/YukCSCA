import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KatexFormula } from '@/shared/content/KatexFormula';
import { MixedProse } from '@/shared/content/MixedProse';
import { termAccessibleName, termClassLabelKey, termDefinitionText } from './termPresentation';
import type { TermCard, TermSurfaceForm } from './types';
import './term-card.css';

interface TermCardViewProps {
  card: TermCard;
  alreadyInNotebook?: boolean | undefined;
  metInLine?: string | null | undefined;
  onPlay?: ((surfaceText: string) => void) | undefined;
  playingSurface?: string | null | undefined;
  playDisabled?: boolean | undefined;
  playFailed?: boolean | undefined;
  layout?: 'card' | 'entry';
}

function PlayButton({
  surface,
  onPlay,
  playing,
  disabled,
  label,
  compact = false,
}: {
  surface: TermSurfaceForm;
  onPlay: (text: string) => void;
  playing: boolean;
  disabled: boolean;
  label: string;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`term-card-speaker${compact ? ' is-compact' : ''}${playing ? ' is-playing' : ''}`}
      onClick={() => onPlay(surface.text)}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-busy={playing}
    >
      <Volume2 size={compact ? 16 : 22} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export function TermCardView({
  card,
  alreadyInNotebook = false,
  metInLine = null,
  onPlay,
  playingSurface = null,
  playDisabled = false,
  playFailed = false,
  layout = 'card',
}: TermCardViewProps): React.JSX.Element {
  const { t } = useTranslation();
  const unavailable = t('terminology.definitionUnavailable');
  const definition = termDefinitionText(card.definition, unavailable);
  const name = termAccessibleName(card, unavailable);
  const aliases = card.aliases.filter((alias) => alias.text !== card.primarySurface.text);
  const english =
    card.englishEquivalent.trim().toLocaleLowerCase() === definition.trim().toLocaleLowerCase()
      ? null
      : card.englishEquivalent;
  const canPlay = Boolean(onPlay) && !playFailed;
  const showSavedNote = alreadyInNotebook && layout !== 'entry';
  const classKind = card.termClass === 'TOPIC_TERM' ? 'topic' : 'exam';

  return (
    <article className={`term-card term-card-${layout}`} aria-label={name}>
      <header className="term-card-lexicon">
        <span className={`term-class-chip is-${classKind}`}>
          {t(termClassLabelKey(card.termClass))}
        </span>

        <div className="term-card-headword">
          <p className="term-card-characters" lang="zh">
            {card.primarySurface.text}
          </p>
          {card.primarySurface.audioAvailable && canPlay && onPlay ? (
            <PlayButton
              surface={card.primarySurface}
              onPlay={onPlay}
              playing={playingSurface === card.primarySurface.text}
              disabled={playDisabled}
              label={t('terminology.playAria', { text: card.primarySurface.text })}
            />
          ) : null}
        </div>
        {card.primarySurface.pinyin ? (
          <p className="term-card-pinyin">{card.primarySurface.pinyin}</p>
        ) : null}
        {aliases.length > 0 ? (
          <p className="term-card-also-line">
            <span className="term-card-also-kicker">{t('terminology.alsoWritten')}</span>
            {aliases.map((alias) => (
              <span key={`${alias.text}-${alias.pinyin}`} className="term-card-also-item">
                <span className="term-alias-text" lang="zh">
                  {alias.text}
                </span>
                {alias.audioAvailable && canPlay && onPlay ? (
                  <PlayButton
                    compact
                    surface={alias}
                    onPlay={onPlay}
                    playing={playingSurface === alias.text}
                    disabled={playDisabled}
                    label={t('terminology.playAria', { text: alias.text })}
                  />
                ) : null}
                {alias.pinyin ? <span className="term-alias-pinyin">{alias.pinyin}</span> : null}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {playFailed ? (
        <p className="term-card-unavailable" role="status">
          {t('terminology.playUnavailable')}
        </p>
      ) : null}

      <div className="term-card-body">
        <section className="term-card-sense" aria-label={t('terminology.meaning')}>
          {card.definition.availability === 'LANGUAGE_UNAVAILABLE' ? (
            <p className="term-card-unavailable" role="status">
              {t('terminology.definitionUnavailableDetail', {
                language: t(`studentActivation.languages.${card.definition.requestedLanguage}`),
              })}
            </p>
          ) : (
            <MixedProse text={definition} as="p" className="term-card-definition" />
          )}
          {english ? (
            <p className="term-card-english">
              <span className="term-card-english-kicker">{t('terminology.englishEquivalent')}</span>
              <span className="term-card-english-value">{english}</span>
            </p>
          ) : null}
        </section>

        {card.symbols ? (
          <section className="term-card-symbols" aria-label={t('terminology.symbols')}>
            <p className="term-card-slot-kicker">{t('terminology.symbols')}</p>
            <div className="term-card-notation">
              <KatexFormula
                latex={card.symbols}
                displayMode
                ariaLabel={t('terminology.symbolsAria', { latex: card.symbols })}
                errorLabel={t('terminology.symbolsError')}
              />
            </div>
          </section>
        ) : null}

        {card.example ? (
          <section className="term-card-example-block" aria-label={t('terminology.example')}>
            <p className="term-card-example-kicker">{t('terminology.example')}</p>
            <MixedProse text={card.example} as="p" className="term-card-example" lang="zh" />
          </section>
        ) : null}
      </div>

      {layout === 'entry' && metInLine ? <p className="term-card-seen">{metInLine}</p> : null}

      {showSavedNote ? (
        <p className="term-card-already" role="status">
          {t('terminology.alreadyInNotebook')}
          {metInLine ? ` ${metInLine}` : ''}
        </p>
      ) : null}
    </article>
  );
}

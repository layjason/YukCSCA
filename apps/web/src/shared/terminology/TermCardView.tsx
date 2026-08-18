import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { termAccessibleName, termClassLabelKey, termDefinitionText } from './termPresentation';
import type { TermCard } from './types';
import './term-card.css';

interface TermCardViewProps {
  card: TermCard;
  alreadyInNotebook?: boolean | undefined;
  metInLine?: string | null | undefined;
  onPlay?: ((surfaceText: string) => void) | undefined;
  playingSurface?: string | null | undefined;
  playDisabled?: boolean | undefined;
  playFailed?: boolean | undefined;
}

export function TermCardView({
  card,
  alreadyInNotebook = false,
  metInLine = null,
  onPlay,
  playingSurface = null,
  playDisabled = false,
  playFailed = false,
}: TermCardViewProps): React.JSX.Element {
  const { t } = useTranslation();
  const unavailable = t('terminology.definitionUnavailable');
  const definition = termDefinitionText(card.definition, unavailable);
  const name = termAccessibleName(card, unavailable);
  const surfaces = [card.primarySurface, ...card.aliases];

  return (
    <article className="term-card" aria-label={name}>
      <header className="term-card-header">
        <p className="term-card-characters" lang="zh">
          {card.primarySurface.text}
        </p>
        <span className="term-class-chip">{t(termClassLabelKey(card.termClass))}</span>
      </header>

      <p className="term-card-pinyin" aria-hidden="true">
        {card.primarySurface.pinyin}
      </p>

      <div className="term-card-play-row">
        {surfaces.map((surface) =>
          surface.audioAvailable && onPlay && !playFailed ? (
            <button
              key={`${surface.text}-${surface.pinyin}`}
              type="button"
              className="btn-secondary term-play-button"
              onClick={() => onPlay(surface.text)}
              disabled={playDisabled}
              aria-label={t('terminology.playAria', { text: surface.text })}
              aria-busy={playingSurface === surface.text}
            >
              <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />
              {surface.text === card.primarySurface.text
                ? t('terminology.play')
                : t('terminology.playSurface', { text: surface.text })}
            </button>
          ) : null,
        )}
        {playFailed ? (
          <p className="term-card-unavailable" role="status">
            {t('terminology.playUnavailable')}
          </p>
        ) : null}
      </div>

      {card.definition.availability === 'LANGUAGE_UNAVAILABLE' ? (
        <p className="term-card-unavailable" role="status">
          {t('terminology.definitionUnavailableDetail', {
            language: t(`studentActivation.languages.${card.definition.requestedLanguage}`),
          })}
        </p>
      ) : (
        <p className="term-card-definition">{definition}</p>
      )}

      <dl className="term-card-meta">
        <div>
          <dt>{t('terminology.englishEquivalent')}</dt>
          <dd>{card.englishEquivalent}</dd>
        </div>
        <div>
          <dt>{t('terminology.domainMeaning')}</dt>
          <dd>{card.domainMeaning}</dd>
        </div>
        {card.symbols ? (
          <div>
            <dt>{t('terminology.symbols')}</dt>
            <dd>{card.symbols}</dd>
          </div>
        ) : null}
        {card.example ? (
          <div>
            <dt>{t('terminology.example')}</dt>
            <dd lang="zh">{card.example}</dd>
          </div>
        ) : null}
      </dl>

      {alreadyInNotebook ? (
        <p className="term-card-already" role="status">
          {t('terminology.alreadyInNotebook')}
          {metInLine ? ` ${metInLine}` : ''}
        </p>
      ) : null}
    </article>
  );
}

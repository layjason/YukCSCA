import type { LucideIcon } from 'lucide-react';

export type DestPageHeroTone = 'sky' | 'lilac' | 'cream' | 'mint' | 'coral';

type DestPageHeroProps = {
  icon: LucideIcon;
  title: string;
  tone: DestPageHeroTone;
};

/** Destination title with a pastel icon tile — no boxed surface or extra copy. */
export function DestPageHero({ icon: Icon, title, tone }: DestPageHeroProps): React.JSX.Element {
  return (
    <header className={`dest-hero dest-hero-${tone}`}>
      <span className="dest-hero-icon" aria-hidden="true">
        <Icon strokeWidth={1.75} />
      </span>
      <h1>{title}</h1>
    </header>
  );
}

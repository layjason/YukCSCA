import { render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { describe, expect, test } from 'vitest';
import { DestPageHero } from './DestPageHero';

describe('DestPageHero', () => {
  test('renders only the destination title beside a tone icon', () => {
    render(<DestPageHero tone="sky" icon={BookOpen} title="Practice" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument();
    expect(document.querySelector('.dest-hero-sky')).toBeTruthy();
    expect(document.querySelector('.dest-hero-eyebrow')).toBeNull();
    expect(document.querySelector('.dest-hero-lead')).toBeNull();
  });
});

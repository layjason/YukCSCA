import { describe, expect, test } from 'vitest';
import { firstGivenName, personalDestTitle } from './preferredGivenName';

describe('preferredGivenName', () => {
  test('uses the first token of a preferred or display name', () => {
    expect(firstGivenName('Ayu Maya')).toBe('Ayu');
    expect(firstGivenName('  Jason  ')).toBe('Jason');
    expect(firstGivenName('')).toBeNull();
    expect(firstGivenName(null)).toBeNull();
  });

  test('prefers a named title and falls back to the anonymous your-form', () => {
    expect(personalDestTitle('Your practice', "Ayu's practice", 'Ayu')).toBe("Ayu's practice");
    expect(personalDestTitle('Your practice', "Ayu's practice", null)).toBe('Your practice');
  });
});

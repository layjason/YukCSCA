import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/features/auth/authContextValue';
import { getMyStudentProfile } from '@/features/profile/studentProfileApi';

/** First token of a preferred or display name — short enough for a page title. */
export function firstGivenName(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export function personalDestTitle(yours: string, named: string, name: string | null): string {
  return name ? named : yours;
}

/**
 * Full preferred name from the student profile. Auth displayName is not a
 * fallback — credential accounts have none, and Google's name is only a
 * suggestion at activation.
 */
export function useStudentPreferredName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        const trimmed = profile.preferredName.trim();
        setName(trimmed || null);
      })
      .catch(() => {
        if (active) setName(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return name;
}

/**
 * Preferred nickname when the profile is available. Isolated tests without
 * AuthProvider stay on the anonymous title.
 */
export function usePreferredGivenName(): string | null {
  const auth = useContext(AuthContext);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMyStudentProfile()
      .then((profile) => {
        if (!active) return;
        setName(firstGivenName(profile.preferredName));
      })
      .catch(() => {
        if (active) setName(firstGivenName(auth?.user?.displayName));
      });
    return () => {
      active = false;
    };
  }, [auth?.user?.displayName]);

  return name;
}

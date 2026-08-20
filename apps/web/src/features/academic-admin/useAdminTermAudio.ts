import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublishedTermPronunciation } from './api/academicAdminApi';

export function useAdminTermAudio(packageId: string | null): {
  play: (termId: string, surfaceForm: string) => Promise<boolean>;
  playingKey: string | null;
} {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  useEffect(() => cleanup, [cleanup, packageId]);

  const play = useCallback(
    async (termId: string, surfaceForm: string) => {
      if (!packageId || !surfaceForm.trim()) return false;
      const key = `${termId}:${surfaceForm}`;
      cleanup();
      try {
        const blob = await getPublishedTermPronunciation(packageId, termId, surfaceForm);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingKey(key);
        audio.onended = () => cleanup();
        await audio.play();
        return true;
      } catch {
        cleanup();
        return false;
      }
    },
    [cleanup, packageId],
  );

  return { play, playingKey };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/shared/api/httpClient';
import { getTermPronunciation } from '@/shared/api/terminologyStudentApi';

export function useTermAudio(termId: string | null): {
  play: (surfaceForm?: string) => Promise<void>;
  playingSurface: string | null;
  playFailed: boolean;
} {
  const [playingSurface, setPlayingSurface] = useState<string | null>(null);
  const [playFailed, setPlayFailed] = useState(false);
  const urlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayingSurface(null);
  }, []);

  useEffect(() => cleanup, [cleanup, termId]);

  const play = useCallback(
    async (surfaceForm?: string) => {
      if (!termId) return;
      cleanup();
      setPlayFailed(false);
      try {
        const blob = await getTermPronunciation(termId, surfaceForm);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingSurface(surfaceForm ?? termId);
        audio.onended = () => cleanup();
        await audio.play();
      } catch (err) {
        cleanup();
        if (err instanceof ApiError && err.status === 404) {
          setPlayFailed(true);
          return;
        }
        setPlayFailed(true);
      }
    },
    [cleanup, termId],
  );

  return { play, playingSurface, playFailed };
}

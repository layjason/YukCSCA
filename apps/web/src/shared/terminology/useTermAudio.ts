import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/shared/api/httpClient';
import { getTermPronunciation } from '@/shared/api/terminologyStudentApi';

export function useTermAudio(): {
  play: (termId: string, surfaceForm?: string) => Promise<void>;
  playingTermId: string | null;
  playingSurface: string | null;
  playFailed: boolean;
} {
  const [playingTermId, setPlayingTermId] = useState<string | null>(null);
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

  useEffect(() => cleanup, [cleanup]);

  const play = useCallback(
    async (termId: string, surfaceForm?: string) => {
      if (!termId) return;
      cleanup();
      setPlayingTermId(termId);
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
    [cleanup],
  );

  return { play, playingTermId, playingSurface, playFailed };
}

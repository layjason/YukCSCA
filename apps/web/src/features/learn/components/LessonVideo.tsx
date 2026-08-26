import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, FileText, Gauge, RefreshCw } from 'lucide-react';
import { getPublishedVideoCaptions, playPublishedVideo } from '../api/learnApi';
import type { ExplanationLanguage, PublishedVideoRef, VideoPlaybackGrant } from '../types';

interface LessonVideoProps {
  videoRef: PublishedVideoRef;
  explanationLanguage: ExplanationLanguage;
  initialPositionSeconds?: number | null;
  onProgressUpdate?: (positionSeconds: number) => void;
}

interface VttCue {
  start: number;
  end: number;
  text: string;
}

function parseVttCues(vttText: string): VttCue[] {
  const lines = vttText.split(/\r?\n/);
  const cues: VttCue[] = [];
  let currentStart = -1;
  let currentEnd = -1;
  let currentText: string[] = [];

  const timeRegex =
    /(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'WEBVTT' || trimmed.startsWith('NOTE')) {
      if (currentStart >= 0 && currentText.length > 0) {
        cues.push({ start: currentStart, end: currentEnd, text: currentText.join(' ') });
        currentStart = -1;
        currentEnd = -1;
        currentText = [];
      }
      continue;
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      if (currentStart >= 0 && currentText.length > 0) {
        cues.push({ start: currentStart, end: currentEnd, text: currentText.join(' ') });
        currentText = [];
      }
      const sH = match[1] ? parseInt(match[1], 10) : 0;
      const sM = parseInt(match[2]!, 10);
      const sS = parseInt(match[3]!, 10);
      currentStart = sH * 3600 + sM * 60 + sS;

      const eH = match[5] ? parseInt(match[5], 10) : 0;
      const eM = parseInt(match[6]!, 10);
      const eS = parseInt(match[7]!, 10);
      currentEnd = eH * 3600 + eM * 60 + eS;
    } else if (currentStart >= 0) {
      currentText.push(trimmed);
    }
  }

  if (currentStart >= 0 && currentText.length > 0) {
    cues.push({ start: currentStart, end: currentEnd, text: currentText.join(' ') });
  }

  return cues;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export function LessonVideo({
  videoRef,
  explanationLanguage,
  initialPositionSeconds,
  onProgressUpdate,
}: LessonVideoProps): React.JSX.Element {
  const { t } = useTranslation();
  const videoElRef = useRef<HTMLVideoElement>(null);
  const [grant, setGrant] = useState<VideoPlaybackGrant | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [cues, setCues] = useState<VttCue[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  const lastReportedTimeRef = useRef<number>(-1);
  const resumeAppliedRef = useRef(false);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    resumeAppliedRef.current = false;
    try {
      // 1. Play grant
      const loadedGrant = await playPublishedVideo(videoRef.videoAssetId);
      setGrant(loadedGrant);

      // 2. Captions
      try {
        const vttText = await getPublishedVideoCaptions(videoRef.videoAssetId);
        setCues(parseVttCues(vttText));
        const blob = new Blob([vttText], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        setTrackUrl(url);
      } catch {
        // Captions failure is non-blocking for video playback
      }
    } catch {
      setError(t('learn.lesson.video.playbackError'));
    } finally {
      setLoading(false);
    }
  }, [videoRef.videoAssetId, t]);

  const resumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    return () => {
      if (trackUrl) {
        URL.revokeObjectURL(trackUrl);
      }
    };
  }, [trackUrl]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  // Handle metadata loaded -> restore resume position
  const handleLoadedMetadata = () => {
    const el = videoElRef.current;
    if (!el || resumeAppliedRef.current) return;

    if (
      initialPositionSeconds != null &&
      initialPositionSeconds > 0 &&
      initialPositionSeconds < (videoRef.durationSeconds || el.duration || 600)
    ) {
      const targetTime = Math.min(initialPositionSeconds, videoRef.durationSeconds || el.duration);
      el.currentTime = targetTime;
      resumeAppliedRef.current = true;
      setResumeNotice(t('learn.lesson.video.resumedAt', { time: formatTime(targetTime) }));
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => setResumeNotice(null), 3000);
    } else {
      resumeAppliedRef.current = true;
    }
  };

  const reportProgress = useCallback(
    (seconds: number) => {
      const floored = Math.floor(seconds);
      if (Math.abs(floored - lastReportedTimeRef.current) >= 3) {
        lastReportedTimeRef.current = floored;
        onProgressUpdate?.(floored);
      }
    },
    [onProgressUpdate],
  );

  const handleTimeUpdate = () => {
    const el = videoElRef.current;
    if (!el) return;
    reportProgress(el.currentTime);
  };

  const handlePauseOrEnd = () => {
    const el = videoElRef.current;
    if (!el) return;
    const floored = Math.floor(el.currentTime);
    lastReportedTimeRef.current = floored;
    onProgressUpdate?.(floored);
  };

  // Flush on visibility change or unmount
  useEffect(() => {
    const el = videoElRef.current;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && el) {
        const floored = Math.floor(el.currentTime);
        onProgressUpdate?.(floored);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (el) {
        const floored = Math.floor(el.currentTime);
        onProgressUpdate?.(floored);
      }
    };
  }, [onProgressUpdate]);

  const speedMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!speedOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setSpeedOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpeedOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [speedOpen]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoElRef.current) {
      videoElRef.current.playbackRate = newSpeed;
    }
    setSpeedOpen(false);
  };

  const handleCueClick = (startTime: number) => {
    if (videoElRef.current) {
      videoElRef.current.currentTime = startTime;
      void videoElRef.current.play();
    }
  };

  const handleMediaError = () => {
    const expired = grant != null && Date.parse(grant.expiresAt) <= Date.now();
    if (expired) {
      void loadMedia();
      return;
    }
    setError(t('learn.lesson.video.playbackError'));
  };

  if (loading && !grant) {
    return (
      <section className="learn-video-section" aria-busy="true">
        <div className="learn-video-skeleton">
          <p className="sr-only">{t('learn.lesson.video.loading')}</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="learn-video-section">
        <div className="state-notice state-notice-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => void loadMedia()}>
            <RefreshCw size={16} />
            {t('learn.lesson.video.retryVideo')}
          </button>
        </div>
        <p className="learn-video-note">{t('learn.lesson.video.textAlternativeNote')}</p>
      </section>
    );
  }

  return (
    <section className="learn-video-section" aria-label={t('learn.lesson.video.playerLabel')}>
      <div className="learn-video-wrapper">
        {grant ? (
          <video
            ref={videoElRef}
            src={grant.url}
            controls
            playsInline
            preload="metadata"
            className="learn-video-element"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePauseOrEnd}
            onEnded={handlePauseOrEnd}
            onError={handleMediaError}
          >
            {trackUrl ? (
              <track
                kind="captions"
                src={trackUrl}
                srcLang={explanationLanguage}
                label={explanationLanguage}
                default
              />
            ) : null}
          </video>
        ) : null}

        {resumeNotice ? (
          <div className="learn-video-resume-badge" role="status">
            {resumeNotice}
          </div>
        ) : null}
      </div>

      <div className="learn-video-toolbar">
        <div className="learn-video-speed-control" ref={speedMenuRef}>
          <button
            type="button"
            className="btn-quiet learn-video-btn-compact"
            aria-label={t('learn.lesson.video.speedAria', { speed })}
            aria-expanded={speedOpen}
            onClick={() => setSpeedOpen(!speedOpen)}
          >
            <Gauge size={16} aria-hidden="true" />
            <span>{speed}x</span>
          </button>

          {speedOpen ? (
            <div className="learn-video-speed-menu" role="menu">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="menuitemradio"
                  aria-checked={speed === opt}
                  className={`learn-video-speed-item ${speed === opt ? 'is-active' : ''}`}
                  onClick={() => handleSpeedChange(opt)}
                >
                  {opt}x
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {cues.length > 0 ? (
          <button
            type="button"
            className="btn-quiet learn-video-btn-compact"
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
          >
            <FileText size={16} aria-hidden="true" />
            <span>
              {showTranscript
                ? t('learn.lesson.video.hideTranscript')
                : t('learn.lesson.video.showTranscript')}
            </span>
            {showTranscript ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {showTranscript && cues.length > 0 ? (
        <div
          className="learn-video-transcript"
          role="region"
          aria-label={t('learn.lesson.video.transcriptTitle')}
        >
          <h3 className="learn-video-transcript-title">
            {t('learn.lesson.video.transcriptTitle')}
          </h3>
          <div className="learn-video-transcript-cues">
            {cues.map((cue, ci) => (
              <button
                key={ci}
                type="button"
                className="learn-video-cue-row"
                onClick={() => handleCueClick(cue.start)}
              >
                <span className="learn-video-cue-time">{formatTime(cue.start)}</span>
                <span className="learn-video-cue-text">{cue.text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="learn-video-note">{t('learn.lesson.video.textAlternativeNote')}</p>
    </section>
  );
}

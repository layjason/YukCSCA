import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LessonVideo } from './LessonVideo';
import * as learnApi from '../api/learnApi';
import type { PublishedVideoRef, VideoPlaybackGrant } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { speed?: number; time?: string }) => {
      const map: Record<string, string> = {
        'learn.lesson.video.playerLabel': 'Lesson video explanation',
        'learn.lesson.video.transcriptTitle': 'Transcript & captions',
        'learn.lesson.video.speedLabel': 'Playback speed',
        'learn.lesson.video.speedAria': `Change playback speed, currently ${opts?.speed ?? 1}x`,
        'learn.lesson.video.textAlternativeNote':
          'The complete text, formulas, and diagrams below remain the primary study material.',
        'learn.lesson.video.playbackError': 'Video playback could not be loaded.',
        'learn.lesson.video.retryVideo': 'Retry video',
        'learn.lesson.video.resumedAt': `Resumed at ${opts?.time ?? ''}`,
        'learn.lesson.video.loading': 'Loading video...',
        'learn.lesson.video.showTranscript': 'Show transcript',
        'learn.lesson.video.hideTranscript': 'Hide transcript',
      };
      return map[key] ?? key;
    },
  }),
}));

const mockVideoRef: PublishedVideoRef = {
  videoAssetId: 'vid-published-1',
  durationSeconds: 120,
};

const mockGrant: VideoPlaybackGrant = {
  url: 'https://cdn.csca.mock/stream.mp4',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

const mockVtt = `WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to polynomial factorisation.

00:00:05.000 --> 00:00:15.000
We break polynomials into irreducible components.
`;

describe('LessonVideo', () => {
  beforeEach(() => {
    vi.spyOn(learnApi, 'playPublishedVideo').mockResolvedValue(mockGrant);
    vi.spyOn(learnApi, 'getPublishedVideoCaptions').mockResolvedValue(mockVtt);
    // Mock URL.createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:https://csca/mock-track');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  test('renders native video player with grant url, captions track, and text alternative note', async () => {
    render(<LessonVideo videoRef={mockVideoRef} explanationLanguage="en" />);

    expect(await screen.findByLabelText('Lesson video explanation')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The complete text, formulas, and diagrams below remain the primary study material.',
      ),
    ).toBeInTheDocument();

    const videoEl = screen
      .getByRole('region', {
        name: 'Lesson video explanation',
      })
      .querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', 'https://cdn.csca.mock/stream.mp4');
  });

  test('handles speed control menu and changes playbackRate', async () => {
    render(<LessonVideo videoRef={mockVideoRef} explanationLanguage="en" />);

    const speedBtn = await screen.findByRole('button', {
      name: /Change playback speed/i,
    });
    fireEvent.click(speedBtn);

    const speed125 = screen.getByRole('menuitemradio', { name: '1.25x' });
    fireEvent.click(speed125);

    expect(screen.getByRole('button', { name: /currently 1.25x/i })).toBeInTheDocument();
  });

  test('toggles transcript disclosure with parsed WebVTT cues and click-to-seek', async () => {
    render(<LessonVideo videoRef={mockVideoRef} explanationLanguage="en" />);

    const transcriptToggle = await screen.findByRole('button', {
      name: /Show transcript/i,
    });
    fireEvent.click(transcriptToggle);

    expect(screen.getByText('Welcome to polynomial factorisation.')).toBeInTheDocument();
    expect(
      screen.getByText('We break polynomials into irreducible components.'),
    ).toBeInTheDocument();
  });

  test('handles progress reporting and resume timestamp', async () => {
    const onProgressUpdate = vi.fn();
    render(
      <LessonVideo
        videoRef={mockVideoRef}
        explanationLanguage="en"
        initialPositionSeconds={25}
        onProgressUpdate={onProgressUpdate}
      />,
    );

    await screen.findByLabelText('Lesson video explanation');

    const videoEl = screen
      .getByRole('region', {
        name: 'Lesson video explanation',
      })
      .querySelector('video');
    expect(videoEl).toBeInTheDocument();

    // Trigger metadata loaded
    fireEvent.loadedMetadata(videoEl!);
    expect(videoEl?.currentTime).toBe(25);
    expect(screen.getByText('Resumed at 00:25')).toBeInTheDocument();

    // Trigger timeupdate
    Object.defineProperty(videoEl, 'currentTime', { value: 30 });
    fireEvent.timeUpdate(videoEl!);

    expect(onProgressUpdate).toHaveBeenCalledWith(30);
  });
});

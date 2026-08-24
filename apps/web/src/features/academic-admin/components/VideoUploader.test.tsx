import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { VideoUploader } from './VideoUploader';
import * as api from '../api/academicAdminApi';
import type { AcademicVideoAsset, VideoUploadSlot } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { language?: string; max?: string }) => {
      const map: Record<string, string> = {
        'admin.academic.video.uploader.title': `Upload finished video (${opts?.language ?? ''})`,
        'admin.academic.video.uploader.fileLabel': 'Video file (MP4, max 200 MiB)',
        'admin.academic.video.uploader.fileTypeError': 'Only MP4 video files are accepted.',
        'admin.academic.video.uploader.fileSizeError': `File exceeds maximum size of 200 MiB (${opts?.max ?? ''}).`,
        'admin.academic.video.uploader.uploading': 'Uploading video bytes...',
        'admin.academic.video.uploader.submitUpload': 'Upload and attach',
        'admin.academic.video.uploader.cancel': 'Cancel',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('VideoUploader', () => {
  test('renders dialog and rejects invalid file types', async () => {
    render(<VideoUploader explanationLanguage="en" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('Upload finished video (en)')).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/Video file/i);
    const textFile = new File(['dummy content'], 'notes.txt', {
      type: 'text/plain',
    });

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(await screen.findByText('Only MP4 video files are accepted.')).toBeInTheDocument();
  });

  test('rejects file larger than 200 MiB', async () => {
    render(<VideoUploader explanationLanguage="en" onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const fileInput = screen.getByLabelText(/Video file/i);
    // Create large mock file (201 MiB)
    const largeFile = new File(['a'], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeFile, 'size', { value: 209715201 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(await screen.findByText(/File exceeds maximum size of 200 MiB/i)).toBeInTheDocument();
  });

  test('successfully executes upload and confirm cycle', async () => {
    const mockSlot: VideoUploadSlot = {
      id: 'slot-123',
      explanationLanguage: 'en',
      uploadUrl: 'https://storage.mock.csca/slots/slot-123',
      maxByteSize: 209715200,
      expiresAt: new Date().toISOString(),
    };

    const mockAsset: AcademicVideoAsset = {
      id: 'vid-123',
      source: 'UPLOADED',
      status: 'AWAITING_VALIDATION',
      explanationLanguage: 'en',
      mediaType: 'video/mp4',
      byteSize: 1048576,
      durationSeconds: 120,
      width: 1920,
      height: 1080,
      sha256: 'abc',
      captionsAvailable: true,
      rejection: null,
      latestValidationJob: null,
      provenance: {
        origin: 'YUKCSCA_ORIGINAL',
        provider: null,
        sourceLocator: null,
        permissionReference: null,
        authorUserId: 'user-1',
        reviewedByUserId: null,
        reviewedAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createSlotSpy = vi.spyOn(api, 'createVideoUploadSlot').mockResolvedValue(mockSlot);
    const uploadBytesSpy = vi.spyOn(api, 'uploadVideoBytesToSlot').mockResolvedValue();
    const confirmSpy = vi.spyOn(api, 'confirmVideoUpload').mockResolvedValue(mockAsset);

    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    render(<VideoUploader explanationLanguage="en" onSuccess={onSuccess} onCancel={onCancel} />);

    const fileInput = screen.getByLabelText(/Video file/i);
    const validFile = new File(['video content bytes'], 'lesson.mp4', {
      type: 'video/mp4',
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const submitBtn = screen.getByRole('button', { name: 'Upload and attach' });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSlotSpy).toHaveBeenCalledWith('en');
      expect(uploadBytesSpy).toHaveBeenCalledWith(
        'https://storage.mock.csca/slots/slot-123',
        validFile,
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        'slot-123',
        expect.objectContaining({ origin: 'YUKCSCA_ORIGINAL' }),
      );
      expect(onSuccess).toHaveBeenCalledWith(mockAsset);
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<VideoUploader explanationLanguage="en" onSuccess={vi.fn()} onCancel={onCancel} />);

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButtons[0]!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

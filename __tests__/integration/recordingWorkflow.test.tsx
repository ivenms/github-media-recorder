import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioRecorder from '../../src/components/AudioRecorder';
import { getUserMediaTestUtils } from '../__mocks__/browser-apis/getUserMedia';
import { MockMediaRecorder } from '../__mocks__/browser-apis/mediaRecorder';
import { mockGithubResponses } from '../__mocks__/server';
import * as storageQuota from '../../src/utils/storageQuota';

// Mock all external dependencies
jest.mock('../../src/utils/storageQuota');
jest.mock('../../src/services/audioWorkerService');
jest.mock('../../src/utils/fileUtils');

const mockStorageQuota = storageQuota as jest.Mocked<typeof storageQuota>;

describe('Recording Workflow Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    getUserMediaTestUtils.resetMocks();
    
    // Setup storage mocks
    mockStorageQuota.isStorageNearCapacity.mockResolvedValue({
      warning: false,
      critical: false,
      percentage: 30,
    });
    mockStorageQuota.canStoreFile.mockResolvedValue(true);

    // Setup successful GitHub responses
    mockGithubResponses.resetToDefaults();

    // Mock fetch for blob URLs
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(testUtils.createMockFile('recording.webm', 5000, 'audio/webm')),
    });

    // Mock URL creation
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-recording-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('Complete Audio Recording Workflow', () => {
    it('successfully records, saves, and uploads audio', async () => {
      // 1. Render the AudioRecorder component
      render(<AudioRecorder audioFormat="mp3" />);

      // 2. Verify initial state
      expect(screen.getByText('Voice Recording')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /record/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

      // 3. Fill in required form fields
      const titleInput = screen.getByPlaceholderText('Title (required)');
      const authorInput = screen.getByPlaceholderText('Author (required)');

      await user.type(titleInput, 'Test Recording');
      await user.type(authorInput, 'Test Author');

      // 4. Start recording
      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);

      // Wait for recording to start
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      });

      // 5. Simulate recording duration
      await act(async () => {
        // Fast-forward time to simulate recording
        jest.advanceTimersByTime(3000);
      });

      // 6. Stop recording
      await user.click(recordButton);

      // Wait for recording to stop and audio URL to be created
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });

      // 7. Verify audio player appears
      await waitFor(() => {
        const audioElement = screen.getByRole('application'); // audio controls
        expect(audioElement).toBeInTheDocument();
        expect(audioElement).toHaveAttribute('src', 'blob:mock-recording-url');
      });

      // 8. Save the recording
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // 9. Verify save process
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      // Wait for save completion
      await waitFor(
        () => {
          expect(screen.getByText(/saved/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      // 10. Verify storage checks were performed
      expect(mockStorageQuota.isStorageNearCapacity).toHaveBeenCalled();
      expect(mockStorageQuota.canStoreFile).toHaveBeenCalled();
    }, 15000);

    it('handles recording permission denied gracefully', async () => {
      // Mock permission denied
      getUserMediaTestUtils.mockPermissionDenied();

      render(<AudioRecorder audioFormat="mp3" />);

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText(/could not start recording/i)).toBeInTheDocument();
      });

      // Save button should remain disabled
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('handles storage capacity warnings', async () => {
      // Mock storage warning
      mockStorageQuota.isStorageNearCapacity.mockResolvedValue({
        warning: true,
        critical: false,
        percentage: 85,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      // Fill form and record
      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      });

      await user.click(recordButton); // Stop recording

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should proceed despite warning
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('blocks save when storage is critically low', async () => {
      // Mock critical storage
      mockStorageQuota.isStorageNearCapacity.mockResolvedValue({
        warning: false,
        critical: true,
        percentage: 95,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      // Fill form and record
      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton); // Stop recording

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should show error modal
      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
        expect(screen.getByText(/storage is critically low/i)).toBeInTheDocument();
      });
    });

    it('handles form validation errors', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton); // Stop recording

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      // Try to save without filling required fields
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should show validation errors
      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('Title (required)');
        const authorInput = screen.getByPlaceholderText('Author (required)');
        
        // Inputs should have error styling
        expect(titleInput).toHaveClass('border-red-500');
        expect(authorInput).toHaveClass('border-red-500');
      });
    });

    it('supports different audio formats', async () => {
      const formats = ['mp3', 'wav', 'webm'] as const;

      for (const format of formats) {
        const { unmount } = render(<AudioRecorder audioFormat={format} />);

        await user.type(screen.getByPlaceholderText('Title (required)'), `Test ${format.toUpperCase()}`);
        await user.type(screen.getByPlaceholderText('Author (required)'), 'Test Author');

        const recordButton = screen.getByRole('button', { name: /record/i });
        await user.click(recordButton);
        await user.click(recordButton); // Stop recording

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
        });

        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
          expect(screen.getByText('Processing...')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('handles conversion errors gracefully', async () => {
      // Mock audio worker service to fail
      const { audioWorkerService } = require('../../src/services/audioWorkerService');
      audioWorkerService.convertAudio.mockRejectedValue(new Error('Conversion failed'));

      render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Audio Conversion Failed')).toBeInTheDocument();
        expect(screen.getByText(/failed to convert audio to MP3 format/i)).toBeInTheDocument();
      });
    });

    it('supports thumbnail upload', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test with Thumbnail');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Test Author');

      // Upload thumbnail
      const fileInput = screen.getByDisplayValue('');
      const thumbnailFile = testUtils.createMockFile('thumbnail.jpg', 50000, 'image/jpeg');
      await user.upload(fileInput, thumbnailFile);

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      // Should eventually complete with thumbnail processing
      await waitFor(
        () => {
          expect(screen.getByText(/saved/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it('handles thumbnail conversion errors gracefully', async () => {
      // Mock thumbnail conversion to fail
      const { convertImageToJpg } = require('../../src/utils/fileUtils');
      convertImageToJpg.mockRejectedValue(new Error('Thumbnail conversion failed'));

      render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const fileInput = screen.getByDisplayValue('');
      const thumbnailFile = testUtils.createMockFile('thumbnail.jpg', 50000, 'image/jpeg');
      await user.upload(fileInput, thumbnailFile);

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should show thumbnail error modal but still save audio
      await waitFor(() => {
        expect(screen.getByText('Thumbnail Error')).toBeInTheDocument();
        expect(screen.getByText('Thumbnail conversion failed.')).toBeInTheDocument();
      });
    });

    it('navigates to library after successful save', async () => {
      const mockSetScreen = jest.fn();
      
      // Mock the UI store
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.mockReturnValue({
        setScreen: mockSetScreen,
        openModal: jest.fn(),
      });

      render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });

      // Should navigate to library
      await waitFor(
        () => {
          expect(mockSetScreen).toHaveBeenCalledWith('library', expect.any(String));
        },
        { timeout: 2000 }
      );
    });

    it('cleans up resources on unmount', async () => {
      const { unmount } = render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });

      unmount();

      // Should revoke object URLs
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('handles rapid user interactions gracefully', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const recordButton = screen.getByRole('button', { name: /record/i });

      // Rapidly start/stop recording multiple times
      await user.click(recordButton); // Start
      await user.click(recordButton); // Stop
      await user.click(recordButton); // Start again
      await user.click(recordButton); // Stop again

      // Should handle this gracefully without errors
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      // Verify audio is playable
      const audioElement = screen.getByRole('application');
      expect(audioElement).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('allows retry after failed save', async () => {
      // First attempt fails
      mockStorageQuota.canStoreFile.mockResolvedValueOnce(false);

      render(<AudioRecorder audioFormat="mp3" />);

      await user.type(screen.getByPlaceholderText('Title (required)'), 'Test');
      await user.type(screen.getByPlaceholderText('Author (required)'), 'Author');

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
      });

      // Close error modal
      const okButton = screen.getByRole('button', { name: /ok/i });
      await user.click(okButton);

      // Second attempt succeeds
      mockStorageQuota.canStoreFile.mockResolvedValue(true);

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('recovers from media recorder errors', async () => {
      // First recording attempt fails
      getUserMediaTestUtils.mockNotSupported();

      render(<AudioRecorder audioFormat="mp3" />);

      const recordButton = screen.getByRole('button', { name: /record/i });
      await user.click(recordButton);

      await waitFor(() => {
        expect(screen.getByText(/could not start recording/i)).toBeInTheDocument();
      });

      // Reset to allow successful recording
      getUserMediaTestUtils.resetMocks();

      // Second attempt succeeds
      await user.click(recordButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      });

      // Should no longer show error
      expect(screen.queryByText(/could not start recording/i)).not.toBeInTheDocument();
    });
  });
});
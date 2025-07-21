import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioRecorder from '../../../src/components/AudioRecorder';
import { useAudioRecorder } from '../../../src/hooks/useAudioRecorder';
import { useAudioForm } from '../../../src/hooks/useAudioForm';
import { useUIStore } from '../../../src/stores/uiStore';
import { useFilesStore } from '../../../src/stores/filesStore';
import { audioWorkerService } from '../../../src/services/audioWorkerService';
import * as storageQuota from '../../../src/utils/storageQuota';
import * as fileUtils from '../../../src/utils/fileUtils';
import { getUserMediaTestUtils } from '../../__mocks__/browser-apis/getUserMedia';

// Mock all dependencies
jest.mock('../../../src/hooks/useAudioRecorder');
jest.mock('../../../src/hooks/useAudioForm');
jest.mock('../../../src/stores/uiStore');
jest.mock('../../../src/stores/filesStore');
jest.mock('../../../src/services/audioWorkerService');
jest.mock('../../../src/utils/storageQuota');
jest.mock('../../../src/utils/fileUtils');

const mockUseAudioRecorder = useAudioRecorder as jest.MockedFunction<typeof useAudioRecorder>;
const mockUseAudioForm = useAudioForm as jest.MockedFunction<typeof useAudioForm>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;
const mockUseFilesStore = useFilesStore as jest.MockedFunction<typeof useFilesStore>;
const mockAudioWorkerService = audioWorkerService as jest.Mocked<typeof audioWorkerService>;
const mockStorageQuota = storageQuota as jest.Mocked<typeof storageQuota>;
const mockFileUtils = fileUtils as jest.Mocked<typeof fileUtils>;

describe('AudioRecorder', () => {
  const user = userEvent.setup();
  
  // Default mock implementations
  const mockSetScreen = jest.fn();
  const mockOpenModal = jest.fn();
  const mockSaveFile = jest.fn();
  const mockStartRecording = jest.fn();
  const mockStopRecording = jest.fn();
  const mockValidateInputs = jest.fn();
  const mockHandleThumbnailChange = jest.fn();

  const defaultAudioRecorderState = {
    recording: false,
    duration: 0,
    audioUrl: null,
    error: null,
    stream: null,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
  };

  const defaultAudioFormState = {
    title: '',
    setTitle: jest.fn(),
    author: '',
    setAuthor: jest.fn(),
    category: 'music',
    setCategory: jest.fn(),
    date: '2025-01-01',
    setDate: jest.fn(),
    titleError: null,
    authorError: null,
    thumbnail: null,
    validateInputs: mockValidateInputs,
    handleThumbnailChange: mockHandleThumbnailChange,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    getUserMediaTestUtils.resetMocks();

    // Setup default mock implementations
    mockUseAudioRecorder.mockReturnValue(defaultAudioRecorderState);
    mockUseAudioForm.mockReturnValue(defaultAudioFormState);
    mockUseUIStore.mockReturnValue({
      setScreen: mockSetScreen,
      openModal: mockOpenModal,
    } as any);
    mockUseFilesStore.mockReturnValue({
      saveFile: mockSaveFile,
    } as any);

    // Mock storage and file utilities
    mockStorageQuota.isStorageNearCapacity.mockResolvedValue({
      warning: false,
      critical: false,
      percentage: 50,
    });
    mockStorageQuota.canStoreFile.mockResolvedValue(true);
    mockFileUtils.formatMediaFileName.mockReturnValue('test-audio.mp3');
    mockFileUtils.convertImageToJpg.mockResolvedValue(new Blob());

    // Mock fetch for audioUrl
    global.fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(testUtils.createMockFile('test.webm', 1000, 'audio/webm')),
    });

    // Mock audio worker service
    mockAudioWorkerService.convertAudio.mockResolvedValue({
      convertedData: new Uint8Array(1000),
      format: 'mp3',
    });
  });

  describe('Rendering', () => {
    it('renders audio recorder interface', () => {
      render(<AudioRecorder audioFormat="mp3" />);

      expect(screen.getByText('Voice Recording')).toBeInTheDocument();
      // Look for the record button by finding the first button (record button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      expect(buttons[0]).toHaveClass('w-14', 'h-14', 'rounded-full');
      expect(screen.getByPlaceholderText('Title (required)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Author (required)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Music')).toBeInTheDocument(); // category select (note: capitalized)
    });

    it('displays duration timer', () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        duration: 65, // 1 minute 5 seconds
      });

      render(<AudioRecorder audioFormat="mp3" />);

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('shows waveform component', () => {
      const mockStream = testUtils.createMockMediaStream([
        testUtils.createMockMediaTrack('audio'),
      ]);

      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        recording: true,
        stream: mockStream,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      // Waveform component should be present (rendered as SVG with aria-label)
      expect(screen.getByLabelText('Waveform')).toBeInTheDocument();
    });

    it('displays error messages', () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        error: 'Microphone access denied',
      });

      render(<AudioRecorder audioFormat="mp3" />);

      expect(screen.getByText('Microphone access denied')).toBeInTheDocument();
    });
  });

  describe('Recording Controls', () => {
    it('starts recording when record button is clicked', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      // Get the record button (first button, circular with specific classes)
      const buttons = screen.getAllByRole('button');
      const recordButton = buttons.find(button => button.classList.contains('w-14') && button.classList.contains('h-14'));
      expect(recordButton).toBeDefined();
      await user.click(recordButton!);

      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    it('stops recording when record button is clicked while recording', async () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        recording: true,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      // Get the record button (first button, circular with specific classes)
      const buttons = screen.getAllByRole('button');
      const recordButton = buttons.find(button => button.classList.contains('w-14') && button.classList.contains('h-14'));
      expect(recordButton).toBeDefined();
      await user.click(recordButton!);

      expect(mockStopRecording).toHaveBeenCalledTimes(1);
    });

    it('disables save button when recording', () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        recording: true,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('disables save button when no audio is recorded', () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when audio is recorded', () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        audioUrl: 'blob:mock-audio-url',
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('handles title input changes', async () => {
      const mockSetTitle = jest.fn();
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        setTitle: mockSetTitle,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const titleInput = screen.getByPlaceholderText('Title (required)');
      await user.type(titleInput, 'Test Recording');

      expect(mockSetTitle).toHaveBeenCalledWith('Test Recording');
    });

    it('handles author input changes', async () => {
      const mockSetAuthor = jest.fn();
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        setAuthor: mockSetAuthor,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const authorInput = screen.getByPlaceholderText('Author (required)');
      await user.type(authorInput, 'Test Author');

      expect(mockSetAuthor).toHaveBeenCalledWith('Test Author');
    });

    it('handles category selection changes', async () => {
      const mockSetCategory = jest.fn();
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        setCategory: mockSetCategory,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const categorySelect = screen.getByDisplayValue('music');
      await user.selectOptions(categorySelect, 'podcast');

      expect(mockSetCategory).toHaveBeenCalledWith('podcast');
    });

    it('displays validation errors', () => {
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        titleError: 'Title is required',
        authorError: 'Author is required',
      });

      render(<AudioRecorder audioFormat="mp3" />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Author is required')).toBeInTheDocument();
    });

    it('prevents future dates in date input', async () => {
      const mockSetDate = jest.fn();
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        setDate: mockSetDate,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const dateInput = screen.getByDisplayValue('2025-01-01');
      
      // Try to set a future date
      await user.clear(dateInput);
      await user.type(dateInput, '2026-01-01');

      // Should not call setDate for future dates
      expect(mockSetDate).not.toHaveBeenCalledWith('2026-01-01');
    });
  });

  describe('Save Functionality', () => {
    beforeEach(() => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        audioUrl: 'blob:mock-audio-url',
        duration: 30,
      });
      mockValidateInputs.mockReturnValue(true);
      mockSaveFile.mockResolvedValue({ id: 'test-file-id' });
    });

    it('validates inputs before saving', async () => {
      mockValidateInputs.mockReturnValue(false);

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockValidateInputs).toHaveBeenCalled();
      expect(mockSaveFile).not.toHaveBeenCalled();
    });

    it('checks storage capacity before saving', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockStorageQuota.isStorageNearCapacity).toHaveBeenCalled();
      expect(mockStorageQuota.canStoreFile).toHaveBeenCalled();
    });

    it('shows error modal when storage is critically low', async () => {
      mockStorageQuota.isStorageNearCapacity.mockResolvedValue({
        warning: false,
        critical: true,
        percentage: 95,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'error',
          title: 'Storage Error',
          message: 'Storage is critically low. Please free up some space before saving.',
          confirmText: 'OK',
        });
      });
    });

    it('saves audio in MP3 format', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockAudioWorkerService.convertAudio).toHaveBeenCalled();
        expect(mockSaveFile).toHaveBeenCalled();
      });

      const saveFileCall = mockSaveFile.mock.calls[0];
      expect(saveFileCall[1].mimeType).toBe('audio/mp3');
    });

    it('saves audio in WAV format', async () => {
      mockFileUtils.decodeWebmToPCM.mockResolvedValue({
        channelData: [new Float32Array(1000)],
        sampleRate: 44100,
      });
      mockFileUtils.encodeWAV.mockReturnValue(new Blob(['wav-data'], { type: 'audio/wav' }));

      render(<AudioRecorder audioFormat="wav" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFileUtils.decodeWebmToPCM).toHaveBeenCalled();
        expect(mockFileUtils.encodeWAV).toHaveBeenCalled();
        expect(mockSaveFile).toHaveBeenCalled();
      });

      const saveFileCall = mockSaveFile.mock.calls[0];
      expect(saveFileCall[1].mimeType).toBe('audio/wav');
    });

    it('saves audio in original WebM format', async () => {
      render(<AudioRecorder audioFormat="webm" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveFile).toHaveBeenCalled();
      });

      // Should not call conversion methods
      expect(mockAudioWorkerService.convertAudio).not.toHaveBeenCalled();
      expect(mockFileUtils.decodeWebmToPCM).not.toHaveBeenCalled();
    });

    it('displays save progress', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      
      // Start save process
      await user.click(saveButton);

      // Should show progress elements
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('navigates to library after successful save', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveFile).toHaveBeenCalled();
      });

      // Should navigate to library screen after delay
      await waitFor(() => {
        expect(mockSetScreen).toHaveBeenCalledWith('library', 'test-file-id');
      }, { timeout: 2000 });
    });

    it('handles conversion errors gracefully', async () => {
      mockAudioWorkerService.convertAudio.mockRejectedValue(new Error('Conversion failed'));

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          title: 'Audio Conversion Failed',
          message: expect.stringContaining('Failed to convert audio to MP3 format'),
        });
      });

      // Should not save file if conversion fails
      expect(mockSaveFile).not.toHaveBeenCalled();
    });

    it('handles thumbnail saving', async () => {
      const mockThumbnail = testUtils.createMockFile('thumbnail.jpg', 500, 'image/jpeg');
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        thumbnail: mockThumbnail,
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFileUtils.convertImageToJpg).toHaveBeenCalledWith(mockThumbnail);
        expect(mockSaveFile).toHaveBeenCalledTimes(2); // Audio + thumbnail
      });
    });

    it('handles thumbnail conversion errors', async () => {
      const mockThumbnail = testUtils.createMockFile('thumbnail.jpg', 500, 'image/jpeg');
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        thumbnail: mockThumbnail,
      });
      mockFileUtils.convertImageToJpg.mockRejectedValue(new Error('Thumbnail conversion failed'));

      render(<AudioRecorder audioFormat="mp3" />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Thumbnail Error')).toBeInTheDocument();
        expect(screen.getByText('Thumbnail conversion failed.')).toBeInTheDocument();
      });
    });
  });

  describe('Audio Playback', () => {
    it('shows audio player when recording exists', () => {
      mockUseAudioRecorder.mockReturnValue({
        ...defaultAudioRecorderState,
        audioUrl: 'blob:mock-audio-url',
      });

      render(<AudioRecorder audioFormat="mp3" />);

      const audioElement = screen.getByRole('application'); // audio controls
      expect(audioElement).toBeInTheDocument();
      expect(audioElement).toHaveAttribute('src', 'blob:mock-audio-url');
    });

    it('hides audio player when no recording exists', () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const audioElement = screen.queryByRole('application');
      expect(audioElement).not.toBeInTheDocument();
    });
  });

  describe('File Input Handling', () => {
    it('handles thumbnail file selection', async () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const fileInput = screen.getByDisplayValue('');
      const mockFile = testUtils.createMockFile('image.jpg', 1000, 'image/jpeg');

      await user.upload(fileInput, mockFile);

      expect(mockHandleThumbnailChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and requirements', () => {
      render(<AudioRecorder audioFormat="mp3" />);

      const titleInput = screen.getByPlaceholderText('Title (required)');
      const authorInput = screen.getByPlaceholderText('Author (required)');

      expect(titleInput).toHaveAttribute('required');
      expect(authorInput).toHaveAttribute('required');
      expect(titleInput).toHaveAttribute('maxLength', '100');
      expect(authorInput).toHaveAttribute('maxLength', '50');
    });

    it('provides feedback for form validation', () => {
      mockUseAudioForm.mockReturnValue({
        ...defaultAudioFormState,
        titleError: 'Title is required',
        authorError: 'Author is required',
      });

      render(<AudioRecorder audioFormat="mp3" />);

      expect(screen.getByText('Title is required')).toHaveAttribute('class', expect.stringContaining('text-red-600'));
      expect(screen.getByText('Author is required')).toHaveAttribute('class', expect.stringContaining('text-red-600'));
    });
  });
});
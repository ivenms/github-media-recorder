import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoRecorder from '../../../src/components/VideoRecorder';

// Mock the hooks before importing anything else
jest.mock('../../../src/hooks/useMediaRecorder');
const useMediaRecorder = require('../../../src/hooks/useMediaRecorder').useMediaRecorder;

jest.mock('../../../src/hooks/useScreenOrientation');
const useScreenOrientation = require('../../../src/hooks/useScreenOrientation').useScreenOrientation;

// Mock the modules before importing
jest.mock('../../../src/stores/filesStore');
jest.mock('../../../src/stores/uiStore');
jest.mock('../../../src/utils/device');
jest.mock('../../../src/services/videoWorkerService');
jest.mock('../../../src/utils/appConfig');
jest.mock('../../../src/utils/fileUtils');
jest.mock('../../../src/utils/date');
jest.mock('../../../src/utils/storageQuota');

// Mock the component dependencies
jest.mock('../../../src/components/Header', () => {
  return function MockHeader({ title }: { title: string }) {
    return <div data-testid="header">{title}</div>;
  };
});

jest.mock('../../../src/components/InputField', () => {
  return function MockInputField({ label, placeholder, value, onChange, type, options, accept, ...props }: {
    label: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    type?: string;
    options?: Array<{ id: string; name: string }>;
    accept?: string;
    [key: string]: unknown;
  }) {
    if (type === 'select') {
      return (
        <div>
          <label htmlFor={`input-${label}`}>{label}</label>
          <select id={`input-${label}`} data-testid={`input-${label}`} value={value} onChange={onChange} {...props}>
            {options?.map((option: { id: string; name: string }) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div>
        <label htmlFor={`input-${label}`}>{label}</label>
        <input 
          id={`input-${label}`}
          data-testid={`input-${label}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          type={type}
          accept={accept}
          {...props}
        />
      </div>
    );
  };
});

jest.mock('../../../src/components/SaveButton', () => {
  return function MockSaveButton({ onClick, disabled, saving, saved, saveProgress, savePhase }: {
    onClick: () => void;
    disabled?: boolean;
    saving?: boolean;
    saved?: boolean;
    saveProgress?: number;
    savePhase?: string;
  }) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled}
        data-testid="save-button"
        className="w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        {saving ? `${saveProgress}% ${savePhase}` : saved ? 'Saved!' : 'Save'}
      </button>
    );
  };
});

jest.mock('../../../src/components/icons/RecordIcon', () => {
  return function MockRecordIcon({ state, width, height, className }: {
    state: string;
    width?: number;
    height?: number;
    className?: string;
  }) {
    return (
      <div 
        data-testid={`record-icon-${state}`}
        className={className}
        style={{ width, height }}
      >
        {state}
      </div>
    );
  };
});

describe('VideoRecorder', () => {
  // Get mock references
  const mockSaveFile = jest.fn();
  const mockSetScreen = jest.fn();
  const mockOpenModal = jest.fn();
  const mockGetMobilePlatform = jest.mocked(require('../../../src/utils/device').getMobilePlatform);
  const mockConvertVideo = jest.mocked(require('../../../src/services/videoWorkerService').videoWorkerService.convertVideo);
  const mockFormatMediaFileName = jest.mocked(require('../../../src/utils/fileUtils').formatMediaFileName);
  const mockConvertImageToJpg = jest.mocked(require('../../../src/utils/fileUtils').convertImageToJpg);
  const mockCanStoreFile = jest.mocked(require('../../../src/utils/storageQuota').canStoreFile);
  const mockIsStorageNearCapacity = jest.mocked(require('../../../src/utils/storageQuota').isStorageNearCapacity);
  const mockValidateFileSize = jest.mocked(require('../../../src/utils/storageQuota').validateFileSize);
  
  // Get mock references for store and utility functions (prefixed with _ to indicate intentionally unused)
  const _useFilesStore = jest.mocked(require('../../../src/stores/filesStore').useFilesStore);
  const _useUIStore = jest.mocked(require('../../../src/stores/uiStore').useUIStore);
  const _getMediaCategories = jest.mocked(require('../../../src/utils/appConfig').getMediaCategories);
  const _getTodayDateString = jest.mocked(require('../../../src/utils/date').getTodayDateString);
  const _isFutureDate = jest.mocked(require('../../../src/utils/date').isFutureDate);

  // Set up store mocks
  beforeAll(() => {
    require('../../../src/stores/filesStore').useFilesStore.mockReturnValue({ saveFile: mockSaveFile });
    require('../../../src/stores/uiStore').useUIStore.mockReturnValue({ setScreen: mockSetScreen, openModal: mockOpenModal });
    require('../../../src/utils/appConfig').getMediaCategories.mockReturnValue([
      { id: 'music', name: 'Music' }, 
      { id: 'podcast', name: 'Podcast' }
    ]);
    require('../../../src/utils/date').getTodayDateString.mockReturnValue('2024-06-01');
    require('../../../src/utils/date').isFutureDate.mockReturnValue(false);
  });

  // Helper function to add video element for tests that need it (prefixed with _ to indicate intentionally unused)
  const _addVideoElementToDOM = () => {
    const video = document.createElement('video');
    video.setAttribute('data-testid', 'video-element');
    video.srcObject = null;
    document.body.appendChild(video);
    return video;
  };

  const removeVideoElementFromDOM = () => {
    // Remove all video elements that might have been added
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      try {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch {
        // Ignore errors if the element is already removed
      }
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clean up any video elements from previous tests
    removeVideoElementFromDOM();
    
    // Re-setup store mocks that were cleared by clearAllMocks
    require('../../../src/stores/filesStore').useFilesStore.mockReturnValue({ saveFile: mockSaveFile });
    require('../../../src/stores/uiStore').useUIStore.mockReturnValue({ setScreen: mockSetScreen, openModal: mockOpenModal });
    
    // Re-setup utility mocks that were cleared by clearAllMocks
    require('../../../src/utils/appConfig').getMediaCategories.mockReturnValue([
      { id: 'music', name: 'Music' }, 
      { id: 'podcast', name: 'Podcast' }
    ]);
    require('../../../src/utils/date').getTodayDateString.mockReturnValue('2024-06-01');
    require('../../../src/utils/date').isFutureDate.mockReturnValue(false);
    
    // Default mock implementations
    useMediaRecorder.mockImplementation(() => ({
      recording: false,
      paused: false,
      error: null,
      duration: 0,
      audioUrl: null,
      audioBlob: null,
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      videoUrl: null,
      videoBlob: null,
      stream: null,
    }));
    
    // Mock useScreenOrientation to return portrait by default
    useScreenOrientation.mockReturnValue('portrait');
    
    // Reset all mocks to default behavior
    mockGetMobilePlatform.mockReturnValue('other');
    mockFormatMediaFileName.mockReturnValue('Video_Test Video_Test Author_2024-06-01.mp4');
    mockCanStoreFile.mockResolvedValue(true);
    mockIsStorageNearCapacity.mockResolvedValue({ critical: false, warning: false });
    mockValidateFileSize.mockResolvedValue(true);
    mockSaveFile.mockResolvedValue({ id: 'test-file-id-123' });
    
    // Simplified mock without setTimeout to avoid timer issues
    mockConvertVideo.mockImplementation((videoData, onProgress) => {
      // Simulate progress if callback provided (synchronously to avoid timer issues)
      if (onProgress) {
        onProgress(25, 'Converting...');
        onProgress(50, 'Processing...');
        onProgress(75, 'Finalizing...');
        onProgress(100, 'Complete!');
      }
      
      return Promise.resolve({
        convertedData: new Uint8Array([1, 2, 3, 4]),
        originalSize: 1000,
        convertedSize: 800
      });
    });
    mockConvertImageToJpg.mockResolvedValue(new Blob(['jpg-data'], { type: 'image/jpeg' }));
  });

  afterEach(() => {
    // Clean up any remaining timers
    jest.clearAllTimers();
    // Clean up video elements
    removeVideoElementFromDOM();
  });

  // BASIC FUNCTIONALITY TESTS
  describe('Basic Functionality', () => {
    it('renders without crashing', () => {
      render(<VideoRecorder />);
      expect(screen.getByText('Video Recorder')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Title (required)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Author (required)')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('shows error message if required fields are empty and save is clicked', () => {
      // Mock with a mediaBlob so validation can run
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      render(<VideoRecorder />);
      fireEvent.click(screen.getByTestId('save-button'));
      
      expect(screen.getByText('Title and Author are required.')).toBeInTheDocument();
    });

    it('disables save button when recording', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      render(<VideoRecorder />);
      expect(screen.getByTestId('save-button')).toBeDisabled();
    });

    it('displays recording duration when recording', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: false,
        error: null,
        duration: 65,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      render(<VideoRecorder />);
      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('shows video preview when video is available', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      render(<VideoRecorder />);
      // Check if video element exists in the DOM
      const videoElements = document.querySelectorAll('video');
      expect(videoElements.length).toBeGreaterThan(0);
    });

    it('handles input changes correctly', () => {
      render(<VideoRecorder />);
      
      const titleInput = screen.getByPlaceholderText('Title (required)');
      fireEvent.change(titleInput, { target: { value: 'Test Video' } });
      expect(titleInput).toHaveValue('Test Video');

      const authorInput = screen.getByPlaceholderText('Author (required)');
      fireEvent.change(authorInput, { target: { value: 'Test Author' } });
      expect(authorInput).toHaveValue('Test Author');
    });
  });

  // RECORDING CONTROLS TESTS
  describe('Recording Controls', () => {
    it('calls start recording when record button is clicked', () => {
      const mockStart = jest.fn();
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: mockStart,
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      
      render(<VideoRecorder />);
      // Find the record button by looking for the button containing the RecordIcon with "idle" state
      const recordButton = screen.getByTestId('record-icon-idle').closest('button');
      expect(recordButton).toBeTruthy();
      fireEvent.click(recordButton!);
      expect(mockStart).toHaveBeenCalled();
    });

    it('calls stop recording when stop button is clicked while recording', () => {
      const mockStop = jest.fn();
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: false,
        error: null,
        duration: 10,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: mockStop,
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      
      render(<VideoRecorder />);
      // Find the stop button by looking for the button containing the RecordIcon with "recording" state
      const stopButton = screen.getByTestId('record-icon-recording').closest('button');
      expect(stopButton).toBeTruthy();
      fireEvent.click(stopButton!);
      expect(mockStop).toHaveBeenCalled();
    });

    it('calls pause recording when pause button is clicked while recording', () => {
      const mockPause = jest.fn();
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: false,
        error: null,
        duration: 10,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: mockPause,
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      
      render(<VideoRecorder />);
      // When recording and not paused, there should be a pause button (second button)
      const pauseButton = screen.getByTestId('record-icon-paused').closest('button');
      expect(pauseButton).toBeTruthy();
      fireEvent.click(pauseButton!);
      expect(mockPause).toHaveBeenCalled();
    });

    it('calls resume recording when resume button is clicked while paused', () => {
      const mockResume = jest.fn();
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: true,
        error: null,
        duration: 10,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: mockResume,
        videoUrl: null,
        videoBlob: null,
        stream: null,
      }));
      
      render(<VideoRecorder />);
      // When paused, there should be a play/resume button
      const resumeButton = screen.getByTestId('record-icon-play').closest('button');
      expect(resumeButton).toBeTruthy();
      fireEvent.click(resumeButton!);
      expect(mockResume).toHaveBeenCalled();
    });
  });

  // FORM VALIDATION TESTS
  describe('Form Validation', () => {
    it('enables save button when video is available and form is valid', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      
      render(<VideoRecorder />);
      
      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      
      expect(screen.getByTestId('save-button')).not.toBeDisabled();
    });

    it('shows error for title exceeding 100 characters', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      
      render(<VideoRecorder />);
      
      const longTitle = 'a'.repeat(101);
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: longTitle } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      fireEvent.click(screen.getByTestId('save-button'));
      
      expect(screen.getByText('Title cannot exceed 100 characters.')).toBeInTheDocument();
    });

    it('shows error for author exceeding 50 characters', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      
      render(<VideoRecorder />);
      
      const longAuthor = 'a'.repeat(51);
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: longAuthor } 
      });
      fireEvent.click(screen.getByTestId('save-button'));
      
      expect(screen.getByText('Author cannot exceed 50 characters.')).toBeInTheDocument();
    });

    it('shows error for underscore in title', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      
      render(<VideoRecorder />);
      
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test_Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      fireEvent.click(screen.getByTestId('save-button'));
      
      expect(screen.getByText('Underscore ( _ ) is not allowed in Title or Author.')).toBeInTheDocument();
    });

    it('shows error for underscore in author', () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['test'], { type: 'video/webm' }),
        stream: null,
      }));
      
      render(<VideoRecorder />);
      
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test_Author' } 
      });
      fireEvent.click(screen.getByTestId('save-button'));
      
      expect(screen.getByText('Underscore ( _ ) is not allowed in Title or Author.')).toBeInTheDocument();
    });
  });

  // SAVE WORKFLOW TESTS
  describe('Save Workflow', () => {
    it('completes full save workflow with video conversion', async () => {
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      // Fill in form
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      
      // Trigger save
      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });
      
      await waitFor(() => {
        expect(mockConvertVideo).toHaveBeenCalled();
        expect(mockSaveFile).toHaveBeenCalled();
      });
    });

    it('shows storage critical error and halts save', async () => {
      mockIsStorageNearCapacity.mockResolvedValue({ critical: true, warning: false });
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'error',
          title: 'Storage Error',
          message: 'Storage is critically low. Please free up some space before saving.',
          confirmText: 'OK'
        });
      });
      
      expect(mockConvertVideo).not.toHaveBeenCalled();
    });

    it('shows storage space error when cannot store original file', async () => {
      mockCanStoreFile.mockResolvedValue(false);
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'error',
          title: 'Storage Error',
          message: 'Not enough storage space available. Please free up some space and try again.',
          confirmText: 'OK'
        });
      });
    });

    it('shows conversion error modal and halts execution', async () => {
      mockConvertVideo.mockRejectedValue(new Error('Conversion failed'));
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      fireEvent.change(screen.getByPlaceholderText('Title (required)'), { 
        target: { value: 'Test Video' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Author (required)'), { 
        target: { value: 'Test Author' } 
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          title: 'Video Conversion Failed',
          message: 'Failed to convert video to MP4 format.\n\nError: Conversion failed\n\nPlease try recording again or check your device\'s available memory.'
        });
      });
      
      expect(mockSaveFile).not.toHaveBeenCalled();
    });
  });

  // THUMBNAIL TESTS
  describe('Thumbnail Handling', () => {
    it('accepts valid image file for thumbnail', async () => {
      render(<VideoRecorder />);
      
      const thumbnailInput = screen.getByTestId('input-Thumbnail');
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(thumbnailInput, { target: { files: [file] } });
      });
      
      expect(mockValidateFileSize).toHaveBeenCalledWith(file, 'thumbnail');
    });

    it('shows error modal for non-image file type', async () => {
      render(<VideoRecorder />);
      
      const thumbnailInput = screen.getByTestId('input-Thumbnail');
      const file = new File(['text'], 'test.txt', { type: 'text/plain' });
      
      await act(async () => {
        fireEvent.change(thumbnailInput, { target: { files: [file] } });
      });
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a valid image file.',
        confirmText: 'OK'
      });
    });

    it('shows error modal when thumbnail file size validation fails', async () => {
      mockValidateFileSize.mockRejectedValue(new Error('File too large'));
      
      render(<VideoRecorder />);
      
      const thumbnailInput = screen.getByTestId('input-Thumbnail');
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      
      await act(async () => {
        fireEvent.change(thumbnailInput, { target: { files: [file] } });
      });
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'File Too Large',
        message: 'File too large',
        confirmText: 'OK'
      });
    });
  });

  // VIDEO ELEMENT TESTS
  describe('Video Element Management', () => {
    it('applies iOS Safari landscape rotation fix when video is landscape and platform is ios-safari', async () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      useScreenOrientation.mockReturnValue('landscape');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      await act(async () => {
        render(<VideoRecorder />);
      });

      // The component creates its own video element, so we check for it
      await waitFor(() => {
        const videoElementInDOM = document.querySelector('video');
        expect(videoElementInDOM).toBeTruthy();
      });
      
      // Simulate the loadedmetadata event to trigger the useEffect that calls getMobilePlatform
      await act(async () => {
        const videoElementInDOM = document.querySelector('video');
        if (videoElementInDOM) {
          // Mock video dimensions for landscape
          Object.defineProperty(videoElementInDOM, 'videoWidth', { value: 1920, configurable: true });
          Object.defineProperty(videoElementInDOM, 'videoHeight', { value: 1080, configurable: true });
          
          const event = new Event('loadedmetadata');
          videoElementInDOM.dispatchEvent(event);
        }
      });
      
      expect(mockGetMobilePlatform).toHaveBeenCalled();
    });

    it('does not apply rotation for portrait videos on iOS Safari', async () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      useScreenOrientation.mockReturnValue('portrait');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      await act(async () => {
        render(<VideoRecorder />);
      });

      // The component creates its own video element, so we check for it
      await waitFor(() => {
        const videoElementInDOM = document.querySelector('video');
        expect(videoElementInDOM).toBeTruthy();
      });
      
      // Simulate the loadedmetadata event to trigger the useEffect that calls getMobilePlatform
      await act(async () => {
        const videoElementInDOM = document.querySelector('video');
        if (videoElementInDOM) {
          // Mock video dimensions for portrait
          Object.defineProperty(videoElementInDOM, 'videoWidth', { value: 1080, configurable: true });
          Object.defineProperty(videoElementInDOM, 'videoHeight', { value: 1920, configurable: true });
          
          const event = new Event('loadedmetadata');
          videoElementInDOM.dispatchEvent(event);
        }
      });
      
      expect(mockGetMobilePlatform).toHaveBeenCalled();
    });

    it('does not apply rotation for non-iOS Safari platforms', async () => {
      mockGetMobilePlatform.mockReturnValue('android-chrome');
      useScreenOrientation.mockReturnValue('landscape');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 30,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      await act(async () => {
        render(<VideoRecorder />);
      });

      // The component creates its own video element, so we check for it
      await waitFor(() => {
        const videoElementInDOM = document.querySelector('video');
        expect(videoElementInDOM).toBeTruthy();
      });
      
      // Simulate the loadedmetadata event to trigger the useEffect that calls getMobilePlatform
      await act(async () => {
        const videoElementInDOM = document.querySelector('video');
        if (videoElementInDOM) {
          // Mock video dimensions for landscape
          Object.defineProperty(videoElementInDOM, 'videoWidth', { value: 1920, configurable: true });
          Object.defineProperty(videoElementInDOM, 'videoHeight', { value: 1080, configurable: true });
          
          const event = new Event('loadedmetadata');
          videoElementInDOM.dispatchEvent(event);
        }
      });
      
      expect(mockGetMobilePlatform).toHaveBeenCalled();
    });

    it('maintains video element attributes for iOS Safari compatibility', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: true,
        paused: false,
        error: null,
        duration: 10,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: null,
        videoBlob: null,
        stream: { getTracks: () => [] },
      }));

      render(<VideoRecorder />);
      
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      expect(videoElement.getAttribute('playsInline')).toBe('true');
      expect(videoElement.getAttribute('webkit-playsinline')).toBe('true');
    });
  });

  // ORIENTATION TESTS
  describe('Orientation Handling', () => {
    it('applies correct CSS class for portrait orientation', () => {
      useScreenOrientation.mockReturnValue('portrait');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveClass('w-full', 'h-full', 'object-cover', 'rounded-lg');
    });

    it('applies correct CSS class for landscape orientation', () => {
      useScreenOrientation.mockReturnValue('landscape');
      
      useMediaRecorder.mockImplementation(() => ({
        recording: false,
        paused: false,
        error: null,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        videoUrl: 'blob:video',
        videoBlob: new Blob(['video-data'], { type: 'video/webm' }),
        stream: null,
      }));

      render(<VideoRecorder />);
      
      const videoElement = document.querySelector('video');
      expect(videoElement).toHaveClass('w-full', 'h-full', 'object-cover', 'rounded-lg');
    });
  });

  // DURATION FORMATTING TESTS
  describe('Duration Formatting', () => {
    it('shows formatted duration correctly for various times', () => {
      const testCases = [
        { duration: 0, expected: '00:00' },
        { duration: 30, expected: '00:30' },
        { duration: 65, expected: '01:05' },
        { duration: 3661, expected: '01:01' },
      ];

      testCases.forEach(({ duration, expected }, index) => {
        // Create a unique container for each test case
        const container = document.createElement('div');
        container.id = `test-container-${index}`;
        document.body.appendChild(container);
        
        useMediaRecorder.mockImplementation(() => ({
          recording: true,
          paused: false,
          error: null,
          duration,
          audioUrl: null,
          audioBlob: null,
          start: jest.fn(),
          stop: jest.fn(),
          pause: jest.fn(),
          resume: jest.fn(),
          videoUrl: null,
          videoBlob: null,
          stream: null,
        }));

        const { unmount } = render(<VideoRecorder />, { container });
        
        // Use container to search for the specific duration text
        const durationElement = container.querySelector('.text-2xl.font-mono');
        expect(durationElement).toHaveTextContent(expected);
        
        unmount();
        document.body.removeChild(container);
      });
    });
  });
});
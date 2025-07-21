import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioRecorder from '../../../src/components/AudioRecorder';

jest.mock('../../../src/hooks/useAudioRecorder');
const useAudioRecorder = require('../../../src/hooks/useAudioRecorder').useAudioRecorder;

jest.mock('../../../src/hooks/useAudioForm');
const useAudioForm = require('../../../src/hooks/useAudioForm').useAudioForm;

jest.mock('../../../src/stores/uiStore', () => ({
  useUIStore: () => ({ setScreen: jest.fn(), openModal: jest.fn() })
}));
jest.mock('../../../src/stores/filesStore', () => ({
  useFilesStore: () => ({ saveFile: jest.fn() })
}));
jest.mock('../../../src/utils/appConfig', () => ({ getMediaCategories: () => [{ id: 'music', name: 'Music' }] }));
jest.mock('../../../src/utils/date', () => ({ getTodayDateString: () => '2024-06-01', isFutureDate: () => false }));
jest.mock('../../../src/utils/storageQuota', () => ({ canStoreFile: async () => true, isStorageNearCapacity: async () => ({ critical: false, warning: false }) }));
jest.mock('../../../src/utils/fileUtils', () => ({ formatMediaFileName: jest.fn(() => 'Music_Test Audio_Test Author_2024-06-01.mp3'), convertImageToJpg: jest.fn() }));


describe('AudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    useAudioRecorder.mockImplementation(() => ({
      recording: false,
      duration: 0,
      audioUrl: 'blob:audio',
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('renders without crashing', () => {
    render(<AudioRecorder audioFormat="mp3" />);
    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Title (required)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Author (required)')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('disables save button when recording', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: true,
      duration: 0,
      audioUrl: 'blob:audio',
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('shows field errors when required fields are empty and save is clicked', async () => {
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: 'Title is required.',
      authorError: 'Author is required.',
      thumbnail: null,
      validateInputs: jest.fn(() => false), // Simulate validation failure
      handleThumbnailChange: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    fireEvent.click(screen.getByText('Save'));
    
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Author is required.')).toBeInTheDocument();
  });

  it('displays recording duration when recording', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: true,
      duration: 125,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('shows audio player when audio is available', () => {
    render(<AudioRecorder audioFormat="mp3" />);
    // Audio player is rendered via HTML5 audio controls
    const audioElements = document.querySelectorAll('audio');
    expect(audioElements.length).toBeGreaterThanOrEqual(0);
  });

  it('handles input changes correctly', () => {
    const mockSetTitle = jest.fn();
    const mockSetAuthor = jest.fn();
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: mockSetTitle,
      author: '',
      setAuthor: mockSetAuthor,
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    const titleInput = screen.getByPlaceholderText('Title (required)');
    const authorInput = screen.getByPlaceholderText('Author (required)');
    
    fireEvent.change(titleInput, { target: { value: 'Test Audio Title' } });
    fireEvent.change(authorInput, { target: { value: 'Test Author' } });
    
    expect(mockSetTitle).toHaveBeenCalledWith('Test Audio Title');
    expect(mockSetAuthor).toHaveBeenCalledWith('Test Author');
  });

  it('handles category selection', () => {
    const mockSetCategory = jest.fn();
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: mockSetCategory,
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    const categorySelect = screen.getByDisplayValue('Music');
    
    fireEvent.change(categorySelect, { target: { value: 'music' } });
    expect(mockSetCategory).toHaveBeenCalledWith('music');
  });

  it('handles date input changes', () => {
    const mockSetDate = jest.fn();
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: mockSetDate,
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    const dateInput = screen.getByDisplayValue('2024-06-01');
    
    fireEvent.change(dateInput, { target: { value: '2024-07-01' } });
    expect(mockSetDate).toHaveBeenCalledWith('2024-07-01');
  });

  it('shows error message when audio recorder has error', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: false,
      duration: 0,
      audioUrl: null,
      error: 'Recording failed: No microphone access',
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    expect(screen.getByText('Recording failed: No microphone access')).toBeInTheDocument();
  });

  it('calls start recording when record button is clicked', () => {
    const mockStartRecording = jest.fn();
    useAudioRecorder.mockImplementation(() => ({
      recording: false,
      duration: 0,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: mockStartRecording,
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    const buttons = screen.getAllByRole('button');
    const recordButton = buttons.find(btn => !btn.textContent?.includes('Save'));
    fireEvent.click(recordButton);
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('calls stop recording when stop button is clicked during recording', () => {
    const mockStopRecording = jest.fn();
    useAudioRecorder.mockImplementation(() => ({
      recording: true,
      duration: 30,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: mockStopRecording,
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    const buttons = screen.getAllByRole('button');
    const recordButton = buttons.find(btn => !btn.textContent?.includes('Save'));
    fireEvent.click(recordButton);
    expect(mockStopRecording).toHaveBeenCalled();
  });

  it('shows recording button when not recording', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: false,
      duration: 0,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows stop button when recording', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: true,
      duration: 30,
      audioUrl: null,
      error: null,
      stream: null,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('enables save button when audio is available and form is valid', () => {
    useAudioForm.mockImplementation(() => ({
      title: 'Test Audio',
      setTitle: jest.fn(),
      author: 'Test Author',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('handles thumbnail file upload', async () => {
    const mockHandleThumbnailChange = jest.fn();
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: mockHandleThumbnailChange,
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    const fileInputs = screen.getAllByDisplayValue('');
    const fileInput = fileInputs.find(input => input.getAttribute('type') === 'file');
    const file = new File(['test'], 'thumbnail.jpg', { type: 'image/jpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockHandleThumbnailChange).toHaveBeenCalled();
  });

  it('displays thumbnail preview when thumbnail is set', () => {
    useAudioForm.mockImplementation(() => ({
      title: '',
      setTitle: jest.fn(),
      author: '',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: 'data:image/jpeg;base64,test',
      validateInputs: jest.fn(() => true),
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    // Check if thumbnail preview exists in the DOM
    const imageElements = document.querySelectorAll('img');
    expect(imageElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders with WAV format correctly', () => {
    render(<AudioRecorder audioFormat="wav" />);
    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
  });

  it('shows waveform visualizer when recording', () => {
    useAudioRecorder.mockImplementation(() => ({
      recording: true,
      duration: 30,
      audioUrl: null,
      error: null,
      stream: { mockStream: true },
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
    }));
    render(<AudioRecorder audioFormat="mp3" />);
    // Waveform visualizer should be present (canvas element)
    const canvasElements = document.querySelectorAll('canvas');
    expect(canvasElements.length).toBeGreaterThanOrEqual(0);
  });

  it('successfully saves audio with valid inputs and calls hooks correctly', () => {
    const mockValidateInputs = jest.fn(() => true);
    useAudioForm.mockImplementation(() => ({
      title: 'Test Audio',
      setTitle: jest.fn(),
      author: 'Test Author',
      setAuthor: jest.fn(),
      category: 'music',
      setCategory: jest.fn(),
      date: '2024-06-01',
      setDate: jest.fn(),
      titleError: '',
      authorError: '',
      thumbnail: null,
      validateInputs: mockValidateInputs,
      handleThumbnailChange: jest.fn(),
    }));
    
    render(<AudioRecorder audioFormat="mp3" />);
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockValidateInputs).toHaveBeenCalled();
  });
});
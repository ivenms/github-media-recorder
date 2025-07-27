import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddMediaModal from '../../src/components/AddMediaModal';

// Mock dependencies
jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: jest.fn(() => ({
    modal: { isOpen: false, type: null, message: '', title: '' },
    openModal: jest.fn(),
    closeModal: jest.fn()
  }))
}));

jest.mock('../../src/stores/filesStore', () => ({
  useFilesStore: jest.fn(() => ({
    saveFile: jest.fn()
  }))
}));

jest.mock('../../src/utils/appConfig', () => ({
  getMediaCategories: jest.fn(() => [
    { id: 'music', name: 'Music' },
    { id: 'podcast', name: 'Podcast' },
    { id: 'lecture', name: 'Lecture' }
  ])
}));

jest.mock('../../src/utils/date', () => ({
  getTodayDateString: jest.fn(() => '2024-01-15'),
  isFutureDate: jest.fn((date: string) => {
    const today = new Date('2024-01-15');
    const inputDate = new Date(date);
    return inputDate > today;
  })
}));

jest.mock('../../src/utils/fileUtils', () => ({
  formatMediaFileName: jest.fn(({ category, title, author, date, extension }) => 
    `${category}_${title}_${author}_${date}.${extension}`
  ),
  convertImageToJpg: jest.fn(() => Promise.resolve(new Blob(['fake jpg'], { type: 'image/jpeg' })))
}));

jest.mock('../../src/utils/storageQuota', () => ({
  validateMultipleFiles: jest.fn(() => Promise.resolve()),
  validateFileSize: jest.fn(() => Promise.resolve()),
  getFileType: jest.fn((file: File) => {
    if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
      return 'audio';
    }
    if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
      return 'video';
    }
    if (file.type.startsWith('image/')) {
      return 'thumbnail';
    }
    return 'unknown';
  }),
  formatBytes: jest.fn((bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`),
  FILE_LIMITS: {
    MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_THUMBNAIL_SIZE: 5 * 1024 * 1024 // 5MB
  }
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'mock://fake-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL
});

describe('AddMediaModal', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onSave: jest.fn()
  };

  let mockUseUIStore: jest.MockedFunction<any>;
  let mockUseFilesStore: jest.MockedFunction<any>;
  let mockOpenModal: jest.Mock;
  let mockSaveFile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();

    mockOpenModal = jest.fn();
    mockSaveFile = jest.fn().mockResolvedValue(undefined);

    mockUseUIStore = require('../../src/stores/uiStore').useUIStore;
    mockUseUIStore.mockImplementation(() => ({
      modal: { isOpen: false, type: null, message: '', title: '' },
      openModal: mockOpenModal,
      closeModal: jest.fn()
    }));

    mockUseFilesStore = require('../../src/stores/filesStore').useFilesStore;
    mockUseFilesStore.mockImplementation(() => ({
      saveFile: mockSaveFile
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders modal with correct title and form elements', () => {
      render(<AddMediaModal {...defaultProps} />);

      expect(screen.getByText('Add Media Files')).toBeInTheDocument();
      expect(screen.getByText('Select Media Files')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Thumbnail (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Import Files')).toBeInTheDocument();
    });

    it('renders file input with correct accept attributes', () => {
      render(<AddMediaModal {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"][accept]');
      expect(fileInput).toHaveAttribute('accept', '.mp3,.wav,.mp4,audio/mp3,audio/mpeg,audio/wav,audio/wave,audio/x-wav,video/mp4');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('displays file size limits information', () => {
      render(<AddMediaModal {...defaultProps} />);

      expect(screen.getByText(/supported formats: MP3, WAV, MP4 only/i)).toBeInTheDocument();
      expect(screen.getByText(/max size: 50.00 MB for audio, 500.00 MB for video/i)).toBeInTheDocument();
    });

    it('initializes form with default values', () => {
      render(<AddMediaModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter media title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument(); // date input
      expect(screen.getByDisplayValue('Music')).toBeInTheDocument(); // category select
    });

    it('renders close button with proper accessibility', () => {
      render(<AddMediaModal {...defaultProps} />);

      const closeButton = screen.getByTitle('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('p-2', 'text-gray-400', 'hover:text-gray-600');
    });
  });

  describe('File Selection and Validation', () => {
    it('accepts valid MP3 files', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Selected files:')).toBeInTheDocument();
        expect(screen.getByText('• test.mp3')).toBeInTheDocument();
      });
    });

    it('accepts valid WAV files with different MIME types', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const files = [
        new File(['audio content'], 'test1.wav', { type: 'audio/wav' }),
        new File(['audio content'], 'test2.wav', { type: 'audio/wave' }),
        new File(['audio content'], 'test3.wav', { type: 'audio/x-wav' })
      ];
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText('• test1.wav')).toBeInTheDocument();
        expect(screen.getByText('• test2.wav')).toBeInTheDocument();
        expect(screen.getByText('• test3.wav')).toBeInTheDocument();
      });
    });

    it('accepts valid MP4 files', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('• test.mp4')).toBeInTheDocument();
      });
    });

    it('rejects unsupported file formats', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Unsupported files: test.txt. Only MP3, WAV, and MP4 files are allowed.',
          title: 'File Validation Error'
        });
      });
    });

    it('handles file size validation errors', async () => {
      const mockValidateFileSize = require('../../src/utils/storageQuota').validateFileSize;
      mockValidateFileSize.mockRejectedValueOnce(new Error('File too large'));

      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['large content'], 'large.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Files too large: large.mp3: File too large',
          title: 'File Validation Error'
        });
      });
    });
  });

  describe('Thumbnail Handling', () => {
    it('accepts valid image files for thumbnail', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const thumbnailFile = new File(['image content'], 'thumb.jpg', { type: 'image/jpeg' });
      const thumbnailInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;

      fireEvent.change(thumbnailInput, { target: { files: [thumbnailFile] } });

      await waitFor(() => {
        expect(screen.getByText('Thumbnail preview:')).toBeInTheDocument();
        expect(screen.getByAltText('Thumbnail preview')).toBeInTheDocument();
        expect(mockCreateObjectURL).toHaveBeenCalledWith(thumbnailFile);
      });
    });

    it('handles thumbnail size validation errors', async () => {
      const mockValidateFileSize = require('../../src/utils/storageQuota').validateFileSize;
      mockValidateFileSize.mockImplementation((file, type) => {
        if (type === 'thumbnail') {
          return Promise.reject(new Error('Thumbnail too large'));
        }
        return Promise.resolve();
      });

      render(<AddMediaModal {...defaultProps} />);

      const thumbnailFile = new File(['large image'], 'large.jpg', { type: 'image/jpeg' });
      const thumbnailInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;

      fireEvent.change(thumbnailInput, { target: { files: [thumbnailFile] } });

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Thumbnail too large',
          title: 'Thumbnail Error'
        });
      });
    });

    it('displays thumbnail size limit information', () => {
      render(<AddMediaModal {...defaultProps} />);

      expect(screen.getByText(/max size: 5.00 MB/i)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('updates title field correctly', () => {
      render(<AddMediaModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter media title');
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      expect(titleInput).toHaveValue('Test Title');
    });

    it('updates author field correctly', () => {
      render(<AddMediaModal {...defaultProps} />);

      const authorInput = screen.getByPlaceholderText('Enter author name');
      fireEvent.change(authorInput, { target: { value: 'Test Author' } });

      expect(authorInput).toHaveValue('Test Author');
    });

    it('updates category selection correctly', () => {
      render(<AddMediaModal {...defaultProps} />);

      const categorySelect = screen.getByDisplayValue('Music');
      fireEvent.change(categorySelect, { target: { value: 'podcast' } });

      expect(categorySelect).toHaveValue('podcast');
    });

    it('updates date field correctly', () => {
      render(<AddMediaModal {...defaultProps} />);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2024-01-10' } });

      expect(dateInput).toHaveValue('2024-01-10');
    });

    it('sets max date attribute to today', () => {
      render(<AddMediaModal {...defaultProps} />);

      const dateInput = document.querySelector('input[type="date"]');
      expect(dateInput).toHaveAttribute('max', '2024-01-15');
    });

    it('enforces max length on title field', () => {
      render(<AddMediaModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter media title');
      expect(titleInput).toHaveAttribute('maxlength', '100');
    });

    it('enforces max length on author field', () => {
      render(<AddMediaModal {...defaultProps} />);

      const authorInput = screen.getByPlaceholderText('Enter author name');
      expect(authorInput).toHaveAttribute('maxlength', '50');
    });
  });

  describe('Form Submission', () => {
    it('prevents submission without files', () => {
      render(<AddMediaModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter media title');
      const authorInput = screen.getByPlaceholderText('Enter author name');
      const form = document.querySelector('form');

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(authorInput, { target: { value: 'Test Author' } });
      fireEvent.submit(form!);

      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'alert',
        message: 'Please select at least one media file.',
        title: 'No Files Selected'
      });
    });

    it('successfully imports single MP3 file', async () => {
      const mockFormatMediaFileName = require('../../src/utils/fileUtils').formatMediaFileName;

      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
      const titleInput = screen.getByPlaceholderText('Enter media title');
      const authorInput = screen.getByPlaceholderText('Enter author name');

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(authorInput, { target: { value: 'Test Author' } });

      await waitFor(() => {
        expect(screen.getByText('• test.mp3')).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockFormatMediaFileName).toHaveBeenCalledWith({
          category: 'Music',
          title: 'Test Title',
          author: 'Test Author',
          date: '2024-01-15',
          extension: 'mp3'
        });

        expect(mockSaveFile).toHaveBeenCalledWith(file, {
          name: 'Music_Test Title_Test Author_2024-01-15.mp3',
          type: 'audio',
          mimeType: 'audio/mp3',
          size: file.size,
          duration: 0,
          created: expect.any(Number)
        });

        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'success',
          message: 'Successfully imported 1 file!',
          title: 'Import Complete'
        });

        expect(defaultProps.onSave).toHaveBeenCalled();
      });
    });

    it('handles file save errors', async () => {
      mockSaveFile.mockRejectedValueOnce(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
      const titleInput = screen.getByPlaceholderText('Enter media title');
      const authorInput = screen.getByPlaceholderText('Enter author name');

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      fireEvent.change(authorInput, { target: { value: 'Author' } });

      await waitFor(() => {
        expect(screen.getByText('• test.mp3')).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error importing files:', expect.any(Error));
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to import files. Please try again.',
          title: 'Import Error'
        });
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Integration', () => {
    it('renders nested modal component', () => {
      render(<AddMediaModal {...defaultProps} />);

      const modalElement = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-60');
      expect(modalElement).toBeInTheDocument();
    });

    it('handles close button click', () => {
      render(<AddMediaModal {...defaultProps} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('handles cancel button click', () => {
      render(<AddMediaModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<AddMediaModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import files/i })).toBeInTheDocument();
      expect(document.querySelector('input[type="file"][accept]')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter media title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter author name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Music')).toBeInTheDocument();
      expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
      expect(document.querySelector('input[type="file"][accept="image/*"]')).toBeInTheDocument();
    });

    it('provides clear error messages', () => {
      render(<AddMediaModal {...defaultProps} />);

      const form = document.querySelector('form');
      
      // Trigger form submission event directly
      fireEvent.submit(form!);

      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'alert',
        message: 'Please select at least one media file.',
        title: 'No Files Selected'
      });
    });
  });

  describe('Additional Edge Cases for 100% Coverage', () => {
    it('handles storage validation with non-Error object', async () => {
      const mockValidateMultipleFiles = require('../../src/utils/storageQuota').validateMultipleFiles;
      mockValidateMultipleFiles.mockRejectedValueOnce('Storage error string');

      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Storage validation failed',
          title: 'Storage Error'
        });
      });
    });

    it('prevents submission with only whitespace in title', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
      const titleInput = screen.getByPlaceholderText('Enter media title');
      const authorInput = screen.getByPlaceholderText('Enter author name');

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.change(titleInput, { target: { value: '   \t\n  ' } }); // Only whitespace
      fireEvent.change(authorInput, { target: { value: 'Author' } });

      await waitFor(() => {
        expect(screen.getByText('• test.mp3')).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector('form')!);

      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'alert',
        message: 'Title and Author are required.',
        title: 'Missing Information'
      });
    });

    it('prevents submission with only whitespace in author', async () => {
      render(<AddMediaModal {...defaultProps} />);

      const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
      const fileInput = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
      const titleInput = screen.getByPlaceholderText('Enter media title');
      const authorInput = screen.getByPlaceholderText('Enter author name');

      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(authorInput, { target: { value: '   \t\n  ' } }); // Only whitespace

      await waitFor(() => {
        expect(screen.getByText('• test.mp3')).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector('form')!);

      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'alert',
        message: 'Title and Author are required.',
        title: 'Missing Information'
      });
    });
  });
});
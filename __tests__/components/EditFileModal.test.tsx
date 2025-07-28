import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditFileModal from '../../src/components/EditFileModal';
import type { FileRecord } from '../../src/types';

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
    updateFileWithThumbnail: jest.fn()
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
  parseMediaFileName: jest.fn((filename: string) => {
    // Mock parsing logic for different filename formats
    if (filename === 'Music_Test Song_Artist Name_2024-01-10.mp3') {
      return {
        category: 'Music',
        title: 'Test Song',
        author: 'Artist Name',
        date: '2024-01-10',
        extension: 'mp3'
      };
    }
    if (filename === 'Music_Test Song_Artist Name_2024-01-10') {
      return {
        category: 'Music',
        title: 'Test Song',
        author: 'Artist Name',
        date: '2024-01-10',
        extension: undefined
      };
    }
    if (filename === 'malformed-filename.mp3') {
      return null; // Simulate parsing failure
    }
    return {
      category: 'Music',
      title: 'Default Title',
      author: 'Default Author',
      date: '2024-01-15',
      extension: 'mp3'
    };
  })
}));

jest.mock('../../src/utils/storageQuota', () => ({
  validateFileSize: jest.fn(() => Promise.resolve()),
  formatBytes: jest.fn((bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`),
  FILE_LIMITS: {
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

describe('EditFileModal', () => {
  const mockFile: FileRecord = {
    id: 'test-file-id',
    name: 'Music_Test Song_Artist Name_2024-01-10.mp3',
    type: 'audio',
    mimeType: 'audio/mp3',
    size: 1024000,
    duration: 180,
    created: Date.now(),
    url: 'mock://file-url',
    file: new Blob(['audio content'], { type: 'audio/mp3' })
  };

  const defaultProps = {
    file: mockFile,
    onClose: jest.fn(),
    onSave: jest.fn(),
    thumbnail: undefined
  };

  let mockUseUIStore: jest.MockedFunction<() => unknown>;
  let mockUseFilesStore: jest.MockedFunction<() => unknown>;
  let mockOpenModal: jest.Mock;
  let mockUpdateFileWithThumbnail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();

    mockOpenModal = jest.fn();
    mockUpdateFileWithThumbnail = jest.fn().mockResolvedValue(undefined);

    mockUseUIStore = require('../../src/stores/uiStore').useUIStore;
    mockUseUIStore.mockReturnValue({
      modal: { isOpen: false, type: null, message: '', title: '' },
      openModal: mockOpenModal,
      closeModal: jest.fn()
    });

    mockUseFilesStore = require('../../src/stores/filesStore').useFilesStore;
    mockUseFilesStore.mockReturnValue({
      updateFileWithThumbnail: mockUpdateFileWithThumbnail
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders modal with correct title and form elements', () => {
      render(<EditFileModal {...defaultProps} />);

      expect(screen.getByText('Edit File')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Author')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Thumbnail')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('initializes form with parsed file metadata', () => {
      render(<EditFileModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument(); // title
      expect(screen.getByDisplayValue('Artist Name')).toBeInTheDocument(); // author
      expect(screen.getByDisplayValue('Music')).toBeInTheDocument(); // category
      expect(screen.getByDisplayValue('2024-01-10')).toBeInTheDocument(); // date
    });

    it('handles files with unparseable names gracefully', () => {
      const fileWithBadName = {
        ...mockFile,
        name: 'malformed-filename.mp3'
      };

      render(<EditFileModal {...defaultProps} file={fileWithBadName} />);

      // Should fall back to empty values when parsing fails
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument(); // date should use today's date
    });

    it('renders close button with proper accessibility', () => {
      render(<EditFileModal {...defaultProps} />);

      const closeButton = screen.getByTitle('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('p-2', 'text-gray-400', 'hover:text-gray-600');
    });

    it('sets max date attribute to today', () => {
      render(<EditFileModal {...defaultProps} />);

      const dateInput = document.querySelector('input[type="date"]');
      expect(dateInput).toHaveAttribute('max', '2024-01-15');
    });
  });

  describe('Thumbnail Handling', () => {
    it('displays existing thumbnail when provided', () => {
      const propsWithThumbnail = {
        ...defaultProps,
        thumbnail: 'mock://existing-thumbnail'
      };

      render(<EditFileModal {...propsWithThumbnail} />);

      expect(screen.getByText('Current thumbnail:')).toBeInTheDocument();
      expect(screen.getByAltText('Thumbnail preview')).toBeInTheDocument();
      expect(screen.getByAltText('Thumbnail preview')).toHaveAttribute('src', 'mock://existing-thumbnail');
      expect(screen.getByText(/upload a new thumbnail to replace the current one/i)).toBeInTheDocument();
    });

    it('shows appropriate message when no thumbnail exists', () => {
      render(<EditFileModal {...defaultProps} />);

      expect(screen.queryByText('Current thumbnail:')).not.toBeInTheDocument();
      expect(screen.getByText(/upload a thumbnail image \(optional\)/i)).toBeInTheDocument();
    });

    it('accepts valid image files for new thumbnail', async () => {
      render(<EditFileModal {...defaultProps} />);

      const thumbnailFile = new File(['image content'], 'new-thumb.jpg', { type: 'image/jpeg' });
      const thumbnailInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;

      fireEvent.change(thumbnailInput, { target: { files: [thumbnailFile] } });

      await waitFor(() => {
        expect(screen.getByText('New thumbnail preview:')).toBeInTheDocument();
        expect(screen.getByAltText('Thumbnail preview')).toBeInTheDocument();
        expect(mockCreateObjectURL).toHaveBeenCalledWith(thumbnailFile);
      });
    });

    it('handles thumbnail size validation errors', async () => {
      const mockValidateFileSize = require('../../src/utils/storageQuota').validateFileSize;
      mockValidateFileSize.mockRejectedValueOnce(new Error('Thumbnail too large'));

      render(<EditFileModal {...defaultProps} />);

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
      render(<EditFileModal {...defaultProps} />);

      expect(screen.getByText(/max size: 5.00 MB/i)).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('updates title field correctly', () => {
      render(<EditFileModal {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('Test Song');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      expect(titleInput).toHaveValue('Updated Title');
    });

    it('updates author field correctly', () => {
      render(<EditFileModal {...defaultProps} />);

      const authorInput = screen.getByDisplayValue('Artist Name');
      fireEvent.change(authorInput, { target: { value: 'Updated Author' } });

      expect(authorInput).toHaveValue('Updated Author');
    });

    it('updates category selection correctly', () => {
      render(<EditFileModal {...defaultProps} />);

      const categorySelect = screen.getByDisplayValue('Music');
      fireEvent.change(categorySelect, { target: { value: 'podcast' } });

      expect(categorySelect).toHaveValue('podcast');
    });

    it('updates date field correctly', () => {
      render(<EditFileModal {...defaultProps} />);

      const dateInput = screen.getByDisplayValue('2024-01-10');
      fireEvent.change(dateInput, { target: { value: '2024-01-12' } });

      expect(dateInput).toHaveValue('2024-01-12');
    });

    it('marks fields as required', () => {
      render(<EditFileModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Test Song')).toBeRequired();
      expect(screen.getByDisplayValue('Artist Name')).toBeRequired();
      expect(screen.getByDisplayValue('2024-01-10')).toBeRequired();
    });
  });

  describe('Form Submission', () => {
    it('successfully updates file metadata', async () => {
      render(<EditFileModal {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('Test Song');
      const authorInput = screen.getByDisplayValue('Artist Name');
      const categorySelect = screen.getByDisplayValue('Music');
      const dateInput = screen.getByDisplayValue('2024-01-10');
      const submitButton = screen.getByText('Save Changes');

      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      fireEvent.change(authorInput, { target: { value: 'Updated Author' } });
      fireEvent.change(categorySelect, { target: { value: 'podcast' } });
      fireEvent.change(dateInput, { target: { value: '2024-01-12' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateFileWithThumbnail).toHaveBeenCalledWith(
          'test-file-id',
          'podcast_Updated Title_Updated Author_2024-01-12.mp3',
          null
        );

        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'success',
          message: 'File metadata updated successfully!',
          title: 'Success'
        });

        expect(defaultProps.onSave).toHaveBeenCalledWith('test-file-id');
      });
    });

    it('includes new thumbnail in update', async () => {
      render(<EditFileModal {...defaultProps} />);

      const thumbnailFile = new File(['image content'], 'new-thumb.jpg', { type: 'image/jpeg' });
      const thumbnailInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
      const submitButton = screen.getByText('Save Changes');

      fireEvent.change(thumbnailInput, { target: { files: [thumbnailFile] } });

      await waitFor(() => {
        expect(screen.getByText('New thumbnail preview:')).toBeInTheDocument();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateFileWithThumbnail).toHaveBeenCalledWith(
          'test-file-id',
          'Music_Test Song_Artist Name_2024-01-10.mp3',
          thumbnailFile
        );
      });
    });

    it('handles file update errors', async () => {
      mockUpdateFileWithThumbnail.mockRejectedValueOnce(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EditFileModal {...defaultProps} />);

      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error updating file:', expect.any(Error));
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to update file metadata. Please try again.',
          title: 'Error'
        });
      });

      consoleSpy.mockRestore();
    });

    it('allows submission with empty thumbnail', async () => {
      render(<EditFileModal {...defaultProps} />);

      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateFileWithThumbnail).toHaveBeenCalledWith(
          'test-file-id',
          'Music_Test Song_Artist Name_2024-01-10.mp3',
          null
        );
      });
    });
  });

  describe('Modal Integration', () => {
    it('renders nested modal component', () => {
      render(<EditFileModal {...defaultProps} />);

      const modalElement = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-60');
      expect(modalElement).toBeInTheDocument();
    });

    it('handles close button click', () => {
      render(<EditFileModal {...defaultProps} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('handles cancel button click', () => {
      render(<EditFileModal {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles files without extension gracefully', async () => {
      const fileWithoutExt = {
        ...mockFile,
        name: 'Music_Test Song_Artist Name_2024-01-10'
      };

      render(<EditFileModal {...defaultProps} file={fileWithoutExt} />);

      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateFileWithThumbnail).toHaveBeenCalledWith(
          'test-file-id',
          'Music_Test Song_Artist Name_2024-01-10.Music_Test Song_Artist Name_2024-01-10',
          null
        );
      });
    });

    it('handles special characters in filename', async () => {
      render(<EditFileModal {...defaultProps} />);

      const titleInput = screen.getByDisplayValue('Test Song');
      const authorInput = screen.getByDisplayValue('Artist Name');
      const submitButton = screen.getByText('Save Changes');

      fireEvent.change(titleInput, { target: { value: 'Title with !@#$%' } });
      fireEvent.change(authorInput, { target: { value: 'Author & Co.' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateFileWithThumbnail).toHaveBeenCalledWith(
          'test-file-id',
          'Music_Title with !@#$%_Author & Co._2024-01-10.mp3',
          null
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<EditFileModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Artist Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Music')).toBeInTheDocument();
      expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
      expect(document.querySelector('input[type="file"][accept="image/*"]')).toBeInTheDocument();
    });

    it('provides clear success and error messages', async () => {
      render(<EditFileModal {...defaultProps} />);

      const submitButton = screen.getByText('Save Changes');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'success',
          message: 'File metadata updated successfully!',
          title: 'Success'
        });
      });
    });

    it('provides alternative text for thumbnail images', async () => {
      const propsWithThumbnail = {
        ...defaultProps,
        thumbnail: 'mock://existing-thumbnail'
      };

      render(<EditFileModal {...propsWithThumbnail} />);

      const thumbnailImage = screen.getByAltText('Thumbnail preview');
      expect(thumbnailImage).toBeInTheDocument();
      expect(thumbnailImage).toHaveAttribute('alt', 'Thumbnail preview');
    });
  });
});
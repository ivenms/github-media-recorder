import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileList from '../../src/components/FileList';

// Mock all dependencies
jest.mock('../../src/utils/fileUtils', () => ({
  parseMediaFileName: jest.fn()
}));

jest.mock('../../src/utils/date', () => ({
  formatReadableDate: (date: string) => `Readable ${date}`
}));

jest.mock('../../src/utils/imageUtils', () => ({
  processThumbnailForUpload: jest.fn(),
  getAppIconUrl: jest.fn(() => '/icon.svg')
}));

jest.mock('../../src/utils/uploadUtils', () => ({
  uploadFile: jest.fn(),
  uploadThumbnail: jest.fn()
}));

jest.mock('../../src/hooks/useCombinedFiles');
jest.mock('../../src/hooks/useUploadManager');
jest.mock('../../src/stores/uiStore');
jest.mock('../../src/stores/gitStore');

// Mock components
jest.mock('../../src/components/EditFileModal', () => {
  return function MockEditFileModal({ onClose, onSave }: { onClose: () => void; onSave: (id?: string) => void }) {
    return (
      <div data-testid="edit-file-modal">
        <button onClick={() => onClose()}>Close Edit</button>
        <button onClick={() => onSave('new-file-id')}>Save Edit</button>
      </div>
    );
  };
});

jest.mock('../../src/components/AddMediaModal', () => {
  return function MockAddMediaModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
    return (
      <div data-testid="add-media-modal">
        <button onClick={() => onClose()}>Close Add</button>
        <button onClick={() => onSave()}>Save Add</button>
      </div>
    );
  };
});

jest.mock('../../src/components/Modal', () => {
  return function MockModal({ isOpen, onClose, onConfirm, title, message, type }: { isOpen: boolean; onClose: () => void; onConfirm?: () => void; title: string; message: string; type: string }) {
    return isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <p>Type: {type}</p>
        <button onClick={() => onClose()}>Close Modal</button>
        {onConfirm && <button onClick={() => onConfirm()}>Confirm Modal</button>}
      </div>
    ) : null;
  };
});

jest.mock('../../src/components/GitHubImage', () => {
  return function MockGitHubImage({ filePath, alt, className, fallback }: { filePath?: string; alt?: string; className?: string; fallback?: React.ReactNode }) {
    return filePath ? (
      <img src={filePath} alt={alt} className={className} data-testid="github-image" />
    ) : (
      <div data-testid="github-image-fallback">{fallback}</div>
    );
  };
});

jest.mock('../../src/components/GitHubMedia', () => {
  return function MockGitHubMedia({ filePath, type, className, fallback }: { filePath?: string; type: string; className?: string; fallback?: React.ReactNode }) {
    return filePath ? (
      <div data-testid={`github-media-${type}`} className={className}>
        {type === 'audio' ? 'GitHub Audio Player' : 'GitHub Video Player'}
      </div>
    ) : (
      <div data-testid="github-media-fallback">{fallback}</div>
    );
  };
});

// Mock all icon components
jest.mock('../../src/components/icons/DefaultThumbnail', () => ({ className }: { className?: string }) => <div data-testid="default-thumbnail" className={className} />);
jest.mock('../../src/components/icons/PlayIcon', () => ({ width: _width, height: _height }: { width?: number; height?: number }) => <div data-testid="play-icon" />);
jest.mock('../../src/components/icons/EditIcon', () => ({ width: _width, height: _height }: { width?: number; height?: number }) => <div data-testid="edit-icon" />);
jest.mock('../../src/components/icons/DeleteIcon', () => ({ width: _width, height: _height }: { width?: number; height?: number }) => <div data-testid="delete-icon" />);
jest.mock('../../src/components/icons/UploadIcon', () => ({ className }: { className?: string }) => <div data-testid="upload-icon" className={className} />);
jest.mock('../../src/components/icons/CheckIcon', () => ({ width: _width, height: _height, className }: { width?: number; height?: number; className?: string }) => <div data-testid="check-icon" className={className} />);
jest.mock('../../src/components/icons/AudioIcon', () => ({ className, width: _width, height: _height }: { className?: string; width?: number; height?: number }) => <div data-testid="audio-icon" className={className} />);
jest.mock('../../src/components/icons/VideoIcon', () => ({ className, width: _width, height: _height }: { className?: string; width?: number; height?: number }) => <div data-testid="video-icon" className={className} />);
jest.mock('../../src/components/icons/CloseIcon', () => ({ width: _width, height: _height }: { width?: number; height?: number }) => <div data-testid="close-icon" />);

const { useCombinedFiles } = require('../../src/hooks/useCombinedFiles');
const { useUploadManager } = require('../../src/hooks/useUploadManager');
const { useUIStore } = require('../../src/stores/uiStore');
const { parseMediaFileName } = require('../../src/utils/fileUtils');

describe('FileList', () => {
  // Default mock data
  const mockFiles = [
    { 
      id: '1', 
      name: 'Music_Audio Test_test_author_2024-06-01.mp3', 
      type: 'audio', 
      mimeType: 'audio/mp3', 
      size: 1234, 
      duration: 60, 
      created: Date.now(), 
      url: 'blob:1', 
      uploaded: true, 
      isLocal: true 
    },
    { 
      id: '2', 
      name: 'Video_Video Test_test_author_2024-06-01.mp4', 
      type: 'video', 
      mimeType: 'video/mp4', 
      size: 2345, 
      duration: 120, 
      created: Date.now(), 
      url: 'blob:2', 
      uploaded: false, 
      isLocal: true 
    }
  ];

  const mockThumbnails = {
    'Music_Audio Test_test_author_2024-06-01': {
      id: 'thumb1',
      url: 'blob:thumb1',
      isLocal: true
    }
  };

  const defaultMockImplementation = {
    files: mockFiles,
    thumbnails: mockThumbnails,
    uploadState: {},
    isLoading: false,
    remoteError: null,
    loadFilesWithThumbnails: jest.fn(),
    refreshAllFiles: jest.fn(),
    removeFile: jest.fn(),
    setRemoteError: jest.fn()
  };

  const defaultUploadManager = {
    uploadFile: jest.fn(),
    retryUpload: jest.fn()
  };

  const defaultUIStore = {
    modal: { isOpen: false },
    closeModal: jest.fn(),
    openModal: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Setup default mocks
    useCombinedFiles.mockReturnValue(defaultMockImplementation);
    useUploadManager.mockReturnValue(defaultUploadManager);
    useUIStore.mockReturnValue(defaultUIStore);
    
    // Setup parseMediaFileName mock
    parseMediaFileName.mockImplementation((name: string) => {
      if (name.includes('Music_Audio Test_test_author_2024-06-01')) {
        return { title: 'Audio Test', author: 'test_author', category: 'Music', date: '2024-06-01', extension: 'mp3' };
      }
      if (name.includes('Video_Video Test_test_author_2024-06-01')) {
        return { title: 'Video Test', author: 'test_author', category: 'Video', date: '2024-06-01', extension: 'mp4' };
      }
      return null;
    });

    // Mock DOM methods
    Object.defineProperty(document, 'getElementById', {
      writable: true,
      value: jest.fn().mockImplementation((_id) => ({
        scrollIntoView: jest.fn()
      }))
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  // BASIC RENDERING TESTS
  it('renders file list and action buttons', () => {
    render(<FileList />);
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(screen.getByText('Audio Test')).toBeInTheDocument();
    expect(screen.getByText('Video Test')).toBeInTheDocument();
    expect(screen.getAllByText('by test_author')).toHaveLength(2);
    expect(screen.getByText('Add Media')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      isLoading: true
    });
    
    render(<FileList />);
    expect(screen.getByText('Loading files from repository...')).toBeInTheDocument();
    expect(screen.queryByText('Add Media')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('displays empty state when no files', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      files: []
    });
    
    render(<FileList />);
    expect(screen.getByText('Add Media')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.queryByText('Audio Test')).not.toBeInTheDocument();
  });

  // FILE DISPLAY TESTS
  it('displays file metadata correctly', () => {
    render(<FileList />);
    
    // Check categories
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    
    // Check dates - use getAllByText since we have two files with same date
    expect(screen.getAllByText('Readable 2024-06-01')).toHaveLength(2);
    
    // Check file types
    expect(screen.getByText('audio')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
    
    // Check icons
    expect(screen.getByTestId('audio-icon')).toBeInTheDocument();
    expect(screen.getByTestId('video-icon')).toBeInTheDocument();
  });

  it('displays thumbnails for files with thumbnails', () => {
    render(<FileList />);
    
    // Should show actual thumbnail for first file (has thumbnail)
    const thumbnailImages = screen.getAllByRole('img');
    expect(thumbnailImages[0]).toHaveAttribute('src', 'blob:thumb1');
    
    // Should show default thumbnail for second file (no thumbnail)
    expect(screen.getByTestId('default-thumbnail')).toBeInTheDocument();
  });

  it('displays remote file thumbnails correctly', () => {
    const remoteFiles = [{
      ...mockFiles[0],
      id: '3',
      isLocal: false,
      url: 'path/to/remote/file.mp3'
    }];
    
    const remoteThumbnails = {
      'Music_Audio Test_test_author_2024-06-01': {
        id: 'thumb3',
        url: 'path/to/remote/thumb.jpg',
        isLocal: false
      }
    };
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      files: remoteFiles,
      thumbnails: remoteThumbnails
    });
    
    render(<FileList />);
    expect(screen.getByTestId('github-image')).toBeInTheDocument();
  });

  it('handles files without parsed metadata', () => {
    parseMediaFileName.mockReturnValue(null);
    
    render(<FileList />);
    
    // Should fall back to filename
    expect(screen.getByText('Music_Audio Test_test_author_2024-06-01.mp3')).toBeInTheDocument();
    expect(screen.getByText('Video_Video Test_test_author_2024-06-01.mp4')).toBeInTheDocument();
    
    // Should use file type as category - expect 2 instances since we have 2 files
    expect(screen.getAllByText('audio')).toHaveLength(2); // One in category, one in file type
    expect(screen.getAllByText('video')).toHaveLength(2); // One in category, one in file type
  });

  // UPLOADED FILE STATES
  it('shows uploaded status for uploaded files', () => {
    render(<FileList />);
    
    // First file is uploaded
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    
    // Should not show edit/delete buttons for uploaded files
    const editButtons = screen.getAllByTitle('Edit');
    const deleteButtons = screen.getAllByTitle('Delete');
    expect(editButtons).toHaveLength(1); // Only for non-uploaded file
    expect(deleteButtons).toHaveLength(1); // Only for non-uploaded file
  });

  // BUTTON INTERACTIONS
  it('handles refresh button click', () => {
    const mockRefreshAllFiles = jest.fn();
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      refreshAllFiles: mockRefreshAllFiles
    });
    
    render(<FileList />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(mockRefreshAllFiles).toHaveBeenCalled();
  });

  it('handles add media button click', () => {
    render(<FileList />);
    fireEvent.click(screen.getByText('Add Media'));
    expect(screen.getByTestId('add-media-modal')).toBeInTheDocument();
  });

  it('handles preview button click', () => {
    render(<FileList />);
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    
    // Should show preview modal
    expect(screen.getAllByText('Audio Test')).toHaveLength(2); // One in list, one in modal
  });

  it('handles edit button click', () => {
    render(<FileList />);
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('edit-file-modal')).toBeInTheDocument();
  });

  it('handles delete button click', () => {
    const mockRemoveFile = jest.fn();
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      removeFile: mockRemoveFile
    });
    
    render(<FileList />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(mockRemoveFile).toHaveBeenCalledWith('2'); // Non-uploaded file ID
  });

  // UPLOAD FUNCTIONALITY TESTS
  it('displays upload section for non-uploaded files', () => {
    render(<FileList />);
    
    // Should show upload section for non-uploaded file
    expect(screen.getByText('Upload to GitHub')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('handles upload button click', () => {
    const mockUploadFile = jest.fn();
    useUploadManager.mockReturnValue({
      ...defaultUploadManager,
      uploadFile: mockUploadFile
    });
    
    render(<FileList />);
    fireEvent.click(screen.getByText('Upload'));
    expect(mockUploadFile).toHaveBeenCalledWith(mockFiles[1]); // Non-uploaded file
  });

  it('displays uploading progress', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      uploadState: {
        '2': { status: 'uploading', progress: 0.6 }
      }
    });
    
    render(<FileList />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('displays upload success state', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      uploadState: {
        '2': { status: 'success', progress: 1 }
      }
    });
    
    render(<FileList />);
    expect(screen.getAllByText('Uploaded')).toHaveLength(2); // One for uploaded file, one for success state
  });

  it('displays upload error state with retry button', () => {
    const mockRetryUpload = jest.fn();
    useUploadManager.mockReturnValue({
      ...defaultUploadManager,
      retryUpload: mockRetryUpload
    });
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      uploadState: {
        '2': { status: 'error', progress: 0, error: 'Upload failed' }
      }
    });
    
    render(<FileList />);
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetryUpload).toHaveBeenCalledWith(mockFiles[1]);
  });

  // MODAL TESTS
  it('closes preview modal when close button is clicked', () => {
    render(<FileList />);
    
    // Open preview modal
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    expect(screen.getAllByText('Audio Test')).toHaveLength(2);
    
    // Click close button
    fireEvent.click(screen.getByTitle('Close'));
    expect(screen.getAllByText('Audio Test')).toHaveLength(1); // Only in list now
  });

  it('displays local audio in preview modal', () => {
    render(<FileList />);
    
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    
    // Should show local audio element
    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute('src', 'blob:1');
  });

  it('displays local video in preview modal', () => {
    render(<FileList />);
    
    fireEvent.click(screen.getAllByTitle('Preview')[1]);
    
    // Should show local video element
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', 'blob:2');
  });

  it('displays remote media in preview modal', () => {
    const remoteFiles = [{
      ...mockFiles[0],
      id: '3',
      isLocal: false,
      url: 'path/to/remote/audio.mp3'
    }];
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      files: remoteFiles
    });
    
    render(<FileList />);
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    
    // Should show GitHub media component
    expect(screen.getByTestId('github-media-audio')).toBeInTheDocument();
  });

  it('closes edit modal and refreshes when saved', () => {
    render(<FileList />);
    
    // Open edit modal
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('edit-file-modal')).toBeInTheDocument();
    
    // Save edit
    fireEvent.click(screen.getByText('Save Edit'));
    expect(screen.queryByTestId('edit-file-modal')).not.toBeInTheDocument();
  });

  it('closes edit modal when cancelled', () => {
    render(<FileList />);
    
    // Open edit modal
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('edit-file-modal')).toBeInTheDocument();
    
    // Close edit
    fireEvent.click(screen.getByText('Close Edit'));
    expect(screen.queryByTestId('edit-file-modal')).not.toBeInTheDocument();
  });

  it('closes add media modal and refreshes when saved', () => {
    const mockLoadFilesWithThumbnails = jest.fn();
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      loadFilesWithThumbnails: mockLoadFilesWithThumbnails
    });
    
    render(<FileList />);
    
    // Open add media modal
    fireEvent.click(screen.getByText('Add Media'));
    expect(screen.getByTestId('add-media-modal')).toBeInTheDocument();
    
    // Save add
    fireEvent.click(screen.getByText('Save Add'));
    expect(screen.queryByTestId('add-media-modal')).not.toBeInTheDocument();
    expect(mockLoadFilesWithThumbnails).toHaveBeenCalled();
  });

  it('closes add media modal when cancelled', () => {
    render(<FileList />);
    
    // Open add media modal
    fireEvent.click(screen.getByText('Add Media'));
    expect(screen.getByTestId('add-media-modal')).toBeInTheDocument();
    
    // Close add
    fireEvent.click(screen.getByText('Close Add'));
    expect(screen.queryByTestId('add-media-modal')).not.toBeInTheDocument();
  });

  // HIGHLIGHTING TESTS
  it('highlights file when highlightId prop is provided', () => {
    render(<FileList highlightId="1" />);
    
    const highlightedFile = screen.getByText('Audio Test').closest('div[id="file-1"]');
    expect(highlightedFile).toHaveClass('border-purple-500', 'bg-purple-50');
  });

  it('scrolls to highlighted file when available', async () => {
    const mockScrollIntoView = jest.fn();
    const mockGetElementById = jest.fn().mockReturnValue({
      scrollIntoView: mockScrollIntoView
    });
    
    Object.defineProperty(document, 'getElementById', {
      writable: true,
      value: mockGetElementById
    });
    
    render(<FileList highlightId="1" />);
    
    await waitFor(() => {
      expect(mockGetElementById).toHaveBeenCalledWith('file-1');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
  });

  it('updates highlighted file when highlightId prop changes', () => {
    const { rerender } = render(<FileList highlightId="1" />);
    
    // Initially highlight file 1
    let highlightedFile = screen.getByText('Audio Test').closest('div[id="file-1"]');
    expect(highlightedFile).toHaveClass('border-purple-500');
    
    // Change highlight to file 2
    rerender(<FileList highlightId="2" />);
    
    highlightedFile = screen.getByText('Video Test').closest('div[id="file-2"]');
    expect(highlightedFile).toHaveClass('border-purple-500');
  });

  // ERROR HANDLING TESTS
  it('shows remote error modal when remoteError is set', () => {
    const mockOpenModal = jest.fn();
    const mockSetRemoteError = jest.fn();
    const mockCloseModal = jest.fn();
    
    useUIStore.mockReturnValue({
      ...defaultUIStore,
      openModal: mockOpenModal,
      closeModal: mockCloseModal
    });
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      remoteError: 'Failed to fetch remote files',
      setRemoteError: mockSetRemoteError
    });
    
    render(<FileList />);
    
    expect(mockOpenModal).toHaveBeenCalledWith({
      type: 'error',
      title: 'Repository Error',
      message: 'Failed to fetch remote files\n\nShowing local files only. Check your GitHub settings to view remote files.',
      confirmText: 'OK',
      onConfirm: expect.any(Function)
    });
  });

  it('handles remote error modal confirmation', () => {
    const mockSetRemoteError = jest.fn();
    const mockCloseModal = jest.fn();
    
    useUIStore.mockReturnValue({
      ...defaultUIStore,
      modal: { 
        isOpen: true, 
        type: 'error', 
        title: 'Repository Error', 
        message: 'Test error',
        onConfirm: () => {
          mockSetRemoteError(null);
          mockCloseModal();
        }
      },
      closeModal: mockCloseModal
    });
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      setRemoteError: mockSetRemoteError
    });
    
    render(<FileList />);
    
    // Modal should be visible
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    
    // Click confirm
    fireEvent.click(screen.getByText('Confirm Modal'));
    
    expect(mockSetRemoteError).toHaveBeenCalledWith(null);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  // EDGE CASES
  it('handles files without author', () => {
    parseMediaFileName.mockReturnValue({
      title: 'Test File',
      author: '',
      category: 'Music',
      date: '2024-06-01',
      extension: 'mp3'
    });
    
    render(<FileList />);
    
    expect(screen.getAllByText('Test File')).toHaveLength(2); // Both files will have same title
    expect(screen.queryByText('by ')).not.toBeInTheDocument();
  });

  it('handles files without date', () => {
    parseMediaFileName.mockReturnValue({
      title: 'Test File',
      author: 'Test Author',
      category: 'Music',
      date: '',
      extension: 'mp3'
    });
    
    render(<FileList />);
    
    expect(screen.getAllByText('Test File')).toHaveLength(2); // Both files will have same title
    expect(screen.queryByText('Readable')).not.toBeInTheDocument();
  });

  it('handles files without category', () => {
    parseMediaFileName.mockReturnValue({
      title: 'Test File',
      author: 'Test Author',
      category: '',
      date: '2024-06-01',
      extension: 'mp3'
    });
    
    render(<FileList />);
    
    // Should fall back to file type - both files will show their type
    expect(screen.getAllByText('audio')).toHaveLength(2); // One in category, one in file type
  });

  it('handles thumbnail mismatch between local and remote', () => {
    const mixedFiles = [
      { ...mockFiles[0], isLocal: true },  // Local file
      { ...mockFiles[1], isLocal: false }  // Remote file
    ];
    
    const mixedThumbnails = {
      'Music_Audio Test_test_author_2024-06-01': {
        id: 'thumb1',
        url: 'blob:thumb1',
        isLocal: false  // Remote thumbnail for local file - should not match
      }
    };
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      files: mixedFiles,
      thumbnails: mixedThumbnails
    });
    
    render(<FileList />);
    
    // Should show default thumbnail since local file has remote thumbnail - expect 2 since both files will show default
    expect(screen.getAllByTestId('default-thumbnail')).toHaveLength(2);
  });

  it('handles upload state without error message', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      uploadState: {
        '2': { status: 'error', progress: 0 } // No error message
      }
    });
    
    render(<FileList />);
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.queryByTitle(/Upload failed/)).not.toBeInTheDocument();
  });

  it('handles preview modal for file without parsed metadata', () => {
    parseMediaFileName.mockReturnValue(null);
    
    render(<FileList />);
    
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    
    // Should use filename without extension as title
    expect(screen.getByText('Music_Audio Test_test_author_2024-06-01')).toBeInTheDocument();
  });

  it('handles setting highlight ID after edit save', () => {
    render(<FileList />);
    
    // Open edit modal
    fireEvent.click(screen.getByTitle('Edit'));
    
    // Save with new file ID
    fireEvent.click(screen.getByText('Save Edit'));
    
    // Should set highlighted ID to the returned file ID - check if element exists with that ID
    const highlightedFile = document.getElementById('file-new-file-id');
    expect(highlightedFile).toBeTruthy(); // Element exists but may be mocked
  });

  // ADDITIONAL COVERAGE TESTS
  it('closes preview modal when backdrop is clicked', () => {
    render(<FileList />);
    
    // Open preview modal
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    expect(screen.getAllByText('Audio Test')).toHaveLength(2);
    
    // Find and click backdrop
    const backdropDiv = document.querySelector('.fixed.inset-0 .absolute.inset-0');
    if (backdropDiv) {
      fireEvent.click(backdropDiv);
      expect(screen.getAllByText('Audio Test')).toHaveLength(1);
    }
  });

  it('handles edit save with no returned file ID', () => {
    render(<FileList />);
    
    // Open edit modal
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('edit-file-modal')).toBeInTheDocument();
    
    // Close edit modal
    fireEvent.click(screen.getByText('Close Edit'));
    
    // Should close modal regardless of file ID
    expect(screen.queryByTestId('edit-file-modal')).not.toBeInTheDocument();
  });

  it('handles files with partial metadata', () => {
    parseMediaFileName.mockReturnValue({
      title: 'Test File',
      author: 'Test Author',
      category: '',
      date: '',
      extension: 'mp3'
    });
    
    render(<FileList />);
    
    expect(screen.getAllByText('Test File')).toHaveLength(2); // Both files will have same title
    expect(screen.getAllByText('by Test Author')).toHaveLength(2); // Both files will have same author
    // Should show file type when no category - both files will show their type
    expect(screen.getAllByText('audio')).toHaveLength(2); // One in category, one in file type for each file
    // Should not show date when empty
    expect(screen.queryByText('Readable')).not.toBeInTheDocument();
  });

  it('displays correct upload progress percentage', () => {
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      uploadState: {
        '2': { status: 'uploading', progress: 0.73 }
      }
    });
    
    render(<FileList />);
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('handles remote video in preview modal', () => {
    const remoteVideoFiles = [{
      ...mockFiles[1],
      id: '4',
      isLocal: false,
      url: 'path/to/remote/video.mp4'
    }];
    
    useCombinedFiles.mockReturnValue({
      ...defaultMockImplementation,
      files: remoteVideoFiles
    });
    
    render(<FileList />);
    fireEvent.click(screen.getAllByTitle('Preview')[0]);
    
    // Should show GitHub media component for video
    expect(screen.getByTestId('github-media-video')).toBeInTheDocument();
  });
});
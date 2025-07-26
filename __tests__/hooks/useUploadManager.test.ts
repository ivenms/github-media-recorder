import { renderHook, act, waitFor } from '@testing-library/react';
import { useUploadManager } from '../../src/hooks/useUploadManager';

// Mock dependencies
jest.mock('../../src/utils/uploadUtils', () => ({
  uploadFile: jest.fn(),
  uploadThumbnail: jest.fn(),
}));

jest.mock('../../src/utils/imageUtils', () => ({
  processThumbnailForUpload: jest.fn(),
}));

jest.mock('../../src/hooks/useCombinedFiles', () => ({
  useCombinedFiles: jest.fn(),
}));

jest.mock('../../src/stores/gitStore', () => ({
  useGitStore: jest.fn(),
}));

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

// Import mocked functions
import { uploadFile, uploadThumbnail } from '../../src/utils/uploadUtils';
import { processThumbnailForUpload } from '../../src/utils/imageUtils';
import { useCombinedFiles } from '../../src/hooks/useCombinedFiles';
import { useGitStore } from '../../src/stores/gitStore';
import { useUIStore } from '../../src/stores/uiStore';

const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;
const mockUploadThumbnail = uploadThumbnail as jest.MockedFunction<typeof uploadThumbnail>;
const mockProcessThumbnailForUpload = processThumbnailForUpload as jest.MockedFunction<typeof processThumbnailForUpload>;
const mockUseCombinedFiles = useCombinedFiles as jest.MockedFunction<typeof useCombinedFiles>;
const mockUseGitStore = useGitStore as jest.MockedFunction<typeof useGitStore>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

// Mock data
const mockFile = {
  id: 'test-file-1',
  name: 'test-audio.mp3',
  file: new Blob(['audio data'], { type: 'audio/mp3' }),
  size: 1024,
  type: 'audio/mp3',
  lastModified: Date.now(),
  isLocal: true,
  uploaded: false,
  title: 'Test Audio',
  author: 'Test Author',
  category: 'music',
} as any;

const mockThumbnail = {
  id: 'test-thumb-1',
  name: 'test-audio.jpg',
  file: new Blob(['image data'], { type: 'image/jpeg' }),
  size: 512,
  type: 'image/jpeg',
  lastModified: Date.now(),
  isLocal: true,
} as any;

describe('useUploadManager', () => {
  const mockOpenModal = jest.fn();
  const mockInvalidateCache = jest.fn();
  const mockRemoveFile = jest.fn();
  const mockSetUploadProgress = jest.fn();
  const mockForceRefreshFiles = jest.fn();
  const mockLoadFilesWithThumbnails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mocks
    mockUseUIStore.mockReturnValue({
      openModal: mockOpenModal,
    });

    mockUseGitStore.mockReturnValue({
      invalidateCache: mockInvalidateCache,
    });

    mockUseCombinedFiles.mockReturnValue({
      files: [mockFile],
      thumbnails: { 'test-audio': mockThumbnail },
      removeFile: mockRemoveFile,
      setUploadProgress: mockSetUploadProgress,
      forceRefreshFiles: mockForceRefreshFiles,
      loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
    });

    mockUploadFile.mockImplementation(async (file, progressCallback) => {
      progressCallback(0.5);
      progressCallback(1);
    });

    mockUploadThumbnail.mockImplementation(async (file, progressCallback) => {
      progressCallback(0.5);
      progressCallback(1);
    });

    mockProcessThumbnailForUpload.mockResolvedValue({
      blob: new Blob(['processed thumbnail'], { type: 'image/jpeg' }),
      filename: 'test-audio.jpg',
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return upload functions', () => {
      const { result } = renderHook(() => useUploadManager());

      expect(typeof result.current.uploadFile).toBe('function');
      expect(typeof result.current.retryUpload).toBe('function');
      expect(typeof result.current.getCurrentFiles).toBe('function');
      expect(typeof result.current.getCurrentThumbnails).toBe('function');
    });

    it('should provide current files and thumbnails', () => {
      const { result } = renderHook(() => useUploadManager());

      expect(result.current.getCurrentFiles()).toEqual([mockFile]);
      expect(result.current.getCurrentThumbnails()).toEqual({ 'test-audio': mockThumbnail });
    });
  });

  describe('File Upload', () => {
    it('should upload file successfully without thumbnail', async () => {
      // Mock no thumbnail
      mockUseCombinedFiles.mockReturnValue({
        files: [mockFile],
        thumbnails: {},
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        forceRefreshFiles: mockForceRefreshFiles,
        loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
      });

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'uploading', progress: 0 });
      expect(mockUploadFile).toHaveBeenCalledWith(
        mockFile.file,
        expect.any(Function),
        mockFile.name
      );
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });
      expect(mockUploadThumbnail).not.toHaveBeenCalled();
    });

    it('should upload file with thumbnail', async () => {
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        mockFile.file,
        expect.any(Function),
        mockFile.name
      );
      expect(mockProcessThumbnailForUpload).toHaveBeenCalledWith(
        mockThumbnail.file,
        mockFile.name
      );
      expect(mockUploadThumbnail).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(Function),
        'test-audio.jpg'
      );
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });
    });

    it('should handle upload progress correctly', async () => {
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Should have been called with progress updates
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'uploading', progress: 0 });
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'uploading', progress: 0.35 }); // 0.5 * 0.7
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'uploading', progress: 0.7 }); // 1 * 0.7
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });
    });

    it('should handle file without file data', async () => {
      const fileWithoutData = { ...mockFile, file: null };
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(fileWithoutData);
      });

      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'alert',
        message: 'File data not available for upload.',
        title: 'Upload Error'
      });
      expect(mockUploadFile).not.toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const errorMessage = 'Upload failed';
      mockUploadFile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });
    });

    it('should handle thumbnail processing errors gracefully', async () => {
      mockProcessThumbnailForUpload.mockRejectedValue(new Error('Thumbnail processing failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error processing thumbnail:', expect.any(Error));
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockUploadThumbnail).not.toHaveBeenCalled();
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });

      consoleSpy.mockRestore();
    });

    it('should cleanup after successful upload', async () => {
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Advance timers to trigger the initial cleanup timeout
      await act(async () => {
        jest.advanceTimersByTime(4000);
        // Also advance nested timeouts from refreshWithRetry
        jest.advanceTimersByTime(1500);
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockRemoveFile).toHaveBeenCalledWith(mockFile.id);
      });

      expect(mockInvalidateCache).toHaveBeenCalled();
      expect(mockForceRefreshFiles).toHaveBeenCalled();
      expect(mockLoadFilesWithThumbnails).toHaveBeenCalled();
    });

    it('should cleanup local thumbnail after upload', async () => {
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Fast-forward to trigger cleanup
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(mockRemoveFile).toHaveBeenCalledWith(mockFile.id);
        expect(mockRemoveFile).toHaveBeenCalledWith(mockThumbnail.id);
      });
    });
  });

  describe('Retry Upload', () => {
    it('should retry upload for failed files', async () => {
      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.retryUpload(mockFile);
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        mockFile.file,
        expect.any(Function),
        mockFile.name
      );
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });
    });
  });

  describe('Refresh and Retry Logic', () => {
    it('should handle refresh with retry', async () => {
      // Mock file that doesn't appear in the list after upload
      mockUseCombinedFiles.mockReturnValue({
        files: [], // Empty to simulate file not appearing
        thumbnails: {},
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        forceRefreshFiles: mockForceRefreshFiles,
        loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
      });

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Advance timers to trigger refresh retry with nested timeouts
      await act(async () => {
        jest.advanceTimersByTime(4000); // Initial cleanup timeout
        jest.advanceTimersByTime(1500); // Initial check delay
        jest.advanceTimersByTime(3000); // Retry delay
      });

      expect(mockInvalidateCache).toHaveBeenCalled();
      expect(mockForceRefreshFiles).toHaveBeenCalled();
      expect(mockLoadFilesWithThumbnails).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockForceRefreshFiles.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Fast-forward to trigger refresh
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh files:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRemoveFile.mockRejectedValue(new Error('Cleanup failed'));

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Fast-forward to trigger cleanup
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to clean up local file after upload:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('State Freshness', () => {
    it('should always return fresh files and thumbnails state', () => {
      const { result, rerender } = renderHook(() => useUploadManager());

      expect(result.current.getCurrentFiles()).toEqual([mockFile]);

      // Update mocked state
      const newFile = { ...mockFile, id: 'test-file-2' };
      mockUseCombinedFiles.mockReturnValue({
        files: [newFile],
        thumbnails: {},
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        forceRefreshFiles: mockForceRefreshFiles,
        loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
      });

      rerender();

      expect(result.current.getCurrentFiles()).toEqual([newFile]);
    });

    it('should check for uploaded files correctly', () => {
      const uploadedFile = { ...mockFile, isLocal: false, uploaded: true };
      mockUseCombinedFiles.mockReturnValue({
        files: [uploadedFile],
        thumbnails: {},
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        forceRefreshFiles: mockForceRefreshFiles,
        loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
      });

      const { result } = renderHook(() => useUploadManager());

      // Access the internal checkForUploadedFile logic through getCurrentFiles
      const files = result.current.getCurrentFiles();
      const uploadedFiles = files.filter(f => 
        f.name === mockFile.name && !f.isLocal && f.uploaded
      );

      expect(uploadedFiles.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-Error exceptions in upload', async () => {
      mockUploadFile.mockRejectedValue('String error');

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, {
        status: 'error',
        progress: 0,
        error: 'Upload failed'
      });
    });

    it('should handle missing thumbnail file', async () => {
      const thumbnailWithoutFile = { ...mockThumbnail, file: null };
      mockUseCombinedFiles.mockReturnValue({
        files: [mockFile],
        thumbnails: { 'test-audio': thumbnailWithoutFile },
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        forceRefreshFiles: mockForceRefreshFiles,
        loadFilesWithThumbnails: mockLoadFilesWithThumbnails,
      });

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      expect(mockProcessThumbnailForUpload).not.toHaveBeenCalled();
      expect(mockUploadThumbnail).not.toHaveBeenCalled();
      expect(mockSetUploadProgress).toHaveBeenCalledWith(mockFile.id, { status: 'success', progress: 1 });
    });

    it('should handle thumbnail cleanup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRemoveFile.mockImplementation((id) => {
        if (id === mockThumbnail.id) {
          throw new Error('Thumbnail cleanup failed');
        }
        return Promise.resolve();
      });

      const { result } = renderHook(() => useUploadManager());

      await act(async () => {
        await result.current.uploadFile(mockFile);
      });

      // Fast-forward to trigger cleanup
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to clean up local thumbnail:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
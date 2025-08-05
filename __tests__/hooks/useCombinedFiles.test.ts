import { renderHook, act, waitFor } from '@testing-library/react';
import { useCombinedFiles } from '../../src/hooks/useCombinedFiles';
import type { FileRecord, EnhancedFileRecord } from '../../src/types';

// Mock dependencies
jest.mock('../../src/stores/filesStore', () => ({
  useFilesStore: jest.fn(),
}));

jest.mock('../../src/stores/gitStore', () => ({
  useGitStore: jest.fn(),
}));

import { useFilesStore } from '../../src/stores/filesStore';
import { useGitStore } from '../../src/stores/gitStore';

const mockUseFilesStore = useFilesStore as jest.MockedFunction<typeof useFilesStore>;
const mockUseGitStore = useGitStore as jest.MockedFunction<typeof useGitStore>;

// Mock data
const mockMediaFile: EnhancedFileRecord = {
  id: 'media-1',
  name: 'test-audio.mp3',
  type: 'audio',
  mimeType: 'audio/mp3',
  size: 1024,
  duration: 120,
  created: Date.now(),
  file: new Blob(['audio data'], { type: 'audio/mp3' }),
  url: 'blob:audio-url',
  isLocal: true,
  uploaded: false,
};

const mockLocalThumbnail: FileRecord = {
  id: 'thumb-1',
  name: 'test-audio.jpg',
  type: 'thumbnail',
  mimeType: 'image/jpeg',
  size: 256,
  duration: 0,
  created: Date.now(),
  file: new Blob(['thumbnail data'], { type: 'image/jpeg' }),
  url: 'blob:thumb-url',
};

const mockRemoteThumbnails = {
  'remote-audio': {
    url: 'https://github.com/user/repo/raw/main/thumbnails/remote-audio.jpg',
    size: 512,
  },
};

describe('useCombinedFiles', () => {
  const mockLoadFiles = jest.fn();
  const mockRemoveFile = jest.fn();
  const mockSetUploadProgress = jest.fn();
  const mockRefreshFiles = jest.fn();
  const mockSetRemoteError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseFilesStore.mockReturnValue({
      files: [mockMediaFile],
      localFiles: [mockMediaFile, mockLocalThumbnail],
      uploadState: {},
      isLoading: false,
      remoteError: null,
      loadFiles: mockLoadFiles,
      removeFile: mockRemoveFile,
      setUploadProgress: mockSetUploadProgress,
      refreshFiles: mockRefreshFiles,
      setRemoteError: mockSetRemoteError,
    });

    mockUseGitStore.mockReturnValue({
      remoteThumbnails: mockRemoteThumbnails,
    });

    mockLoadFiles.mockResolvedValue(undefined);
    mockRefreshFiles.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.files).toEqual([mockMediaFile]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.remoteError).toBeNull();
      expect(result.current.uploadState).toEqual({});
      expect(typeof result.current.loadFilesWithThumbnails).toBe('function');
      expect(typeof result.current.refreshAllFiles).toBe('function');
      expect(typeof result.current.forceRefreshFiles).toBe('function');
      expect(typeof result.current.removeFile).toBe('function');
      expect(typeof result.current.setUploadProgress).toBe('function');
      expect(typeof result.current.setRemoteError).toBe('function');
      expect(typeof result.current.getCurrentFiles).toBe('function');
      expect(typeof result.current.getCurrentThumbnails).toBe('function');
    });

    it('should load files on mount', async () => {
      renderHook(() => useCombinedFiles());

      await waitFor(() => {
        expect(mockLoadFiles).toHaveBeenCalled();
      });
    });
  });

  describe('Thumbnail Loading', () => {
    it('should load local thumbnails correctly', () => {
      const { result } = renderHook(() => useCombinedFiles());

      // Should include both local and remote thumbnails
      expect(result.current.thumbnails).toEqual(
        expect.objectContaining({
          'test-audio': expect.objectContaining({
            id: 'thumb-1',
            name: 'test-audio.jpg',
            type: 'thumbnail',
            isLocal: true,
          }),
          'remote-audio': expect.objectContaining({
            id: 'remote-thumb-remote-audio',
            name: 'remote-audio.jpg',
            type: 'thumbnail',
            isLocal: false,
          }),
        })
      );
    });

    it('should load remote thumbnails correctly', () => {
      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.thumbnails).toEqual(
        expect.objectContaining({
          'remote-audio': expect.objectContaining({
            id: 'remote-thumb-remote-audio',
            name: 'remote-audio.jpg',
            type: 'thumbnail',
            url: 'https://github.com/user/repo/raw/main/thumbnails/remote-audio.jpg',
            isLocal: false,
          }),
        })
      );
    });

    it('should combine local and remote thumbnails', () => {
      const { result } = renderHook(() => useCombinedFiles());

      expect(Object.keys(result.current.thumbnails)).toContain('test-audio');
      expect(Object.keys(result.current.thumbnails)).toContain('remote-audio');
      expect(result.current.thumbnails['test-audio'].isLocal).toBe(true);
      expect(result.current.thumbnails['remote-audio'].isLocal).toBe(false);
    });

    it('should extract base name from thumbnail filename', () => {
      const thumbnailWithExtension: FileRecord = {
        ...mockLocalThumbnail,
        id: 'thumb-2',
        name: 'my-file.test.jpg',
      };

      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile, thumbnailWithExtension],
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.thumbnails).toEqual(
        expect.objectContaining({
          'my-file.test': expect.objectContaining({
            name: 'my-file.test.jpg',
            isLocal: true,
          }),
        })
      );
    });

    it('should handle files without thumbnails', () => {
      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile], // No thumbnail
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      mockUseGitStore.mockReturnValue({
        remoteThumbnails: {}, // No remote thumbnails
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.thumbnails).toEqual({});
    });

    it('should update thumbnails when mediaFiles change', () => {
      const { result, rerender } = renderHook(() => useCombinedFiles());

      // Initial state
      expect(Object.keys(result.current.thumbnails)).toContain('test-audio');

      // Update mock to remove thumbnails
      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile], // No thumbnail
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      mockUseGitStore.mockReturnValue({
        remoteThumbnails: {},
      });

      rerender();

      expect(result.current.thumbnails).toEqual({});
    });

    it('should update thumbnails when remoteThumbnails change', () => {
      const { result, rerender } = renderHook(() => useCombinedFiles());

      // Initial state has remote thumbnails
      expect(Object.keys(result.current.thumbnails)).toContain('remote-audio');

      // Update mock to add more remote thumbnails
      mockUseGitStore.mockReturnValue({
        remoteThumbnails: {
          ...mockRemoteThumbnails,
          'new-remote': {
            url: 'https://github.com/user/repo/raw/main/thumbnails/new-remote.jpg',
            size: 256,
          },
        },
      });

      rerender();

      expect(Object.keys(result.current.thumbnails)).toContain('remote-audio');
      expect(Object.keys(result.current.thumbnails)).toContain('new-remote');
    });

    it('should not load thumbnails when still loading', () => {
      mockUseFilesStore.mockReturnValue({
        files: [],
        localFiles: [],
        uploadState: {},
        isLoading: true, // Still loading
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.thumbnails).toEqual({});
    });

    it('should load thumbnails when not loading even with empty files', () => {
      mockUseFilesStore.mockReturnValue({
        files: [], // Empty files
        localFiles: [],
        uploadState: {},
        isLoading: false, // Not loading
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      // Should attempt to load (even though they'll be empty)
      expect(result.current.thumbnails).toEqual(
        expect.objectContaining({
          'remote-audio': expect.any(Object),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle thumbnail loading errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock a scenario that would cause an error
      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [
          {
            ...mockLocalThumbnail,
            name: null as unknown as string, // Invalid name that might cause error
          },
        ],
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      // Should not crash and should log error
      expect(result.current.thumbnails).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading thumbnails:', expect.any(TypeError));

      consoleSpy.mockRestore();
    });

    it('should handle loadFiles errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLoadFiles.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.loadFilesWithThumbnails();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error loading files:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('File Operations', () => {
    it('should call loadFiles when loadFilesWithThumbnails is called', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.loadFilesWithThumbnails();
      });

      expect(mockLoadFiles).toHaveBeenCalled();
    });

    it('should call refreshFiles when refreshAllFiles is called', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.refreshAllFiles();
      });

      expect(mockRefreshFiles).toHaveBeenCalled();
    });

    it('should call refreshFiles when forceRefreshFiles is called', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.forceRefreshFiles();
      });

      expect(mockRefreshFiles).toHaveBeenCalled();
    });

    it('should pass through removeFile calls', () => {
      const { result } = renderHook(() => useCombinedFiles());

      result.current.removeFile('test-id');

      expect(mockRemoveFile).toHaveBeenCalledWith('test-id');
    });

    it('should pass through setUploadProgress calls', () => {
      const { result } = renderHook(() => useCombinedFiles());
      const progressData = { status: 'uploading', progress: 0.5 };

      result.current.setUploadProgress('test-id', progressData);

      expect(mockSetUploadProgress).toHaveBeenCalledWith('test-id', progressData);
    });

    it('should pass through setRemoteError calls', () => {
      const { result } = renderHook(() => useCombinedFiles());

      result.current.setRemoteError('Test error');

      expect(mockSetRemoteError).toHaveBeenCalledWith('Test error');
    });
  });

  describe('Fresh State Access', () => {
    it('should return current files through getCurrentFiles', () => {
      const { result } = renderHook(() => useCombinedFiles());

      const currentFiles = result.current.getCurrentFiles();

      expect(currentFiles).toEqual([mockMediaFile]);
    });

    it('should return current thumbnails through getCurrentThumbnails', () => {
      const { result } = renderHook(() => useCombinedFiles());

      const currentThumbnails = result.current.getCurrentThumbnails();

      expect(currentThumbnails).toEqual(
        expect.objectContaining({
          'test-audio': expect.objectContaining({
            isLocal: true,
          }),
          'remote-audio': expect.objectContaining({
            isLocal: false,
          }),
        })
      );
    });

    it('should maintain fresh state even with async operations', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      // Simulate async operation
      await act(async () => {
        await result.current.refreshAllFiles();
      });

      // State should still be fresh
      const currentFiles = result.current.getCurrentFiles();
      expect(currentFiles).toEqual([mockMediaFile]);
    });

    it('should update refs when files change', () => {
      const { result, rerender } = renderHook(() => useCombinedFiles());

      const initialFiles = result.current.getCurrentFiles();
      expect(initialFiles).toEqual([mockMediaFile]);

      // Change mock data
      const newMediaFile: EnhancedFileRecord = {
        ...mockMediaFile,
        id: 'media-2',
        name: 'new-audio.mp3',
      };

      mockUseFilesStore.mockReturnValue({
        files: [newMediaFile],
        localFiles: [newMediaFile],
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      rerender();

      const updatedFiles = result.current.getCurrentFiles();
      expect(updatedFiles).toEqual([newMediaFile]);
    });

    it('should update refs when thumbnails change', () => {
      const { result, rerender } = renderHook(() => useCombinedFiles());

      const initialThumbnails = result.current.getCurrentThumbnails();
      expect(Object.keys(initialThumbnails)).toContain('test-audio');

      // Change mock data
      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile], // No thumbnail
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      mockUseGitStore.mockReturnValue({
        remoteThumbnails: {}, // No remote thumbnails
      });

      rerender();

      const updatedThumbnails = result.current.getCurrentThumbnails();
      expect(updatedThumbnails).toEqual({});
    });
  });

  describe('Force Re-render Mechanism', () => {
    it('should provide forceRefreshFiles that triggers re-render', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.forceRefreshFiles();
      });

      expect(mockRefreshFiles).toHaveBeenCalled();
    });

    it('should handle forceRefreshFiles with refreshAllFiles', async () => {
      const { result } = renderHook(() => useCombinedFiles());

      await act(async () => {
        await result.current.refreshAllFiles();
      });

      expect(mockRefreshFiles).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should reflect loading state from store', () => {
      mockUseFilesStore.mockReturnValue({
        files: [],
        localFiles: [],
        uploadState: {},
        isLoading: true,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect remote error from store', () => {
      const testError = 'Test error message';
      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile],
        uploadState: {},
        isLoading: false,
        remoteError: testError,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.remoteError).toBe(testError);
    });

    it('should reflect upload state from store', () => {
      const testUploadState = {
        'file-1': { status: 'uploading', progress: 0.5 },
        'file-2': { status: 'success', progress: 1 },
      };

      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile],
        uploadState: testUploadState,
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.uploadState).toBe(testUploadState);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files array', () => {
      mockUseFilesStore.mockReturnValue({
        files: [],
        localFiles: [],
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.files).toEqual([]);
      expect(result.current.getCurrentFiles()).toEqual([]);
    });

    it('should handle null/undefined remote thumbnails', () => {
      mockUseGitStore.mockReturnValue({
        remoteThumbnails: null as unknown as Record<string, import('../../src/types').FileRecord>,
      });

      const { result } = renderHook(() => useCombinedFiles());

      // Should not crash
      expect(result.current.thumbnails).toBeDefined();
    });

    it('should handle malformed thumbnail objects', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockUseGitStore.mockReturnValue({
        remoteThumbnails: {
          'malformed': null as unknown as import('../../src/types').FileRecord, // Malformed thumbnail data
        },
      });

      const { result } = renderHook(() => useCombinedFiles());

      // Should handle gracefully
      expect(result.current.thumbnails).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('should handle files with special characters in names', () => {
      const specialFile: FileRecord = {
        ...mockLocalThumbnail,
        id: 'special-thumb',
        name: 'file with spaces & symbols (1).jpg',
      };

      mockUseFilesStore.mockReturnValue({
        files: [mockMediaFile],
        localFiles: [mockMediaFile, specialFile],
        uploadState: {},
        isLoading: false,
        remoteError: null,
        loadFiles: mockLoadFiles,
        removeFile: mockRemoveFile,
        setUploadProgress: mockSetUploadProgress,
        refreshFiles: mockRefreshFiles,
        setRemoteError: mockSetRemoteError,
      });

      const { result } = renderHook(() => useCombinedFiles());

      expect(result.current.thumbnails).toEqual(
        expect.objectContaining({
          'file with spaces & symbols (1)': expect.objectContaining({
            name: 'file with spaces & symbols (1).jpg',
            isLocal: true,
          }),
        })
      );
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useCombinedFiles());

      const firstLoadFiles = result.current.loadFilesWithThumbnails;
      const firstRefreshFiles = result.current.refreshAllFiles;
      const firstGetCurrentFiles = result.current.getCurrentFiles;

      rerender();

      expect(result.current.loadFilesWithThumbnails).toBe(firstLoadFiles);
      expect(result.current.refreshAllFiles).toBe(firstRefreshFiles);
      expect(result.current.getCurrentFiles).toBe(firstGetCurrentFiles);
    });

    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useCombinedFiles());

      // Should not throw any errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
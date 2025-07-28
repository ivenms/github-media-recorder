import { act, renderHook } from '@testing-library/react';
import type { FileRecord, EnhancedFileRecord, FileMetadata } from '../../src/types';

// Mock dependencies
jest.mock('../../src/stores/gitStore', () => ({
  useGitStore: {
    getState: jest.fn(() => ({
      fetchRemoteFiles: jest.fn(),
      remoteFiles: [],
    })),
  },
}));

jest.mock('../../src/utils/persistentStorage', () => ({
  createFileRecord: jest.fn(),
  restoreFileRecord: jest.fn(),
  cleanupBlobUrls: jest.fn(),
}));

jest.mock('../../src/utils/fileDeduplication', () => ({
  combineAndDeduplicateFiles: jest.fn(),
  findFilesToRemove: jest.fn(),
}));

// Import after mocking
import { useFilesStore } from '../../src/stores/filesStore';
import { useGitStore } from '../../src/stores/gitStore';
import { createFileRecord, restoreFileRecord, cleanupBlobUrls } from '../../src/utils/persistentStorage';
import { combineAndDeduplicateFiles, findFilesToRemove } from '../../src/utils/fileDeduplication';

const mockUseGitStore = useGitStore as jest.Mocked<typeof useGitStore>;
const mockCreateFileRecord = createFileRecord as jest.MockedFunction<typeof createFileRecord>;
const mockRestoreFileRecord = restoreFileRecord as jest.MockedFunction<typeof restoreFileRecord>;
const mockCleanupBlobUrls = cleanupBlobUrls as jest.MockedFunction<typeof cleanupBlobUrls>;
const mockCombineAndDeduplicateFiles = combineAndDeduplicateFiles as jest.MockedFunction<typeof combineAndDeduplicateFiles>;
const mockFindFilesToRemove = findFilesToRemove as jest.MockedFunction<typeof findFilesToRemove>;

// Mock data
const mockFileRecord = {
  id: 'test-file-1',
  name: 'test-audio.mp3',
  file: new Blob(['audio data'], { type: 'audio/mp3' }),
  url: 'blob://test-url',
  type: 'audio',
  mimeType: 'audio/mp3',
  size: 1024,
  duration: 180,
  created: Date.now(),
  uploaded: false,
} as FileRecord;

const mockEnhancedFile = {
  ...mockFileRecord,
  isLocal: true,
} as EnhancedFileRecord;

describe('filesStore', () => {
  const mockFetchRemoteFiles = jest.fn();
  const mockGitStoreState = {
    fetchRemoteFiles: mockFetchRemoteFiles,
    remoteFiles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUseGitStore.getState.mockReturnValue(mockGitStoreState);
    mockCreateFileRecord.mockResolvedValue(mockFileRecord);
    mockRestoreFileRecord.mockResolvedValue(mockFileRecord);
    mockCleanupBlobUrls.mockResolvedValue(undefined);
    mockCombineAndDeduplicateFiles.mockReturnValue([mockEnhancedFile]);
    mockFindFilesToRemove.mockReturnValue({
      filesToRemove: ['test-file-1'],
      cleanup: [mockFileRecord],
    });

    // Reset store state
    useFilesStore.setState({
      files: [],
      localFiles: [],
      isLoading: false,
      uploadState: {},
      lastRefresh: 0,
      remoteError: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useFilesStore());

      expect(result.current.files).toEqual([]);
      expect(result.current.localFiles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.uploadState).toEqual({});
      expect(result.current.lastRefresh).toBe(0);
      expect(result.current.remoteError).toBeNull();
      expect(typeof result.current.loadFiles).toBe('function');
      expect(typeof result.current.getCombinedFiles).toBe('function');
      expect(typeof result.current.addFile).toBe('function');
      expect(typeof result.current.saveFile).toBe('function');
      expect(typeof result.current.removeFile).toBe('function');
      expect(typeof result.current.updateFile).toBe('function');
      expect(typeof result.current.updateFileWithThumbnail).toBe('function');
      expect(typeof result.current.setUploadProgress).toBe('function');
      expect(typeof result.current.clearUploadProgress).toBe('function');
      expect(typeof result.current.refreshFiles).toBe('function');
      expect(typeof result.current.setRemoteError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('File Management', () => {
    it('should add file', () => {
      const { result } = renderHook(() => useFilesStore());

      act(() => {
        result.current.addFile(mockFileRecord);
      });

      expect(result.current.localFiles).toHaveLength(1);
      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0]).toEqual(mockEnhancedFile);
    });

    it('should save file', async () => {
      const { result } = renderHook(() => useFilesStore());

      const blob = new Blob(['test content'], { type: 'text/plain' });
      const metadata = {
        name: 'test.txt',
        type: 'document',
        mimeType: 'text/plain',
        size: 12,
        duration: 0,
        created: Date.now(),
      } as FileMetadata;

      let savedFile: FileRecord;
      await act(async () => {
        savedFile = await result.current.saveFile(blob, metadata);
      });

      expect(mockCreateFileRecord).toHaveBeenCalledWith(blob, metadata);
      expect(savedFile).toEqual(mockFileRecord);
      expect(result.current.localFiles).toHaveLength(1);
    });

    it('should handle save file errors', async () => {
      const error = new Error('Save failed');
      mockCreateFileRecord.mockRejectedValue(error);

      const { result } = renderHook(() => useFilesStore());

      const blob = new Blob(['test content'], { type: 'text/plain' });
      const metadata = {
        name: 'test.txt',
        type: 'document',
        mimeType: 'text/plain',
        size: 12,
        duration: 0,
        created: Date.now(),
      } as FileMetadata;

      await expect(act(async () => {
        await result.current.saveFile(blob, metadata);
      })).rejects.toThrow('Save failed');

      expect(result.current.localFiles).toHaveLength(0);
    });

    it('should remove file', async () => {
      const { result } = renderHook(() => useFilesStore());

      // Add file first
      act(() => {
        result.current.addFile(mockFileRecord);
      });

      expect(result.current.localFiles).toHaveLength(1);

      // Remove file
      await act(async () => {
        await result.current.removeFile('test-file-1');
      });

      expect(mockFindFilesToRemove).toHaveBeenCalledWith(expect.any(Array), 'test-file-1');
      expect(mockCleanupBlobUrls).toHaveBeenCalledWith([mockFileRecord]);
      expect(result.current.localFiles).toHaveLength(0);
      expect(result.current.files).toHaveLength(0);
    });

    it('should update file', () => {
      const { result } = renderHook(() => useFilesStore());

      // Add file first
      act(() => {
        result.current.addFile(mockFileRecord);
      });

      // Update file
      act(() => {
        result.current.updateFile('test-file-1', { name: 'updated-name.mp3' });
      });

      expect(result.current.localFiles[0].name).toBe('updated-name.mp3');
      expect(result.current.files[0].name).toBe('updated-name.mp3');
    });
  });

  describe('Upload Progress', () => {
    it('should set upload progress', () => {
      const { result } = renderHook(() => useFilesStore());

      const progress = {
        status: 'uploading' as const,
        progress: 0.5,
      };

      act(() => {
        result.current.setUploadProgress('test-file-1', progress);
      });

      expect(result.current.uploadState['test-file-1']).toEqual(progress);
    });

    it('should update file upload status on success', () => {
      const { result } = renderHook(() => useFilesStore());

      // Add file first
      act(() => {
        result.current.addFile(mockFileRecord);
      });

      const successProgress = {
        status: 'success' as const,
        progress: 1,
      };

      act(() => {
        result.current.setUploadProgress('test-file-1', successProgress);
      });

      expect(result.current.uploadState['test-file-1']).toEqual(successProgress);
      expect(result.current.localFiles[0].uploaded).toBe(true);
      expect(result.current.files[0].uploaded).toBe(true);
    });

    it('should clear upload progress', () => {
      const { result } = renderHook(() => useFilesStore());

      // Set progress first
      act(() => {
        result.current.setUploadProgress('test-file-1', { status: 'uploading', progress: 0.5 });
      });

      expect(result.current.uploadState['test-file-1']).toBeDefined();

      // Clear progress
      act(() => {
        result.current.clearUploadProgress('test-file-1');
      });

      expect(result.current.uploadState['test-file-1']).toBeUndefined();
    });
  });

  describe('Load Files', () => {
    it('should load files successfully', async () => {
      const { result } = renderHook(() => useFilesStore());

      await act(async () => {
        await result.current.loadFiles();
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockFetchRemoteFiles).toHaveBeenCalled();
      expect(mockCombineAndDeduplicateFiles).toHaveBeenCalled();
      expect(result.current.lastRefresh).toBeGreaterThan(0);
    });

    it('should handle remote fetch errors gracefully', async () => {
      const error = new Error('Remote fetch failed');
      mockFetchRemoteFiles.mockRejectedValue(error);

      const { result } = renderHook(() => useFilesStore());

      await act(async () => {
        await result.current.loadFiles();
      });

      expect(result.current.remoteError).toBe('Remote fetch failed');
      expect(result.current.isLoading).toBe(false);
      // Should still process local files
      expect(mockCombineAndDeduplicateFiles).toHaveBeenCalled();
    });

    it('should prevent duplicate loading calls', async () => {
      const { result } = renderHook(() => useFilesStore());

      // Start loading
      const promise1 = act(async () => {
        await result.current.loadFiles();
      });

      // Try to load again while first is still in progress
      const promise2 = act(async () => {
        await result.current.loadFiles();
      });

      await Promise.all([promise1, promise2]);

      // fetchRemoteFiles should only be called once
      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Files', () => {
    it('should refresh files with force refresh', async () => {
      const { result } = renderHook(() => useFilesStore());

      await act(async () => {
        await result.current.refreshFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledWith(true); // Force refresh
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle refresh errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFetchRemoteFiles.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useFilesStore());

      await act(async () => {
        await result.current.refreshFiles();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh files:', expect.any(Error));
      expect(result.current.isLoading).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Remote Error Management', () => {
    it('should set remote error', () => {
      const { result } = renderHook(() => useFilesStore());

      act(() => {
        result.current.setRemoteError('Test error');
      });

      expect(result.current.remoteError).toBe('Test error');
    });

    it('should clear remote error', () => {
      const { result } = renderHook(() => useFilesStore());

      // Set error first
      act(() => {
        result.current.setRemoteError('Test error');
      });

      expect(result.current.remoteError).toBe('Test error');

      // Clear error
      act(() => {
        result.current.setRemoteError(null);
      });

      expect(result.current.remoteError).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset all state and cleanup resources', async () => {
      const { result } = renderHook(() => useFilesStore());

      // Set some state
      act(() => {
        result.current.addFile(mockFileRecord);
        result.current.setUploadProgress('test-file-1', { status: 'uploading', progress: 0.5 });
        result.current.setRemoteError('Test error');
      });

      // Verify state has changed
      expect(result.current.localFiles).toHaveLength(1);
      expect(result.current.uploadState['test-file-1']).toBeDefined();
      expect(result.current.remoteError).toBe('Test error');

      // Reset
      await act(async () => {
        await result.current.reset();
      });

      expect(mockCleanupBlobUrls).toHaveBeenCalledWith(expect.any(Array));
      expect(result.current.files).toEqual([]);
      expect(result.current.localFiles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.uploadState).toEqual({});
      expect(result.current.lastRefresh).toBe(0);
      expect(result.current.remoteError).toBeNull();
    });
  });

  describe('Combined Files', () => {
    it('should get combined files', () => {
      const { result } = renderHook(() => useFilesStore());

      // Add some files
      act(() => {
        result.current.addFile(mockFileRecord);
      });

      const combinedFiles = result.current.getCombinedFiles();
      expect(combinedFiles).toEqual(result.current.files);
    });
  });

  describe('File Update with Thumbnail', () => {
    it('should update file with new thumbnail', async () => {
      const { result } = renderHook(() => useFilesStore());

      // Add file first
      act(() => {
        result.current.addFile(mockFileRecord);
      });

      const thumbnailFile = new File(['thumbnail data'], 'thumbnail.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.updateFileWithThumbnail('test-file-1', 'new-name.mp3', thumbnailFile);
      });

      expect(mockCreateFileRecord).toHaveBeenCalledWith(
        thumbnailFile,
        expect.objectContaining({
          name: 'new-name.jpg',
          type: 'thumbnail',
          mimeType: 'image/jpeg',
        })
      );
    });

    it('should handle file not found error', async () => {
      const { result } = renderHook(() => useFilesStore());

      await expect(act(async () => {
        await result.current.updateFileWithThumbnail('nonexistent-file', 'new-name.mp3');
      })).rejects.toThrow('File not found');
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const { result: filesResult } = renderHook(() => 
        useFilesStore((state) => state.files)
      );
      const { result: loadingResult } = renderHook(() => 
        useFilesStore((state) => state.isLoading)
      );

      expect(filesResult.current).toEqual([]);
      expect(loadingResult.current).toBe(false);

      act(() => {
        useFilesStore.getState().addFile(mockFileRecord);
      });

      expect(filesResult.current).toHaveLength(1);
    });

    it('should allow selecting computed values', () => {
      const { result } = renderHook(() => 
        useFilesStore((state) => ({
          hasFiles: state.files.length > 0,
          hasError: state.remoteError !== null,
          uploadCount: Object.keys(state.uploadState).length,
        }))
      );

      expect(result.current.hasFiles).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.uploadCount).toBe(0);

      act(() => {
        useFilesStore.getState().addFile(mockFileRecord);
        useFilesStore.getState().setRemoteError('Test error');
        useFilesStore.getState().setUploadProgress('file-1', { status: 'uploading', progress: 0.5 });
      });

      expect(result.current.hasFiles).toBe(true);
      expect(result.current.hasError).toBe(true);
      expect(result.current.uploadCount).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete file workflow', async () => {
      const { result } = renderHook(() => useFilesStore());

      // Save new file
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const metadata = {
        name: 'test.txt',
        type: 'document',
        mimeType: 'text/plain',
        size: 12,
        duration: 0,
        created: Date.now(),
      } as FileMetadata;

      await act(async () => {
        await result.current.saveFile(blob, metadata);
      });

      expect(result.current.localFiles).toHaveLength(1);

      // Update file
      act(() => {
        result.current.updateFile(mockFileRecord.id, { name: 'updated.txt' });
      });

      expect(result.current.localFiles[0].name).toBe('updated.txt');

      // Set upload progress
      act(() => {
        result.current.setUploadProgress(mockFileRecord.id, { status: 'uploading', progress: 0.8 });
      });

      expect(result.current.uploadState[mockFileRecord.id].progress).toBe(0.8);

      // Complete upload
      act(() => {
        result.current.setUploadProgress(mockFileRecord.id, { status: 'success', progress: 1 });
      });

      expect(result.current.localFiles[0].uploaded).toBe(true);

      // Remove file
      await act(async () => {
        await result.current.removeFile(mockFileRecord.id);
      });

      expect(result.current.localFiles).toHaveLength(0);
    });
  });
});
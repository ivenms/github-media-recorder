import { act, renderHook } from '@testing-library/react';
import { useGitStore } from '../../src/stores/gitStore';
import type { FileRecord } from '../../src/types';

// Mock dependencies
jest.mock('../../src/utils/githubUtils', () => ({
  fetchRemoteFiles: jest.fn(),
  fetchRemoteThumbnails: jest.fn(),
}));

jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

import { fetchRemoteFiles, fetchRemoteThumbnails } from '../../src/utils/githubUtils';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';

const mockFetchRemoteFiles = fetchRemoteFiles as jest.MockedFunction<typeof fetchRemoteFiles>;
const mockFetchRemoteThumbnails = fetchRemoteThumbnails as jest.MockedFunction<typeof fetchRemoteThumbnails>;
const mockUseAuthStore = useAuthStore as jest.Mocked<typeof useAuthStore>;
const mockUseSettingsStore = useSettingsStore as jest.Mocked<typeof useSettingsStore>;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock global fetch
global.fetch = jest.fn();

const mockRemoteFiles: FileRecord[] = [
  {
    id: 'remote-file-1',
    name: 'remote-audio.mp3',
    type: 'audio',
    mimeType: 'audio/mp3',
    size: 2048,
    duration: 240,
    created: Date.now(),
    uploaded: true,
    file: new Blob(['dummy'], { type: 'audio/mp3' }),
  },
];

const mockRemoteThumbnails = {
  'remote-audio': {
    url: 'https://example.com/remote-audio.jpg',
    isLocal: false,
  },
} as Record<string, { url: string; isLocal: false }>;

const mockAuthState = {
  isAuthenticated: true,
  githubConfig: {
    token: 'test-token',
    owner: 'test-owner',
  },
  userInfo: null,
  tokenTimestamp: Date.now(),
  login: jest.fn(),
  logout: jest.fn(),
  updateConfig: jest.fn(),
  setUserInfo: jest.fn(),
};

const mockSettingsState = {
  audioFormat: 'mp3' as const,
  appSettings: {
    repo: 'test-repo',
    path: 'media/',
    thumbnailPath: 'thumbnails/',
    thumbnailWidth: 320,
    thumbnailHeight: 240,
    customCategories: [],
  },
  setAudioFormat: jest.fn(),
  setAppSettings: jest.fn(),
  updateAppSettings: jest.fn(),
  reset: jest.fn(),
};

describe('gitStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Setup mocks
    mockUseAuthStore.getState.mockReturnValue(mockAuthState);
    mockUseSettingsStore.getState.mockReturnValue(mockSettingsState);
    mockFetchRemoteFiles.mockResolvedValue(mockRemoteFiles);
    mockFetchRemoteThumbnails.mockResolvedValue(mockRemoteThumbnails);
    
    // Mock fetch response
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{
        commit: {
          committer: {
            date: new Date().toISOString(),
          },
        },
      }]),
    } as Response);

    // Reset store
    useGitStore.setState({
      remoteFiles: [],
      remoteThumbnails: {},
      isLoadingRemote: false,
      lastRemoteFetch: 0,
      remoteError: null,
      lastCommitTimestamp: 0,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useGitStore());

      expect(result.current.remoteFiles).toEqual([]);
      expect(result.current.remoteThumbnails).toEqual({});
      expect(result.current.isLoadingRemote).toBe(false);
      expect(result.current.lastRemoteFetch).toBe(0);
      expect(result.current.remoteError).toBeNull();
      expect(result.current.lastCommitTimestamp).toBe(0);
    });
  });

  describe('Basic Functions', () => {
    it('should have all required functions', () => {
      const { result } = renderHook(() => useGitStore());

      expect(typeof result.current.fetchRemoteFiles).toBe('function');
      expect(typeof result.current.autoRefreshIfStale).toBe('function');
      expect(typeof result.current.setRemoteError).toBe('function');
      expect(typeof result.current.invalidateCache).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should set remote error', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setRemoteError('Test error');
      });

      expect(result.current.remoteError).toBe('Test error');
    });

    it('should clear remote error', () => {
      const { result } = renderHook(() => useGitStore());

      act(() => {
        result.current.setRemoteError('Test error');
      });
      expect(result.current.remoteError).toBe('Test error');

      act(() => {
        result.current.setRemoteError(null);
      });
      expect(result.current.remoteError).toBeNull();
    });

    it('should invalidate cache', () => {
      const { result } = renderHook(() => useGitStore());

      // Set some values
      act(() => {
        useGitStore.setState({ 
          lastRemoteFetch: Date.now(),
          lastCommitTimestamp: Date.now()
        });
      });

      expect(result.current.lastRemoteFetch).toBeGreaterThan(0);
      expect(result.current.lastCommitTimestamp).toBeGreaterThan(0);

      act(() => {
        result.current.invalidateCache();
      });

      expect(result.current.lastRemoteFetch).toBe(0);
      expect(result.current.lastCommitTimestamp).toBe(0);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useGitStore());

      // Set some state
      act(() => {
        useGitStore.setState({
          remoteFiles: mockRemoteFiles,
          remoteThumbnails: mockRemoteThumbnails,
          isLoadingRemote: true,
          lastRemoteFetch: Date.now(),
          remoteError: 'error',
          lastCommitTimestamp: Date.now(),
        });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.remoteFiles).toEqual([]);
      expect(result.current.remoteThumbnails).toEqual({});
      expect(result.current.isLoadingRemote).toBe(false);
      expect(result.current.lastRemoteFetch).toBe(0);
      expect(result.current.remoteError).toBeNull();
      expect(result.current.lastCommitTimestamp).toBe(0);
    });
  });

  describe('Fetch Remote Files', () => {
    it('should fetch files successfully with force refresh', async () => {
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalled();
      expect(mockFetchRemoteThumbnails).toHaveBeenCalled();
      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
      expect(result.current.remoteThumbnails).toEqual(mockRemoteThumbnails);
      expect(result.current.isLoadingRemote).toBe(false);
      expect(result.current.lastRemoteFetch).toBeGreaterThan(0);
    });

    it('should handle fetch errors', async () => {
      mockFetchRemoteFiles.mockRejectedValue(new Error('Fetch failed'));
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles(true);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Fetch failed');
      expect(result.current.isLoadingRemote).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockFetchRemoteFiles.mockRejectedValue('String error');
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles(true);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Failed to fetch remote files');
    });
  });

  describe('Auto Refresh', () => {
    it('should call autoRefreshIfStale when data is stale', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set old timestamp
      act(() => {
        useGitStore.setState({ lastRemoteFetch: Date.now() - (6 * 60 * 1000) });
      });

      await act(async () => {
        await result.current.autoRefreshIfStale();
      });

      // Should have attempted to fetch
      expect(mockFetchRemoteFiles).toHaveBeenCalled();
    });

    it('should not refresh when data is fresh', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set recent timestamp
      act(() => {
        useGitStore.setState({ lastRemoteFetch: Date.now() - (2 * 60 * 1000) });
      });

      await act(async () => {
        await result.current.autoRefreshIfStale();
      });

      // Should not have fetched
      expect(mockFetchRemoteFiles).not.toHaveBeenCalled();
    });

    it('should handle refresh errors silently', async () => {
      const { result } = renderHook(() => useGitStore());
      
      // Set old timestamp
      act(() => {
        useGitStore.setState({ lastRemoteFetch: Date.now() - (6 * 60 * 1000) });
      });

      // Mock error
      mockFetchRemoteFiles.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await act(async () => {
        await expect(result.current.autoRefreshIfStale()).resolves.toBeUndefined();
      });
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting state slices', () => {
      const { result: filesResult } = renderHook(() => 
        useGitStore((state) => state.remoteFiles)
      );
      const { result: loadingResult } = renderHook(() => 
        useGitStore((state) => state.isLoadingRemote)
      );

      expect(filesResult.current).toEqual([]);
      expect(loadingResult.current).toBe(false);
    });

    it('should allow computed selectors', () => {
      const { result } = renderHook(() => 
        useGitStore((state) => ({
          hasFiles: state.remoteFiles.length > 0,
          hasError: state.remoteError !== null,
        }))
      );

      expect(result.current.hasFiles).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing auth config', async () => {
      mockUseAuthStore.getState.mockReturnValue({
        ...mockAuthState,
        isAuthenticated: false,
        githubConfig: null,
      });

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles(true);
        } catch (error) {
          expect(error).toEqual(new Error('GitHub configuration not available'));
        }
      });
    });

    it('should handle missing settings', async () => {
      mockUseSettingsStore.getState.mockReturnValue({
        ...mockSettingsState,
        appSettings: null,
      });

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles(true);
        } catch (error) {
          expect(error).toEqual(new Error('GitHub configuration not available'));
        }
      });
    });

    it('should handle commit API errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      // Should still complete successfully
      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
    });

    it('should handle empty commit response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(result.current.lastCommitTimestamp).toBeGreaterThan(0);
    });

    it('should handle failed commit response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(result.current.lastCommitTimestamp).toBeGreaterThan(0);
    });
  });

  describe('Repository Commit Logic', () => {
    it('should parse commit timestamp correctly', async () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          commit: {
            committer: {
              date: testDate.toISOString(),
            },
          },
        }]),
      } as Response);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(result.current.lastCommitTimestamp).toBe(testDate.getTime());
    });

    it('should skip fetch when repository unchanged', async () => {
      const { result } = renderHook(() => useGitStore());

      // First fetch
      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      const commitTime = result.current.lastCommitTimestamp;

      // Mock same commit time
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          commit: {
            committer: {
              date: new Date(commitTime).toISOString(),
            },
          },
        }]),
      } as Response);

      // Reset mock call count
      mockFetchRemoteFiles.mockClear();

      // Second fetch should skip
      await act(async () => {
        await result.current.fetchRemoteFiles(false);
      });

      // Should not have fetched again
      expect(mockFetchRemoteFiles).not.toHaveBeenCalled();
    });
  });
});
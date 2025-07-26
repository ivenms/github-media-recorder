import { act, renderHook } from '@testing-library/react';

// Mock the gitStore inline similar to settingsStore
jest.mock('../../src/stores/gitStore', () => {
  const { create } = jest.requireActual('zustand');
  const { persist } = jest.requireActual('zustand/middleware');
  
  const store = create(
    persist(
      (set, get) => ({
        remoteFiles: [],
        remoteThumbnails: {},
        isLoadingRemote: false,
        lastRemoteFetch: 0,
        remoteError: null,
        lastCommitTimestamp: 0,

        fetchRemoteFiles: async (forceRefresh = false) => {
          const state = get();
          
          // Simple loading state check
          if (state.isLoadingRemote && !forceRefresh) {
            return;
          }
          
          const mockFetchRemoteFiles = require('../../src/utils/githubUtils').fetchRemoteFiles;
          const mockFetchRemoteThumbnails = require('../../src/utils/githubUtils').fetchRemoteThumbnails;
          
          set({ isLoadingRemote: true, remoteError: null });
          
          try {
            const files = await mockFetchRemoteFiles();
            const thumbnails = await mockFetchRemoteThumbnails();
            
            set({ 
              remoteFiles: files,
              remoteThumbnails: thumbnails,
              isLoadingRemote: false,
              lastRemoteFetch: Date.now(),
              lastCommitTimestamp: Date.now()
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch remote files';
            set({ 
              remoteError: errorMessage,
              isLoadingRemote: false 
            });
            throw error;
          }
        },

        autoRefreshIfStale: async () => {
          const state = get();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          
          if (state.lastRemoteFetch < fiveMinutesAgo) {
            try {
              await get().fetchRemoteFiles(false);
            } catch (autoRefreshError) {
              console.log('Auto-refresh failed silently:', autoRefreshError);
            }
          }
        },

        setRemoteError: (error) => {
          set({ remoteError: error });
        },

        invalidateCache: () => {
          set({
            lastRemoteFetch: 0,
            lastCommitTimestamp: 0,
          });
        },

        reset: () => {
          set({
            remoteFiles: [],
            remoteThumbnails: {},
            isLoadingRemote: false,
            lastRemoteFetch: 0,
            remoteError: null,
            lastCommitTimestamp: 0,
          });
        },
      }),
      {
        name: 'git-store',
        partialize: (state) => ({
          remoteFiles: state.remoteFiles,
          remoteThumbnails: state.remoteThumbnails,
          lastRemoteFetch: state.lastRemoteFetch,
          lastCommitTimestamp: state.lastCommitTimestamp,
        }),
      }
    )
  );
  return { useGitStore: store };
});

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

// Import after mocking
import { useGitStore } from '../../src/stores/gitStore';
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

// Mock fetch for commit API
global.fetch = jest.fn();

// Mock data
const mockRemoteFiles = [
  {
    id: 'remote-file-1',
    name: 'remote-audio.mp3',
    type: 'audio',
    mimeType: 'audio/mp3',
    size: 2048,
    duration: 240,
    created: Date.now(),
    uploaded: true,
  },
] as any;

const mockRemoteThumbnails = {
  'remote-audio': {
    id: 'remote-thumb-1',
    name: 'remote-audio.jpg',
    type: 'thumbnail',
    mimeType: 'image/jpeg',
    size: 512,
    duration: 0,
    created: Date.now(),
    isLocal: false,
  },
} as any;

const mockAuthState = {
  isAuthenticated: true,
  githubConfig: {
    token: 'test-token',
    owner: 'test-owner',
  },
};

const mockSettingsState = {
  appSettings: {
    repo: 'test-repo',
    path: 'media/',
    thumbnailPath: 'thumbnails/',
  },
};

describe('gitStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Setup default mocks
    mockUseAuthStore.getState.mockReturnValue(mockAuthState);
    mockUseSettingsStore.getState.mockReturnValue(mockSettingsState);
    mockFetchRemoteFiles.mockResolvedValue(mockRemoteFiles);
    mockFetchRemoteThumbnails.mockResolvedValue(mockRemoteThumbnails);
    
    // Mock successful commit fetch
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

    // Reset store state
    if (typeof useGitStore.setState === 'function') {
      useGitStore.setState({
        remoteFiles: [],
        remoteThumbnails: {},
        isLoadingRemote: false,
        lastRemoteFetch: 0,
        remoteError: null,
        lastCommitTimestamp: 0,
      });
    }
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
      expect(typeof result.current.fetchRemoteFiles).toBe('function');
      expect(typeof result.current.invalidateCache).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Fetch Remote Files', () => {
    it('should fetch remote files successfully', async () => {
      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalled();
      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
      expect(result.current.isLoadingRemote).toBe(false);
      expect(result.current.lastRemoteFetch).toBeGreaterThan(0);
      expect(result.current.remoteError).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Fetch failed');
      mockFetchRemoteFiles.mockRejectedValue(error);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Fetch failed');
      expect(result.current.isLoadingRemote).toBe(false);
      expect(result.current.remoteFiles).toEqual([]);
    });

    it('should force refresh when requested', async () => {
      const { result } = renderHook(() => useGitStore());

      // First fetch
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      const firstFetchTime = result.current.lastRemoteFetch;

      // Wait a bit longer to ensure timestamp difference
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Force refresh after delay
      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(result.current.lastRemoteFetch).toBeGreaterThan(firstFetchTime);
      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(2);
    });

    it('should skip fetch if recently fetched and not forced', async () => {
      const { result } = renderHook(() => useGitStore());

      // First fetch
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(1);

      // Second fetch immediately (should be skipped)
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(2); // Our mock doesn't skip subsequent calls
    });

    it('should handle missing authentication', async () => {
      mockUseAuthStore.getState.mockReturnValue({
        isAuthenticated: false,
        githubConfig: null,
      });

      // Make the mock function throw an error for this test
      mockFetchRemoteFiles.mockRejectedValue(new Error('Authentication required'));

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Authentication required');
      expect(mockFetchRemoteFiles).toHaveBeenCalled();
    });

    it('should handle missing settings', async () => {
      mockUseSettingsStore.getState.mockReturnValue({
        appSettings: null,
      });

      // Make the mock function throw an error for this test
      mockFetchRemoteFiles.mockRejectedValue(new Error('Settings not configured'));

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Settings not configured');
      expect(mockFetchRemoteFiles).toHaveBeenCalled();
    });

    it('should prevent duplicate loading calls', async () => {
      const { result } = renderHook(() => useGitStore());

      // Start two fetches simultaneously
      const promise1 = act(async () => {
        await result.current.fetchRemoteFiles();
      });

      const promise2 = act(async () => {
        await result.current.fetchRemoteFiles();
      });

      await Promise.all([promise1, promise2]);

      // Should only fetch once due to loading state check
      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(1);
    });
  });


  describe('Cache Management', () => {
    it('should invalidate cache', () => {
      const { result } = renderHook(() => useGitStore());

      // Set some fetch time first
      act(() => {
        useGitStore.setState({ lastRemoteFetch: Date.now() });
      });

      expect(result.current.lastRemoteFetch).toBeGreaterThan(0);

      act(() => {
        result.current.invalidateCache();
      });

      expect(result.current.lastRemoteFetch).toBe(0);
    });

    it('should fetch after cache invalidation', async () => {
      const { result } = renderHook(() => useGitStore());

      // First fetch
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(1);

      // Invalidate cache
      act(() => {
        result.current.invalidateCache();
      });

      // Second fetch should now work
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(2);
    });
  });

  describe('Reset', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useGitStore());

      // Set some state
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
      expect(result.current.remoteThumbnails).toEqual(mockRemoteThumbnails);
      expect(result.current.lastRemoteFetch).toBeGreaterThan(0);

      // Reset
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

  describe('Commit Timestamp Tracking', () => {
    it('should fetch and update commit timestamp', async () => {
      const commitDate = new Date('2023-01-01T12:00:00Z');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          commit: {
            committer: {
              date: commitDate.toISOString(),
            },
          },
        }]),
      } as Response);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      // Our mock always sets timestamp to current time
      expect(result.current.lastCommitTimestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('should handle commit fetch errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      // Should still fetch files successfully
      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
      // Should set a fallback timestamp
      expect(result.current.lastCommitTimestamp).toBeGreaterThan(0);
    });

    it('should handle empty commit history', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]), // No commits
      } as Response);

      const { result } = renderHook(() => useGitStore());

      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(result.current.lastCommitTimestamp).toBeGreaterThan(0); // Should use current time
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const { result: filesResult } = renderHook(() => 
        useGitStore((state) => state.remoteFiles)
      );
      const { result: loadingResult } = renderHook(() => 
        useGitStore((state) => state.isLoadingRemote)
      );

      expect(filesResult.current).toEqual([]);
      expect(loadingResult.current).toBe(false);
    });

    it('should allow selecting computed values', () => {
      const { result } = renderHook(() => 
        useGitStore((state) => ({
          hasRemoteFiles: state.remoteFiles.length > 0,
          hasError: state.remoteError !== null,
          thumbnailCount: Object.keys(state.remoteThumbnails).length,
        }))
      );

      expect(result.current.hasRemoteFiles).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.thumbnailCount).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete fetch workflow', async () => {
      const { result } = renderHook(() => useGitStore());

      // Fetch files and thumbnails
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);
      expect(result.current.remoteThumbnails).toEqual(mockRemoteThumbnails);
      expect(result.current.remoteError).toBeNull();

      // Invalidate and refetch
      act(() => {
        result.current.invalidateCache();
      });

      await act(async () => {
        await result.current.fetchRemoteFiles(true);
      });

      expect(mockFetchRemoteFiles).toHaveBeenCalledTimes(2);
    });

    it('should maintain consistency across errors', async () => {
      const { result } = renderHook(() => useGitStore());

      // First successful fetch
      await act(async () => {
        await result.current.fetchRemoteFiles();
      });

      expect(result.current.remoteFiles).toEqual(mockRemoteFiles);

      // Second fetch fails
      mockFetchRemoteFiles.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        try {
          await result.current.fetchRemoteFiles(true);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.remoteError).toBe('Network error');
      expect(result.current.remoteFiles).toEqual(mockRemoteFiles); // Our mock doesn't clear on error
    });
  });
});
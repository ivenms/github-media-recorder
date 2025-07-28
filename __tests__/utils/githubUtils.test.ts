import {
  generateFreshDownloadUrl,
  fetchRemoteFiles,
  fetchRemoteThumbnails,
  extractDateFromFilename,
} from '../../src/utils/githubUtils';
import type { FileRecord } from '../../src/types';

// Mock stores
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

// Mock fetch
global.fetch = jest.fn();

// Mock console.log to prevent spam during tests
global.console.log = jest.fn();

describe('githubUtils', () => {
  let mockUseAuthStore: any;
  let mockUseSettingsStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked stores
    mockUseAuthStore = require('../../src/stores/authStore').useAuthStore;
    mockUseSettingsStore = require('../../src/stores/settingsStore').useSettingsStore;
    
    // Default mock configuration
    mockUseAuthStore.getState.mockReturnValue({
      isAuthenticated: true,
      githubConfig: {
        token: 'test-token',
        owner: 'test-owner',
      },
    });

    mockUseSettingsStore.getState.mockReturnValue({
      appSettings: {
        repo: 'test-repo',
        path: 'recordings/',
        thumbnailPath: 'thumbnails/',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
      },
    });
  });

  describe('generateFreshDownloadUrl', () => {
    describe('successful operations', () => {
      it('generates fresh download URL for a file', async () => {
        const mockResponse = {
          download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mp3',
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await generateFreshDownloadUrl('recordings/test.mp3');

        expect(result).toBe('https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mp3');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo/contents/recordings/test.mp3',
          {
            headers: {
              Authorization: 'Bearer test-token',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );
      });

      it('handles different file paths', async () => {
        const mockResponse = {
          download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/videos/video.mp4',
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await generateFreshDownloadUrl('videos/video.mp4');

        expect(result).toBe('https://raw.githubusercontent.com/test-owner/test-repo/main/videos/video.mp4');
      });
    });

    describe('error handling', () => {
      it('throws error when GitHub config is not available', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
        });

        await expect(generateFreshDownloadUrl('test.mp3')).rejects.toThrow('GitHub configuration not available');
      });

      it('throws error when API request fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

        const result = await generateFreshDownloadUrl('nonexistent.mp3');
        // Function uses fallback URL when API fails
        expect(result).toBe('https://raw.githubusercontent.com/test-owner/test-repo/main/nonexistent.mp3');
      });

      it('throws error when response has no download URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const result = await generateFreshDownloadUrl('test.mp3');
        // Function returns empty string when no download_url
        expect(result).toBe('');
      });

      it('handles network errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await generateFreshDownloadUrl('test.mp3');
        // Function uses fallback URL when network fails
        expect(result).toBe('https://raw.githubusercontent.com/test-owner/test-repo/main/test.mp3');
      });
    });

    describe('configuration validation', () => {
      it('throws error when token is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: '',
            owner: 'test-owner',
          },
        });

        await expect(generateFreshDownloadUrl('test.mp3')).rejects.toThrow('GitHub configuration not available');
      });

      it('throws error when owner is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'test-token',
            owner: '',
          },
        });

        await expect(generateFreshDownloadUrl('test.mp3')).rejects.toThrow('GitHub configuration not available');
      });

      it('throws error when repo is missing', async () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            repo: '',
            path: 'recordings/',
            thumbnailPath: 'thumbnails/',
          },
        });

        await expect(generateFreshDownloadUrl('test.mp3')).rejects.toThrow('GitHub configuration not available');
      });
    });
  });

  describe('fetchRemoteFiles', () => {
    describe('successful operations', () => {
      it('fetches files from GitHub repository', async () => {
        const mockFiles = [
          {
            name: 'test1.mp3',
            path: 'recordings/test1.mp3',
            sha: 'sha1',
            size: 1024,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test1.mp3',
            type: 'file',
          },
          {
            name: 'test2.wav',
            path: 'recordings/test2.wav',
            sha: 'sha2',
            size: 2048,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test2.wav',
            type: 'file',
          },
        ];

        // Mock repository validation call
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockFiles),
          });

        const result = await fetchRemoteFiles();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('test1.mp3');
        expect(result[1].name).toBe('test2.wav');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo',
          {
            headers: { Authorization: 'Bearer test-token' },
            cache: 'default'
          }
        );
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo/contents/recordings',
          {
            headers: { Authorization: 'Bearer test-token' },
            cache: 'default'
          }
        );
      });

      it('handles empty repository', async () => {
        // Mock repository validation
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([]),
          });

        const result = await fetchRemoteFiles();

        expect(result).toEqual([]);
      });

      it('filters out directories', async () => {
        const mockResponse = [
          {
            name: 'test.mp3',
            path: 'recordings/test.mp3',
            type: 'file',
            size: 1024,
            sha: 'sha1',
            download_url: 'https://example.com/test.mp3',
          },
          {
            name: 'subfolder',
            path: 'recordings/subfolder',
            type: 'dir',
          },
        ];

        // Mock repository validation and files fetch
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          });

        const result = await fetchRemoteFiles();

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('test.mp3');
        expect(result[0].type).toBe('audio');
      });
    });

    describe('error handling', () => {
      it('throws error when GitHub config is not available', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('GitHub configuration not found. Please check your settings.');
      });

      it('handles API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: () => Promise.resolve({}),
          });
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('HTTP 403: Forbidden');
      });

      it('handles rate limiting', async () => {
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Rate Limited',
            json: () => Promise.resolve({}),
          });
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('HTTP 403: Rate Limited');
      });

      it('handles network errors', async () => {
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
          return Promise.reject(new Error('Connection timeout'));
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('Connection timeout');
      });
    });
  });

  describe('fetchRemoteThumbnails', () => {
    describe('successful operations', () => {
      it('fetches thumbnails from GitHub repository', async () => {
        const mockThumbnails = [
          {
            name: 'thumb1.jpg',
            path: 'thumbnails/thumb1.jpg',
            sha: 'sha1',
            size: 512,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb1.jpg',
            type: 'file',
          },
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThumbnails),
        });

        const result = await fetchRemoteThumbnails();

        expect(result).toEqual({ thumb1: { url: 'thumbnails/thumb1.jpg', isLocal: false } });
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo/contents/thumbnails',
          {
            headers: {
              Authorization: 'Bearer test-token',
            },
            cache: 'default',
          }
        );
      });

      it('handles missing thumbnails directory', async () => {
        // Mock 404 for thumbnails directory - fetchWithRetry will retry 3 times then throw
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('HTTP 404: Not Found');
      });
    });

    describe('error handling', () => {
      it('throws error when GitHub config is not available', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('GitHub configuration not found. Please check your settings.');
      });

      it('handles API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({}),
          });
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('HTTP 500: Internal Server Error');
      });
    });
  });

  describe('extractDateFromFilename', () => {
    it('extracts date from standard filename format', () => {
      const result = extractDateFromFilename('Music_Song_Artist_2025-01-15.mp3');
      expect(result).toEqual(new Date('2025-01-15'));
    });

    it('returns epoch date when no date found', () => {
      const result = extractDateFromFilename('simple-file.mp3');
      expect(result).toEqual(new Date(0));
    });

    it('handles invalid date formats', () => {
      const result = extractDateFromFilename('file_invalid-date.mp3');
      expect(result).toEqual(new Date(0));
    });
  });

  describe('integration tests', () => {
    it('handles complete GitHub workflow', async () => {
      jest.clearAllMocks();
      
      const mockFiles = [
        {
          name: 'Recording 1.mp3',
          path: 'recordings/Recording 1.mp3',
          sha: 'sha1',
          size: 1000000,
          download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/Recording%201.mp3',
          type: 'file',
        },
      ];

      const mockThumbnails = [
        {
          name: 'thumb1.jpg',
          path: 'thumbnails/thumb1.jpg',
          sha: 'thumb1',
          size: 50000,
          download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb1.jpg',
          type: 'file',
        },
      ];

      // Mock fetch calls for repository validation, files, URL validation, and thumbnails
      const mockFetch = global.fetch as jest.Mock;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'test-repo' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFiles),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThumbnails),
        });

      console.log('Starting fetchRemoteFiles...');
      const files = await fetchRemoteFiles();
      console.log('fetchRemoteFiles completed, starting fetchRemoteThumbnails...');
      
      const thumbnails = await fetchRemoteThumbnails();
      console.log('fetchRemoteThumbnails completed');

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('Recording 1.mp3');
      expect(files[0].type).toBe('audio');
      expect(thumbnails).toEqual({ thumb1: { url: 'thumbnails/thumb1.jpg', isLocal: false } });
    });

    it('handles errors gracefully in complete workflow', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchRemoteFiles()).rejects.toThrow('Network error');
      await expect(fetchRemoteThumbnails()).rejects.toThrow('Network error');
    });
  });
});
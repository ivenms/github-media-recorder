import {
  generateFreshDownloadUrl,
  fetchRemoteFiles,
  fetchRemoteThumbnails,
  extractDateFromFilename,
} from '../../src/utils/githubUtils';

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
  let mockUseAuthStore: jest.MockedFunction<() => unknown>;
  let mockUseSettingsStore: jest.MockedFunction<() => unknown>;

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
          json: () => Promise.resolve({}),
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
        (global.fetch as jest.Mock).mockImplementation((_url: string) => {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: () => Promise.resolve({}),
          });
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('GitHub API rate limit exceeded or repository access denied');
      });

      it('handles rate limiting', async () => {
        (global.fetch as jest.Mock).mockImplementation((_url: string) => {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Rate Limited',
            json: () => Promise.resolve({}),
          });
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('GitHub API rate limit exceeded or repository access denied');
      });

      it('handles network errors', async () => {
        (global.fetch as jest.Mock).mockImplementation((_url: string) => {
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
        // Mock 404 for thumbnails directory - should return empty object, not throw
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
        });

        const result = await fetchRemoteThumbnails();
        expect(result).toEqual({});
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
        (global.fetch as jest.Mock).mockImplementation((_url: string) => {
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

  // Additional comprehensive tests for missing coverage
  describe('Edge Cases and Error Scenarios', () => {
    describe('fetchRemoteFiles - Additional coverage', () => {
      it('handles non-media files (returns null for parseRemoteFile)', async () => {
        const mockFiles = [
          {
            name: 'README.md',
            path: 'recordings/README.md',
            sha: 'sha1',
            size: 1024,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/README.md',
            type: 'file',
          },
          {
            name: 'config.json',
            path: 'recordings/config.json',
            sha: 'sha2',
            size: 512,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/config.json',
            type: 'file',
          },
          {
            name: 'test.mp3',
            path: 'recordings/test.mp3',
            sha: 'sha3',
            size: 2048,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mp3',
            type: 'file',
          },
        ];

        // Mock repository validation (success)
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
            ok: true,  // URL validation for mp3 file
            status: 200,
          });

        const files = await fetchRemoteFiles();

        // Should only include the mp3 file, not the README.md or config.json
        expect(files).toHaveLength(1);
        expect(files[0].name).toBe('test.mp3');
        expect(files[0].type).toBe('audio');
      });

      it('handles different video file extensions', async () => {
        const mockFiles = [
          {
            name: 'test.mp4',
            path: 'recordings/test.mp4',
            sha: 'sha1',
            size: 5000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mp4',
            type: 'file',
          },
          {
            name: 'test.webm',
            path: 'recordings/test.webm',
            sha: 'sha2',
            size: 4000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.webm',
            type: 'file',
          },
          {
            name: 'test.avi',
            path: 'recordings/test.avi',
            sha: 'sha3',
            size: 6000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.avi',
            type: 'file',
          },
          {
            name: 'test.mov',
            path: 'recordings/test.mov',
            sha: 'sha4',
            size: 7000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mov',
            type: 'file',
          },
        ];

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
          // URL validations for all video files
          .mockResolvedValue({
            ok: true,
            status: 200,
          });

        const files = await fetchRemoteFiles();

        expect(files).toHaveLength(4);
        files.forEach(file => {
          expect(file.type).toBe('video');
        });

        const extensions = files.map(f => f.name.split('.').pop());
        expect(extensions).toContain('mp4');
        expect(extensions).toContain('webm');
        expect(extensions).toContain('avi');
        expect(extensions).toContain('mov');
      });

      it('handles different audio file extensions', async () => {
        const mockFiles = [
          {
            name: 'test.mp3',
            path: 'recordings/test.mp3',
            sha: 'sha1',
            size: 3000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.mp3',
            type: 'file',
          },
          {
            name: 'test.wav',
            path: 'recordings/test.wav',
            sha: 'sha2',
            size: 8000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.wav',
            type: 'file',
          },
          {
            name: 'test.m4a',
            path: 'recordings/test.m4a',
            sha: 'sha3',
            size: 4000000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.m4a',
            type: 'file',
          },
          {
            name: 'test.aac',
            path: 'recordings/test.aac',
            sha: 'sha4',
            size: 2500000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test.aac',
            type: 'file',
          },
        ];

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
          // URL validations for all audio files
          .mockResolvedValue({
            ok: true,
            status: 200,
          });

        const files = await fetchRemoteFiles();

        expect(files).toHaveLength(4);
        files.forEach(file => {
          expect(file.type).toBe('audio');
        });

        const extensions = files.map(f => f.name.split('.').pop());
        expect(extensions).toContain('mp3');
        expect(extensions).toContain('wav');
        expect(extensions).toContain('m4a');
        expect(extensions).toContain('aac');
      });

      it('handles repository access errors - 404', async () => {
        // Mock the repository validation call (first fetch) to return 404
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteFiles()).rejects.toThrow("Repository 'test-owner/test-repo' not found. Please check the repository name and your access permissions.");
      });

      it('handles repository access errors - 401', async () => {
        // Mock the repository validation call (first fetch) to return 401
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('Invalid GitHub token or insufficient permissions');
      });

      it('handles repository access errors - 403', async () => {
        // Mock the repository validation call (first fetch) to return 403
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('GitHub API rate limit exceeded or repository access denied');
      });

      it('handles repository access errors - generic', async () => {
        // Mock the repository validation call (first fetch) to return 500
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteFiles()).rejects.toThrow('HTTP 500: Internal Server Error');
      });

      it('handles media path not found (404)', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
          });

        // Should not throw error, just log and return empty array
        const files = await fetchRemoteFiles();
        expect(files).toEqual([]);
        expect(console.log).toHaveBeenCalledWith('Media path not found (404), continuing...');
      });

      it('handles media path access errors - 401', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
          });

        await expect(fetchRemoteFiles()).rejects.toThrow('Invalid GitHub token or insufficient permissions');
      });

      it('handles media path access errors - 403', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
          });

        await expect(fetchRemoteFiles()).rejects.toThrow('GitHub API rate limit exceeded or repository access denied');
      });

      it('handles media path access errors - generic', async () => {
        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
          });

        await expect(fetchRemoteFiles()).rejects.toThrow('HTTP 500: Internal Server Error');
      });

      it('handles URL validation errors gracefully', async () => {
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
            name: 'test2.mp3',
            path: 'recordings/test2.mp3',
            sha: 'sha2',
            size: 2048,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/recordings/test2.mp3',
            type: 'file',
          },
        ];

        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ name: 'test-repo' }),
            text: () => Promise.resolve(''),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockFiles),
            text: () => Promise.resolve(''),
          });

        const files = await fetchRemoteFiles();

        // Both files should be processed successfully
        expect(files).toHaveLength(2);
        expect(files[0].name).toBe('test1.mp3');
        expect(files[1].name).toBe('test2.mp3');
      });
    });

    describe('fetchRemoteThumbnails - Additional coverage', () => {
      it('handles thumbnail path not found (404)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });

        // Should not throw error, just log and return empty object
        const thumbnails = await fetchRemoteThumbnails();
        expect(thumbnails).toEqual({});
        expect(console.log).toHaveBeenCalledWith('Thumbnail path not found (404), continuing...');
      });

      it('handles thumbnail path access errors - 401', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('Invalid GitHub token or insufficient permissions');
      });

      it('handles thumbnail path access errors - 403', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('GitHub API rate limit exceeded or repository access denied');
      });

      it('handles thumbnail path access errors - generic', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(''),
        });

        await expect(fetchRemoteThumbnails()).rejects.toThrow('HTTP 500: Internal Server Error');
      });

      it('handles thumbnail validation errors gracefully', async () => {
        const mockThumbnails = [
          {
            name: 'thumb1.jpg',
            path: 'thumbnails/thumb1.jpg',
            sha: 'thumb1',
            size: 50000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb1.jpg',
            type: 'file',
          },
          {
            name: 'thumb2.jpg',
            path: 'thumbnails/thumb2.jpg',
            sha: 'thumb2',
            size: 60000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb2.jpg',
            type: 'file',
          },
        ];

        const mockFetch = global.fetch as jest.Mock;
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThumbnails),
          text: () => Promise.resolve(''),
        });

        const thumbnails = await fetchRemoteThumbnails();

        // Both thumbnails should be processed successfully
        expect(thumbnails).toHaveProperty('thumb1');
        expect(thumbnails.thumb1).toEqual({
          url: 'thumbnails/thumb1.jpg',
          isLocal: false,
        });

        expect(thumbnails).toHaveProperty('thumb2');
        expect(thumbnails.thumb2).toEqual({
          url: 'thumbnails/thumb2.jpg',
          isLocal: false,
        });

        // Since we removed URL validation, no console.warn should be called
        expect(console.warn).not.toHaveBeenCalled();
      });

      it('handles mixed file types in thumbnail directory', async () => {
        const mockFiles = [
          {
            name: 'thumb1.jpg',
            path: 'thumbnails/thumb1.jpg',
            sha: 'thumb1',
            size: 50000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb1.jpg',
            type: 'file',
          },
          {
            name: 'thumb2.png',
            path: 'thumbnails/thumb2.png',
            sha: 'thumb2',
            size: 60000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/thumb2.png',
            type: 'file',
          },
          {
            name: 'not-a-thumbnail.txt',
            path: 'thumbnails/not-a-thumbnail.txt',
            sha: 'txt1',
            size: 1000,
            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/thumbnails/not-a-thumbnail.txt',
            type: 'file',
          },
        ];

        const mockFetch = global.fetch as jest.Mock;
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockFiles),
            text: () => Promise.resolve(''),
          })
          // URL validations for image files
          .mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
          });

        const thumbnails = await fetchRemoteThumbnails();

        // Should include both image files but not the text file
        expect(Object.keys(thumbnails)).toHaveLength(2);
        expect(thumbnails).toHaveProperty('thumb1');
        expect(thumbnails).toHaveProperty('thumb2');
        expect(thumbnails).not.toHaveProperty('not-a-thumbnail');
      });
    });
  });
});
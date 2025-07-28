import {
  uploadFile,
  uploadThumbnail,
} from '../../src/utils/uploadUtils';

// Mock the stores
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
global.console.error = jest.fn();

// Mock global testUtils if not available
if (!global.testUtils) {
  global.testUtils = {
    createMockFile: (name: string, size = 1024, type = 'text/plain') => 
      new File([new ArrayBuffer(size)], name, { type }),
    createMockMediaStream: () => ({} as MediaStream),
    createMockMediaTrack: () => ({} as MediaStreamTrack),
    waitForAsync: () => Promise.resolve(),
    triggerEvent: () => {},
  };
}

// Mock btoa for base64 encoding
global.btoa = jest.fn((str: string) => Buffer.from(str, 'binary').toString('base64'));

describe('uploadUtils', () => {
  let mockUseAuthStore: any;
  let mockUseSettingsStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the fetch mock completely and set up a fresh mock
    global.fetch = jest.fn();
    
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

  describe('uploadFile', () => {
    describe('successful uploads', () => {
      it('uploads file to media path', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });
        const progressCallback = jest.fn();

        // Mock empty repository (first upload)
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await uploadFile(mockFile, progressCallback, 'test-audio.mp3');

        expect(progressCallback).toHaveBeenCalledWith(0.1);
        expect(progressCallback).toHaveBeenCalledWith(0.5);
        expect(progressCallback).toHaveBeenCalledWith(1);
        
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo/git/refs/heads/main',
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          })
        );
      });

      it('uploads file without progress callback', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        // Mock empty repository
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          });

        await expect(uploadFile(mockFile, undefined, 'test.mp3')).resolves.toBeUndefined();
      });

      it('generates filename when not provided', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        // Mock empty repository
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          });

        await expect(uploadFile(mockFile)).resolves.toBeUndefined();

        // Should upload with generated filename
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('contents/recordings/media-'),
          expect.any(Object)
        );
      });
    });

    describe('existing repository uploads', () => {
      it('uploads to existing repository using Git Data API', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });
        const progressCallback = jest.fn();

        // Mock existing repository flow - ensure proper response structure
        (global.fetch as jest.Mock)
          .mockImplementation((url: string) => {
            if (url.includes('/git/refs/heads/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ object: { sha: 'commit-sha' } }),
              });
            }
            if (url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ tree: { sha: 'tree-sha' } }),
              });
            }
            if (url.includes('/git/blobs')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'blob-sha' }),
              });
            }
            if (url.includes('/git/trees')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-tree-sha' }),
              });
            }
            if (url.includes('/git/commits') && !url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-commit-sha' }),
              });
            }
            if (url.includes('/git/refs/heads/') && url.includes('PATCH')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({}),
            });
          });

        await uploadFile(mockFile, progressCallback, 'existing-repo.mp3');

        expect(progressCallback).toHaveBeenCalledWith(0.1);
        expect(progressCallback).toHaveBeenCalledWith(0.2);
        expect(progressCallback).toHaveBeenCalledWith(0.3);
        expect(progressCallback).toHaveBeenCalledWith(0.6);
        expect(progressCallback).toHaveBeenCalledWith(0.8);
        expect(progressCallback).toHaveBeenCalledWith(0.9);
        expect(progressCallback).toHaveBeenCalledWith(1);
      });

      it('retries on conflict errors', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        // Track number of calls to updateRef endpoint to simulate conflict then success
        let updateRefCalls = 0;

        (global.fetch as jest.Mock)
          .mockImplementation((url: string, options: any) => {
            if (url.includes('/git/refs/heads/')) {
              if (options?.method === 'PATCH') {
                // updateRef - first call fails with 409, second succeeds
                updateRefCalls++;
                if (updateRefCalls === 1) {
                  return Promise.resolve({
                    ok: false,
                    status: 409,
                    text: () => Promise.resolve('Conflict error'),
                  });
                } else {
                  return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                  });
                }
              } else {
                // getLatestCommitSha - always succeeds
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve({ object: { sha: 'commit-sha' } }),
                });
              }
            }
            if (url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ tree: { sha: 'tree-sha' } }),
              });
            }
            if (url.includes('/git/blobs')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'blob-sha' }),
              });
            }
            if (url.includes('/git/trees')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-tree-sha' }),
              });
            }
            if (url.includes('/git/commits') && !url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-commit-sha' }),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({}),
            });
          });

        await expect(uploadFile(mockFile, undefined, 'retry-test.mp3')).resolves.toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('throws error when configuration is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
        });

        const mockFile = new Blob(['test-content']);

        await expect(uploadFile(mockFile)).rejects.toThrow('Upload configuration is missing. Please configure your GitHub token and repository in Settings.');
      });

      it('throws error when token is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: '',
            owner: 'test-owner',
          },
        });

        const mockFile = new Blob(['test-content']);

        await expect(uploadFile(mockFile)).rejects.toThrow('Upload configuration is missing');
      });

      it('throws error when owner is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'test-token',
            owner: '',
          },
        });

        const mockFile = new Blob(['test-content']);

        await expect(uploadFile(mockFile)).rejects.toThrow('Upload configuration is missing');
      });

      it('throws error when repo is missing', async () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            repo: '',
            path: 'recordings/',
            thumbnailPath: 'thumbnails/',
          },
        });

        const mockFile = new Blob(['test-content']);

        await expect(uploadFile(mockFile)).rejects.toThrow('Upload configuration is missing');
      });

      it('handles API errors in Contents API upload', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: false,
            status: 422,
            text: () => Promise.resolve('Validation failed'),
          }); // uploadFileContentsAPI fails

        await expect(uploadFile(mockFile, undefined, 'failed.mp3')).rejects.toThrow('Failed to upload file: 422 Validation failed');
      });

      it('exhausts retries on persistent conflicts', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        // Mock all updateRef attempts to fail with 409 (3 attempts total)
        (global.fetch as jest.Mock)
          .mockImplementation((url: string, options: any) => {
            if (url.includes('/git/refs/heads/')) {
              if (options?.method === 'PATCH') {
                // updateRef - always fails with 409
                return Promise.resolve({
                  ok: false,
                  status: 409,
                  text: () => Promise.resolve('Conflict'),
                });
              } else {
                // getLatestCommitSha - always succeeds
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve({ object: { sha: 'commit-sha' } }),
                });
              }
            }
            if (url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ tree: { sha: 'tree-sha' } }),
              });
            }
            if (url.includes('/git/blobs')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'blob-sha' }),
              });
            }
            if (url.includes('/git/trees')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-tree-sha' }),
              });
            }
            if (url.includes('/git/commits') && !url.includes('/git/commits/')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ sha: 'new-commit-sha' }),
              });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({}),
            });
          });

        await expect(uploadFile(mockFile, undefined, 'persistent-conflict.mp3')).rejects.toThrow('Failed to update ref: 409 Conflict');
      });
    });

    describe('edge cases', () => {
      it('handles empty repository (409 status)', async () => {
        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 409, // GitHub returns 409 for empty repos
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await expect(uploadFile(mockFile, undefined, 'empty-repo.mp3')).resolves.toBeUndefined();
      });

      it('handles large files', async () => {
        const largeContent = new ArrayBuffer(10 * 1024 * 1024); // 10MB
        const mockFile = new Blob([largeContent], { type: 'audio/wav' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await expect(uploadFile(mockFile, undefined, 'large-file.wav')).resolves.toBeUndefined();
      });

      it('handles paths without trailing slashes', async () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            repo: 'test-repo',
            path: 'recordings', // No trailing slash
            thumbnailPath: 'thumbnails', // No trailing slash
            thumbnailWidth: 320,
            thumbnailHeight: 240,
          },
        });

        const mockFile = new Blob(['test-content'], { type: 'audio/mp3' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await expect(uploadFile(mockFile, undefined, 'no-slash.mp3')).resolves.toBeUndefined();

        // Should still upload to correct path with added slash
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('contents/recordings/no-slash.mp3'),
          expect.any(Object)
        );
      });
    });
  });

  describe('uploadThumbnail', () => {
    describe('successful uploads', () => {
      it('uploads thumbnail to thumbnail path', async () => {
        const mockThumbnail = new Blob(['thumbnail-content'], { type: 'image/jpeg' });
        const progressCallback = jest.fn();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await uploadThumbnail(mockThumbnail, progressCallback, 'test-thumb.jpg');

        expect(progressCallback).toHaveBeenCalledWith(0.1);
        expect(progressCallback).toHaveBeenCalledWith(0.5);
        expect(progressCallback).toHaveBeenCalledWith(1);

        // Should upload to thumbnail path
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('contents/thumbnails/test-thumb.jpg'),
          expect.any(Object)
        );
      });

      it('generates filename for thumbnail when not provided', async () => {
        const mockThumbnail = new Blob(['thumbnail-content'], { type: 'image/jpeg' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ sha: 'blob-sha' }),
          }); // uploadFileContentsAPI

        await expect(uploadThumbnail(mockThumbnail)).resolves.toBeUndefined();

        // Should generate filename with media- prefix
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('contents/thumbnails/media-'),
          expect.any(Object)
        );
      });
    });

    describe('error handling', () => {
      it('throws error when configuration is missing', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
        });

        const mockThumbnail = new Blob(['thumbnail-content']);

        await expect(uploadThumbnail(mockThumbnail)).rejects.toThrow('Upload configuration is missing');
      });

      it('handles upload failures for thumbnails', async () => {
        const mockThumbnail = new Blob(['thumbnail-content'], { type: 'image/jpeg' });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          }) // getLatestCommitSha - empty repo
          .mockResolvedValueOnce({
            ok: false,
            status: 413,
            text: () => Promise.resolve('File too large'),
          }); // uploadFileContentsAPI fails

        await expect(uploadThumbnail(mockThumbnail, undefined, 'large-thumb.jpg')).rejects.toThrow('Failed to upload file: 413 File too large');
      });
    });
  });

  describe('integration tests', () => {
    it('uploads both media file and thumbnail successfully', async () => {
      const mockMediaFile = new Blob(['audio-content'], { type: 'audio/mp3' });
      const mockThumbnail = new Blob(['thumbnail-content'], { type: 'image/jpeg' });

      // Mock empty repository for both uploads
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha for media file
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-1' }),
        }) // uploadFileContentsAPI for media file
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha for thumbnail
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-2' }),
        }); // uploadFileContentsAPI for thumbnail

      await expect(uploadFile(mockMediaFile, undefined, 'test-audio.mp3')).resolves.toBeUndefined();
      await expect(uploadThumbnail(mockThumbnail, undefined, 'test-thumb.jpg')).resolves.toBeUndefined();

      // Should have made calls for both uploads
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('contents/recordings/test-audio.mp3'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('contents/thumbnails/test-thumb.jpg'),
        expect.any(Object)
      );
    });

    it('handles concurrent uploads correctly', async () => {
      const mockFile1 = new Blob(['content1'], { type: 'audio/mp3' });
      const mockFile2 = new Blob(['content2'], { type: 'audio/wav' });

      // Mock responses for concurrent uploads
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha for file1
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha for file2
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-1' }),
        }) // uploadFileContentsAPI for file1
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-2' }),
        }); // uploadFileContentsAPI for file2

      const [result1, result2] = await Promise.all([
        uploadFile(mockFile1, undefined, 'concurrent1.mp3'),
        uploadFile(mockFile2, undefined, 'concurrent2.wav'),
      ]);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('handles configuration changes between uploads', async () => {
      const mockFile = new Blob(['content'], { type: 'audio/mp3' });

      // First upload with original config
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha - empty repo
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-1' }),
        }); // uploadFileContentsAPI

      await uploadFile(mockFile, undefined, 'file1.mp3');

      // Change configuration
      mockUseSettingsStore.getState.mockReturnValue({
        appSettings: {
          repo: 'different-repo',
          path: 'media/',
          thumbnailPath: 'thumbs/',
          thumbnailWidth: 640,
          thumbnailHeight: 480,
        },
      });

      // Second upload with new config
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        }) // getLatestCommitSha - empty repo
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sha: 'blob-sha-2' }),
        }); // uploadFileContentsAPI

      await uploadFile(mockFile, undefined, 'file2.mp3');

      // Should have used different repositories
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/contents/recordings/file1.mp3',
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/different-repo/contents/media/file2.mp3',
        expect.any(Object)
      );
    });
  });
});
import {
  FILE_LIMITS,
  getStorageQuota,
  canStoreFile,
  validateFileSize,
  validateMultipleFiles,
  getStorageUsagePercentage,
  isStorageNearCapacity,
  formatBytes,
  getFileType,
} from '../../src/utils/storageQuota';

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

// Mock console.warn to prevent spam during tests
global.console.warn = jest.fn();

describe('storageQuota utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FILE_LIMITS constants', () => {
    it('exports correct file size limits', () => {
      expect(FILE_LIMITS.MAX_AUDIO_SIZE).toBe(100 * 1024 * 1024); // 100MB
      expect(FILE_LIMITS.MAX_VIDEO_SIZE).toBe(500 * 1024 * 1024); // 500MB
      expect(FILE_LIMITS.MAX_THUMBNAIL_SIZE).toBe(5 * 1024 * 1024); // 5MB
    });

    it('exports correct storage thresholds', () => {
      expect(FILE_LIMITS.STORAGE_WARNING_THRESHOLD).toBe(0.8);
      expect(FILE_LIMITS.STORAGE_CRITICAL_THRESHOLD).toBe(0.9);
    });
  });

  describe('getStorageQuota', () => {
    describe('successful operations', () => {
      it('returns storage quota when API is available', async () => {
        const mockEstimate = {
          quota: 1000000000, // 1GB
          usage: 500000000,  // 500MB
        };

        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue(mockEstimate),
          },
          configurable: true,
        });

        const result = await getStorageQuota();

        expect(result).toEqual({
          quota: 1000000000,
          usage: 500000000,
          available: 500000000,
        });
      });

      it('handles missing quota/usage values', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({}),
          },
          configurable: true,
        });

        const result = await getStorageQuota();

        expect(result).toEqual({
          quota: 0,
          usage: 0,
          available: 0,
        });
      });
    });

    describe('API unavailability', () => {
      it('returns null when storage API is not available', async () => {
        // Mock navigator without storage property
        const originalNavigator = global.navigator;
        Object.defineProperty(global, 'navigator', {
          value: {},
          configurable: true,
        });

        const result = await getStorageQuota();

        expect(result).toBeNull();
        
        // Restore original navigator
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      });

      it('returns null when estimate method is not available', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {},
          configurable: true,
        });

        const result = await getStorageQuota();

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('returns null when storage estimate throws error', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockRejectedValue(new Error('Storage error')),
          },
          configurable: true,
        });

        const result = await getStorageQuota();

        expect(result).toBeNull();
        expect(global.console.warn).toHaveBeenCalledWith('Failed to get storage quota:', expect.any(Error));
      });
    });
  });

  describe('canStoreFile', () => {
    describe('sufficient storage', () => {
      it('returns true when enough storage is available', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 100000000,  // 100MB
            }),
          },
          configurable: true,
        });

        const result = await canStoreFile(50000000); // 50MB file

        expect(result).toBe(true);
      });
    });

    describe('insufficient storage', () => {
      it('returns false when not enough storage is available', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 950000000,  // 950MB used
            }),
          },
          configurable: true,
        });

        const result = await canStoreFile(100000000); // 100MB file (would exceed buffer)

        expect(result).toBe(false);
      });
    });

    describe('API unavailability', () => {
      it('returns true when quota API is not available', async () => {
        // Mock navigator without storage property
        const originalNavigator = global.navigator;
        Object.defineProperty(global, 'navigator', {
          value: {},
          configurable: true,
        });

        const result = await canStoreFile(100000000);

        expect(result).toBe(true);
        
        // Restore original navigator
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      });
    });

    describe('buffer consideration', () => {
      it('accounts for 50MB buffer when checking availability', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 900000000,  // 900MB used, 100MB available
            }),
          },
          configurable: true,
        });

        // 60MB file + 50MB buffer = 110MB needed, but only 100MB available
        const result = await canStoreFile(60000000);

        expect(result).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    beforeEach(() => {
      // Mock sufficient storage by default
      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 10000000000, // 10GB
            usage: 1000000000,  // 1GB used
          }),
        },
        configurable: true,
      });
    });

    describe('file size limits', () => {
      it('validates audio file within limits', async () => {
        const audioFile = testUtils.createMockFile('test.mp3', 50 * 1024 * 1024, 'audio/mp3'); // 50MB

        await expect(validateFileSize(audioFile, 'audio')).resolves.toBeUndefined();
      });

      it('rejects audio file exceeding limits', async () => {
        const audioFile = testUtils.createMockFile('large-audio.mp3', 150 * 1024 * 1024, 'audio/mp3'); // 150MB

        await expect(validateFileSize(audioFile, 'audio')).rejects.toThrow('File "large-audio.mp3" is 150MB, which exceeds the 100MB limit for audio files.');
      });

      it('validates video file within limits', async () => {
        const videoFile = testUtils.createMockFile('test.mp4', 300 * 1024 * 1024, 'video/mp4'); // 300MB

        await expect(validateFileSize(videoFile, 'video')).resolves.toBeUndefined();
      });

      it('rejects video file exceeding limits', async () => {
        const videoFile = testUtils.createMockFile('large-video.mp4', 600 * 1024 * 1024, 'video/mp4'); // 600MB

        await expect(validateFileSize(videoFile, 'video')).rejects.toThrow('File "large-video.mp4" is 600MB, which exceeds the 500MB limit for video files.');
      });

      it('validates thumbnail file within limits', async () => {
        const thumbnailFile = testUtils.createMockFile('thumb.jpg', 2 * 1024 * 1024, 'image/jpeg'); // 2MB

        await expect(validateFileSize(thumbnailFile, 'thumbnail')).resolves.toBeUndefined();
      });

      it('rejects thumbnail file exceeding limits', async () => {
        const thumbnailFile = testUtils.createMockFile('large-thumb.jpg', 10 * 1024 * 1024, 'image/jpeg'); // 10MB

        await expect(validateFileSize(thumbnailFile, 'thumbnail')).rejects.toThrow('File "large-thumb.jpg" is 10MB, which exceeds the 5MB limit for thumbnail files.');
      });
    });

    describe('storage availability', () => {
      it('rejects file when not enough storage space', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 980000000,  // 980MB used, only 20MB available
            }),
          },
          configurable: true,
        });

        const audioFile = testUtils.createMockFile('test.mp3', 50 * 1024 * 1024, 'audio/mp3'); // 50MB

        await expect(validateFileSize(audioFile, 'audio')).rejects.toThrow('Not enough storage space available to save this 50MB file. Please free up some space and try again.');
      });
    });
  });

  describe('validateMultipleFiles', () => {
    const mockGetFileType = (file: File) => {
      if (file.type.startsWith('video/')) return 'video' as const;
      if (file.type.startsWith('image/')) return 'thumbnail' as const;
      return 'audio' as const;
    };

    beforeEach(() => {
      // Mock sufficient storage by default
      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 10000000000, // 10GB
            usage: 1000000000,  // 1GB used
          }),
        },
        configurable: true,
      });
    });

    describe('successful validation', () => {
      it('validates multiple files within limits', async () => {
        const files = [
          testUtils.createMockFile('audio1.mp3', 30 * 1024 * 1024, 'audio/mp3'), // 30MB
          testUtils.createMockFile('audio2.mp3', 40 * 1024 * 1024, 'audio/mp3'), // 40MB
          testUtils.createMockFile('thumb.jpg', 1 * 1024 * 1024, 'image/jpeg'),  // 1MB
        ];

        await expect(validateMultipleFiles(files, mockGetFileType)).resolves.toBeUndefined();
      });
    });

    describe('storage constraints', () => {
      it('rejects files when total size exceeds available storage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 950000000,  // 950MB used, 50MB available
            }),
          },
          configurable: true,
        });

        const files = [
          testUtils.createMockFile('audio1.mp3', 80 * 1024 * 1024, 'audio/mp3'), // 80MB
          testUtils.createMockFile('audio2.mp3', 50 * 1024 * 1024, 'audio/mp3'), // 50MB
        ]; // Total 130MB

        await expect(validateMultipleFiles(files, mockGetFileType)).rejects.toThrow('Not enough storage space for 2 files (130MB total). Please free up some space and try again.');
      });
    });

    describe('individual file validation', () => {
      it('rejects when individual file exceeds type limit', async () => {
        const files = [
          testUtils.createMockFile('normal.mp3', 30 * 1024 * 1024, 'audio/mp3'), // 30MB - OK
          testUtils.createMockFile('large.mp3', 150 * 1024 * 1024, 'audio/mp3'), // 150MB - exceeds audio limit
        ];

        await expect(validateMultipleFiles(files, mockGetFileType)).rejects.toThrow('File "large.mp3" is 150MB, which exceeds the 100MB limit for audio files.');
      });
    });

    describe('edge cases', () => {
      it('handles empty file array', async () => {
        await expect(validateMultipleFiles([], mockGetFileType)).resolves.toBeUndefined();
      });

      it('handles single file', async () => {
        const files = [testUtils.createMockFile('single.mp3', 50 * 1024 * 1024, 'audio/mp3')];

        await expect(validateMultipleFiles(files, mockGetFileType)).resolves.toBeUndefined();
      });
    });
  });

  describe('getStorageUsagePercentage', () => {
    describe('normal usage calculation', () => {
      it('calculates usage percentage correctly', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 750000000,  // 750MB
            }),
          },
          configurable: true,
        });

        const result = await getStorageUsagePercentage();

        expect(result).toBe(75); // 75%
      });

      it('handles zero quota', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 0,
              usage: 0,
            }),
          },
          configurable: true,
        });

        const result = await getStorageUsagePercentage();

        expect(result).toBe(0);
      });
    });

    describe('API unavailability', () => {
      it('returns 0 when quota API is not available', async () => {
        // Mock navigator without storage property
        const originalNavigator = global.navigator;
        Object.defineProperty(global, 'navigator', {
          value: {},
          configurable: true,
        });

        const result = await getStorageUsagePercentage();

        expect(result).toBe(0);
        
        // Restore original navigator
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      });
    });
  });

  describe('isStorageNearCapacity', () => {
    describe('normal usage levels', () => {
      it('returns no warnings for normal usage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 500000000,  // 500MB (50%)
            }),
          },
          configurable: true,
        });

        const result = await isStorageNearCapacity();

        expect(result).toEqual({
          warning: false,
          critical: false,
        });
      });

      it('returns warning for 80%+ usage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 850000000,  // 850MB (85%)
            }),
          },
          configurable: true,
        });

        const result = await isStorageNearCapacity();

        expect(result).toEqual({
          warning: true,
          critical: false,
        });
      });

      it('returns critical for 90%+ usage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 950000000,  // 950MB (95%)
            }),
          },
          configurable: true,
        });

        const result = await isStorageNearCapacity();

        expect(result).toEqual({
          warning: true,
          critical: true,
        });
      });
    });

    describe('edge cases', () => {
      it('handles exactly 80% usage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 800000000,  // 800MB (80%)
            }),
          },
          configurable: true,
        });

        const result = await isStorageNearCapacity();

        expect(result).toEqual({
          warning: true,
          critical: false,
        });
      });

      it('handles exactly 90% usage', async () => {
        Object.defineProperty(global.navigator, 'storage', {
          value: {
            estimate: jest.fn().mockResolvedValue({
              quota: 1000000000, // 1GB
              usage: 900000000,  // 900MB (90%)
            }),
          },
          configurable: true,
        });

        const result = await isStorageNearCapacity();

        expect(result).toEqual({
          warning: true,
          critical: true,
        });
      });
    });
  });

  describe('formatBytes', () => {
    describe('byte formatting', () => {
      it('formats zero bytes', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
      });

      it('formats bytes', () => {
        expect(formatBytes(512)).toBe('512 Bytes');
        expect(formatBytes(1023)).toBe('1023 Bytes');
      });

      it('formats kilobytes', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(102400)).toBe('100 KB');
      });

      it('formats megabytes', () => {
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
        expect(formatBytes(100 * 1024 * 1024)).toBe('100 MB');
      });

      it('formats gigabytes', () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
        expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
      });
    });

    describe('precision handling', () => {
      it('rounds to 2 decimal places', () => {
        expect(formatBytes(1536.789)).toBe('1.5 KB');
        expect(formatBytes(1024 * 1024 * 1.123456)).toBe('1.12 MB');
      });

      it('handles very small fractions', () => {
        expect(formatBytes(1025)).toBe('1 KB');
        expect(formatBytes(1100)).toBe('1.07 KB');
      });
    });
  });

  describe('getFileType', () => {
    describe('image files', () => {
      it('identifies image files as thumbnails', () => {
        const imageFile = testUtils.createMockFile('image.jpg', 1000, 'image/jpeg');
        expect(getFileType(imageFile)).toBe('thumbnail');

        const pngFile = testUtils.createMockFile('image.png', 1000, 'image/png');
        expect(getFileType(pngFile)).toBe('thumbnail');

        const gifFile = testUtils.createMockFile('image.gif', 1000, 'image/gif');
        expect(getFileType(gifFile)).toBe('thumbnail');
      });
    });

    describe('video files', () => {
      it('identifies video files by MIME type', () => {
        const videoFile = testUtils.createMockFile('video.mp4', 1000, 'video/mp4');
        expect(getFileType(videoFile)).toBe('video');

        const webmFile = testUtils.createMockFile('video.webm', 1000, 'video/webm');
        expect(getFileType(webmFile)).toBe('video');
      });

      it('identifies MP4 files by extension', () => {
        const mp4File = testUtils.createMockFile('video.mp4', 1000, 'application/octet-stream');
        expect(getFileType(mp4File)).toBe('video');

        const MP4File = testUtils.createMockFile('VIDEO.MP4', 1000, 'application/octet-stream');
        expect(getFileType(MP4File)).toBe('video');
      });
    });

    describe('audio files', () => {
      it('defaults to audio for other file types', () => {
        const audioFile = testUtils.createMockFile('audio.mp3', 1000, 'audio/mp3');
        expect(getFileType(audioFile)).toBe('audio');

        const unknownFile = testUtils.createMockFile('unknown.xyz', 1000, 'application/octet-stream');
        expect(getFileType(unknownFile)).toBe('audio');

        const textFile = testUtils.createMockFile('text.txt', 1000, 'text/plain');
        expect(getFileType(textFile)).toBe('audio');
      });
    });

    describe('edge cases', () => {
      it('handles files without extensions', () => {
        const noExtFile = testUtils.createMockFile('noextension', 1000, 'application/octet-stream');
        expect(getFileType(noExtFile)).toBe('audio');
      });

      it('handles files with multiple extensions', () => {
        const multiExtFile = testUtils.createMockFile('file.tar.mp4', 1000, 'application/octet-stream');
        expect(getFileType(multiExtFile)).toBe('video');
      });
    });
  });

  describe('integration tests', () => {
    it('validates complete storage workflow', async () => {
      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 1000000000, // 1GB
            usage: 600000000,  // 600MB (60%)
          }),
        },
        configurable: true,
      });

      const quota = await getStorageQuota();
      expect(quota?.available).toBe(400000000); // 400MB available

      const canStore = await canStoreFile(100000000); // 100MB file
      expect(canStore).toBe(true);

      const usagePercentage = await getStorageUsagePercentage();
      expect(usagePercentage).toBe(60);

      const capacity = await isStorageNearCapacity();
      expect(capacity).toEqual({ warning: false, critical: false });

      const audioFile = testUtils.createMockFile('test.mp3', 50 * 1024 * 1024, 'audio/mp3');
      await expect(validateFileSize(audioFile, 'audio')).resolves.toBeUndefined();
    });

    it('handles storage limits correctly', async () => {
      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: jest.fn().mockResolvedValue({
            quota: 1000000000, // 1GB
            usage: 950000000,  // 950MB (95%)
          }),
        },
        configurable: true,
      });

      const capacity = await isStorageNearCapacity();
      expect(capacity).toEqual({ warning: true, critical: true });

      const canStore = await canStoreFile(100000000); // 100MB file - should fail
      expect(canStore).toBe(false);

      const audioFile = testUtils.createMockFile('test.mp3', 100 * 1024 * 1024, 'audio/mp3');
      await expect(validateFileSize(audioFile, 'audio')).rejects.toThrow('Not enough storage space available');
    });
  });
});
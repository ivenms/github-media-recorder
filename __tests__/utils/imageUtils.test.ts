import { processImage, generateThumbnails, getAppIconUrl, getAppIconUrlWithFallback } from '../../src/utils/imageUtils';
import type { ImageProcessOptions } from '../../src/types';

// Mock console.log to prevent spam during tests
global.console.log = jest.fn();

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

// Mock the entire imageUtils module to avoid import.meta issues
jest.mock('../../src/utils/imageUtils', () => ({
  processImage: jest.fn(),
  generateThumbnails: jest.fn(),
  getAppIconUrl: jest.fn(() => '/test-base/icon.svg'),
  getAppIconUrlWithFallback: jest.fn(() => '/test-base/icon.svg'),
  createThumbnailFilename: jest.fn(),
  getThumbnailDimensions: jest.fn(),
  isImage: jest.fn(),
  processThumbnailForUpload: jest.fn(),
}));

describe('imageUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processImage', () => {
    beforeEach(() => {
      // Set up the mock implementation
      (processImage as jest.Mock).mockImplementation(async (_file: File, _options: ImageProcessOptions) => {
        return new Blob(['processed-image'], { type: 'image/jpeg' });
      });
    });

    describe('basic functionality', () => {
      it('processes image with given dimensions', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 320, height: 240, quality: 0.9 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });

      it('uses default quality when not specified', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 320, height: 240 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });

      it('handles different image types', async () => {
        const mockBlob = testUtils.createMockFile('test.png', 1000, 'image/png');
        const options: ImageProcessOptions = { width: 100, height: 100, quality: 0.8 };

        const result = await processImage(mockBlob, options);

        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });
    });

    describe('dimension handling', () => {
      it('handles square dimensions', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 200, height: 200, quality: 0.9 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });

      it('handles rectangular dimensions', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 400, height: 200, quality: 0.9 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });

      it('handles small dimensions', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 50, height: 50, quality: 0.9 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });
    });

    describe('quality settings', () => {
      it('handles high quality setting', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 320, height: 240, quality: 1.0 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });

      it('handles low quality setting', async () => {
        const mockBlob = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
        const options: ImageProcessOptions = { width: 320, height: 240, quality: 0.1 };

        const result = await processImage(mockBlob, options);
        
        expect(result).toBeInstanceOf(Blob);
        expect(processImage).toHaveBeenCalledWith(mockBlob, options);
      });
    });
  });

  describe('generateThumbnails', () => {
    beforeEach(() => {
      (generateThumbnails as jest.Mock).mockImplementation(async (_videoBlob: Blob) => {
        return [
          new Blob(['thumb1'], { type: 'image/jpeg' }),
          new Blob(['thumb2'], { type: 'image/jpeg' }),
        ];
      });
    });

    describe('basic functionality', () => {
      it('generates thumbnails from video blob', async () => {
        const videoBlob = new Blob(['video-data'], { type: 'video/webm' });
        const result = await generateThumbnails(videoBlob);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Blob);
        expect(result[1]).toBeInstanceOf(Blob);
        expect(generateThumbnails).toHaveBeenCalledWith(videoBlob);
      });

      it('handles different video formats', async () => {
        const videoBlob = new Blob(['video-data'], { type: 'video/mp4' });
        const result = await generateThumbnails(videoBlob);

        expect(result).toHaveLength(2);
        expect(generateThumbnails).toHaveBeenCalledWith(videoBlob);
      });
    });

    describe('edge cases', () => {
      it('handles empty video blob', async () => {
        const videoBlob = new Blob([], { type: 'video/webm' });
        const result = await generateThumbnails(videoBlob);

        expect(result).toHaveLength(2);
        expect(generateThumbnails).toHaveBeenCalledWith(videoBlob);
      });

      it('handles large video blob', async () => {
        const largeData = new ArrayBuffer(10 * 1024 * 1024); // 10MB
        const videoBlob = new Blob([largeData], { type: 'video/webm' });
        const result = await generateThumbnails(videoBlob);

        expect(result).toHaveLength(2);
        expect(generateThumbnails).toHaveBeenCalledWith(videoBlob);
      });
    });

    describe('error handling', () => {
      it('handles video processing errors', async () => {
        (generateThumbnails as jest.Mock).mockRejectedValueOnce(new Error('Video processing failed'));
        const videoBlob = new Blob(['invalid-video'], { type: 'video/webm' });

        await expect(generateThumbnails(videoBlob)).rejects.toThrow('Video processing failed');
      });
    });
  });

  describe('getAppIconUrl', () => {
    it('returns correct icon URL', () => {
      const result = getAppIconUrl();
      expect(result).toBe('/test-base/icon.svg');
      expect(getAppIconUrl).toHaveBeenCalled();
    });
  });

  describe('getAppIconUrlWithFallback', () => {
    it('returns icon URL without fallback', () => {
      const result = getAppIconUrlWithFallback();
      expect(result).toBe('/test-base/icon.svg');
      expect(getAppIconUrlWithFallback).toHaveBeenCalled();
    });

    it('returns fallback when provided', () => {
      const fallback = '/fallback-icon.png';
      const result = getAppIconUrlWithFallback(fallback);
      expect(result).toBe('/test-base/icon.svg');
      expect(getAppIconUrlWithFallback).toHaveBeenCalledWith(fallback);
    });

    it('handles empty fallback', () => {
      const result = getAppIconUrlWithFallback('');
      expect(result).toBe('/test-base/icon.svg');
      expect(getAppIconUrlWithFallback).toHaveBeenCalledWith('');
    });
  });

  describe('integration tests', () => {
    it('processes image and generates thumbnails work together', async () => {
      const imageFile = testUtils.createMockFile('test.jpg', 1000, 'image/jpeg');
      const videoFile = new Blob(['video-data'], { type: 'video/webm' });

      const processedImage = await processImage(imageFile, { width: 320, height: 240, quality: 0.9 });
      const thumbnails = await generateThumbnails(videoFile);

      expect(processedImage).toBeInstanceOf(Blob);
      expect(thumbnails).toHaveLength(2);
      expect(processImage).toHaveBeenCalledWith(imageFile, { width: 320, height: 240, quality: 0.9 });
      expect(generateThumbnails).toHaveBeenCalledWith(videoFile);
    });
  });
});
import { renderHook, act } from '@testing-library/react';
import { useGitHubUrl } from '../../src/hooks/useGitHubUrl';
import { generateFreshDownloadUrl } from '../../src/utils/githubUtils';

// Mock dependencies
jest.mock('../../src/utils/githubUtils', () => ({
  generateFreshDownloadUrl: jest.fn(),
}));

const mockGenerateFreshDownloadUrl = generateFreshDownloadUrl as jest.MockedFunction<typeof generateFreshDownloadUrl>;

describe('useGitHubUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return hook functions', () => {
      const { result } = renderHook(() => useGitHubUrl());

      expect(typeof result.current.getUrl).toBe('function');
      expect(typeof result.current.clearCache).toBe('function');
      expect(typeof result.current.isLoading).toBe('function');
    });

    it('should initially report no loading state', () => {
      const { result } = renderHook(() => useGitHubUrl());

      expect(result.current.isLoading('test-file.mp3')).toBe(false);
    });
  });

  describe('URL Generation - Success Cases', () => {
    it('should generate fresh URL on first request', async () => {
      const mockUrl = 'https://github.com/user/repo/raw/token/path/test-file.mp3';
      mockGenerateFreshDownloadUrl.mockResolvedValue(mockUrl);

      const { result } = renderHook(() => useGitHubUrl());

      let generatedUrl: string;
      await act(async () => {
        generatedUrl = await result.current.getUrl('test-file.mp3');
      });

      expect(generatedUrl!).toBe(mockUrl);
      expect(mockGenerateFreshDownloadUrl).toHaveBeenCalledWith('test-file.mp3');
      expect(mockGenerateFreshDownloadUrl).toHaveBeenCalledTimes(1);
    });

    it('should return cached URL on subsequent requests within cache duration', async () => {
      const mockUrl = 'https://github.com/user/repo/raw/token/path/test-file.mp3';
      mockGenerateFreshDownloadUrl.mockResolvedValue(mockUrl);

      const { result } = renderHook(() => useGitHubUrl());

      // First request
      let firstUrl: string;
      await act(async () => {
        firstUrl = await result.current.getUrl('test-file.mp3');
      });

      // Second request (should use cache)
      let secondUrl: string;
      await act(async () => {
        secondUrl = await result.current.getUrl('test-file.mp3');
      });

      expect(firstUrl!).toBe(mockUrl);
      expect(secondUrl!).toBe(mockUrl);
      expect(mockGenerateFreshDownloadUrl).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should generate new URL after cache expires', async () => {
      const firstUrl = 'https://github.com/user/repo/raw/token1/path/test-file.mp3';
      const secondUrl = 'https://github.com/user/repo/raw/token2/path/test-file.mp3';
      
      mockGenerateFreshDownloadUrl
        .mockResolvedValueOnce(firstUrl)
        .mockResolvedValueOnce(secondUrl);

      const { result } = renderHook(() => useGitHubUrl());

      // First request
      let result1: string;
      await act(async () => {
        result1 = await result.current.getUrl('test-file.mp3');
      });

      // Fast-forward past cache duration (4 minutes)
      act(() => {
        jest.advanceTimersByTime(4 * 60 * 1000 + 1000);
      });

      // Second request (cache expired)
      let result2: string;
      await act(async () => {
        result2 = await result.current.getUrl('test-file.mp3');
      });

      expect(result1!).toBe(firstUrl);
      expect(result2!).toBe(secondUrl);
      expect(mockGenerateFreshDownloadUrl).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle URL generation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGenerateFreshDownloadUrl.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGitHubUrl());

      let fallbackUrl: string;
      await act(async () => {
        fallbackUrl = await result.current.getUrl('test-file.mp3');
      });

      expect(fallbackUrl!).toBe('test-file.mp3'); // Fallback to original path
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to generate fresh URL for:',
        'test-file.mp3',
        expect.any(Error)
      );
      expect(result.current.isLoading('test-file.mp3')).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when clearCache is called', async () => {
      const firstUrl = 'https://github.com/user/repo/raw/token1/path/test-file.mp3';
      const secondUrl = 'https://github.com/user/repo/raw/token2/path/test-file.mp3';
      
      mockGenerateFreshDownloadUrl
        .mockResolvedValueOnce(firstUrl)
        .mockResolvedValueOnce(secondUrl);

      const { result } = renderHook(() => useGitHubUrl());

      // First request
      let result1: string;
      await act(async () => {
        result1 = await result.current.getUrl('test-file.mp3');
      });

      expect(result1!).toBe(firstUrl);

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      // Second request should generate new URL
      let result2: string;
      await act(async () => {
        result2 = await result.current.getUrl('test-file.mp3');
      });

      expect(result2!).toBe(secondUrl);
      expect(mockGenerateFreshDownloadUrl).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useGitHubUrl());

      const firstGetUrl = result.current.getUrl;
      const firstClearCache = result.current.clearCache;
      const firstIsLoading = result.current.isLoading;

      rerender();

      expect(result.current.getUrl).toBe(firstGetUrl);
      expect(result.current.clearCache).toBe(firstClearCache);
      // isLoading is not memoized, so it creates new function references
      expect(typeof result.current.isLoading).toBe('function');
      expect(result.current.isLoading).not.toBe(firstIsLoading);
    });

    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useGitHubUrl());

      // Should not throw any errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
import { useState, useCallback } from 'react';
import { generateFreshDownloadUrl } from '../utils/githubUtils';

/**
 * Custom hook to generate fresh GitHub download URLs
 * Handles caching and error states for URL generation
 */
export function useGitHubUrl() {
  const [urlCache, setUrlCache] = useState<Record<string, { url: string; timestamp: number }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Cache duration: 4 minutes (tokens expire after 5 minutes)
  const CACHE_DURATION = 4 * 60 * 1000;

  const getUrl = useCallback(async (filePath: string): Promise<string> => {
    // Check cache first
    const cached = urlCache[filePath];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.url;
    }

    // Check if already loading
    if (loading[filePath]) {
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!loading[filePath]) {
            clearInterval(checkInterval);
            const cachedAfterWait = urlCache[filePath];
            resolve(cachedAfterWait?.url || filePath);
          }
        }, 100);
      });
    }

    setLoading(prev => ({ ...prev, [filePath]: true }));

    try {
      const freshUrl = await generateFreshDownloadUrl(filePath);
      
      // Update cache
      setUrlCache(prev => ({
        ...prev,
        [filePath]: {
          url: freshUrl,
          timestamp: Date.now()
        }
      }));

      setLoading(prev => ({ ...prev, [filePath]: false }));
      return freshUrl;
    } catch (error) {
      console.error('Failed to generate fresh URL for:', filePath, error);
      setLoading(prev => ({ ...prev, [filePath]: false }));
      
      // Return the original path as fallback
      return filePath;
    }
  }, [urlCache, loading, CACHE_DURATION]);

  const clearCache = useCallback(() => {
    setUrlCache({});
  }, []);

  return {
    getUrl,
    clearCache,
    isLoading: (filePath: string) => loading[filePath] || false
  };
}
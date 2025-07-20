// Utility for fetching files from GitHub repository
import type { FileRecord, GitHubFile, GitHubConfig } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

function getGitHubConfig() {
  const authState = useAuthStore.getState();
  const settingsState = useSettingsStore.getState();
  
  if (!authState.isAuthenticated || !authState.githubConfig || !settingsState.appSettings) {
    return null;
  }
  
  const { githubConfig } = authState;
  const { appSettings } = settingsState;
  
  if (!githubConfig.token || !githubConfig.owner || !appSettings.repo) {
    return null;
  }
  
  return {
    token: githubConfig.token,
    owner: githubConfig.owner,
    repo: appSettings.repo,
    path: appSettings.path.endsWith('/') ? appSettings.path : appSettings.path + '/',
    thumbnailPath: appSettings.thumbnailPath.endsWith('/') ? appSettings.thumbnailPath : appSettings.thumbnailPath + '/',
    thumbnailWidth: appSettings.thumbnailWidth || 320,
    thumbnailHeight: appSettings.thumbnailHeight || 240
  };
}


/**
 * Generate a fresh download URL using our PAT instead of temporary token
 */
export async function generateFreshDownloadUrl(filePath: string): Promise<string> {
  const config = getGitHubConfig();
  if (!config) {
    throw new Error('GitHub configuration not available');
  }

  try {
    // Use Contents API to get fresh download URL
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`,
      {
        headers: { 
          Authorization: `Bearer ${config.token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get fresh URL: ${response.status}`);
    }

    const fileData = await response.json();
    return fileData.download_url || '';
  } catch (error) {
    console.error('Failed to generate fresh download URL:', error);
    // Fallback to raw URL without token
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main/${filePath}`;
  }
}

// Helper to parse metadata from file name and determine type
// Only handles media files (audio/video), not thumbnails
function parseRemoteFile(file: GitHubFile): FileRecord | null {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return null;
  
  // Only handle media files - thumbnails are handled separately
  let type: 'audio' | 'video';
  if (['mp3', 'wav', 'm4a', 'aac'].includes(extension)) {
    type = 'audio';
  } else if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
    type = 'video';
  } else {
    // Skip non-media files (including thumbnails)
    return null;
  }
  
  return {
    id: `remote-${file.sha}`,
    name: fileName,
    type,
    mimeType: type === 'video' ? 'video/mp4' : 'audio/mp3',
    size: file.size,
    duration: 0,
    created: Date.now(),
    url: file.path, // Store file path instead of temporary download_url
    uploaded: true,
    file: undefined,
    sha: file.sha
  } as unknown as FileRecord;
}

export async function fetchRemoteFiles(): Promise<FileRecord[]> {
  const config = getGitHubConfig();
  if (!config) {
    throw new Error('GitHub configuration not found. Please check your settings.');
  }
  
  try {
    const files: FileRecord[] = [];
    
    // First, validate that the repository exists
    console.log('Validating repository:', `${config.owner}/${config.repo}`);
    const repoResponse = await fetchWithRetry(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: { Authorization: `Bearer ${config.token}` }
      }
    );
    
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`Repository '${config.owner}/${config.repo}' not found. Please check the repository name and your access permissions.`);
      } else if (repoResponse.status === 401) {
        throw new Error('Invalid GitHub token or insufficient permissions');
      } else if (repoResponse.status === 403) {
        throw new Error('GitHub API rate limit exceeded or repository access denied');
      } else {
        throw new Error(`Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`);
      }
    }
    
    // Fetch media files
    console.log('Fetching media files from:', config.path);
    const mediaResponse = await fetchWithRetry(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path.replace(/\/$/, '')}`,
      {
        headers: { Authorization: `Bearer ${config.token}` }
      }
    );
    
    if (mediaResponse.ok) {
      const mediaFiles: GitHubFile[] = await mediaResponse.json();
      if (Array.isArray(mediaFiles)) {
        // Process media files with URL validation
        const mediaPromises = mediaFiles
          .filter(file => file.type === 'file')
          .map(async (file) => {
            const parsed = parseRemoteFile(file);
            if (parsed && parsed.url) {
              try {
                // Validate media file URL with fallbacks
                const mediaPath = config.path.replace(/\/$/, '');
                const validatedUrl = await validateUrlWithFallbacks(
                  parsed.url, 
                  config, 
                  mediaPath, 
                  file.name,
                  1 // Only 1 retry for media files to avoid long delays
                );
                
                // Update the parsed file with validated URL
                parsed.url = validatedUrl;
                files.push(parsed);
              } catch (error) {
                console.warn(`Skipping media file ${file.name}:`, error);
                // Still add the file with original URL as fallback
                files.push(parsed);
              }
            }
          });
        
        // Wait for all validations to complete
        await Promise.all(mediaPromises);
      }
    } else if (mediaResponse.status === 404) {
      console.log('Media path not found (404), continuing...');
    } else if (mediaResponse.status === 401) {
      throw new Error('Invalid GitHub token or insufficient permissions');
    } else if (mediaResponse.status === 403) {
      throw new Error('GitHub API rate limit exceeded or repository access denied');
    } else {
      throw new Error(`Failed to access repository: ${mediaResponse.status} ${mediaResponse.statusText}`);
    }
    
    // Note: Thumbnail files are not included in the media files list
    // They are handled separately by the useCombinedFiles hook
    
    console.log(`Fetched ${files.length} remote files`);
    return files;
  } catch (error) {
    console.error('Error fetching remote files:', error);
    throw error; // Re-throw to be caught by FileList component
  }
}

/**
 * Fetch with retry logic and web cache support for handling intermittent 404s
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        cache: 'default' // Use browser cache with revalidation
      });
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (400-499) except 404 which might be intermittent
      if (response.status >= 400 && response.status < 500 && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network error');
      
      // Don't retry on network errors that aren't timeouts
      if (error instanceof TypeError && !error.message.includes('timeout')) {
        throw error;
      }
    }
    
    // Wait before retry with exponential backoff
    if (attempt < maxRetries - 1) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 second delay
      await new Promise(resolve => setTimeout(resolve, delay));
      console.warn(`Retrying request to ${url} (attempt ${attempt + 2}/${maxRetries})`);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generate fallback URLs for GitHub files
 */
function generateFallbackUrls(originalUrl: string, config: GitHubConfig, filePath: string, fileName: string): string[] {
  // Remove any existing query parameters (like tokens)
  const cleanUrl = originalUrl.split('?')[0];
  
  return [
    originalUrl, // Original download_url (with token if present)
    cleanUrl, // Same without query params
    `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main/${filePath}/${encodeURIComponent(fileName)}`, // Properly encoded
    `https://github.com/${config.owner}/${config.repo}/raw/main/${filePath}/${encodeURIComponent(fileName)}`, // Alternative raw format
    `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@main/${filePath}/${encodeURIComponent(fileName)}` // JSDelivr CDN (public repos only)
  ];
}

/**
 * Validate URL with multiple fallbacks
 */
async function validateUrlWithFallbacks(
  originalUrl: string, 
  config: GitHubConfig, 
  filePath: string, 
  fileName: string,
  maxRetries = 2
): Promise<string> {
  const fallbackUrls = generateFallbackUrls(originalUrl, config, filePath, fileName);
  
  for (const url of fallbackUrls) {
    try {
      const response = await fetchWithRetry(url, {}, maxRetries);
      if (response.ok) {
        return url;
      }
    } catch (error) {
      console.warn(`Failed URL: ${url}`, error);
      continue; // Try next URL
    }
  }
  
  // If all URLs fail, return the original and let the browser handle it
  console.warn(`All fallback URLs failed for ${fileName}, using original: ${originalUrl}`);
  return originalUrl;
}


// Fetch remote thumbnail files with web cache and retry logic
export async function fetchRemoteThumbnails(): Promise<Record<string, { url: string; isLocal: false }>> {
  const config = getGitHubConfig();
  if (!config) {
    throw new Error('GitHub configuration not found. Please check your settings.');
  }
  
  const thumbnails: Record<string, { url: string; isLocal: false }> = {};
  
  try {
    console.log('Fetching thumbnail files from:', config.thumbnailPath);
    
    const thumbnailResponse = await fetchWithRetry(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.thumbnailPath.replace(/\/$/, '')}`,
      {
        headers: { Authorization: `Bearer ${config.token}` }
      }
    );
    
    if (thumbnailResponse.ok) {
      const thumbnailFiles: GitHubFile[] = await thumbnailResponse.json();
      if (Array.isArray(thumbnailFiles)) {
        // Process thumbnails with validation
        const thumbnailPromises = thumbnailFiles
          .filter(file => {
            if (file.type !== 'file') return false;
            const extension = file.name.split('.').pop()?.toLowerCase();
            return extension && ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
          })
          .map(async (file) => {
            try {
              const baseName = file.name.replace(/\.[^.]+$/, '');
              
              // Store file path instead of temporary download URL
              thumbnails[baseName] = {
                url: file.path, // Store path, will generate fresh URL when needed
                isLocal: false
              };
            } catch (error) {
              console.warn(`Skipping thumbnail ${file.name}:`, error);
              // Continue with other thumbnails
            }
          });
        
        // Wait for all validations to complete
        await Promise.all(thumbnailPromises);
      }
    } else if (thumbnailResponse.status === 404) {
      console.log('Thumbnail path not found (404), continuing...');
    } else if (thumbnailResponse.status === 401) {
      throw new Error('Invalid GitHub token or insufficient permissions');
    } else if (thumbnailResponse.status === 403) {
      throw new Error('GitHub API rate limit exceeded or repository access denied');
    } else {
      throw new Error(`Failed to access repository: ${thumbnailResponse.status} ${thumbnailResponse.statusText}`);
    }
    
    console.log(`Fetched ${Object.keys(thumbnails).length} remote thumbnails with web cache support`);
    return thumbnails;
  } catch (error) {
    console.error('Error fetching remote thumbnails:', error);
    throw error;
  }
}

// Helper to extract date from filename for sorting
export function extractDateFromFilename(filename: string): Date {
  // Expected format: CATEGORY_TITLE_AUTHOR_DATE.ext
  const match = filename.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if (match) {
    return new Date(match[1]);
  }
  return new Date(0); // Default to epoch if no date found
}
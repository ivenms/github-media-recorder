// Utility for fetching files from GitHub repository
import type { FileRecord } from '../types';
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

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
  type: 'file' | 'dir';
}


// Helper to parse metadata from file name and determine type
function parseRemoteFile(file: GitHubFile): FileRecord | null {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return null;
  
  // Determine file type based on extension
  let type: 'audio' | 'video' | 'thumbnail';
  if (['mp3', 'wav', 'm4a', 'aac'].includes(extension)) {
    type = 'audio';
  } else if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
    type = 'video';
  } else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    type = 'thumbnail';
  } else {
    return null; // Skip unsupported files
  }
  
  return {
    id: `remote-${file.sha}`,
    name: fileName,
    type,
    mimeType: type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mp3' : 'image/jpeg',
    size: file.size,
    duration: 0,
    created: Date.now(),
    url: file.download_url,
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
    const repoResponse = await fetch(
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
    const mediaResponse = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path.replace(/\/$/, '')}`,
      {
        headers: { Authorization: `Bearer ${config.token}` }
      }
    );
    
    if (mediaResponse.ok) {
      const mediaFiles: GitHubFile[] = await mediaResponse.json();
      if (Array.isArray(mediaFiles)) {
        mediaFiles.forEach(file => {
          if (file.type === 'file') {
            const parsed = parseRemoteFile(file);
            if (parsed) files.push(parsed);
          }
        });
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
    
    // Fetch thumbnail files
    console.log('Fetching thumbnail files from:', config.thumbnailPath);
    const thumbnailResponse = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.thumbnailPath.replace(/\/$/, '')}`,
      {
        headers: { Authorization: `Bearer ${config.token}` }
      }
    );
    
    if (thumbnailResponse.ok) {
      const thumbnailFiles: GitHubFile[] = await thumbnailResponse.json();
      if (Array.isArray(thumbnailFiles)) {
        thumbnailFiles.forEach(file => {
          if (file.type === 'file') {
            const parsed = parseRemoteFile(file);
            if (parsed) files.push(parsed);
          }
        });
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
    
    console.log(`Fetched ${files.length} remote files`);
    return files;
  } catch (error) {
    console.error('Error fetching remote files:', error);
    throw error; // Re-throw to be caught by FileList component
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
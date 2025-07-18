// Utility for fetching files from GitHub repository
import type { AppSettings } from '../types';
import { getStoredToken, getStoredUsername } from './tokenAuth';
import { LOCALSTORAGE_KEYS } from './appConfig';

function getGitHubConfig() {
  const token = getStoredToken();
  const username = getStoredUsername();
  const raw = localStorage.getItem(LOCALSTORAGE_KEYS.githubSettings);
  
  if (!token || !username || !raw) {
    return null;
  }
  
  try {
    const settings: AppSettings = JSON.parse(raw);
    return {
      token,
      owner: username,
      repo: settings.repo,
      path: settings.path.endsWith('/') ? settings.path : settings.path + '/',
      thumbnailPath: settings.thumbnailPath.endsWith('/') ? settings.thumbnailPath : settings.thumbnailPath + '/',
      thumbnailWidth: settings.thumbnailWidth || 320,
      thumbnailHeight: settings.thumbnailHeight || 240
    };
  } catch {
    return null;
  }
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
  type: 'file' | 'dir';
}

interface RemoteFile {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'thumbnail';
  size: number;
  url: string;
  uploaded: boolean;
  uploadedAt?: string;
  sha: string;
}

// Helper to parse metadata from file name and determine type
function parseRemoteFile(file: GitHubFile, basePath: string): RemoteFile | null {
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
    size: file.size,
    url: file.download_url,
    uploaded: true,
    sha: file.sha
  };
}

export async function fetchRemoteFiles(): Promise<RemoteFile[]> {
  const config = getGitHubConfig();
  if (!config) {
    console.log('GitHub config not available, skipping remote files');
    return [];
  }
  
  try {
    const files: RemoteFile[] = [];
    
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
            const parsed = parseRemoteFile(file, config.path);
            if (parsed) files.push(parsed);
          }
        });
      }
    } else if (mediaResponse.status !== 404) {
      console.error('Failed to fetch media files:', mediaResponse.status);
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
            const parsed = parseRemoteFile(file, config.thumbnailPath);
            if (parsed) files.push(parsed);
          }
        });
      }
    } else if (thumbnailResponse.status !== 404) {
      console.error('Failed to fetch thumbnail files:', thumbnailResponse.status);
    }
    
    console.log(`Fetched ${files.length} remote files`);
    return files;
  } catch (error) {
    console.error('Error fetching remote files:', error);
    return [];
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
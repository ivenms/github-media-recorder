// ============================================================================
// Core Application Types
// ============================================================================

// Media file types
export type MediaType = 'audio' | 'video';

export interface RecordingFile {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  size: number;
  duration: number;
  created: number;
  url: string;
  thumbnailUrl?: string;
  uploaded?: boolean;
  uploadProgress?: number;
  file?: Blob;
}

export interface UploadStatus {
  fileId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// App settings for repository and preferences
export interface AppSettings {
  repo: string;
  path: string;
  thumbnailPath: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  customCategories?: MediaCategory[];
}

// GitHub settings for API and storage (legacy - keeping for compatibility)
export interface GitHubSettings {
  token: string;
  owner: string;
  repo: string;
  audioFormat?: 'mp3' | 'wav'; // Optional for utils, required for settings
  path?: string; // Added for Settings usage
}

// Upload state for UploadManager
export interface UploadState {
  [id: string]: {
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
  };
}

export type MediaCategory = {
  id: string;
  name: string;
}; 

export interface ParsedMediaFileName {
  category: string;
  title: string;
  author: string;
  date: string;
  extension: string;
}

export interface ThumbnailFile {
  id: string;
  name: string;
  type: 'thumbnail';
  url: string;
  thumbnailUrl?: string;
}

export interface UploadProgress {
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export interface ModalState {
  type: 'alert' | 'confirm' | null;
  message: string;
  onConfirm?: () => void;
}

export interface FileMetadata {
  id?: string;
  name: string;
  type: MediaType | 'thumbnail';
  mimeType: string;
  size: number;
  duration?: number;
  created: number;
  thumbnailUrl?: string;
  uploaded?: boolean;
  uploadProgress?: number;
}

export interface FileRecord extends FileMetadata {
  id: string;
  file: Blob;
  url?: string;
  base64Data?: string; // For persistent storage
}

// Basic GitHub auth config (stored in auth store)
export interface GitHubAuthConfig {
  token: string;
  owner: string;
  repo: string;
}

// Full GitHub config (combines auth + settings for utils)
export interface GitHubConfig extends GitHubAuthConfig {
  path: string;
  thumbnailPath: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
}

export interface CreateTreeBody {
  tree: GitTreeItem[];
  base_tree?: string;
}

export interface CreateCommitBody {
  message: string;
  tree: string;
  parents?: string[];
}

export interface EnhancedFileRecord extends FileRecord {
  isLocal: boolean;
}

// ============================================================================
// Re-exports from organized type files
// ============================================================================

// Hook types
export * from './hooks';

// Component types  
export * from './components';

// Utility types
export * from './utils';

// Store types
export * from './stores';
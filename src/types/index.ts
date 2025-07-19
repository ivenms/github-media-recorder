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

// Props for AudioRecorder
export interface AudioRecorderProps {
  audioFormat: 'mp3' | 'wav';
  onNavigateToLibrary?: (highlightId?: string) => void;
}

// Props for FileList
export interface FileListProps {
  highlightId?: string;
}

// Props for Settings
export interface SettingsProps {
  audioFormat: 'mp3' | 'wav';
  setAudioFormat: (format: 'mp3' | 'wav') => void;
  onLogout: () => void;
}

// Props for TokenSetup
export interface TokenSetupProps {
  onSuccess: () => void;
}


// Options for useMediaRecorder hook
export interface UseMediaRecorderOptions {
  audio?: boolean;
  video?: boolean;
  mimeType?: string;
}

// TODO: Define more specific types for fileUtils and mediaConverter if needed
// TODO: Add types for FileList and VideoRecorder if props are added in the future 

export type MediaCategory = {
  id: string;
  name: string;
}; 

export interface ParsedMediaFileName {
  category: string;
  title: string;
  author: string;
  date: string;
}

export interface EditFileModalProps {
  file: any;
  onClose: () => void;
  onSave: (fileId?: string) => void;
  thumbnail?: any;
}
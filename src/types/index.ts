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

// GitHub settings for API and storage
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
}

// Props for Settings
export interface SettingsProps {
  audioFormat: 'mp3' | 'wav';
  setAudioFormat: (format: 'mp3' | 'wav') => void;
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
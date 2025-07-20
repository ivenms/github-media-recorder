// Hook-related type definitions

// useFileConverter hook
export type ConvertType = 'mp3' | 'mp4';

// useAuth hook
export interface UseAuthReturn {
  authenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
}

// useAudioSave hook
export interface UseAudioSaveParams {
  audioUrl: string | null;
  audioFormat: string;
  title: string;
  author: string;
  category: string;
  date: string;
  duration: number;
  thumbnail: File | null;
  validateInputs: () => boolean;
  convert: (type: ConvertType, input: Uint8Array) => Promise<Uint8Array | null>;
  convertProgress?: number;
}


// Options for useMediaRecorder hook
export interface UseMediaRecorderOptions {
  audio?: boolean;
  video?: boolean;
  mimeType?: string;
}

// useCombinedFiles hook
export interface UseCombinedFilesReturn {
  files: import('./index').EnhancedFileRecord[];
  thumbnails: Record<string, import('./index').FileRecord & {isLocal: boolean}>;
  isLoading: boolean;
  remoteError: string | null;
  uploadState: Record<string, import('./index').UploadProgress>;
  loadFilesWithThumbnails: () => Promise<void>;
  refreshAllFiles: () => Promise<void>;
  forceRefreshFiles: () => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
  setUploadProgress: (fileId: string, progress: import('./index').UploadProgress) => void;
  setRemoteError: (error: string | null) => void;
  // Fresh state access methods (for async operations)
  getCurrentFiles: () => import('./index').EnhancedFileRecord[];
  getCurrentThumbnails: () => Record<string, import('./index').FileRecord & {isLocal: boolean}>;
}

// useUploadManager hook
export interface UseUploadManagerReturn {
  uploadFile: (file: import('./index').EnhancedFileRecord) => Promise<void>;
  retryUpload: (file: import('./index').EnhancedFileRecord) => Promise<void>;
  getCurrentFiles: () => import('./index').EnhancedFileRecord[];
  getCurrentThumbnails: () => Record<string, import('./index').FileRecord & {isLocal: boolean}>;
}


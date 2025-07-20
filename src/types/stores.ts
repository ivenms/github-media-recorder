// Store state type definitions
import type { FileRecord, UploadProgress, EnhancedFileRecord, GitHubAuthConfig, AppSettings } from './index';

// Screen navigation type
export type Screen = 'audio' | 'video' | 'library' | 'settings';

// filesStore
export interface FilesState {
  // File management state
  files: EnhancedFileRecord[];
  localFiles: FileRecord[];
  isLoading: boolean;
  uploadState: Record<string, UploadProgress>;
  lastRefresh: number;
  remoteError: string | null;

  // Actions
  loadFiles: () => Promise<void>;
  getCombinedFiles: () => EnhancedFileRecord[];
  addFile: (file: FileRecord) => void;
  saveFile: (fileBlob: Blob, metadata: Omit<FileRecord, 'id' | 'file' | 'url' | 'base64Data'>) => Promise<FileRecord>;
  removeFile: (fileId: string) => Promise<void>;
  updateFile: (fileId: string, updates: Partial<FileRecord>) => void;
  updateFileWithThumbnail: (fileId: string, newName: string, thumbnailFile?: File | null) => Promise<void>;
  setUploadProgress: (fileId: string, progress: UploadProgress) => void;
  clearUploadProgress: (fileId: string) => void;
  refreshFiles: () => Promise<void>;
  setRemoteError: (error: string | null) => void;
  reset: () => Promise<void>;
}

// authStore
export interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  githubConfig: GitHubAuthConfig | null;
  userInfo: {
    login?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  tokenTimestamp: number | null;

  // Actions
  login: (config: GitHubAuthConfig, userInfo?: unknown) => void;
  logout: () => void;
  updateConfig: (config: Partial<GitHubAuthConfig>) => void;
  setUserInfo: (userInfo: unknown) => void;
}

// uiStore
export interface UIState {
  // Navigation state
  currentScreen: Screen;
  previousScreen: Screen | null;
  highlightFileId?: string;

  // Modal state
  modal: {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error' | null;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    data?: unknown;
    onConfirm?: () => void;
    onCancel?: () => void;
  };

  // Loading states
  isUploading: boolean;
  isProcessing: boolean;

  // Actions
  setScreen: (screen: Screen, highlightId?: string) => void;
  goBack: () => void;
  openModal: (modal: Partial<UIState['modal']>) => void;
  closeModal: () => void;
  setUploading: (uploading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

// settingsStore
export interface SettingsState {
  // App settings
  audioFormat: 'mp3' | 'wav';
  appSettings: AppSettings | null;

  // Actions
  setAudioFormat: (format: 'mp3' | 'wav') => void;
  setAppSettings: (settings: AppSettings) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  reset: () => void;
}

// gitStore
export interface GitState {
  // Remote files state
  remoteFiles: FileRecord[];
  remoteThumbnails: Record<string, { url: string; isLocal: false }>;
  isLoadingRemote: boolean;
  lastRemoteFetch: number;
  remoteError: string | null;
  lastCommitTimestamp: number;

  // Actions
  fetchRemoteFiles: (forceRefresh?: boolean) => Promise<void>;
  autoRefreshIfStale: () => Promise<void>;
  setRemoteError: (error: string | null) => void;
  invalidateCache: () => void;
  reset: () => void;
}
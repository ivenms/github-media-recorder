import { create } from 'zustand';
import type { FileRecord, UploadProgress, EnhancedFileRecord } from '../types';
import { listFiles, deleteFile } from '../utils/fileUtils';

interface FilesState {
  // File management state
  files: EnhancedFileRecord[];
  isLoading: boolean;
  uploadState: Record<string, UploadProgress>;
  lastRefresh: number;

  // Actions
  loadFiles: () => Promise<void>;
  addFile: (file: FileRecord) => void;
  removeFile: (fileId: string) => Promise<void>;
  updateFile: (fileId: string, updates: Partial<FileRecord>) => void;
  setUploadProgress: (fileId: string, progress: UploadProgress) => void;
  clearUploadProgress: (fileId: string) => void;
  refreshFiles: () => Promise<void>;
  reset: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  isLoading: false,
  uploadState: {},
  lastRefresh: 0,

  loadFiles: async () => {
    set({ isLoading: true });
    try {
      const fileRecords = await listFiles();
      const enhancedFiles: EnhancedFileRecord[] = fileRecords.map((file: FileRecord) => ({
        ...file,
        isLocal: true
      }));
      
      set({ 
        files: enhancedFiles,
        isLoading: false,
        lastRefresh: Date.now()
      });
    } catch (error) {
      console.error('Failed to load files:', error);
      set({ isLoading: false });
    }
  },

  addFile: (file: FileRecord) => {
    const enhancedFile: EnhancedFileRecord = {
      ...file,
      isLocal: true
    };
    
    set(state => ({
      files: [enhancedFile, ...state.files],
    }));
  },

  removeFile: async (fileId: string) => {
    try {
      await deleteFile(fileId);
      set(state => {
        const newUploadState: Record<string, UploadProgress> = { ...state.uploadState };
        delete newUploadState[fileId];
        return {
          files: state.files.filter(f => f.id !== fileId),
          uploadState: newUploadState
        };
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  updateFile: (fileId: string, updates: Partial<FileRecord>) => {
    set(state => ({
      files: state.files.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      ),
    }));
  },

  setUploadProgress: (fileId: string, progress: UploadProgress) => {
    set(state => ({
      uploadState: {
        ...state.uploadState,
        [fileId]: progress,
      },
    }));

    // Update file upload status if completed
    if (progress.status === 'success') {
      get().updateFile(fileId, { uploaded: true, uploadProgress: 100 });
    }
  },

  clearUploadProgress: (fileId: string) => {
    set(state => {
      const newUploadState: Record<string, UploadProgress> = { ...state.uploadState };
      delete newUploadState[fileId];
      return { uploadState: newUploadState };
    });
  },

  refreshFiles: async () => {
    await get().loadFiles();
  },

  reset: () => {
    set({
      files: [],
      isLoading: false,
      uploadState: {},
      lastRefresh: 0,
    });
  },
}));
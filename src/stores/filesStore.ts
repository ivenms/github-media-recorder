import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileRecord, UploadProgress, EnhancedFileRecord, FilesState } from '../types';
import { useGitStore } from './gitStore';
import { createFileRecord, restoreFileRecord, cleanupBlobUrls } from '../utils/persistentStorage';
import { combineAndDeduplicateFiles, findFilesToRemove } from '../utils/fileDeduplication';

export const useFilesStore = create<FilesState>()(
  persist(
    (set, get) => ({
  files: [],
  localFiles: [],
  isLoading: false,
  uploadState: {},
  lastRefresh: 0,
  remoteError: null,

  loadFiles: async () => {
    const { isLoading } = get();
    
    // Prevent duplicate calls when already loading
    if (isLoading) {
      return;
    }
    
    set({ isLoading: true, remoteError: null });
    try {
      const { localFiles } = get();
      
      // Restore local files from persistence (recreate blob URLs if needed)
      const restoredLocalFiles = await Promise.all(localFiles.map(restoreFileRecord));

      // Get remote files from gitStore
      let remoteFiles: FileRecord[] = [];
      try {
        const gitStore = useGitStore.getState();
        await gitStore.fetchRemoteFiles();
        // Re-get the state after the async operation completes
        const updatedGitStore = useGitStore.getState();
        remoteFiles = updatedGitStore.remoteFiles;
      } catch (remoteError) {
        const errorMessage = remoteError instanceof Error ? remoteError.message : 'Failed to fetch remote files';
        set({ remoteError: errorMessage });
        console.error('Failed to fetch remote files:', remoteError);
        // Continue with local files only
      }

      // Use utility to combine and deduplicate files
      const combinedFiles = combineAndDeduplicateFiles(restoredLocalFiles, remoteFiles);
      
      set({ 
        localFiles: restoredLocalFiles, // Update with restored files
        files: combinedFiles,
        isLoading: false,
        lastRefresh: Date.now()
      });
    } catch (error) {
      console.error('Failed to load files:', error);
      set({ isLoading: false });
    }
  },

  // Get combined local and remote files (method to be used by components)
  getCombinedFiles: () => {
    const { files } = get();
    return files;
  },

  addFile: (file: FileRecord) => {
    const enhancedFile: EnhancedFileRecord = {
      ...file,
      isLocal: true
    };
    
    set(state => ({
      localFiles: [file, ...state.localFiles],
      files: [enhancedFile, ...state.files],
    }));
  },

  saveFile: async (fileBlob: Blob, metadata: Omit<FileRecord, 'id' | 'file' | 'url' | 'base64Data'>) => {
    try {
      const fileRecord = await createFileRecord(fileBlob, metadata);
      get().addFile(fileRecord);
      return fileRecord;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  },

  removeFile: async (fileId: string) => {
    try {
      const state = get();
      const { filesToRemove, cleanup } = findFilesToRemove(state.localFiles, fileId);
      
      // Cleanup blob URLs and IndexedDB entries
      await cleanupBlobUrls(cleanup);

      const newUploadState: Record<string, UploadProgress> = { ...state.uploadState };
      filesToRemove.forEach(id => delete newUploadState[id]);
      
      set({
        localFiles: state.localFiles.filter(f => !filesToRemove.includes(f.id)),
        files: state.files.filter(f => !filesToRemove.includes(f.id)),
        uploadState: newUploadState
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  updateFile: (fileId: string, updates: Partial<FileRecord>) => {
    set(state => ({
      localFiles: state.localFiles.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      ),
      files: state.files.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      ),
    }));
  },

  updateFileWithThumbnail: async (
    fileId: string, 
    newName: string, 
    thumbnailFile?: File | null
  ) => {
    try {
      const state = get();
      const fileToUpdate = state.localFiles.find(f => f.id === fileId);
      if (!fileToUpdate) {
        throw new Error('File not found');
      }

      const oldBaseName = fileToUpdate.name.replace(/\.[^.]+$/, '');
      const newBaseName = newName.replace(/\.[^.]+$/, '');
      const filenameChanged = oldBaseName !== newBaseName;

      // Update the main file in store
      get().updateFile(fileId, { name: newName });

      // Handle thumbnail updates
      if (thumbnailFile) {
        // New thumbnail uploaded - save it with the new filename
        const thumbnailName = `${newBaseName}.jpg`;
        
        // Delete any existing thumbnail for this media file (old or current basename)
        const currentState = get();
        const existingThumbnails = currentState.localFiles.filter(f => 
          f.type === 'thumbnail' && 
          (f.name === `${oldBaseName}.jpg` || f.name === `${newBaseName}.jpg`)
        );
        
        // Cleanup existing thumbnails
        await cleanupBlobUrls(existingThumbnails);
        
        // Create new thumbnail record with persistence support
        const newThumbnailRecord = await createFileRecord(thumbnailFile, {
          name: thumbnailName,
          type: 'thumbnail',
          mimeType: 'image/jpeg',
          size: thumbnailFile.size,
          duration: 0,
          created: Date.now()
        });
        
        // Remove existing thumbnails and add the new one in one update
        set(state => {
          const existingThumbnailIds = existingThumbnails.map(t => t.id);
          return {
            localFiles: [
              ...state.localFiles.filter(f => !existingThumbnailIds.includes(f.id)),
              newThumbnailRecord
            ],
            files: state.files.filter(f => !existingThumbnailIds.includes(f.id))
          };
        });
      } else if (filenameChanged) {
        // Filename changed but no new thumbnail - rename existing thumbnail
        const oldThumbnail = state.localFiles.find(f => 
          f.type === 'thumbnail' && f.name === `${oldBaseName}.jpg`
        );
        
        if (oldThumbnail) {
          const newThumbnailName = `${newBaseName}.jpg`;
          get().updateFile(oldThumbnail.id, { name: newThumbnailName });
        }
      }
      
    } catch (error) {
      console.error('Failed to update file with thumbnail:', error);
      throw error;
    }
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
    // Set loading state immediately when refresh starts
    set({ isLoading: true, remoteError: null });
    
    try {
      // Force refresh remote files when refreshing
      const gitStore = useGitStore.getState();
      await gitStore.fetchRemoteFiles(true); // Force refresh
      await get().loadFiles();
    } catch (error) {
      console.error('Failed to refresh files:', error);
    } finally {
      // Always clear loading state at the end
      set({ isLoading: false });
    }
  },

  setRemoteError: (error: string | null) => {
    set({ remoteError: error });
  },

  reset: async () => {
    const state = get();
    // Cleanup blob URLs and IndexedDB before reset
    await cleanupBlobUrls(state.localFiles);
    
    set({
      files: [],
      localFiles: [],
      isLoading: false,
      uploadState: {},
      lastRefresh: 0,
      remoteError: null,
    });
  },
    }),
    {
      name: 'files-store',
      // Only persist essential data, not loading states
      partialize: (state) => ({
        localFiles: state.localFiles.map(file => ({
          ...file,
          // Don't persist the blob object, only base64Data
          file: undefined as unknown as Blob,
          // Don't persist blob URLs as they expire
          url: undefined
        })),
        lastRefresh: state.lastRefresh,
      }),
      // Restore blob data when loading from storage
      onRehydrateStorage: () => (state) => {
        if (state?.localFiles) {
          // The loadFiles method will handle restoration via restoreFileRecord
          console.log('Filesstore rehydrated with', state.localFiles.length, 'local files');
        }
      },
    }
  )
);
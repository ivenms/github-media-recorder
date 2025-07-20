import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { useFilesStore } from '../stores/filesStore';
import { useGitStore } from '../stores/gitStore';
import type { FileRecord, UseCombinedFilesReturn, EnhancedFileRecord } from '../types';

export function useCombinedFiles(): UseCombinedFilesReturn {
  const { 
    files: mediaFiles,
    localFiles,
    uploadState, 
    isLoading, 
    remoteError,
    loadFiles, 
    removeFile, 
    setUploadProgress,
    refreshFiles,
    setRemoteError
  } = useFilesStore();

  const { remoteThumbnails } = useGitStore();

  const [thumbnails, setThumbnails] = useState<Record<string, FileRecord & {isLocal: boolean}>>({});
  
  // Force re-render mechanism
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Use refs to provide fresh state access and avoid stale closures
  const filesRef = useRef<EnhancedFileRecord[]>([]);
  const thumbnailsRef = useRef<Record<string, FileRecord & {isLocal: boolean}>>({});

  const loadFilesWithThumbnails = useCallback(async () => {
    try {
      // Load combined files using store (this now handles both local and remote)
      await loadFiles();
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }, [loadFiles]);

  const refreshAllFiles = useCallback(async () => {
    await refreshFiles(); // This already calls loadFiles() internally
    // Force a re-render to ensure component updates
    forceUpdate();
  }, [refreshFiles]);

  // Add a force refresh method that guarantees re-render
  const forceRefreshFiles = useCallback(async () => {
    await refreshFiles();
    // Force component to re-render even if Zustand doesn't detect changes
    forceUpdate();
  }, [refreshFiles]);

  // Keep refs updated with latest state to avoid stale closures
  useEffect(() => {
    filesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  // Provide fresh state access methods
  const getCurrentFiles = useCallback((): EnhancedFileRecord[] => {
    return filesRef.current;
  }, []);

  const getCurrentThumbnails = useCallback((): Record<string, FileRecord & {isLocal: boolean}> => {
    return thumbnailsRef.current;
  }, []);

  // Load thumbnails when mediaFiles change
  useEffect(() => {
    const loadThumbnails = () => {
      try {
        // Get local thumbnails from store
        const localThumbs = localFiles.filter((f) => f.type === 'thumbnail');
        
        // Map thumbnails by base name (without extension)  
        const thumbMap: Record<string, FileRecord & {isLocal: boolean}> = {};
        
        // Add local thumbnails
        localThumbs.forEach((thumb: FileRecord) => {
          const base = thumb.name.replace(/\.[^.]+$/, '');
          thumbMap[base] = { ...thumb, isLocal: true };
        });
        
        // Add remote thumbnails from gitStore
        Object.entries(remoteThumbnails).forEach(([baseName, thumbData]) => {
          thumbMap[baseName] = {
            id: `remote-thumb-${baseName}`,
            name: `${baseName}.jpg`,
            type: 'thumbnail' as const,
            mimeType: 'image/jpeg',
            size: 0,
            duration: 0,
            created: Date.now(),
            url: thumbData.url,
            file: undefined as unknown as Blob,
            isLocal: false
          };
        });
        
        setThumbnails(thumbMap);
      } catch (error) {
        console.error('Error loading thumbnails:', error);
      }
    };

    if (mediaFiles.length > 0 || !isLoading) {
      loadThumbnails();
    }
  }, [mediaFiles, localFiles, isLoading, remoteThumbnails]);

  // Load files on mount
  useEffect(() => {
    loadFilesWithThumbnails();
  }, [loadFilesWithThumbnails]);

  return {
    // Files and state
    files: mediaFiles,
    thumbnails,
    isLoading,
    remoteError,
    uploadState,
    
    // Actions
    loadFilesWithThumbnails,
    refreshAllFiles,
    forceRefreshFiles,
    removeFile,
    setUploadProgress,
    setRemoteError,
    
    // Fresh state access methods (for async operations)
    getCurrentFiles,
    getCurrentThumbnails
  };
}
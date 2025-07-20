import { useRef, useEffect, useCallback } from 'react';
import { uploadFile, uploadThumbnail } from '../utils/uploadUtils';
import { processThumbnailForUpload } from '../utils/imageUtils';
import { useCombinedFiles } from './useCombinedFiles';
import { useGitStore } from '../stores/gitStore';
import { useUIStore } from '../stores/uiStore';
import type { EnhancedFileRecord, FileRecord, UseUploadManagerReturn } from '../types';

/**
 * Custom hook for managing file upload operations with clean business logic separation
 * Handles the complete upload lifecycle including retry logic and state management
 */
export function useUploadManager(): UseUploadManagerReturn {
  const { openModal } = useUIStore();
  const { invalidateCache } = useGitStore();
  const { 
    files,
    thumbnails,
    removeFile, 
    setUploadProgress,
    forceRefreshFiles,
    loadFilesWithThumbnails
  } = useCombinedFiles();

  // Use refs to avoid stale closure issues in async operations
  const filesRef = useRef<EnhancedFileRecord[]>([]);
  const thumbnailsRef = useRef<Record<string, FileRecord & {isLocal: boolean}>>({});

  // Keep refs updated with latest state
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  /**
   * Get current files state - always fresh, never stale
   */
  const getCurrentFiles = useCallback(() => filesRef.current, []);

  /**
   * Get current thumbnails state - always fresh, never stale
   */
  const getCurrentThumbnails = useCallback(() => thumbnailsRef.current, []);

  /**
   * Check if uploaded file appears in the current file list
   */
  const checkForUploadedFile = useCallback((fileName: string) => {
    const currentFiles = getCurrentFiles();
    return currentFiles.filter(f => 
      f.name === fileName && !f.isLocal && f.uploaded
    );
  }, [getCurrentFiles]);

  /**
   * Perform file refresh with retry logic
   */
  const refreshWithRetry = useCallback(async (fileName: string, maxAttempts: number = 3) => {
    let refreshAttempts = 0;
    
    const attemptRefresh = async (): Promise<void> => {
      refreshAttempts++;
      
      try {
        // Invalidate git store cache to force fresh fetch
        invalidateCache();
        
        // Force a complete refresh with guaranteed re-render
        await forceRefreshFiles();
        
        // Also force load files again to ensure state is updated
        await loadFilesWithThumbnails();
        
        // Check if the uploaded file appears in the list after a short delay
        setTimeout(() => {
          const uploadedFiles = checkForUploadedFile(fileName);
          
          if (uploadedFiles.length === 0 && refreshAttempts < maxAttempts) {
            setTimeout(attemptRefresh, 3000); // Increased wait time
          }
        }, 1500); // Increased delay for GitHub processing
      } catch (refreshError) {
        console.error('Failed to refresh files:', refreshError);
        if (refreshAttempts < maxAttempts) {
          setTimeout(attemptRefresh, 3000);
        }
      }
    };
    
    await attemptRefresh();
  }, [invalidateCache, forceRefreshFiles, loadFilesWithThumbnails, checkForUploadedFile]);

  /**
   * Clean up local files after successful upload
   */
  const cleanupAfterUpload = useCallback(async (file: EnhancedFileRecord) => {
    try {
      // Remove the main media file from IndexedDB
      await removeFile(file.id);
      
      // Also remove the local thumbnail if it exists
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const currentThumbnails = getCurrentThumbnails();
      const thumbnail = currentThumbnails[baseName];
      
      if (thumbnail && thumbnail.isLocal) {
        try {
          await removeFile(thumbnail.id);
        } catch (thumbError) {
          console.error('Failed to clean up local thumbnail:', thumbError);
        }
      }
    } catch (error) {
      console.error('Failed to clean up local file after upload:', error);
    }
  }, [removeFile, getCurrentThumbnails]);

  /**
   * Upload file with complete lifecycle management
   */
  const uploadWithManagement = useCallback(async (file: EnhancedFileRecord): Promise<void> => {
    if (!file.file) {
      openModal({ type: 'alert', message: 'File data not available for upload.', title: 'Upload Error' });
      return;
    }

    setUploadProgress(file.id, { status: 'uploading', progress: 0 });

    try {
      // Upload the main media file
      await uploadFile(file.file, (progress) => {
        setUploadProgress(file.id, { status: 'uploading', progress: progress * 0.7 }); // 70% for main file
      }, file.name);

      // Check if there's a thumbnail to upload
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const currentThumbnails = getCurrentThumbnails();
      const thumbnail = currentThumbnails[baseName];
      
      if (thumbnail && thumbnail.file) {
        try {
          // Process thumbnail: crop, scale, convert to JPG
          const mediaFileName = file.name;
          const { blob: processedThumbnail, filename: processedFilename } = await processThumbnailForUpload(
            thumbnail.file,
            mediaFileName
          );
          
          await uploadThumbnail(processedThumbnail, (progress) => {
            setUploadProgress(file.id, { status: 'uploading', progress: 0.7 + (progress * 0.3) }); // 30% for thumbnail
          }, processedFilename);
        } catch (error) {
          console.error('Error processing thumbnail:', error);
          // Continue without thumbnail if processing fails
        }
      }

      setUploadProgress(file.id, { status: 'success', progress: 1 });
      
      // Wait longer for GitHub to process the upload, then cleanup and refresh
      setTimeout(async () => {
        await cleanupAfterUpload(file);
        await refreshWithRetry(file.name);
      }, 4000); // Further increased delay for GitHub processing

    } catch (error: unknown) {
      setUploadProgress(file.id, { 
        status: 'error', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  }, [
    openModal,
    setUploadProgress,
    getCurrentThumbnails,
    cleanupAfterUpload,
    refreshWithRetry
  ]);

  /**
   * Retry upload for failed files
   */
  const retryUpload = useCallback((file: EnhancedFileRecord) => {
    return uploadWithManagement(file);
  }, [uploadWithManagement]);

  return {
    uploadFile: uploadWithManagement,
    retryUpload,
    getCurrentFiles,
    getCurrentThumbnails
  };
}
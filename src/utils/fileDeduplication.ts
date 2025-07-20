import type { FileRecord, EnhancedFileRecord } from '../types';
import { sortFilesByDate } from './fileUtils';

/**
 * Utility functions for file deduplication and combination logic
 */

/**
 * Combine local and remote files with comprehensive deduplication
 */
export function combineAndDeduplicateFiles(
  localFiles: FileRecord[], 
  remoteFiles: FileRecord[]
): EnhancedFileRecord[] {
  // Convert local files to enhanced format
  const localEnhancedFiles: EnhancedFileRecord[] = localFiles
    .filter((file: FileRecord) => file.type === 'audio' || file.type === 'video') // Only media files
    .map((file: FileRecord) => ({
      ...file,
      isLocal: true
    }));

  // Create sets for efficient deduplication
  const localFileNames = new Set(localEnhancedFiles.map(f => f.name));
  const localFileIds = new Set(localEnhancedFiles.map(f => f.id));
  
  // Filter and enhance remote files
  const remoteEnhancedFiles: EnhancedFileRecord[] = remoteFiles
    .filter(remoteFile => !localFileNames.has(remoteFile.name) && !localFileIds.has(remoteFile.id))
    .map(remoteFile => ({
      ...remoteFile,
      isLocal: false,
      uploaded: true
    }));

  // Combine all files
  const allFiles = [...localEnhancedFiles, ...remoteEnhancedFiles];
  
  // Final deduplication pass by ID
  const uniqueFiles = deduplicateById(allFiles);
  
  // Sort and return
  return sortFilesByDate(uniqueFiles);
}

/**
 * Remove duplicate files by ID with logging
 */
export function deduplicateById<T extends { id: string }>(files: T[]): T[] {
  const seenIds = new Set<string>();
  
  return files.filter(file => {
    if (seenIds.has(file.id)) {
      console.warn(`Duplicate file ID detected: ${file.id}, skipping duplicate`);
      return false;
    }
    seenIds.add(file.id);
    return true;
  });
}

/**
 * Find files that need to be removed (used for cascading deletes)
 */
export function findFilesToRemove(
  localFiles: FileRecord[], 
  fileId: string
): { filesToRemove: string[]; cleanup: FileRecord[] } {
  const fileToRemove = localFiles.find(f => f.id === fileId);
  const filesToRemove = [fileId];
  const cleanup: FileRecord[] = [];
  
  if (!fileToRemove) {
    return { filesToRemove, cleanup };
  }
  
  // If removing a media file, also remove its associated thumbnail
  if (fileToRemove.type === 'audio' || fileToRemove.type === 'video') {
    const baseName = fileToRemove.name.replace(/\.[^.]+$/, '');
    const associatedThumbnail = localFiles.find(f => 
      f.type === 'thumbnail' && f.name === `${baseName}.jpg`
    );
    if (associatedThumbnail) {
      filesToRemove.push(associatedThumbnail.id);
      cleanup.push(associatedThumbnail);
    }
  }
  
  // Add the main file to cleanup
  cleanup.push(fileToRemove);
  
  return { filesToRemove, cleanup };
}
/**
 * Storage quota utilities for file size validation and storage management
 */

// File size limits for different media types
export const FILE_LIMITS = {
  // Individual file size limits (in bytes)
  MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_THUMBNAIL_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Total storage warning thresholds
  STORAGE_WARNING_THRESHOLD: 0.8, // Warn at 80% usage
  STORAGE_CRITICAL_THRESHOLD: 0.9, // Block at 90% usage
};

export interface StorageQuota {
  quota: number; // Total available storage
  usage: number; // Currently used storage
  available: number; // Available storage remaining
}

/**
 * Get current storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuota | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      };
    } catch (error) {
      console.warn('Failed to get storage quota:', error);
      return null;
    }
  }
  return null;
}

/**
 * Check if we have enough storage space for a file
 */
export async function canStoreFile(fileSize: number): Promise<boolean> {
  const quota = await getStorageQuota();
  if (!quota) return true; // Can't check, assume OK
  
  // Leave 50MB buffer for other app data
  const buffer = 50 * 1024 * 1024;
  return quota.available > (fileSize + buffer);
}

/**
 * Validate file size based on type and storage availability
 */
export async function validateFileSize(file: File, type: 'audio' | 'video' | 'thumbnail'): Promise<void> {
  const limits = {
    'audio': FILE_LIMITS.MAX_AUDIO_SIZE,
    'video': FILE_LIMITS.MAX_VIDEO_SIZE,
    'thumbnail': FILE_LIMITS.MAX_THUMBNAIL_SIZE
  };
  
  const maxSize = limits[type];
  
  // Check individual file size limit
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    throw new Error(`File "${file.name}" is ${fileSizeMB}MB, which exceeds the ${maxSizeMB}MB limit for ${type} files.`);
  }
  
  // Check available storage
  const canStore = await canStoreFile(file.size);
  if (!canStore) {
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    throw new Error(`Not enough storage space available to save this ${fileSizeMB}MB file. Please free up some space and try again.`);
  }
}

/**
 * Validate multiple files at once
 */
export async function validateMultipleFiles(files: File[], getFileType: (file: File) => 'audio' | 'video' | 'thumbnail'): Promise<void> {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  // Check total size against available storage
  const canStore = await canStoreFile(totalSize);
  if (!canStore) {
    const totalSizeMB = Math.round(totalSize / (1024 * 1024));
    throw new Error(`Not enough storage space for ${files.length} files (${totalSizeMB}MB total). Please free up some space and try again.`);
  }
  
  // Validate each file individually
  for (const file of files) {
    await validateFileSize(file, getFileType(file));
  }
}

/**
 * Get storage usage percentage
 */
export async function getStorageUsagePercentage(): Promise<number> {
  const quota = await getStorageQuota();
  if (!quota || quota.quota === 0) return 0;
  return (quota.usage / quota.quota) * 100;
}

/**
 * Check if storage is approaching capacity
 */
export async function isStorageNearCapacity(): Promise<{ warning: boolean; critical: boolean }> {
  const usagePercentage = await getStorageUsagePercentage();
  return {
    warning: usagePercentage >= FILE_LIMITS.STORAGE_WARNING_THRESHOLD * 100,
    critical: usagePercentage >= FILE_LIMITS.STORAGE_CRITICAL_THRESHOLD * 100
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type from file object
 */
export function getFileType(file: File): 'audio' | 'video' | 'thumbnail' {
  if (file.type.startsWith('image/')) {
    return 'thumbnail';
  } else if (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4')) {
    return 'video';
  } else {
    return 'audio';
  }
}
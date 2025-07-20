import type { FileRecord } from '../types';

/**
 * Utility functions for handling persistent file storage with hybrid approach:
 * - Small files (< 1MB): base64 in localStorage
 * - Large files: blob in IndexedDB, metadata in localStorage
 */

const DB_NAME = 'MediaRecorderDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const SIZE_THRESHOLD = 1024 * 1024; // 1MB

/**
 * Initialize IndexedDB for large file storage
 */
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Store blob in IndexedDB
 */
async function storeBlobInIndexedDB(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve blob from IndexedDB
 */
async function getBlobFromIndexedDB(key: string): Promise<Blob | null> {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete blob from IndexedDB
 */
async function deleteBlobFromIndexedDB(key: string): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Convert a Blob to base64 string for small files
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string back to Blob
 */
export function base64ToBlob(base64Data: string): Blob {
  const [header, data] = base64Data.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Create a FileRecord with hybrid persistent storage support
 */
export async function createFileRecord(
  fileBlob: Blob, 
  metadata: Omit<FileRecord, 'id' | 'file' | 'url' | 'base64Data'>
): Promise<FileRecord> {
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fileUrl = URL.createObjectURL(fileBlob);
  
  let base64Data: string | undefined;
  
  // For small files, store as base64 in localStorage
  // For large files, store blob in IndexedDB
  if (fileBlob.size < SIZE_THRESHOLD) {
    base64Data = await blobToBase64(fileBlob);
  } else {
    // Store large blob in IndexedDB
    await storeBlobInIndexedDB(fileId, fileBlob);
  }
  
  return {
    id: fileId,
    file: fileBlob,
    url: fileUrl,
    base64Data,
    ...metadata
  };
}

/**
 * Restore FileRecord from persisted data by recreating blob and URL
 */
export async function restoreFileRecord(persistedFile: FileRecord): Promise<FileRecord> {
  // If we have base64Data, restore from base64 (small files)
  if (persistedFile.base64Data && (!persistedFile.url || !persistedFile.url.startsWith('blob:'))) {
    const restoredBlob = base64ToBlob(persistedFile.base64Data);
    const restoredUrl = URL.createObjectURL(restoredBlob);
    
    return {
      ...persistedFile,
      file: restoredBlob,
      url: restoredUrl
    };
  }
  
  // If no base64Data, try to restore from IndexedDB (large files)
  if (!persistedFile.base64Data && (!persistedFile.url || !persistedFile.url.startsWith('blob:'))) {
    try {
      const restoredBlob = await getBlobFromIndexedDB(persistedFile.id);
      if (restoredBlob) {
        const restoredUrl = URL.createObjectURL(restoredBlob);
        return {
          ...persistedFile,
          file: restoredBlob,
          url: restoredUrl
        };
      }
    } catch (error) {
      console.error('Failed to restore blob from IndexedDB:', error);
    }
  }
  
  return persistedFile;
}


/**
 * Clean up blob URLs and IndexedDB entries to prevent memory leaks
 */
export async function cleanupBlobUrls(files: FileRecord[]): Promise<void> {
  for (const file of files) {
    // Clean up blob URL
    if (file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
    
    // Clean up IndexedDB entry for large files
    if (!file.base64Data) {
      try {
        await deleteBlobFromIndexedDB(file.id);
      } catch (error) {
        console.error('Failed to delete blob from IndexedDB:', error);
      }
    }
  }
}
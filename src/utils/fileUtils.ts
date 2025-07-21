// Utility for IndexedDB file storage and file helpers
// - Save, list, delete, and get files
// - Validate file types and sizes
// - Extract metadata

import { formatDate } from './date';
import type { ParsedMediaFileName, FileMetadata, FileRecord } from '../types';

const DB_NAME = 'media-recorder-db';
const STORE_NAME = 'mediaFiles';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(file: Blob, meta: FileMetadata): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const id = meta.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = { ...meta, id, file };
    store.put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listFiles(): Promise<FileRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const files = req.result.map((rec: FileRecord) => ({
        ...rec,
        url: URL.createObjectURL(rec.file),
      }));
      resolve(files);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateFile(id: string, updatedMeta: Partial<FileMetadata>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // First get the existing file
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existingRecord = getReq.result;
      if (!existingRecord) {
        reject(new Error('File not found'));
        return;
      }
      
      // Update the record with new metadata, keeping the file blob
      const updatedRecord = { 
        ...existingRecord, 
        ...updatedMeta, 
        id, // Ensure ID remains the same
        file: existingRecord.file // Keep the original file blob
      };
      
      const putReq = store.put(updatedRecord);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Decode webm audio to PCM using Web Audio API
 * @param blob - Blob containing the webm audio data
 * @returns Object containing the channel data and sample rate
 */
export async function decodeWebmToPCM(blob: Blob): Promise<{channelData: Float32Array[], sampleRate: number}> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const channelData = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }
  return { channelData, sampleRate: audioBuffer.sampleRate };
}

/**
 * Encode PCM data to WAV format
 * @param channelData - Array of Float32Array representing audio channels
 * @param sampleRate - Sample rate of the audio data
 * @returns Blob containing the WAV data
 */
export function encodeWAV(channelData: Float32Array[], sampleRate: number): Blob {
  // Validate inputs
  if (!channelData || channelData.length === 0) {
    throw new Error('Channel data is required');
  }
  if (sampleRate <= 0) {
    throw new Error('Sample rate must be positive');
  }
  const numChannels = channelData.length;
  const length = channelData[0].length;
  const buffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(buffer);
  // RIFF identifier 'RIFF'
  view.setUint32(0, 0x52494646, false);
  // file length
  view.setUint32(4, 36 + length * numChannels * 2, true);
  // RIFF type 'WAVE'
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier 'fmt '
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier 'data'
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, length * numChannels * 2, true);
  // write PCM samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Converts an image file (any format) to a JPG Blob using a canvas.
 * @param file - The input image file (Blob or File)
 * @param quality - JPG quality (0-1, default 0.92)
 * @returns Promise<Blob> - The JPG Blob
 */
export async function convertImageToJpg(file: Blob, quality: number = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert image to JPG'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for conversion'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Parses a media file name into its metadata components.
 * @param name The file name to parse.
 * @returns ParsedMediaFileName object or null if parsing fails.
 */
export function parseMediaFileName(name: string): ParsedMediaFileName | null {
  if (!name || typeof name !== 'string') return null;
  
  const extension = name.split('.').pop() || '';
  
  // Try to match standard format: Category_Title_Author_Date.extension
  const match = name.match(/^([^_]+)_([^_]+)_([^_]+)_([0-9]{4}-[0-9]{2}-[0-9]{2})\.[^.]+$/);
  if (match) {
    return {
      category: match[1],
      title: match[2],
      author: match[3],
      date: match[4],
      extension,
    };
  }

  // Try to match format: Category_Title_Author.extension (no date)
  const matchNoDate = name.match(/^([^_]+)_([^_]+)_([^_]+)\.[^.]+$/);
  if (matchNoDate) {
    return {
      category: matchNoDate[1],
      title: matchNoDate[2],
      author: matchNoDate[3],
      date: '',
      extension,
    };
  }
  
  // Fallback: try to extract at least the extension and use filename as title
  const parts = name.split('.');
  if (parts.length >= 2) {
    return {
      category: '',
      title: parts.slice(0, -1).join('.'),
      author: '',
      date: '',
      extension,
    };
  }
  
  return null;
}

/**
 * Sorts files by date (newest first) with proper fallback logic.
 * 1. Extract date from filename if available
 * 2. Fall back to created timestamp
 * 3. For same dates, use created timestamp as tiebreaker
 */
export function sortFilesByDate<T extends { name: string; created?: number; isLocal?: boolean }>(files: T[]): T[] {
  return files.sort((a, b) => {
    // Helper function to get sort date for a file
    const getSortDate = (file: T): number => {
      // First try to get date from filename
      const parsedName = parseMediaFileName(file.name);
      if (parsedName?.date) {
        const fileDate = new Date(parsedName.date).getTime();
        // If file has date in name, use it, but add created timestamp as tiebreaker for same-day files
        return fileDate + (file.created || 0) / 1000000; // Add microseconds for tiebreaker
      }
      
      // Fall back to created timestamp
      return file.created || 0;
    };
    
    const dateA = getSortDate(a);
    const dateB = getSortDate(b);
    
    // Sort newest first (descending)
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    
    // If dates are exactly equal, prioritize local files (they're more recent)
    if (a.isLocal !== b.isLocal) {
      return a.isLocal ? -1 : 1;
    }
    
    // Final fallback: use created timestamp for precise ordering
    return (b.created || 0) - (a.created || 0);
  });
}

/**
 * Formats a media file name as Category_Title_Author_Date.extension
 * - Removes special characters but keeps alphanumeric, dashes, and spaces
 * - Uses "_" (underscore) as separator with no spaces
 * - Example: Music_My Song_John Doe_2024-06-07.mp3
 */
export function formatMediaFileName({
  category,
  title,
  author,
  date,
  extension,
}: {
  category: string;
  title: string;
  author: string;
  date: string;
  extension: string;
}): string {
  // Remove special characters but keep alphanumeric, dashes, and spaces
  const safe = (str: string) => str.replace(/[^a-zA-Z0-9\- ]/g, '').trim();
  
  // Build components, filtering out empty ones
  const components = [safe(category), safe(title), safe(author), formatDate(date)]
    .filter(component => component.length > 0);
  
  // Join with "_" and add extension
  return `${components.join('_')}.${extension}`;
}

/**
 * Validates if a file is a supported media file based on name and MIME type
 * @param filename - The file name to check
 * @param mimeType - The MIME type to validate
 * @returns true if valid media file, false otherwise
 */
export function isValidMediaFile(filename: string, mimeType: string): boolean {
  if (!filename || !mimeType) return false;
  
  // Get file extension
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  
  // Define valid combinations
  const validCombinations = {
    // Audio files
    'mp3': ['audio/mp3', 'audio/mpeg'],
    'wav': ['audio/wav', 'audio/wave'],
    'webm': ['audio/webm', 'video/webm'], // WebM can be audio or video
    'm4a': ['audio/mp4', 'audio/m4a'],
    'ogg': ['audio/ogg'],
    
    // Video files  
    'mp4': ['video/mp4'],
    'mov': ['video/quicktime'],
    'avi': ['video/avi', 'video/x-msvideo'],
    
    // Image files
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'webp': ['image/webp'],
  };
  
  const validMimeTypes = validCombinations[extension as keyof typeof validCombinations];
  return validMimeTypes ? validMimeTypes.includes(mimeType.toLowerCase()) : false;
} 
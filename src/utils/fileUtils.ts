// Utility for IndexedDB file storage and file helpers
// - Save, list, delete, and get files
// - Validate file types and sizes
// - Extract metadata

import { formatDate } from './date';
import type { ParsedMediaFileName } from '../types';

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

export async function saveFile(file: Blob, meta: any): Promise<string> {
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

export async function listFiles(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const files = req.result.map((rec: any) => ({
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

export async function updateFile(id: string, updatedMeta: any): Promise<void> {
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
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    img.onerror = (e) => reject(new Error('Failed to load image for conversion'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Parses a media file name into its metadata components.
 * @param name The file name to parse.
 * @returns ParsedMediaFileName object or null if parsing fails.
 */
export function parseMediaFileName(name: string): ParsedMediaFileName | null {
  // Expected: Category_Title_Author_Date.extension
  const match = name.match(/^([^_]+)_([^_]+)_([^_]+)_([0-9]{4}-[0-9]{2}-[0-9]{2})\.[^.]+$/);
  if (!match) return null;
  return {
    category: match[1],
    title: match[2],
    author: match[3],
    date: match[4],
  };
}

/**
 * Formats a media file name as Category_Title_Author_Date.extension
 * - Removes non-alphanumeric, dash, and space characters
 * - Removes spaces
 * - Example: Music_MySong_JohnDoe_2024-06-07.mp3
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
  // Only remove non-alphanumeric, dash, and space characters, keep spaces
  // Then replace dashes with spaces
  const safe = (str: string) => str.replace(/[^a-zA-Z0-9\- ]/g, '').replace(/-/g, ' ');
  return `${safe(category)}_${safe(title)}_${safe(author)}_${formatDate(date)}.${extension}`;
} 
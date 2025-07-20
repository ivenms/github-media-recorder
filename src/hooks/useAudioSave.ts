import { useState } from 'react';
import { decodeWebmToPCM, encodeWAV, formatMediaFileName, convertImageToJpg } from '../utils/fileUtils';
import { getMediaCategories } from '../utils/appConfig';
import { useFilesStore } from '../stores/filesStore';
import { canStoreFile, isStorageNearCapacity } from '../utils/storageQuota';
import type { UseAudioSaveParams } from '../types';

export function useAudioSave({
  audioUrl,
  audioFormat,
  title,
  author,
  category,
  date,
  duration,
  thumbnail,
  validateInputs,
  convert,
}: UseAudioSaveParams) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [savedFileId, setSavedFileId] = useState<string | null>(null);
  const { saveFile } = useFilesStore();

  const handleSave = async () => {
    if (!audioUrl) return;
    if (!validateInputs()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Check storage capacity before processing
      const storageStatus = await isStorageNearCapacity();
      if (storageStatus.critical) {
        setError('Storage is critically low. Please free up some space before saving.');
        setSaving(false);
        return;
      }
      
      if (storageStatus.warning) {
        console.warn('Storage usage is high. Consider cleaning up files.');
      }
      
      // Fetch the blob from the audioUrl
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Check if we can store the original file
      const canStore = await canStoreFile(blob.size);
      if (!canStore) {
        setError('Not enough storage space available. Please free up some space and try again.');
        setSaving(false);
        return;
      }
      
      let outBlob = blob;
      let outMime = blob.type;
      let ext = 'webm';
      
      // Process audio conversion
      try {
      if (audioFormat === 'wav' || audioFormat === 'mp3') {
        const { channelData, sampleRate } = await decodeWebmToPCM(blob);
        if (audioFormat === 'wav') {
          outBlob = encodeWAV(channelData, sampleRate);
          outMime = 'audio/wav';
          ext = 'wav';
        } else if (audioFormat === 'mp3') {
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const mp3Data = await convert('mp3', uint8);
          if (!mp3Data) throw new Error('MP3 conversion failed');
          outBlob = new Blob([mp3Data], { type: 'audio/mp3' });
          outMime = 'audio/mp3';
          ext = 'mp3';
        }
      }
      } catch (conversionErr) {
        setError('Conversion failed: ' + (conversionErr instanceof Error ? conversionErr.message : 'Unknown error'));
        setSaving(false);
        return;
      }
      
      // Final check after conversion (converted file might be different size)
      const finalCanStore = await canStoreFile(outBlob.size);
      if (!finalCanStore) {
        setError('Converted file is too large for available storage space.');
        setSaving(false);
        return;
      }
    // Format date
    const fileDate = date ? date : new Date().toISOString().slice(0, 10);
    const catObj = getMediaCategories().find(c => c.id === category);
    const catName = catObj ? catObj.name : category;
    const outName = formatMediaFileName({
      category: catName,
      title,
      author,
      date: fileDate,
      extension: ext,
    });
    const fileRecord = await saveFile(outBlob, {
      name: outName,
      type: 'audio',
      mimeType: outMime,
      size: outBlob.size,
      duration,
      created: Date.now(),
    });
    setSavedFileId(fileRecord.id);
    // Handle thumbnail save
    if (thumbnail) {
      try {
        const jpgBlob = await convertImageToJpg(thumbnail);
        const thumbName = outName.replace(/\.[^.]+$/, '.jpg');
        await saveFile(jpgBlob, {
          name: thumbName,
          type: 'thumbnail',
          mimeType: 'image/jpeg',
          size: jpgBlob.size,
          duration: 0,
          created: Date.now(),
        });
      } catch {
        setThumbnailError('Thumbnail conversion failed.');
      }
    }
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save audio: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setSaving(false);
    }
  };

  const clearThumbnailError = () => setThumbnailError(null);

  return {
    handleSave,
    saving,
    saved,
    setSaving,
    setSaved,
    error,
    setError,
    thumbnailError,
    clearThumbnailError,
    savedFileId,
  };
} 
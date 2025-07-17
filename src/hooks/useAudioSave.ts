import { useState } from 'react';
import { saveFile, decodeWebmToPCM, encodeWAV, formatMediaFileName, convertImageToJpg } from '../utils/fileUtils';
import { MEDIA_CATEGORIES } from '../utils/appConfig';
import type { ConvertType } from './useFileConverter';

interface UseAudioSaveParams {
  audioUrl: string | null;
  audioFormat: string;
  title: string;
  author: string;
  category: string;
  date: string;
  duration: number;
  thumbnail: File | null;
  validateInputs: () => boolean;
  convert: (type: ConvertType, input: Uint8Array) => Promise<Uint8Array | null>;
  convertProgress?: number;
  setInputError: (msg: string | null) => void;
  setThumbnailError: (msg: string | null) => void;
}

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
  convertProgress,
  setInputError,
  setThumbnailError,
}: UseAudioSaveParams) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!audioUrl) return;
    if (!validateInputs()) return;
    setSaving(true);
    // Fetch the blob from the audioUrl
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    let outBlob = blob;
    let outMime = blob.type;
    let ext = 'webm';
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
    } catch (err) {
      setError('Conversion failed: ' + (err as any)?.message);
      setSaving(false);
      return;
    }
    // Format date
    let fileDate = date ? date : new Date().toISOString().slice(0, 10);
    const catObj = MEDIA_CATEGORIES.find(c => c.id === category);
    const catName = catObj ? catObj.name : category;
    const outName = formatMediaFileName({
      category: catName,
      title,
      author,
      date: fileDate,
      extension: ext,
    });
    await saveFile(outBlob, {
      name: outName,
      type: 'audio',
      mimeType: outMime,
      size: outBlob.size,
      duration,
      created: Date.now(),
    });
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
          created: Date.now(),
        });
      } catch (err) {
        setThumbnailError('Thumbnail conversion failed.');
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return {
    handleSave,
    saving,
    saved,
    setSaving,
    setSaved,
    error,
    setError,
  };
} 
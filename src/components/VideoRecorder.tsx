import React, { useState, useRef, useEffect } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { saveFile } from '../utils/fileUtils';
import { useFileConverter } from '../hooks/useFileConverter';
import { getMediaCategories } from '../utils/appConfig';
import { formatMediaFileName } from '../utils/fileUtils';
import { convertImageToJpg } from '../utils/fileUtils';
import { getTodayDateString, isFutureDate } from '../utils/date';
import Header from './Header';

const VideoRecorder: React.FC = () => {
  const mediaCategories = getMediaCategories();
  const {
    recording,
    paused,
    error,
    duration,
    audioUrl,
    audioBlob,
    start,
    stop,
    pause,
    resume,
    videoUrl,
    videoBlob,
    stream,
  } = useMediaRecorder({ video: true, audio: true });

  const { convert, progress: convertProgress, error: convertError } = useFileConverter();

  // For video, use videoUrl/videoBlob if available, else fallback to audioUrl/audioBlob
  const mediaUrl = (videoUrl as string) || (audioUrl as string) || null;
  const mediaBlob = (videoBlob as Blob) || (audioBlob as Blob) || null;

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (recording && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [recording, stream]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(mediaCategories[0].id);
  const [date, setDate] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const validateInputs = () => {
    if (!title.trim() || !author.trim()) {
      setInputError('Title and Author are required.');
      return false;
    }
    if (title.length > 100) {
      setInputError('Title cannot exceed 100 characters.');
      return false;
    }
    if (author.length > 50) {
      setInputError('Author cannot exceed 50 characters.');
      return false;
    }
    if (title.includes('_') || author.includes('_')) {
      setInputError('Underscore ( _ ) is not allowed in Title or Author.');
      return false;
    }
    setInputError(null);
    return true;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThumbnailError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setThumbnailError('Please select a valid image file.');
        setThumbnail(null);
        return;
      }
      setThumbnail(file);
    }
  };

  const handleSave = async () => {
    if (!mediaBlob) return;
    if (!validateInputs()) return;
    setSaving(true);
    let outBlob = mediaBlob;
    let outMime = mediaBlob.type;
    let ext = 'webm';
    try {
      // Convert to MP4 using useFileConverter hook
      const arrayBuffer = await mediaBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const mp4Data = await convert('mp4', uint8);
      if (!mp4Data) throw new Error('MP4 conversion failed');
      outBlob = new Blob([mp4Data], { type: 'video/mp4' });
      outMime = 'video/mp4';
      ext = 'mp4';
    } catch (err) {
      // fallback: save original if conversion fails
      console.error('MP4 conversion failed:', err);
    }
    // Format date
    const fileDate = date ? date : new Date().toISOString().slice(0, 10);
    const catObj = mediaCategories.find(c => c.id === category);
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
      type: 'video',
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
      } catch {
        setThumbnailError('Thumbnail conversion failed.');
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Video Recorder" />
      <div className="flex flex-col items-center p-4">
      {inputError && <div className="text-red-600 mb-2">{inputError}</div>}
      {thumbnailError && <div className="text-red-600 mb-2">{thumbnailError}</div>}
      <div className="w-full h-48 bg-gray-300 rounded mb-4 flex items-center justify-center">
        {recording && stream ? (
          <video ref={videoRef} autoPlay muted className="w-full h-48 object-contain rounded" />
        ) : mediaUrl ? (
          <video src={mediaUrl} controls className="w-full h-48 object-contain rounded" />
        ) : (
          <span className="text-gray-500">{recording ? '[Recording...]' : '[Camera Preview]'}</span>
        )}
      </div>
      <div className="flex flex-col w-full max-w-md gap-2 mb-4">
        <input
          className="border rounded px-2 py-1"
          placeholder="Title (required)"
          value={title}
          maxLength={100}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Author (required)"
          value={author}
          maxLength={50}
          onChange={e => setAuthor(e.target.value)}
          required
        />
        <select
          className="border rounded px-2 py-1"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {mediaCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          className="border rounded px-2 py-1"
          type="date"
          value={date}
          max={getTodayDateString()}
          onChange={e => {
            const selectedDate = e.target.value;
            if (!isFutureDate(selectedDate)) {
              setDate(selectedDate);
            }
          }}
        />
        <input
          type="file"
          accept="image/*"
          className="border rounded px-2 py-1"
          onChange={handleThumbnailChange}
        />
      </div>
      <div className="text-2xl font-mono mb-4">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {convertError && <div className="text-red-600 mb-2">{convertError}</div>}
      <div className="flex gap-2 mb-4">
        {!recording && (
          <button
            className="w-14 h-14 rounded-full bg-green-500 text-white text-2xl flex items-center justify-center shadow-neumorph transition-all"
            onClick={start}
          >
            ●
          </button>
        )}
        {recording && (
          <>
            <button
              className="w-14 h-14 rounded-full bg-red-500 text-white text-2xl flex items-center justify-center shadow-neumorph transition-all"
              onClick={stop}
            >
              ■
            </button>
            <button
              className="w-10 h-10 rounded-full bg-yellow-500 text-white text-lg flex items-center justify-center"
              onClick={paused ? resume : pause}
            >
              {paused ? '▶' : '⏸'}
            </button>
          </>
        )}
      </div>
      <button
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-400"
        disabled={recording || !mediaBlob || saving}
        onClick={handleSave}
      >
        {saving ? (convertProgress > 0 && convertProgress < 1 ? `Converting... ${(convertProgress * 100).toFixed(0)}%` : 'Saving...') : saved ? 'Saved!' : 'Save'}
      </button>
      </div>
    </div>
  );
};

export default VideoRecorder; 
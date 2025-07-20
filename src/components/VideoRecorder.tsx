import React, { useState, useRef, useEffect } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useFilesStore } from '../stores/filesStore';
import { videoWorkerService } from '../services/videoWorkerService';
import { getMediaCategories } from '../utils/appConfig';
import { formatMediaFileName } from '../utils/fileUtils';
import { convertImageToJpg } from '../utils/fileUtils';
import { getTodayDateString, isFutureDate } from '../utils/date';
import { canStoreFile, isStorageNearCapacity, validateFileSize } from '../utils/storageQuota';
import type { VideoRecorderProps } from '../types';
import { useUIStore } from '../stores/uiStore';
import Header from './Header';
import RecordIcon from './icons/RecordIcon';

const VideoRecorder: React.FC<VideoRecorderProps> = () => {
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

  const [workerProgress, setWorkerProgress] = useState(0);
  const [workerPhase, setWorkerPhase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const { saveFile } = useFilesStore();

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
  const [savedFileId, setSavedFileId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState(0);
  const [savePhase, setSavePhase] = useState<string>('');

  const { setScreen, openModal } = useUIStore();

  // Navigate to library screen when file is saved
  useEffect(() => {
    if (saved && savedFileId) {
      const timer = setTimeout(() => {
        setScreen('library', savedFileId);
      }, 1000); // Show "Saved!" briefly before navigating
      return () => clearTimeout(timer);
    }
  }, [saved, savedFileId, setScreen]);

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

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setThumbnailError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setThumbnailError('Please select a valid image file.');
        setThumbnail(null);
        return;
      }
      
      try {
        await validateFileSize(file, 'thumbnail');
        setThumbnail(file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Thumbnail validation failed';
        setThumbnailError(errorMessage);
        setThumbnail(null);
        // Clear the file input
        e.target.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!mediaBlob) return;
    if (!validateInputs()) return;
    
    setSaving(true);
    setInputError(null);
    setSaveProgress(0);
    setSavePhase('Initializing...');
    
    try {
      // Phase 1: Storage validation (0-20%)
      setSavePhase('Checking storage...');
      setSaveProgress(5);
      
      const storageStatus = await isStorageNearCapacity();
      if (storageStatus.critical) {
        setInputError('Storage is critically low. Please free up some space before saving.');
        setSaving(false);
        setSaveProgress(0);
        setSavePhase('');
        return;
      }
      
      setSaveProgress(10);
      
      if (storageStatus.warning) {
        console.warn('Storage usage is high. Consider cleaning up files.');
      }
      
      // Check if we can store the original file
      const canStore = await canStoreFile(mediaBlob.size);
      if (!canStore) {
        setInputError('Not enough storage space available. Please free up some space and try again.');
        setSaving(false);
        setSaveProgress(0);
        setSavePhase('');
        return;
      }
      
      setSaveProgress(20);
      
      let outBlob = mediaBlob;
      let outMime = mediaBlob.type;
      let ext = 'webm';
      
      try {
        // Phase 2: Video conversion using Web Worker (20-70%)
        setSavePhase('Preparing conversion...');
        setSaveProgress(25);
        
        const arrayBuffer = await mediaBlob.arrayBuffer();
        setSaveProgress(30);
        
        const uint8 = new Uint8Array(arrayBuffer);
        setSaveProgress(35);
        
        // Convert using Web Worker Service (handles its own progress reporting 35-65%)
        setIsProcessing(true);
        setWorkerError(null);
        
        const conversionResult = await videoWorkerService.convertVideo(
          uint8,
          (progress, phase) => {
            setWorkerProgress(progress);
            setWorkerPhase(phase);
            // Map worker progress to save progress (35-65% range)
            if (progress >= 0 && progress <= 100) {
              const mappedProgress = 35 + (progress * 0.3);
              setSaveProgress(Math.round(mappedProgress));
            }
          }
        );
        
        setIsProcessing(false);
        
        setSaveProgress(65);
        outBlob = new Blob([conversionResult.convertedData], { type: 'video/mp4' });
        outMime = 'video/mp4';
        ext = 'mp4';
        setSaveProgress(70);
        
        // Final check after conversion (converted file might be different size)
        const finalCanStore = await canStoreFile(outBlob.size);
        if (!finalCanStore) {
          setInputError('Converted file is too large for available storage space.');
          setSaving(false);
          setSaveProgress(0);
          setSavePhase('');
          return;
        }
      } catch (conversionErr) {
        // Halt execution and show error modal
        console.error('MP4 conversion failed:', conversionErr);
        const errorMessage = conversionErr instanceof Error ? conversionErr.message : 'Unknown conversion error';
        
        setIsProcessing(false);
        setSaving(false);
        setSaveProgress(0);
        setSavePhase('');
        setWorkerError(errorMessage);
        
        openModal({
          type: 'alert',
          title: 'Video Conversion Failed',
          message: `Failed to convert video to MP4 format.\n\nError: ${errorMessage}\n\nPlease try recording again or check your device's available memory.`,
        });
        
        return; // Halt execution - don't save anything
      }
      // Phase 3: File preparation and saving (70-100%)
      setSavePhase('Preparing file...');
      setSaveProgress(72);
      
      const fileDate = date ? date : new Date().toISOString().slice(0, 10);
      setSaveProgress(74);
      
      const catObj = mediaCategories.find(c => c.id === category);
      const catName = catObj ? catObj.name : category;
      setSaveProgress(76);
      
      const outName = formatMediaFileName({
        category: catName,
        title,
        author,
        date: fileDate,
        extension: ext,
      });
      setSaveProgress(78);
      
      setSavePhase('Saving video file...');
      setSaveProgress(80);
      
      const fileRecord = await saveFile(outBlob, {
        name: outName,
        type: 'video',
        mimeType: outMime,
        size: outBlob.size,
        duration,
        created: Date.now(),
      });
      setSavedFileId(fileRecord.id);
      setSaveProgress(88);
      
      // Handle thumbnail save
      if (thumbnail) {
        try {
          setSavePhase('Processing thumbnail...');
          setSaveProgress(90);
          
          const jpgBlob = await convertImageToJpg(thumbnail);
          setSaveProgress(93);
          
          setSavePhase('Saving thumbnail...');
          const thumbName = outName.replace(/\.[^.]+$/, '.jpg');
          await saveFile(jpgBlob, {
            name: thumbName,
            type: 'thumbnail',
            mimeType: 'image/jpeg',
            size: jpgBlob.size,
            duration: 0,
            created: Date.now(),
          });
          setSaveProgress(97);
        } catch {
          setThumbnailError('Thumbnail conversion failed.');
        }
      } else {
        setSaveProgress(95);
      }
      
      setSavePhase('Complete!');
      setSaveProgress(100);
      setSaving(false);
      setSaved(true);
      
      // Reset progress after brief delay
      setTimeout(() => {
        setSaved(false);
        setSaveProgress(0);
        setSavePhase('');
      }, 2000);
    } catch (err) {
      setInputError('Failed to save video: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setSaving(false);
      setSaveProgress(0);
      setSavePhase('');
    }
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
      {workerError && <div className="text-red-600 mb-2">Conversion error: {workerError}</div>}
      <div className="flex items-center justify-center gap-4 mb-6">
        {/* Main record/stop button */}
        <button
          className="w-16 h-16 rounded-full shadow-neumorph transition-all overflow-hidden p-0 border-0 bg-transparent"
          onClick={recording ? stop : start}
        >
          <RecordIcon 
            width={64} 
            height={64} 
            className="transition-colors w-full h-full"
            state={recording ? 'recording' : 'idle'}
          />
        </button>
        
        {/* Pause/Resume button - only show when recording */}
        {recording && (
          <button
            className="w-16 h-16 rounded-full shadow-neumorph transition-all overflow-hidden p-0 border-0 bg-transparent"
            onClick={paused ? resume : pause}
          >
            <RecordIcon 
              width={64} 
              height={64} 
              className="transition-colors w-full h-full"
              state={paused ? "play" : "paused"}
            />
          </button>
        )}
      </div>
      
      {/* Comprehensive progress bar during save operation */}
      {saving && (
        <div className="w-full max-w-md mb-4">
          <div className="text-sm text-gray-600 mb-2 text-center">
            {savePhase} {saveProgress > 0 && `${saveProgress}%`}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${saveProgress}%` }}
            />
          </div>
          {/* Web Worker conversion sub-progress when available */}
          {isProcessing && savePhase.includes('Converting') && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                Web Worker: {workerPhase || 'Processing...'}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div 
                  className="bg-purple-300 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((workerProgress - 35) / 30) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      <button
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-400 disabled:opacity-50"
        disabled={recording || !mediaBlob || saving}
        onClick={handleSave}
      >
        {saving ? savePhase || 'Processing...' : saved ? 'Saved!' : 'Save'}
      </button>
      </div>
    </div>
  );
};

export default VideoRecorder; 
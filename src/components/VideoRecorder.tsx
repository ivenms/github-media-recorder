import React, { useState, useRef, useEffect } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useFilesStore } from '../stores/filesStore';
import { getMobilePlatform } from '../utils/device';
import { videoWorkerService } from '../services/videoWorkerService';
import { getMediaCategories } from '../utils/appConfig';
import { formatMediaFileName } from '../utils/fileUtils';
import { convertImageToJpg } from '../utils/fileUtils';
import { getTodayDateString, isFutureDate } from '../utils/date';
import { canStoreFile, isStorageNearCapacity, validateFileSize } from '../utils/storageQuota';
import type { VideoRecorderProps } from '../types';
import { useUIStore } from '../stores/uiStore';
import Header from './Header';
import InputField from './InputField';
import SaveButton from './SaveButton';
import RecordIcon from './icons/RecordIcon';
import { useScreenOrientation } from '../hooks/useScreenOrientation';

const VideoRecorder: React.FC<VideoRecorderProps> = () => {
  const mediaCategories = getMediaCategories();
  const orientation = useScreenOrientation();
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

  const { saveFile } = useFilesStore();

  // For video, use videoUrl/videoBlob if available, else fallback to audioUrl/audioBlob
  const mediaUrl = (videoUrl as string) || (audioUrl as string) || null;
  const mediaBlob = (videoBlob as Blob) || (audioBlob as Blob) || null;

  // Fix video orientation for iOS Safari when URL changes
  useEffect(() => {
    if (mediaUrl && videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        // iOS Safari specific rotation fix
        const platform = getMobilePlatform();
        
        if (platform === 'ios-safari' && video.videoWidth > video.videoHeight) {
          // Video is landscape but was likely recorded in portrait on iOS Safari
          // Apply counter-clockwise rotation to fix the anti-clockwise issue
          video.style.transform = 'rotate(-90deg)';
          video.style.transformOrigin = 'center';
        } else {
          // Non-iOS or correctly oriented video
          video.style.transform = 'none';
        }
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [mediaUrl]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (recording && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      // Ensure inline playback on iOS
      videoRef.current.setAttribute('playsInline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [recording, stream]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(mediaCategories[0].id);
  const [date, setDate] = useState(getTodayDateString());
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

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
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        openModal({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please select a valid image file.',
          confirmText: 'OK'
        });
        setThumbnail(null);
        // Clear the file input
        e.target.value = '';
        return;
      }
      
      try {
        await validateFileSize(file, 'thumbnail');
        setThumbnail(file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Thumbnail validation failed';
        openModal({
          type: 'error',
          title: 'File Too Large',
          message: errorMessage,
          confirmText: 'OK'
        });
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
        openModal({
          type: 'error',
          title: 'Storage Error',
          message: 'Storage is critically low. Please free up some space before saving.',
          confirmText: 'OK'
        });
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
        openModal({
          type: 'error',
          title: 'Storage Error',
          message: 'Not enough storage space available. Please free up some space and try again.',
          confirmText: 'OK'
        });
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
        
        const conversionResult = await videoWorkerService.convertVideo(
          uint8,
          (progress) => {
            // Map worker progress to save progress (35-65% range)
            if (progress >= 0 && progress <= 100) {
              const mappedProgress = 35 + (progress * 0.3);
              setSaveProgress(Math.round(mappedProgress));
            }
          }
        );
        
        setSaveProgress(65);
        outBlob = new Blob([conversionResult.convertedData], { type: 'video/mp4' });
        outMime = 'video/mp4';
        ext = 'mp4';
        setSaveProgress(70);
        
        // Final check after conversion (converted file might be different size)
        const finalCanStore = await canStoreFile(outBlob.size);
        if (!finalCanStore) {
          openModal({
            type: 'error',
            title: 'Storage Error',
            message: 'Converted file is too large for available storage space.',
            confirmText: 'OK'
          });
          setSaving(false);
          setSaveProgress(0);
          setSavePhase('');
          return;
        }
      } catch (conversionErr) {
        // Halt execution and show error modal
        console.error('MP4 conversion failed:', conversionErr);
        const errorMessage = conversionErr instanceof Error ? conversionErr.message : 'Unknown conversion error';
        
        setSaving(false);
        setSaveProgress(0);
        setSavePhase('');
        
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
          openModal({
            type: 'error',
            title: 'Thumbnail Error',
            message: 'Thumbnail conversion failed.',
            confirmText: 'OK'
          });
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
      openModal({
        type: 'error',
        title: 'Save Error',
        message: 'Failed to save video: ' + (err instanceof Error ? err.message : 'Unknown error'),
        confirmText: 'OK'
      });
      setSaving(false);
      setSaveProgress(0);
      setSavePhase('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Video Recorder" />
      <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-md mb-6 p-4 bg-white rounded-xl shadow-lg">
        <div className={`w-full bg-gray-300 rounded-lg mb-4 flex items-center justify-center overflow-hidden ${orientation === 'portrait' ? 'video-preview-portrait' : 'video-preview-landscape'}`}>
          {recording && stream ? (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              webkit-playsinline="true"
              x-webkit-airplay="disabled"
              className="w-full h-full object-cover rounded-lg" 
            />
          ) : mediaUrl ? (
            <video 
              ref={videoRef}
              src={mediaUrl} 
              controls 
              playsInline
              webkit-playsinline="true"
              x-webkit-airplay="disabled"
              className="w-full h-full object-cover rounded-lg" 
            />
          ) : (
            <span className="text-gray-500">{recording ? '[Recording...]' : '[Camera Preview]'}</span>
          )}
        </div>
        
        {/* Timer display */}
        <div className="text-2xl font-mono mb-4 text-center text-purple-600">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
        
        {/* Record buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Main record/stop button */}
          <button
            className="w-16 h-16 rounded-full shadow-lg transition-all overflow-hidden p-0 border-0 bg-transparent"
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
              className="w-16 h-16 rounded-full shadow-lg transition-all overflow-hidden p-0 border-0 bg-transparent"
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
      </div>
      
      {/* Input error display */}
      {inputError && <div className="text-red-600 mb-2">{inputError}</div>}
      
      <div className="w-full max-w-md mb-6 p-4 bg-white rounded-xl shadow-lg">
        <div className="space-y-4">
          <InputField
            label="Title"
            type="text"
            placeholder="Title (required)"
            value={title}
            maxLength={100}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <InputField
            label="Author"
            type="text"
            placeholder="Author (required)"
            value={author}
            maxLength={50}
            onChange={e => setAuthor(e.target.value)}
            required
          />
          <InputField
            label="Category"
            type="select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={mediaCategories}
          />
          <InputField
            label="Date"
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
          <InputField
            label="Thumbnail"
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
          />
        </div>
      </div>
      
      {/* Error display */}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      
      <SaveButton
        saving={saving}
        saved={saved}
        saveProgress={saveProgress}
        savePhase={savePhase}
        disabled={recording || !mediaBlob || saving}
        onClick={handleSave}
      />
      </div>
    </div>
  );
};

export default VideoRecorder;
 
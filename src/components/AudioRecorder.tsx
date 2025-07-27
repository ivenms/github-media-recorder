import React, { useState } from 'react';
import { audioWorkerService } from '../services/audioWorkerService';
import { decodeWebmToPCM, encodeWAV, formatMediaFileName, convertImageToJpg } from '../utils/fileUtils';
import type { AudioRecorderProps } from '../types';
import { getMediaCategories } from '../utils/appConfig';
import { useUIStore } from '../stores/uiStore';
import { useFilesStore } from '../stores/filesStore';
import { canStoreFile, isStorageNearCapacity } from '../utils/storageQuota';
import MicIcon from './icons/MicIcon';
import RecordIcon from './icons/RecordIcon';
import Waveform from './Waveform';
import Modal from './Modal';
import Header from './Header';
import InputField from './InputField';
import SaveButton from './SaveButton';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioForm } from '../hooks/useAudioForm';
import { getTodayDateString, isFutureDate } from '../utils/date';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioFormat }) => {
  const mediaCategories = getMediaCategories();
  // Recording logic
  const {
    recording,
    duration,
    audioUrl,
    error,
    stream,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  // Form logic
  const {
    title,
    setTitle,
    author,
    setAuthor,
    category,
    setCategory,
    date,
    setDate,
    titleError,
    authorError,
    thumbnail,
    validateInputs,
    handleThumbnailChange,
  } = useAudioForm();

  
  // Save states
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedFileId, setSavedFileId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState(0);
  const [savePhase, setSavePhase] = useState<string>('');
  const [saveThumbnailError, setSaveThumbnailError] = useState<string | null>(null);

  const { setScreen, openModal } = useUIStore();
  const { saveFile } = useFilesStore();

  // Navigate to library screen when file is saved
  React.useEffect(() => {
    if (saved && savedFileId) {
      const timer = setTimeout(() => {
        setScreen('library', savedFileId);
      }, 1000); // Show "Saved!" briefly before navigating
      return () => clearTimeout(timer);
    }
  }, [saved, savedFileId, setScreen]);

  const clearThumbnailError = () => setSaveThumbnailError(null);

  const handleSave = async () => {
    if (!audioUrl) return;
    if (!validateInputs()) return;
    
    setSaving(true);
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
      
      // Fetch the blob from the audioUrl
      setSavePhase('Loading audio data...');
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      setSaveProgress(15);
      
      // Check if we can store the original file
      const canStore = await canStoreFile(blob.size);
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
      
      let outBlob = blob;
      let outMime = blob.type;
      let ext = 'webm';
      
      try {
        // Phase 2: Audio conversion (20-70%)
        if (audioFormat === 'wav' || audioFormat === 'mp3') {
          setSavePhase('Preparing conversion...');
          setSaveProgress(25);
          
          if (audioFormat === 'wav') {
            // Direct WAV conversion without Web Worker
            setSavePhase('Converting to WAV...');
            setSaveProgress(35);
            
            const { channelData, sampleRate } = await decodeWebmToPCM(blob);
            setSaveProgress(50);
            
            outBlob = encodeWAV(channelData, sampleRate);
            outMime = 'audio/wav';
            ext = 'wav';
            setSaveProgress(70);
          } else if (audioFormat === 'mp3') {
            // Use Web Worker for MP3 conversion (direct from WebM)
            setSavePhase('Preparing MP3 conversion...');
            setSaveProgress(30);
            
            const arrayBuffer = await blob.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            
            setSaveProgress(35);
            
            // Convert using Web Worker Service (handles its own progress reporting 35-65%)
            
            const conversionResult = await audioWorkerService.convertAudio(
              uint8,
              'mp3',
              (progress) => {
                // Map worker progress to save progress (35-65% range)
                if (progress >= 0 && progress <= 100) {
                  const mappedProgress = 35 + (progress * 0.3);
                  setSaveProgress(Math.round(mappedProgress));
                }
              }
            );
            setSaveProgress(65);
            
            outBlob = new Blob([conversionResult.convertedData], { type: 'audio/mp3' });
            outMime = 'audio/mp3';
            ext = 'mp3';
            setSaveProgress(70);
          }
        } else {
          // Keep original format
          setSaveProgress(70);
        }
        
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
        console.error('Audio conversion failed:', conversionErr);
        const errorMessage = conversionErr instanceof Error ? conversionErr.message : 'Unknown conversion error';
        
        setSaving(false);
        setSaveProgress(0);
        setSavePhase('');
        
        openModal({
          type: 'alert',
          title: 'Audio Conversion Failed',
          message: `Failed to convert audio to ${audioFormat.toUpperCase()} format.\n\nError: ${errorMessage}\n\nPlease try recording again or check your device's available memory.`,
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
      
      setSavePhase('Saving audio file...');
      setSaveProgress(80);
      
      const fileRecord = await saveFile(outBlob, {
        name: outName,
        type: 'audio',
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
          setSaveThumbnailError('Thumbnail conversion failed.');
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
        title: 'Audio Save Failed',
        message: `Failed to save audio recording.\n\nError: ${err instanceof Error ? err.message : 'Unknown error'}\n\nPlease try saving again or check your device's storage and permissions.`,
        confirmText: 'OK'
      });
      setSaving(false);
      setSaveProgress(0);
      setSavePhase('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Voice Recording" />
      <div className="flex flex-col items-center p-4 pb-32">
      {error && <div className="text-red-600 mb-2">{error}</div>}
      
      <Modal
        isOpen={!!saveThumbnailError}
        onClose={clearThumbnailError}
        title="Thumbnail Error"
        message={saveThumbnailError || ''}
        type="alert"
      />
      <div className="flex flex-col items-center w-full max-w-md bg-white/70 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 flex items-center justify-center mb-2">
            <MicIcon className="w-20 h-20" />
          </div>
          <div className="text-3xl font-mono text-purple-600 mb-2">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
          <div className="w-full h-10 flex items-center justify-center mb-2">
            <Waveform height={40} stream={recording ? stream : undefined} />
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            className="w-14 h-14 rounded-full shadow-neumorph transition-all overflow-hidden p-0 border-0 bg-transparent"
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            <RecordIcon 
              width={56} 
              height={56} 
              className="transition-colors w-full h-full"
              state={recording ? 'recording' : 'idle'}
            />
          </button>
        </div>
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full mt-4 rounded-xl" />
        )}
      </div>
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
            error={titleError || undefined}
          />
          <InputField
            label="Author"
            type="text"
            placeholder="Author (required)"
            value={author}
            maxLength={50}
            onChange={e => setAuthor(e.target.value)}
            required
            error={authorError || undefined}
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
      
      <SaveButton
        saving={saving}
        saved={saved}
        saveProgress={saveProgress}
        savePhase={savePhase}
        disabled={recording || !audioUrl || saving}
        onClick={handleSave}
      />
      </div>
    </div>
  );
};

export default AudioRecorder; 
import React from 'react';
import { useFileConverter } from '../hooks/useFileConverter';
// @ts-expect-error: no types for lamejs
import lamejs from 'lamejs';
// Fix for lamejs: define Lame global if not present
if (typeof window !== 'undefined' && !(window as any).Lame) {
  (window as any).Lame = lamejs;
}
// Fix for lamejs: define BitStream global if not present
if (typeof window !== 'undefined' && !(window as any).BitStream && lamejs.BitStream) {
  (window as any).BitStream = lamejs.BitStream;
}
import type { AudioRecorderProps } from '../types';
import { getMediaCategories } from '../utils/appConfig';
import MicIcon from './icons/MicIcon';
import Waveform from './Waveform';
import Modal from './Modal';
import Header from './Header';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioForm } from '../hooks/useAudioForm';
import { useAudioSave } from '../hooks/useAudioSave';
import { getTodayDateString, isFutureDate } from '../utils/date';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioFormat, onNavigateToLibrary }) => {
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
    setThumbnail,
    thumbnailError,
    setThumbnailError,
    validateInputs,
    handleThumbnailChange,
  } = useAudioForm();

  // File conversion logic
  const { convert, progress: convertProgress, error: convertError } = useFileConverter();

  // Save logic
  const {
    handleSave,
    saving,
    saved,
    thumbnailError: saveThumbnailError,
    clearThumbnailError,
    savedFileId,
  } = useAudioSave({
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
  });

  // For freezing waveform: listen to last animation frame from Waveform
  const [waveformData, setWaveformData] = React.useState<number[] | undefined>(undefined);
  const handleWaveformData = React.useCallback((bars: number[]) => {
    setWaveformData(bars);
  }, []);

  // Fix for lamejs: define MPEGMode if not present
  if (typeof window !== 'undefined' && !(window as any).MPEGMode) {
    (window as any).MPEGMode = { MONO: 3, STEREO: 0, DUAL_CHANNEL: 2, JOINT_STEREO: 1 };
  }

  // Navigate to library screen when file is saved
  React.useEffect(() => {
    if (saved && savedFileId && onNavigateToLibrary) {
      const timer = setTimeout(() => {
        onNavigateToLibrary(savedFileId);
      }, 1000); // Show "Saved!" briefly before navigating
      return () => clearTimeout(timer);
    }
  }, [saved, savedFileId, onNavigateToLibrary]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Voice Recording" />
      <div className="flex flex-col items-center p-4">
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {convertError && <div className="text-red-600 mb-2">{convertError}</div>}
      
      <Modal
        isOpen={!!saveThumbnailError}
        onClose={clearThumbnailError}
        title="Thumbnail Error"
        message={saveThumbnailError || ''}
        type="alert"
      />
      <div className="flex flex-col items-center w-full max-w-xs bg-white/70 rounded-3xl shadow-neumorph p-6 mb-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 flex items-center justify-center mb-2">
            <MicIcon className="w-20 h-20" />
          </div>
          <div className="text-3xl font-mono text-purple-600 mb-2">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
          <div className="w-full h-10 flex items-center justify-center mb-2">
            <Waveform height={40} stream={recording ? stream : undefined} data={!recording ? waveformData : undefined} />
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-neumorph text-2xl transition-all ${recording ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <span className="text-3xl">&#9632;</span> // Red square for stop
            ) : (
              <span className="text-3xl">&#9679;</span> // Green circle for record
            )}
          </button>
        </div>
        <button
          className="w-full bg-purple-500 text-white px-4 py-2 rounded-xl shadow-neumorph disabled:opacity-50 hover:bg-purple-400"
          disabled={recording || !audioUrl || saving}
          onClick={handleSave}
        >
          {saving ? (audioFormat === 'mp3' && convertProgress > 0 && convertProgress < 1 ? `Converting... ${(convertProgress * 100).toFixed(0)}%` : 'Saving...') : saved ? 'Saved!' : 'Save'}
        </button>
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full mt-4 rounded-xl" />
        )}
      </div>
      <div className="flex flex-col w-full max-w-xs gap-2 mt-2">
        <div>
          <input
            className={`border rounded-xl px-3 py-2 shadow-neumorph w-full ${
              titleError ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
            } focus:outline-none focus:ring-2`}
            placeholder="Title (required)"
            value={title}
            maxLength={100}
            onChange={e => setTitle(e.target.value)}
            required
          />
          {titleError && <div className="text-red-600 text-sm mt-1">{titleError}</div>}
        </div>
        <div>
          <input
            className={`border rounded-xl px-3 py-2 shadow-neumorph w-full ${
              authorError ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
            } focus:outline-none focus:ring-2`}
            placeholder="Author (required)"
            value={author}
            maxLength={50}
            onChange={e => setAuthor(e.target.value)}
            required
          />
          {authorError && <div className="text-red-600 text-sm mt-1">{authorError}</div>}
        </div>
        <select
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {mediaCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          className="border rounded-xl px-3 py-2 shadow-neumorph"
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
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          onChange={handleThumbnailChange}
        />
      </div>
      </div>
    </div>
  );
};

export default AudioRecorder; 
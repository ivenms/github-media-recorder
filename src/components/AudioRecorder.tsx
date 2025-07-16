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
import { MEDIA_CATEGORIES } from '../types';
import MicIcon from './icons/MicIcon';
import Waveform from './Waveform';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioForm } from '../hooks/useAudioForm';
import { useAudioSave } from '../hooks/useAudioSave';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioFormat }) => {
  // Recording logic
  const {
    recording,
    duration,
    audioUrl,
    error,
    formatWarning,
    stream,
    startRecording,
    stopRecording,
    setError,
    setFormatWarning,
    setDuration,
    setAudioUrl,
    setStream,
  } = useAudioRecorder(audioFormat);

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
    inputError,
    setInputError,
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
    setInputError,
    setThumbnailError,
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

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-700">Voice Recording</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {inputError && <div className="text-red-600 mb-2">{inputError}</div>}
      {convertError && <div className="text-red-600 mb-2">{convertError}</div>}
      {formatWarning && <div className="text-yellow-600 mb-2">{formatWarning}</div>}
      {thumbnailError && <div className="text-red-600 mb-2">{thumbnailError}</div>}
      <div className="flex flex-col items-center w-full max-w-xs bg-white/70 rounded-3xl shadow-neumorph p-6 mb-6">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 flex items-center justify-center mb-2">
            <MicIcon className="w-20 h-20" />
          </div>
          <div className="text-3xl font-mono text-blue-600 mb-2">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
          <div className="w-full h-10 flex items-center justify-center mb-2">
            <Waveform height={40} stream={recording ? stream : undefined} data={!recording ? waveformData : undefined} />
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <button
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-neumorph text-2xl transition-all ${recording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? <span className="text-3xl">&#10073;&#10073;</span> : <span className="text-3xl">&#9679;</span>}
          </button>
        </div>
        <button
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl shadow-neumorph disabled:opacity-50"
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
        <input
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          placeholder="Title (required)"
          value={title}
          maxLength={100}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <input
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          placeholder="Author (required)"
          value={author}
          maxLength={50}
          onChange={e => setAuthor(e.target.value)}
          required
        />
        <select
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {MEDIA_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          className="border rounded-xl px-3 py-2 shadow-neumorph"
          onChange={handleThumbnailChange}
        />
      </div>
    </div>
  );
};

export default AudioRecorder; 
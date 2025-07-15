import React, { useState } from 'react';
import { saveFile, decodeWebmToPCM, encodeWAV, formatMediaFileName, convertImageToJpg } from '../utils/fileUtils';
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

const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioFormat }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const { convert, progress: convertProgress, error: convertError } = useFileConverter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(MEDIA_CATEGORIES[0].id);
  const [date, setDate] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  React.useEffect(() => {
    let timer: any;
    if (recording) {
      timer = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [recording]);

  const startRecording = async () => {
    setError(null);
    setFormatWarning(null);
    setDuration(0);
    setAudioUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('audio/webm is not supported in this browser.');
      }
      if (audioFormat === 'mp3' || audioFormat === 'wav') {
        setFormatWarning('Selected format (' + audioFormat.toUpperCase() + ') is not supported for recording. Recording will be saved as WEBM.');
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setError('Could not start recording: ' + (err?.message || 'Unknown error'));
      setRecording(false);
      console.error('AudioRecorder error:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

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

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

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
            <Waveform height={40} />
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
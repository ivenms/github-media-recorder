import React, { useState } from 'react';
import { saveFile } from '../utils/fileUtils';
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

  // Helper: decode webm audio to PCM using Web Audio API
  async function decodeWebmToPCM(blob: Blob): Promise<{channelData: Float32Array[], sampleRate: number}> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }
    return { channelData, sampleRate: audioBuffer.sampleRate };
  }

  // Helper: encode PCM to WAV
  function encodeWAV(channelData: Float32Array[], sampleRate: number): Blob {
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

  const handleSave = async () => {
    if (!audioUrl) return;
    setSaving(true);
    // Fetch the blob from the audioUrl
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    let outBlob = blob;
    let outName = `audio-${Date.now()}.webm`;
    let outMime = blob.type;
    try {
      if (audioFormat === 'wav' || audioFormat === 'mp3') {
        const { channelData, sampleRate } = await decodeWebmToPCM(blob);
        if (audioFormat === 'wav') {
          outBlob = encodeWAV(channelData, sampleRate);
          outName = `audio-${Date.now()}.wav`;
          outMime = 'audio/wav';
        } else if (audioFormat === 'mp3') {
          // Use useFileConverter hook for mp3 conversion
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const mp3Data = await convert('mp3', uint8);
          if (!mp3Data) throw new Error('MP3 conversion failed');
          outBlob = new Blob([mp3Data], { type: 'audio/mp3' });
          outName = `audio-${Date.now()}.mp3`;
          outMime = 'audio/mp3';
        }
      }
    } catch (err) {
      setError('Conversion failed: ' + (err as any)?.message);
      setSaving(false);
      return;
    }
    await saveFile(outBlob, {
      name: outName,
      type: 'audio',
      mimeType: outMime,
      size: outBlob.size,
      duration,
      created: Date.now(),
    });
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
      <h2 className="text-lg font-bold mb-2">Audio Recorder</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {convertError && <div className="text-red-600 mb-2">{convertError}</div>}
      {formatWarning && <div className="text-yellow-600 mb-2">{formatWarning}</div>}
      <div className="w-full h-16 bg-gray-200 rounded mb-4 flex items-center justify-center">
        {/* Waveform placeholder */}
        <span className="text-gray-500">[Waveform]</span>
      </div>
      <div className="text-2xl font-mono mb-4">{new Date(duration * 1000).toISOString().substr(14, 5)}</div>
      <button
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${recording ? 'bg-red-600' : 'bg-green-600'} text-white text-2xl`}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? '■' : '●'}
      </button>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={recording || !audioUrl || saving}
        onClick={handleSave}
      >
        {saving ? (audioFormat === 'mp3' && convertProgress > 0 && convertProgress < 1 ? `Converting... ${(convertProgress * 100).toFixed(0)}%` : 'Saving...') : saved ? 'Saved!' : 'Save'}
      </button>
      {audioUrl && (
        <audio controls src={audioUrl} className="mt-2" />
      )}
    </div>
  );
};

export default AudioRecorder; 
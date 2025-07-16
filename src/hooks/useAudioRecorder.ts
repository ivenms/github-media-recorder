import { useState, useRef, useEffect } from 'react';

export function useAudioRecorder(audioFormat: string) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    setError(null);
    setFormatWarning(null);
    setDuration(0);
    setAudioUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(stream);
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
        setStream(undefined);
      };
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setError('Could not start recording: ' + (err?.message || 'Unknown error'));
      setRecording(false);
      setStream(undefined);
      console.error('AudioRecorder error:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  useEffect(() => {
    let timer: any;
    if (recording) {
      timer = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return {
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
  };
} 
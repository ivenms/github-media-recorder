import { useState, useRef, useCallback } from 'react';
import type { UseMediaRecorderOptions } from '../types';

export function useMediaRecorder(options: UseMediaRecorderOptions) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setVideoUrl(null);
    setVideoBlob(null);
    setDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: options.audio, video: options.video });
      streamRef.current = stream;
      const mimeType = options.mimeType || (options.audio && !options.video ? 'audio/webm' : 'video/webm');
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        if (options.video) {
          setVideoBlob(blob);
          setVideoUrl(URL.createObjectURL(blob));
        } else {
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.onerror = (e) => setError(e.error?.message || 'Recording error');
      recorder.start();
      setRecording(true);
      setPaused(false);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e: any) {
      setError(e.message || 'Could not start recording');
    }
  }, [options.audio, options.video, options.mimeType]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setPaused(false);
      clearInterval(timerRef.current);
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      clearInterval(timerRef.current);
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
  }, []);

  return {
    recording,
    paused,
    error,
    duration,
    audioUrl,
    audioBlob,
    videoUrl,
    videoBlob,
    start,
    stop,
    pause,
    resume,
    stream: streamRef.current,
  };
} 
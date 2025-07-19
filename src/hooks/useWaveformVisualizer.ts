import { useEffect, useRef, useState } from 'react';

const DEFAULT_BARS = 32;

export function useWaveformVisualizer(stream?: MediaStream): number[] | undefined {
  const [bars, setBars] = useState<number[] | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) return;
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    const audioContext = new (window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      const newBars: number[] = [];
      const binsPerBar = Math.floor(dataArray.length / DEFAULT_BARS);
      for (let i = 0; i < DEFAULT_BARS; i++) {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          sum += dataArray[i * binsPerBar + j];
        }
        const avg = sum / binsPerBar;
        newBars.push(avg / 255);
      }
      setBars(newBars);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream]);

  return bars;
} 
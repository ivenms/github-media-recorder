import { useState, useCallback } from 'react';
import { convertToMp3, convertToMp4 } from '../utils/mediaConverter';

export type ConvertType = 'mp3' | 'mp4';

export function useFileConverter() {
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(
    async (type: ConvertType, input: Uint8Array): Promise<Uint8Array | null> => {
      setProgress(0);
      setError(null);
      try {
        if (type === 'mp3') {
          return await convertToMp3(input, setProgress);
        } else if (type === 'mp4') {
          return await convertToMp4(input, setProgress);
        } else {
          setError('Unsupported conversion type');
          return null;
        }
      } catch (err: any) {
        setError(err?.message || 'Conversion failed');
        return null;
      }
    },
    []
  );

  return {
    convert,
    progress,
    error,
  };
} 
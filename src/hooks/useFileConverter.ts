import { useState, useCallback } from 'react';
import { convertToMp3, convertToMp4 } from '../utils/mediaConverter';
import type { ConvertType } from '../types';

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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Conversion failed');
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
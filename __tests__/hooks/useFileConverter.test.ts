import { renderHook, act } from '@testing-library/react';
import { useFileConverter } from '../../src/hooks/useFileConverter';

// Mock the media converter utility
jest.mock('../../src/utils/mediaConverter', () => ({
  convertToMp3: jest.fn(),
  convertToMp4: jest.fn(),
}));

import { convertToMp3, convertToMp4 } from '../../src/utils/mediaConverter';
import { ConvertType } from '../../src/types';

const mockConvertToMp3 = convertToMp3 as jest.MockedFunction<typeof convertToMp3>;
const mockConvertToMp4 = convertToMp4 as jest.MockedFunction<typeof convertToMp4>;

describe('useFileConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useFileConverter());

      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.convert).toBe('function');
    });
  });

  describe('MP3 Conversion', () => {
    it('should successfully convert to MP3', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const outputData = new Uint8Array([5, 6, 7, 8]);
      
      mockConvertToMp3.mockImplementation(async (input, progressCallback) => {
        progressCallback?.(25);
        progressCallback?.(50);
        progressCallback?.(75);
        progressCallback?.(100);
        return outputData;
      });

      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('mp3', inputData);
      });

      expect(conversionResult).toBe(outputData);
      expect(result.current.progress).toBe(100);
      expect(result.current.error).toBeNull();
      expect(mockConvertToMp3).toHaveBeenCalledWith(inputData, expect.any(Function));
      expect(mockConvertToMp4).not.toHaveBeenCalled();
    });

    it('should handle MP3 conversion errors', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const errorMessage = 'MP3 conversion failed';
      
      mockConvertToMp3.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('mp3', inputData);
      });

      expect(conversionResult).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should reset state before MP3 conversion', async () => {
      const { result } = renderHook(() => useFileConverter());

      // Set initial error and progress
      await act(async () => {
        try {
          await result.current.convert('unsupported' as unknown as 'mp3' | 'mp4', new Uint8Array());
        } catch {
          // Expected to fail
        }
      });

      expect(result.current.error).toBe('Unsupported conversion type');

      // Now test successful conversion
      const inputData = new Uint8Array([1, 2, 3, 4]);
      mockConvertToMp3.mockResolvedValue(new Uint8Array([5, 6, 7, 8]));

      await act(async () => {
        await result.current.convert('mp3', inputData);
      });

      expect(result.current.progress).toBe(0); // Reset to 0 at start
      expect(result.current.error).toBeNull(); // Error cleared
    });
  });

  describe('MP4 Conversion', () => {
    it('should successfully convert to MP4', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const outputData = new Uint8Array([9, 10, 11, 12]);
      
      mockConvertToMp4.mockImplementation(async (input, progressCallback) => {
        // Simulate progress updates
        progressCallback(20);
        progressCallback(40);
        progressCallback(60);
        progressCallback(80);
        progressCallback(100);
        return outputData;
      });

      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('mp4', inputData);
      });

      expect(conversionResult).toBe(outputData);
      expect(result.current.progress).toBe(100);
      expect(result.current.error).toBeNull();
      expect(mockConvertToMp4).toHaveBeenCalledWith(inputData, expect.any(Function));
      expect(mockConvertToMp3).not.toHaveBeenCalled();
    });

    it('should handle MP4 conversion errors', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      const errorMessage = 'MP4 conversion failed';
      
      mockConvertToMp4.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('mp4', inputData);
      });

      expect(conversionResult).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress during conversion', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      
      mockConvertToMp3.mockImplementation(async (input, progressCallback) => {
        progressCallback?.(25);
        progressCallback?.(50);
        progressCallback?.(75);
        progressCallback?.(100);
        return new Uint8Array([5, 6, 7, 8]);
      });

      const { result } = renderHook(() => useFileConverter());

      await act(async () => {
        await result.current.convert('mp3', inputData);
      });

      // Progress should be updated by the mock implementation
      expect(result.current.progress).toBe(100);
    });

    it('should reset progress to 0 at start of conversion', async () => {
      const { result } = renderHook(() => useFileConverter());

      // First, set progress to some value
      mockConvertToMp3.mockImplementation(async (input, progressCallback) => {
        progressCallback(50);
        return new Uint8Array([5, 6, 7, 8]);
      });

      await act(async () => {
        await result.current.convert('mp3', new Uint8Array([1, 2, 3, 4]));
      });

      expect(result.current.progress).toBe(50);

      // Now start another conversion
      mockConvertToMp3.mockImplementation(async (_input, _progressCallback) => {
        // Don't call progressCallback immediately
        return new Uint8Array([9, 10, 11, 12]);
      });

      await act(async () => {
        await result.current.convert('mp3', new Uint8Array([5, 6, 7, 8]));
      });

      // Progress should have been reset to 0 at the start of second conversion
      expect(result.current.progress).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported conversion types', async () => {
      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('unsupported' as ConvertType, new Uint8Array());
      });

      expect(conversionResult).toBeNull();
      expect(result.current.error).toBe('Unsupported conversion type');
      expect(result.current.progress).toBe(0);
    });

    it('should handle non-Error exceptions', async () => {
      const inputData = new Uint8Array([1, 2, 3, 4]);
      
      mockConvertToMp3.mockRejectedValue('String error');

      const { result } = renderHook(() => useFileConverter());

      let conversionResult: Uint8Array | null = null;

      await act(async () => {
        conversionResult = await result.current.convert('mp3', inputData);
      });

      expect(conversionResult).toBeNull();
      expect(result.current.error).toBe('Conversion failed');
    });

    it('should clear previous errors on new conversion', async () => {
      const { result } = renderHook(() => useFileConverter());

      // First conversion that fails
      mockConvertToMp3.mockRejectedValue(new Error('First error'));

      await act(async () => {
        await result.current.convert('mp3', new Uint8Array([1, 2, 3, 4]));
      });

      expect(result.current.error).toBe('First error');

      // Second conversion that succeeds
      mockConvertToMp3.mockResolvedValue(new Uint8Array([5, 6, 7, 8]));

      await act(async () => {
        await result.current.convert('mp3', new Uint8Array([9, 10, 11, 12]));
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Hook Stability', () => {
    it('should return stable convert function reference', () => {
      const { result, rerender } = renderHook(() => useFileConverter());

      const firstConvert = result.current.convert;
      
      rerender();
      
      const secondConvert = result.current.convert;

      expect(firstConvert).toBe(secondConvert);
    });

    it('should handle multiple simultaneous conversions correctly', async () => {
      const { result } = renderHook(() => useFileConverter());

      // Set up mocks before starting conversions
      mockConvertToMp3.mockResolvedValue(new Uint8Array([10, 11, 12, 13]));
      mockConvertToMp4.mockResolvedValue(new Uint8Array([14, 15, 16, 17]));

      // Start two conversions simultaneously
      const conversion1Promise = act(async () => {
        return await result.current.convert('mp3', new Uint8Array([1, 2, 3, 4]));
      });

      const conversion2Promise = act(async () => {
        return await result.current.convert('mp4', new Uint8Array([5, 6, 7, 8]));
      });

      // Both should complete without interfering with each other
      const [result1, result2] = await Promise.all([conversion1Promise, conversion2Promise]);

      // Both conversions should succeed
      expect(result1).toEqual(new Uint8Array([10, 11, 12, 13]));
      expect(result2).toEqual(new Uint8Array([14, 15, 16, 17]));
      
      // The final state should be from the last completed conversion (no error)
      expect(result.current.error).toBeNull();
    });
  });
});
import { renderHook, act } from '@testing-library/react';
import { useMediaRecorder } from '../../src/hooks/useMediaRecorder';
import { getMobilePlatform } from '../../src/utils/device';

// Mock the device utility
jest.mock('../../src/utils/device', () => ({
  getMobilePlatform: jest.fn(),
}));

import type { MobilePlatform } from '../../src/types/utils';

const mockGetMobilePlatform = getMobilePlatform as jest.MockedFunction<typeof getMobilePlatform>;

// Mock MediaRecorder globally
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();

const mockMediaRecorder = {
  start: mockStart,
  stop: mockStop,
  pause: mockPause,
  resume: mockResume,
  state: 'inactive',
  ondataavailable: null as ((event: BlobEvent) => void) | null,
  onstop: null as (() => void) | null,
  onerror: null as ((event: { error: { message?: string } | null }) => void) | null,
};

global.MediaRecorder = Object.assign(
  jest.fn().mockImplementation(() => mockMediaRecorder as unknown as MediaRecorder),
  {
    isTypeSupported: jest.fn().mockReturnValue(true)
  }
);

// Mock getUserMedia
const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('mock://url');

describe('useMediaRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetMobilePlatform.mockReturnValue('android-chrome' as unknown as MobilePlatform);
    Object.defineProperty(mockMediaRecorder, 'state', { value: 'inactive', writable: true });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      expect(result.current.recording).toBe(false);
      expect(result.current.paused).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.duration).toBe(0);
      expect(result.current.audioUrl).toBeNull();
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.videoUrl).toBeNull();
      expect(result.current.videoBlob).toBeNull();
      expect(result.current.stream).toBeNull();
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
    });
  });

  describe('Audio Recording', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should start audio recording successfully', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      });
      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, { mimeType: 'audio/webm' });
      expect(mockStart).toHaveBeenCalled();
      expect(result.current.recording).toBe(true);
      expect(result.current.paused).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle getUserMedia errors', async () => {
      const errorMessage = 'Permission denied';
      mockGetUserMedia.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.recording).toBe(false);
    });

    it('should stop audio recording and create blob', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate recording stop
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      act(() => {
        if (typeof mockMediaRecorder.ondataavailable === 'function') {
          mockMediaRecorder.ondataavailable({ data: mockBlob } as unknown as BlobEvent);
        }
        if (typeof mockMediaRecorder.onstop === 'function') {
          mockMediaRecorder.onstop();
        }
      });

      act(() => {
        result.current.stop();
      });

      expect(mockStop).toHaveBeenCalled();
      expect(result.current.recording).toBe(false);
      expect(result.current.audioBlob).toEqual(expect.any(Blob));
      expect(result.current.audioUrl).toBe('mock://url');
    });

    it('should increment duration during recording', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.duration).toBe(0);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.duration).toBe(3);
    });
  });

  describe('Video Recording', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should start video recording with default constraints', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true, video: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      });
      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, { mimeType: 'video/webm' });
      expect(result.current.recording).toBe(true);
    });

    it('should use iOS Safari specific constraints', async () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari' as unknown as MobilePlatform);

      const { result } = renderHook(() => useMediaRecorder({ audio: true, video: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: {
          facingMode: 'user',
          width: { exact: 640 },
          height: { exact: 480 },
        },
      });
    });

    it('should handle video MIME type selection for iOS Safari', async () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari' as unknown as MobilePlatform);
      (global.MediaRecorder as typeof MediaRecorder & { isTypeSupported: jest.Mock }).isTypeSupported.mockImplementation((type: string) => {
        return type === 'video/mp4';
      });

      const { result } = renderHook(() => useMediaRecorder({ audio: true, video: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, { mimeType: 'video/mp4' });
    });

    it('should stop video recording and create video blob', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true, video: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate recording stop
      const mockBlob = new Blob(['video data'], { type: 'video/webm' });
      
      act(() => {
        if (typeof mockMediaRecorder.ondataavailable === 'function') {
          mockMediaRecorder.ondataavailable({ data: mockBlob } as unknown as BlobEvent);
        }
        if (typeof mockMediaRecorder.onstop === 'function') {
          mockMediaRecorder.onstop();
        }
      });

      act(() => {
        result.current.stop();
      });

      expect(result.current.recording).toBe(false);
      expect(result.current.videoBlob).toEqual(expect.any(Blob));
      expect(result.current.videoUrl).toBe('mock://url');
    });
  });

  describe('Pause and Resume', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should pause recording', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'recording', writable: true });
        result.current.pause();
      });

      expect(mockPause).toHaveBeenCalled();
      expect(result.current.paused).toBe(true);
    });

    it('should resume recording', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // First pause
      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'recording', writable: true });
        result.current.pause();
      });

      // Then resume
      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'paused', writable: true });
        result.current.resume();
      });

      expect(mockResume).toHaveBeenCalled();
      expect(result.current.paused).toBe(false);
    });

    it('should not pause when not recording', () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'inactive', writable: true });
      });

      act(() => {
        result.current.pause();
      });

      expect(mockPause).not.toHaveBeenCalled();
      expect(result.current.paused).toBe(false);
    });

    it('should not resume when not paused', () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'recording', writable: true });
      });

      act(() => {
        result.current.resume();
      });

      expect(mockResume).not.toHaveBeenCalled();
    });

    it('should stop timer when pausing and restart when resuming', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Let time advance
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.duration).toBe(2);

      // Pause
      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'recording', writable: true });
        result.current.pause();
      });

      // Time should not advance while paused
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.duration).toBe(2);

      // Resume
      act(() => {
        Object.defineProperty(mockMediaRecorder, 'state', { value: 'paused', writable: true });
        result.current.resume();
      });

      // Time should advance again
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.duration).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle MediaRecorder errors', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
      } as unknown as MediaStream;
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate MediaRecorder error
      const errorMessage = 'Recording failed';
      act(() => {
        if (typeof mockMediaRecorder.onerror === 'function') {
          mockMediaRecorder.onerror({ error: { message: errorMessage } });
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle MediaRecorder errors without message', async () => {
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
      } as unknown as MediaStream;
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate MediaRecorder error without message
      act(() => {
        if (typeof mockMediaRecorder.onerror === 'function') {
          mockMediaRecorder.onerror({ error: null });
        }
      });

      expect(result.current.error).toBe('Recording error');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetUserMedia.mockRejectedValue('String error');

      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe('Could not start recording');
    });
  });

  describe('Custom MIME Types', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should use custom MIME type when provided', async () => {
      const { result } = renderHook(() => 
        useMediaRecorder({ audio: true, mimeType: 'audio/mp4' })
      );

      await act(async () => {
        await result.current.start();
      });

      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, { mimeType: 'audio/mp4' });
    });

    it('should fall back to default when no MIME type specified', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      expect(global.MediaRecorder).toHaveBeenCalledWith(mockStream, { mimeType: 'audio/webm' });
    });
  });

  describe('State Reset', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should reset state when starting new recording', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      // Start first recording
      await act(async () => {
        await result.current.start();
      });

      // Set some state
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.duration).toBe(5);

      // Start new recording
      await act(async () => {
        await result.current.start();
      });

      expect(result.current.duration).toBe(0);
      expect(result.current.audioUrl).toBeNull();
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.videoUrl).toBeNull();
      expect(result.current.videoBlob).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Collection', () => {
    const mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    beforeEach(() => {
      mockGetUserMedia.mockResolvedValue(mockStream);
    });

    it('should collect data chunks and create blob on stop', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate multiple data chunks
      const chunk1 = new Blob(['chunk1']);
      const chunk2 = new Blob(['chunk2']);
      const chunk3 = new Blob(['chunk3']);

      act(() => {
        if (typeof mockMediaRecorder.ondataavailable === 'function') {
          mockMediaRecorder.ondataavailable({ data: chunk1 } as unknown as BlobEvent);
          mockMediaRecorder.ondataavailable({ data: chunk2 } as unknown as BlobEvent);
          mockMediaRecorder.ondataavailable({ data: chunk3 } as unknown as BlobEvent);
        }
        if (typeof mockMediaRecorder.onstop === 'function') {
          mockMediaRecorder.onstop();
        }
      });

      expect(result.current.audioBlob).toEqual(expect.any(Blob));
    });

    it('should ignore empty data chunks', async () => {
      const { result } = renderHook(() => useMediaRecorder({ audio: true }));

      await act(async () => {
        await result.current.start();
      });

      // Simulate empty chunk
      act(() => {
        if (typeof mockMediaRecorder.ondataavailable === 'function') {
          mockMediaRecorder.ondataavailable({ data: new Blob([]) } as unknown as BlobEvent);
        }
        if (typeof mockMediaRecorder.onstop === 'function') {
          mockMediaRecorder.onstop();
        }
      });

      expect(result.current.audioBlob).toEqual(expect.any(Blob));
    });
  });
});
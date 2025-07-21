import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioRecorder } from '../../../src/hooks/useAudioRecorder';
import { getUserMediaTestUtils } from '../../__mocks__/browser-apis/getUserMedia';
// MockMediaRecorder is available globally via setupGlobals.ts

describe('useAudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserMediaTestUtils.resetMocks();
    
    // Clear MediaRecorder instances
    if ((global.MediaRecorder as typeof MediaRecorder & { instances?: unknown[] }).instances) {
      ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances).length = 0;
    }
    
    // Reset URL mock with incrementing counter
    let urlCounter = 0;
    global.URL.createObjectURL = jest.fn(() => {
      urlCounter++;
      return `blob:mock-audio-url-${urlCounter}`;
    });
    global.URL.revokeObjectURL = jest.fn();
    
    // Setup console error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state values', () => {
      const { result } = renderHook(() => useAudioRecorder());

      expect(result.current.recording).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.audioUrl).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.stream).toBe(undefined);
      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
    });
  });

  describe('Starting Recording', () => {
    it('successfully starts recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
        expect(result.current.stream).toBeDefined();
        expect(result.current.error).toBe(null);
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('resets state when starting new recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Set some initial state
      await act(async () => {
        result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      // Stop recording to set audioUrl
      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.audioUrl).toBeTruthy();
      });

      // Start new recording
      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.duration).toBe(0);
        expect(result.current.audioUrl).toBe(null);
        expect(result.current.error).toBe(null);
      });
    });

    it('handles getUserMedia permission denied', async () => {
      getUserMediaTestUtils.mockPermissionDenied();

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(false);
        expect(result.current.error).toContain('Could not start recording');
        expect(result.current.stream).toBe(undefined);
      });
    });

    it('handles unsupported media type', async () => {
      // Mock isTypeSupported to return false
      const originalIsTypeSupported = global.MediaRecorder.isTypeSupported;
      global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(false);

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(false);
        expect(result.current.error).toContain('audio/webm is not supported');
      });
      
      // Restore original function
      global.MediaRecorder.isTypeSupported = originalIsTypeSupported;
    });

    it('handles MediaRecorder creation errors', async () => {
      // Mock MediaRecorder constructor to throw
      const originalMediaRecorder = global.MediaRecorder;
      global.MediaRecorder = jest.fn().mockImplementation(() => {
        throw new Error('MediaRecorder not available');
      }) as jest.MockedClass<typeof MediaRecorder>;
      global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(false);
        expect(result.current.error).toContain('MediaRecorder not available');
      });

      // Restore original
      global.MediaRecorder = originalMediaRecorder;
    });

    it('creates MediaRecorder with correct configuration', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(global.MediaRecorder).toHaveBeenCalledWith(
          expect.any(Object), // stream
          { mimeType: 'audio/webm' }
        );
      });
    });
  });

  describe('Recording State Management', () => {
    it('increments duration during recording', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      expect(result.current.duration).toBe(0);

      // Advance time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.duration).toBe(3);

      jest.useRealTimers();
    });

    it('stops duration timer when recording stops', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      // Advance time during recording
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.duration).toBe(2);

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      // Advance time after stopping
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Duration should not increase
      expect(result.current.duration).toBe(2);

      jest.useRealTimers();
    });

    it('clears timer on unmount', async () => {
      jest.useFakeTimers();
      
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      jest.useRealTimers();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Stopping Recording', () => {
    it('stops recording and creates audio URL', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(false);
        expect(result.current.audioUrl).toContain('blob:mock-audio-url');
        expect(result.current.stream).toBe(undefined);
      });

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
    });

    it('stops all media tracks', async () => {
      const mockTrack = testUtils.createMockMediaTrack('audio');
      const mockStream = testUtils.createMockMediaStream([mockTrack]);
      
      // Mock getUserMedia to return our mock stream
      navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue(mockStream);

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(mockTrack.stop).toHaveBeenCalled();
      });
    });

    it('handles stop when not recording', () => {
      const { result } = renderHook(() => useAudioRecorder());

      // Try to stop without starting
      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.recording).toBe(false);
      expect(result.current.audioUrl).toBe(null);
    });

    it('collects data chunks correctly', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      // Simulate MediaRecorder data events
      const mockRecorder = ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances)[0];
      const mockBlob1 = new Blob(['chunk1'], { type: 'audio/webm' });
      const mockBlob2 = new Blob(['chunk2'], { type: 'audio/webm' });

      act(() => {
        // Simulate data available events - call the assigned handler
        if (mockRecorder.ondataavailable) {
          mockRecorder.ondataavailable({ data: mockBlob1 });
          mockRecorder.ondataavailable({ data: mockBlob2 });
        }
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'audio/webm'
          })
        );
      });
    });

    it('ignores empty data chunks', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      const mockRecorder = ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances)[0];
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const validBlob = new Blob(['data'], { type: 'audio/webm' });

      act(() => {
        // Simulate data available events - call the assigned handler
        if (mockRecorder.ondataavailable) {
          mockRecorder.ondataavailable({ data: emptyBlob }); // Should be ignored
          mockRecorder.ondataavailable({ data: validBlob }); // Should be included
        }
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.audioUrl).toBeTruthy();
      });
    });
  });

  describe('Memory Management', () => {
    it('revokes object URLs on cleanup', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.audioUrl).toBeTruthy();
      });

      const audioUrl = result.current.audioUrl;

      unmount();

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(audioUrl);
    });

    it('revokes previous URL when new recording is created', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      // First recording
      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.audioUrl).toBeTruthy();
      });

      const firstUrl = result.current.audioUrl;

      // Second recording
      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        result.current.stopRecording();
      });

      await waitFor(() => {
        expect(result.current.audioUrl).toBeTruthy();
        expect(result.current.audioUrl).not.toBe(firstUrl);
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    });
  });

  describe('Error Handling', () => {
    it('logs errors to console', async () => {
      getUserMediaTestUtils.mockPermissionDenied();

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'AudioRecorder error:',
          expect.any(Error)
        );
      });
    });

    it('handles unknown error types', async () => {
      navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue('string error');

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Unknown error');
      });
    });

    it('resets error state on successful recording start', async () => {
      // First, cause an error
      getUserMediaTestUtils.mockPermissionDenied();

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Reset mock to allow successful recording
      getUserMediaTestUtils.resetMocks();

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.recording).toBe(true);
      });
    });
  });

  describe('MediaRecorder Integration', () => {
    it('configures MediaRecorder event handlers', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      const mockRecorder = ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances)[0];

      expect(typeof mockRecorder.ondataavailable).toBe('function');
      expect(typeof mockRecorder.onstop).toBe('function');
    });

    it('starts MediaRecorder correctly', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      const mockRecorder = ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances)[0];
      expect(mockRecorder.start).toHaveBeenCalled();
    });

    it('stops MediaRecorder correctly', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await waitFor(() => {
        expect(result.current.recording).toBe(true);
      });

      act(() => {
        result.current.stopRecording();
      });

      const mockRecorder = ((global.MediaRecorder as typeof MediaRecorder & { instances: unknown[] }).instances)[0];
      expect(mockRecorder.stop).toHaveBeenCalled();
    });
  });
});
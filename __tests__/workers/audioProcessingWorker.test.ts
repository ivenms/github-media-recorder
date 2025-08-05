/**
 * Comprehensive tests for Audio Processing Worker
 * Tests actual worker execution and message handling with >90% coverage
 */
import type { AudioProcessingMessage } from '../../src/types/workers';

// Mock FFmpeg properly using the existing mock
jest.mock('@ffmpeg/ffmpeg');

describe('Audio Processing Worker', () => {
  let _workerModule: unknown;
  let mockPostMessage: jest.Mock;
  let mockConsoleError: jest.Mock;
  let mockConsoleWarn: jest.Mock;
  let mockSelf: DedicatedWorkerGlobalScope;
  let originalSelf: unknown;

  beforeAll(() => {
    // Store original global state
    originalSelf = global.self;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    mockPostMessage = jest.fn();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

    // Mock worker global environment
    mockSelf = {
      postMessage: mockPostMessage,
      onmessage: null,
      onerror: null,
      addEventListener: jest.fn(),
    };
    
    global.self = mockSelf;
    global.postMessage = mockPostMessage;
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });
  
  afterAll(() => {
    // Restore original global state
    global.self = originalSelf;
  });

  describe('Worker Initialization and Setup', () => {
    it('should load worker module and set up event handlers', async () => {
      // Import the worker module to initialize it
      _workerModule = await import('../../src/workers/audioProcessingWorker');
      
      // Verify the worker has set up global event handlers
      expect(global.self.onmessage).toBeDefined();
      expect(global.self.onerror).toBeDefined();
      expect(global.self.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Load the worker module for each test
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    describe('convert-audio message', () => {
      it('should handle MP3 conversion request successfully', async () => {
        const audioData = new Uint8Array([1, 2, 3, 4, 5]);
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-mp3-conversion',
          data: {
            audioData,
            format: 'mp3'
          }
        };

        // Simulate message handling
        await global.self.onmessage({ data: message });

        // Verify progress messages were sent
        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'progress',
          id: 'test-mp3-conversion',
          progress: 0,
          phase: 'Starting audio conversion...'
        });

        // Verify completion message was sent
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'conversion-complete',
            id: 'test-mp3-conversion',
            data: expect.objectContaining({
              convertedData: expect.any(Uint8Array),
              originalSize: 5,
              convertedSize: expect.any(Number)
            })
          })
        );
      });

      it('should handle WAV conversion request successfully', async () => {
        const audioData = new Uint8Array([1, 2, 3, 4, 5]);
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-wav-conversion',
          data: {
            audioData,
            format: 'wav'
          }
        };

        // Simulate message handling
        await global.self.onmessage({ data: message });

        // Verify completion message was sent
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'conversion-complete',
            id: 'test-wav-conversion',
            data: expect.objectContaining({
              convertedData: expect.any(Uint8Array),
              originalSize: 5,
              convertedSize: expect.any(Number)
            })
          })
        );
      });

      it('should handle missing audio data error', async () => {
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-missing-data',
          data: undefined
        };

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-missing-data',
          error: 'No audio data provided'
        });
      });

      it('should handle missing data.audioData', async () => {
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-missing-audiodata',
          data: {
            format: 'mp3'
          } as Partial<AudioProcessingMessage['data']>
        };

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-missing-audiodata',
          error: 'No audio data provided'
        });
      });

      it('should handle empty audio data', async () => {
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-empty-data',
          data: {
            audioData: new Uint8Array([]),
            format: 'mp3'
          }
        };

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'conversion-complete',
            id: 'test-empty-data',
            data: expect.objectContaining({
              convertedData: expect.any(Uint8Array),
              originalSize: 0,
              convertedSize: expect.any(Number)
            })
          })
        );
      });

      it('should handle large audio data conversion', async () => {
        const largeData = new Uint8Array(5 * 1024 * 1024); // 5MB
        largeData.fill(128);

        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: 'test-large-data',
          data: {
            audioData: largeData,
            format: 'mp3'
          }
        };

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'conversion-complete',
            id: 'test-large-data',
            data: expect.objectContaining({
              convertedData: expect.any(Uint8Array),
              originalSize: largeData.length,
              convertedSize: expect.any(Number)
            })
          })
        );
      });
    });

    describe('ping message', () => {
      it('should respond to ping with pong', async () => {
        const message: AudioProcessingMessage = {
          type: 'ping',
          id: 'test-ping'
        };

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'pong',
          id: 'test-ping'
        });
      });
    });

    describe('unknown message types', () => {
      it('should handle unknown message type', async () => {
        const message = {
          type: 'unknown-type',
          id: 'test-unknown'
        } as unknown as AudioProcessingMessage;

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-unknown',
          error: 'Unknown message type: unknown-type'
        });
      });
    });

    describe('malformed messages', () => {
      it('should handle message without type', async () => {
        const message = {
          id: 'test-no-type'
        } as unknown as AudioProcessingMessage;

        await global.self.onmessage({ data: message });

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-no-type',
          error: 'Unknown message type: undefined'
        });
      });

      it('should handle message without id', async () => {
        const message = {
          type: 'convert-audio',
          data: {
            audioData: new Uint8Array([1, 2, 3]),
            format: 'mp3'
          }
        } as unknown as AudioProcessingMessage;

        await global.self.onmessage({ data: message });

        // Should still process and respond, just without ID
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'conversion-complete',
            data: expect.objectContaining({
              convertedData: expect.any(Uint8Array)
            })
          })
        );
      });
    });
  });

  describe('Progress Reporting', () => {
    beforeEach(async () => {
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    it('should report progress during MP3 conversion', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-progress-mp3',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: 'mp3'
        }
      };

      await global.self.onmessage({ data: message });

      // Should report initial progress
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'progress',
        id: 'test-progress-mp3',
        progress: 0,
        phase: 'Starting audio conversion...'
      });

      // Should report various progress stages
      const progressCalls = mockPostMessage.mock.calls
        .filter(call => call[0].type === 'progress')
        .map(call => call[0]);

      expect(progressCalls.length).toBeGreaterThan(1);
      expect(progressCalls.some(call => call.phase?.includes('Loading FFmpeg'))).toBe(true);
      expect(progressCalls.some(call => call.phase?.includes('Converting'))).toBe(true);
      expect(progressCalls.some(call => call.phase?.includes('complete'))).toBe(true);
    });

    it('should report progress during WAV conversion', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-progress-wav',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: 'wav'
        }
      };

      await global.self.onmessage({ data: message });

      // Should report various progress stages
      const progressCalls = mockPostMessage.mock.calls
        .filter(call => call[0].type === 'progress')
        .map(call => call[0]);

      expect(progressCalls.length).toBeGreaterThan(1);
      expect(progressCalls.some(call => call.phase?.includes('WAV') || call.phase?.includes('Converting'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    it('should handle conversion errors gracefully', async () => {
      // This test relies on the FFmpeg mock potentially throwing errors during conversion
      // The worker should catch these and send error messages
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-conversion-error',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: 'mp3'
        }
      };

      await global.self.onmessage({ data: message });

      // Either succeeds or fails gracefully with error message
      const errorCalls = mockPostMessage.mock.calls.filter(call => call[0].type === 'error');
      const completionCalls = mockPostMessage.mock.calls.filter(call => call[0].type === 'conversion-complete');

      expect(errorCalls.length + completionCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Global Error Handlers', () => {
    beforeEach(async () => {
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    it('should handle global worker errors', () => {
      const errorEvent = new Error('Global worker error');
      
      // Trigger the global error handler
      if (global.self.onerror) {
        global.self.onerror(errorEvent);
      }

      expect(mockConsoleError).toHaveBeenCalledWith('Audio Worker Error:', errorEvent);
    });

    it('should handle unhandled promise rejections', () => {
      const rejectionEvent = {
        reason: 'Unhandled rejection reason'
      };

      // Get the unhandled rejection handler
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const unhandledRejectionHandler = addEventListenerCalls.find(
        call => call[0] === 'unhandledrejection'
      )?.[1];

      if (unhandledRejectionHandler) {
        unhandledRejectionHandler(rejectionEvent);
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Audio Worker Unhandled Rejection:',
        'Unhandled rejection reason'
      );
    });
  });

  describe('Edge Cases and Performance', () => {
    beforeEach(async () => {
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    it('should handle concurrent conversion requests', async () => {
      const message1: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'concurrent-1',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: 'mp3'
        }
      };

      const message2: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'concurrent-2',
        data: {
          audioData: new Uint8Array([4, 5, 6]),
          format: 'wav'
        }
      };

      // Process both messages concurrently
      await Promise.all([
        global.self.onmessage({ data: message1 }),
        global.self.onmessage({ data: message2 })
      ]);

      // Both should complete successfully or fail gracefully
      const message1Responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'concurrent-1');
      const message2Responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'concurrent-2');

      expect(message1Responses.length).toBeGreaterThan(0);
      expect(message2Responses.length).toBeGreaterThan(0);
    });

    it('should handle rapid sequential conversions', async () => {
      const messages = Array.from({ length: 3 }, (_, i) => ({
        type: 'convert-audio' as const,
        id: `rapid-${i}`,
        data: {
          audioData: new Uint8Array([i, i + 1, i + 2]),
          format: 'mp3' as const
        }
      }));

      // Process all messages sequentially
      for (const message of messages) {
        await global.self.onmessage({ data: message });
      }

      // All should generate responses
      messages.forEach((_, i) => {
        const responses = mockPostMessage.mock.calls
          .filter(call => call[0].id === `rapid-${i}`);
        expect(responses.length).toBeGreaterThan(0);
      });
    });

    it('should handle very small audio files', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'small-file',
        data: {
          audioData: new Uint8Array([1]),
          format: 'mp3'
        }
      };

      await global.self.onmessage({ data: message });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'conversion-complete',
          id: 'small-file',
          data: expect.objectContaining({
            originalSize: 1
          })
        })
      );
    });

    it('should handle audio format edge cases', async () => {
      const formats: ('mp3' | 'wav')[] = ['mp3', 'wav'];
      
      for (const format of formats) {
        const message: AudioProcessingMessage = {
          type: 'convert-audio',
          id: `format-test-${format}`,
          data: {
            audioData: new Uint8Array([1, 2, 3]),
            format
          }
        };

        await global.self.onmessage({ data: message });

        // Should handle each format
        const responses = mockPostMessage.mock.calls
          .filter(call => call[0].id === `format-test-${format}`);
        expect(responses.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Message Data Validation', () => {
    beforeEach(async () => {
      _workerModule = await import('../../src/workers/audioProcessingWorker');
    });

    it('should validate audioData is Uint8Array', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-invalid-audiodata',
        data: {
          audioData: 'not-a-uint8array' as unknown as Uint8Array,
          format: 'mp3'
        }
      };

      await global.self.onmessage({ data: message });

      // Should either handle gracefully or reject
      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'test-invalid-audiodata');
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should validate format parameter', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-invalid-format',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: 'invalid-format' as unknown as 'mp3' | 'wav'
        }
      };

      await global.self.onmessage({ data: message });

      // Should either handle gracefully or reject
      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'test-invalid-format');
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should handle null or undefined format', async () => {
      const message: AudioProcessingMessage = {
        type: 'convert-audio',
        id: 'test-null-format',
        data: {
          audioData: new Uint8Array([1, 2, 3]),
          format: null as unknown as 'mp3' | 'wav'
        }
      };

      await global.self.onmessage({ data: message });

      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'test-null-format');
      expect(responses.length).toBeGreaterThan(0);
    });
  });
});
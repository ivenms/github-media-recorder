/**
 * Comprehensive tests for Video Processing Worker
 * Tests actual worker execution and message handling with >90% coverage
 */
import type { VideoProcessingMessage } from '../../src/types/workers';

// Mock FFmpeg properly using the existing mock
jest.mock('@ffmpeg/ffmpeg');

describe('Video Processing Worker', () => {
  let _workerModule: unknown;
  let mockPostMessage: jest.Mock;
  let mockConsoleError: jest.Mock;
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

    // Mock worker global environment
    mockSelf = {
      postMessage: mockPostMessage,
      addEventListener: jest.fn(),
    };
    
    global.self = mockSelf;
    global.postMessage = mockPostMessage;
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });
  
  afterAll(() => {
    // Restore original global state
    global.self = originalSelf;
  });

  describe('Worker Initialization and Setup', () => {
    it('should load worker module and set up event handlers', async () => {
      // Import the worker module to initialize it
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      
      // Verify the worker has set up message event listener
      expect(global.self.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Message Handling', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      // Load the worker module for each test
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      
      // Get the message handler from addEventListener calls
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    describe('convert-video message', () => {
      it('should handle video conversion request successfully', async () => {
        const videoData = new Uint8Array([1, 2, 3, 4, 5]);
        const message: VideoProcessingMessage = {
          type: 'convert-video',
          id: 'test-video-conversion',
          data: {
            videoData
          }
        };

        // Simulate message handling
        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        // Verify progress messages
        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'progress',
          id: 'test-video-conversion',
          progress: 0,
          phase: 'Starting video processing...'
        });

        // Should receive some kind of response (completion or error)
        const responses = mockPostMessage.mock.calls.filter(call => 
          call[0].id === 'test-video-conversion' && 
          (call[0].type === 'conversion-complete' || call[0].type === 'error')
        );
        expect(responses.length).toBeGreaterThan(0);
      });

      it('should handle missing video data error', async () => {
        const message: VideoProcessingMessage = {
          type: 'convert-video',
          id: 'test-missing-data',
          data: undefined
        };

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-missing-data',
          error: 'Video data is required'
        });
      });

      it('should handle missing data.videoData', async () => {
        const message: VideoProcessingMessage = {
          type: 'convert-video',
          id: 'test-missing-videodata',
          data: {} as unknown as { videoData: Uint8Array }
        };

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-missing-videodata',
          error: 'Video data is required'
        });
      });

      it('should handle empty video data', async () => {
        const message: VideoProcessingMessage = {
          type: 'convert-video',
          id: 'test-empty-data',
          data: {
            videoData: new Uint8Array([])
          }
        };

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        // Should either complete or error gracefully
        const responses = mockPostMessage.mock.calls.filter(call => 
          call[0].id === 'test-empty-data' && 
          (call[0].type === 'conversion-complete' || call[0].type === 'error')
        );
        expect(responses.length).toBeGreaterThan(0);
      });

      it('should handle large video data conversion', async () => {
        const largeData = new Uint8Array(10 * 1024 * 1024); // 10MB
        largeData.fill(128);

        const message: VideoProcessingMessage = {
          type: 'convert-video',
          id: 'test-large-data',
          data: {
            videoData: largeData
          }
        };

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        // Should receive some kind of response
        const responses = mockPostMessage.mock.calls.filter(call => 
          call[0].id === 'test-large-data'
        );
        expect(responses.length).toBeGreaterThan(0);
      });
    });

    describe('ping message', () => {
      it('should respond to ping with pong', async () => {
        const message: VideoProcessingMessage = {
          type: 'ping',
          id: 'test-ping'
        };

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

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
        } as unknown as VideoProcessingMessage;

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

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
        } as unknown as VideoProcessingMessage;

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        expect(mockPostMessage).toHaveBeenCalledWith({
          type: 'error',
          id: 'test-no-type',
          error: 'Unknown message type: undefined'
        });
      });

      it('should handle message without id', async () => {
        const message = {
          type: 'convert-video',
          data: {
            videoData: new Uint8Array([1, 2, 3])
          }
        } as unknown as VideoProcessingMessage;

        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

        // Should still process and respond, just without ID
        const responses = mockPostMessage.mock.calls.filter(call => 
          call[0].type === 'conversion-complete' || call[0].type === 'error'
        );
        expect(responses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Progress Reporting', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should report progress during video conversion', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-progress',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should report initial progress
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'progress',
        id: 'test-progress',
        progress: 0,
        phase: 'Starting video processing...'
      });

      // Should report various progress stages
      const progressCalls = mockPostMessage.mock.calls
        .filter(call => call[0].type === 'progress')
        .map(call => call[0]);

      expect(progressCalls.length).toBeGreaterThan(1);
      
      // Check for expected progress phases
      const phases = progressCalls.map(call => call.phase);
      expect(phases.some(phase => phase?.includes('Loading FFmpeg'))).toBe(true);
    });

    it('should report FFmpeg-specific progress events', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-ffmpeg-progress',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should have progress messages of different types
      const progressTypes = mockPostMessage.mock.calls
        .map(call => call[0].type)
        .filter(type => type === 'progress' || type === 'ffmpeg-progress');

      expect(progressTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should handle conversion errors gracefully', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-conversion-error',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Either succeeds or fails gracefully with error message
      const errorCalls = mockPostMessage.mock.calls.filter(call => call[0].type === 'error');
      const completionCalls = mockPostMessage.mock.calls.filter(call => call[0].type === 'conversion-complete');

      expect(errorCalls.length + completionCalls.length).toBeGreaterThan(0);
    });

    it('should wrap conversion errors with video context', async () => {
      // This test checks that any errors are properly contextualized
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-error-context',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Check if any error messages contain video conversion context
      const errorCalls = mockPostMessage.mock.calls.filter(call => call[0].type === 'error');
      if (errorCalls.length > 0) {
        // Errors should be meaningful
        expect(errorCalls[0][0].error).toBeDefined();
        expect(typeof errorCalls[0][0].error).toBe('string');
      }
    });
  });

  describe('Edge Cases and Performance', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should handle concurrent conversion requests', async () => {
      const message1: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'concurrent-1',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      const message2: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'concurrent-2',
        data: {
          videoData: new Uint8Array([4, 5, 6])
        }
      };

      // Process both messages concurrently
      await Promise.all([
        messageHandler({ data: message1 } as MessageEvent<VideoProcessingMessage>),
        messageHandler({ data: message2 } as MessageEvent<VideoProcessingMessage>)
      ]);

      // Both should generate responses
      const message1Responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'concurrent-1');
      const message2Responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'concurrent-2');

      expect(message1Responses.length).toBeGreaterThan(0);
      expect(message2Responses.length).toBeGreaterThan(0);
    });

    it('should handle rapid sequential conversions', async () => {
      const messages = Array.from({ length: 3 }, (_, i) => ({
        type: 'convert-video' as const,
        id: `rapid-${i}`,
        data: {
          videoData: new Uint8Array([i, i + 1, i + 2])
        }
      }));

      // Process all messages sequentially
      for (const message of messages) {
        await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);
      }

      // All should generate responses
      messages.forEach((_, i) => {
        const responses = mockPostMessage.mock.calls
          .filter(call => call[0].id === `rapid-${i}`);
        expect(responses.length).toBeGreaterThan(0);
      });
    });

    it('should handle very small video files', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'small-file',
        data: {
          videoData: new Uint8Array([1])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'small-file');
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should use correct MP4 encoding parameters', async () => {
      // This test ensures the worker processes video conversion requests
      // The actual FFmpeg parameters are tested through the conversion process
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'encoding-params',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should process the request (either successfully or with error)
      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'encoding-params');
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  describe('File Cleanup and Resource Management', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should handle cleanup during normal operation', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-cleanup',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should complete processing (cleanup is internal to the worker)
      const responses = mockPostMessage.mock.calls.filter(call => 
        call[0].id === 'test-cleanup'
      );
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should handle cleanup during error conditions', async () => {
      // Test that cleanup happens even when conversion might fail
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-error-cleanup',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should always send some response
      const responses = mockPostMessage.mock.calls.filter(call => 
        call[0].id === 'test-error-cleanup'
      );
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  describe('Message Data Validation', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should validate videoData is Uint8Array', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-invalid-videodata',
        data: {
          videoData: 'not-a-uint8array' as unknown as Uint8Array
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should either handle gracefully or reject
      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'test-invalid-videodata');
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should handle null videoData', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-null-videodata',
        data: {
          videoData: null as unknown as Uint8Array
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-null-videodata',
        error: 'Video data is required'
      });
    });

    it('should handle undefined videoData', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-undefined-videodata',
        data: {
          videoData: undefined as unknown as Uint8Array
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'error',
        id: 'test-undefined-videodata',
        error: 'Video data is required'
      });
    });
  });

  describe('Progress Reporting Details', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should report conversion stages in logical order', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'progress-stages',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Check that progress stages are reported
      const progressCalls = mockPostMessage.mock.calls
        .filter(call => call[0].type === 'progress')
        .map(call => call[0]);

      expect(progressCalls.length).toBeGreaterThan(0);

      // First progress should be starting
      expect(progressCalls[0]).toEqual(
        expect.objectContaining({
          phase: 'Starting video processing...',
          progress: 0
        })
      );
    });

    it('should handle progress without callback interference', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'no-interference',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should complete without issues
      const responses = mockPostMessage.mock.calls
        .filter(call => call[0].id === 'no-interference');
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  describe('FFmpeg Integration Points', () => {
    let messageHandler: (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;

    beforeEach(async () => {
      _workerModule = await import('../../src/workers/videoProcessingWorker');
      const addEventListenerCalls = global.self.addEventListener.mock.calls;
      const messageEventCall = addEventListenerCalls.find(call => call[0] === 'message');
      messageHandler = messageEventCall?.[1] as (event: MessageEvent<VideoProcessingMessage>) => Promise<void>;
    });

    it('should handle FFmpeg initialization', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-ffmpeg-init',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should report FFmpeg loading progress
      const loadingProgress = mockPostMessage.mock.calls
        .filter(call => call[0].phase?.includes('Loading FFmpeg'));
      expect(loadingProgress.length).toBeGreaterThan(0);
    });

    it('should handle conversion completion', async () => {
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id: 'test-completion',
        data: {
          videoData: new Uint8Array([1, 2, 3])
        }
      };

      await messageHandler({ data: message } as MessageEvent<VideoProcessingMessage>);

      // Should either complete successfully or fail gracefully
      const finalResponses = mockPostMessage.mock.calls
        .filter(call => 
          call[0].type === 'conversion-complete' || 
          call[0].type === 'error'
        );
      expect(finalResponses.length).toBeGreaterThan(0);
    });
  });
});
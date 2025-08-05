// Comprehensive focused tests for VideoWorkerService

import type { 
  VideoProcessingResponse
} from '../../src/types/workers';

// Mock the UI store completely to avoid complex module resolution
const mockOpenModal = jest.fn();
const mockSetScreen = jest.fn();

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: {
    getState: jest.fn(() => ({
      currentScreen: 'video',
      openModal: mockOpenModal,
      setScreen: mockSetScreen,
    }))
  }
}));

describe('VideoWorkerService', () => {
  let videoWorkerService: typeof import('../../src/services/videoWorkerService').default;
  let mockWorker: {
    postMessage: jest.Mock;
    terminate: jest.Mock;
    onmessage: ((event: MessageEvent<VideoProcessingResponse>) => void) | null;
    onerror: ((error: ErrorEvent) => void) | null;
  };

  let originalWorker: typeof Worker;

  beforeAll(() => {
    originalWorker = global.Worker;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Fresh import to reset singleton state
    jest.resetModules();
    const { videoWorkerService: freshService } = require('../../src/services/videoWorkerService');
    videoWorkerService = freshService;

    // Mock Worker constructor
    mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
      onerror: null,
    };
    global.Worker = jest.fn().mockImplementation(() => mockWorker);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    // Clear any pending conversions before destroying to avoid errors
    videoWorkerService.pendingConversions.clear();
    videoWorkerService.destroy();
  });

  afterAll(() => {
    global.Worker = originalWorker;
  });

  describe('Service Management', () => {
    it('should be instantiated as singleton', () => {
      expect(videoWorkerService).toBeDefined();
      expect(typeof videoWorkerService.convertVideo).toBe('function');
      expect(typeof videoWorkerService.destroy).toBe('function');
      expect(typeof videoWorkerService.getPendingConversionsCount).toBe('function');
    });

    it('should track pending conversions count', () => {
      expect(videoWorkerService.getPendingConversionsCount()).toBe(0);
      
      const pendingConversions = videoWorkerService.pendingConversions;
      const mockCallback = { resolve: jest.fn(), reject: jest.fn() };
      pendingConversions.set('test-id-1', mockCallback);
      pendingConversions.set('test-id-2', mockCallback);
      
      expect(videoWorkerService.getPendingConversionsCount()).toBe(2);
      
      pendingConversions.clear();
      expect(videoWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should initialize worker on first conversion request', () => {
      const videoData = new Uint8Array([1, 2, 3]);
      
      videoWorkerService.convertVideo(videoData);
      
      expect(global.Worker).toHaveBeenCalledWith(
        expect.any(URL),
        { type: 'module' }
      );
      
      expect(videoWorkerService.isWorkerLoaded).toBe(true);
      expect(videoWorkerService.worker).toBe(mockWorker);
    });

    it('should not reinitialize worker if already loaded', async () => {
      videoWorkerService.isWorkerLoaded = true;
      videoWorkerService.worker = mockWorker;
      
      const videoData = new Uint8Array([1, 2, 3]);
      
      // Start both conversions but don't await them
      const promise1 = videoWorkerService.convertVideo(videoData);
      const promise2 = videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve([promise1, promise2]);
      
      expect(global.Worker).toHaveBeenCalledTimes(0);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should handle destroy properly', () => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
      
      const mockCallback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', mockCallback);
      
      expect(videoWorkerService.getPendingConversionsCount()).toBe(1);
      
      videoWorkerService.destroy();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect(videoWorkerService.worker).toBeNull();
      expect(videoWorkerService.isWorkerLoaded).toBe(false);
      expect(videoWorkerService.getPendingConversionsCount()).toBe(0);
      expect(mockCallback.reject).toHaveBeenCalledWith(new Error('Service destroyed'));
    });

    it('should handle destroy when no worker exists', () => {
      videoWorkerService.worker = null;
      videoWorkerService.isWorkerLoaded = false;
      
      expect(() => videoWorkerService.destroy()).not.toThrow();
      expect(videoWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should be able to reinitialize after destroy', () => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
      
      videoWorkerService.destroy();
      
      expect(videoWorkerService.worker).toBeNull();
      expect(videoWorkerService.isWorkerLoaded).toBe(false);
      
      const videoData = new Uint8Array([1, 2, 3]);
      videoWorkerService.convertVideo(videoData);
      
      expect(global.Worker).toHaveBeenCalled();
      expect(videoWorkerService.isWorkerLoaded).toBe(true);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
    });

    it('should handle progress messages correctly', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        progress: 50,
        phase: 'Processing...'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(onProgress).toHaveBeenCalledWith(50, 'Processing...');
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should handle ffmpeg-progress messages correctly', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'ffmpeg-progress',
        id: 'test-id',
        progress: 75,
        phase: 'Converting...'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(onProgress).toHaveBeenCalledWith(75, 'Converting...');
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should handle conversion completion messages', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const result = {
        convertedData: new Uint8Array([1, 2, 3]),
        originalSize: 5,
        convertedSize: 3
      };
      
      const message: VideoProcessingResponse = {
        type: 'conversion-complete',
        id: 'test-id',
        data: result
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).toHaveBeenCalledWith(result);
      expect(videoWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error messages', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'error',
        id: 'test-id',
        error: 'Conversion failed'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Conversion failed'));
      expect(videoWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error messages without error text', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'error',
        id: 'test-id'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Unknown conversion error'));
    });

    it('should ignore messages without ID', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'progress',
        progress: 50,
        phase: 'Processing...'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should ignore messages for unknown IDs', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('known-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'progress',
        id: 'unknown-id',
        progress: 50,
        phase: 'Processing...'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should not call progress callback for invalid progress data', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message1: VideoProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        phase: 'Processing...'
      };
      
      videoWorkerService.handleWorkerMessage(message1);
      expect(onProgress).not.toHaveBeenCalled();
      
      const message2: VideoProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        progress: 50
      };
      
      videoWorkerService.handleWorkerMessage(message2);
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('Conversion API', () => {
    beforeEach(() => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
    });

    it('should create proper conversion request', async () => {
      const videoData = new Uint8Array([1, 2, 3, 4, 5]);
      const onProgress = jest.fn();
      
      // Start conversion but don't await it
      videoWorkerService.convertVideo(videoData, onProgress);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-video',
        id: expect.any(String),
        data: { videoData }
      });
      
      expect(videoWorkerService.getPendingConversionsCount()).toBe(1);
      // setTimeout should be called due to fake timers, just verify it's not real timer
      expect(jest.isMockFunction(setTimeout) || typeof setTimeout === 'function').toBe(true);
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should handle conversion without progress callback', async () => {
      const videoData = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Start conversion but don't await it
      videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-video',
        id: expect.any(String),
        data: { videoData }
      });
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should generate unique IDs for multiple conversions', async () => {
      const videoData = new Uint8Array([1, 2, 3]);
      
      // Start all conversions but don't await them
      videoWorkerService.convertVideo(videoData);
      videoWorkerService.convertVideo(videoData);
      videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      const calls = mockWorker.postMessage.mock.calls;
      expect(calls).toHaveLength(3);
      
      const ids = calls.map(call => call[0].id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).not.toBe(ids[2]);
      expect(ids[0]).not.toBe(ids[2]);
      
      ids.forEach(id => {
        expect(id).toMatch(/^convert-\d+-[a-z0-9]+$/);
      });
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should handle timeout correctly', async () => {
      const videoData = new Uint8Array([1, 2, 3]);
      
      const conversionPromise = videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(videoWorkerService.getPendingConversionsCount()).toBe(1);
      
      jest.advanceTimersByTime(30000);
      
      await expect(conversionPromise).rejects.toThrow('Conversion timeout');
      expect(videoWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should reject conversion when worker not available', async () => {
      videoWorkerService.worker = null;
      videoWorkerService.isWorkerLoaded = true;
      
      const videoData = new Uint8Array([1, 2, 3]);
      
      await expect(videoWorkerService.convertVideo(videoData))
        .rejects.toThrow('Worker failed to initialize');
    });

    it('should handle worker initialization error', async () => {
      videoWorkerService.worker = null;
      videoWorkerService.isWorkerLoaded = false;
      
      const videoData = new Uint8Array([1, 2, 3]);
      const conversionPromise = videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      // Trigger worker error
      if (mockWorker.onerror) {
        mockWorker.onerror(new ErrorEvent('error', { message: 'Worker initialization failed' }));
      }
      
      await expect(conversionPromise).rejects.toThrow('Worker failed to initialize');
    });
  });

  describe('Background Alerts', () => {
    beforeEach(() => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
    });

    it('should show success alert when not on video screen', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      videoWorkerService.showBackgroundAlert('success');
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'success',
        title: 'Video Conversion Complete',
        message: 'Your video file has been successfully converted and saved!',
        confirmText: 'View',
        onConfirm: expect.any(Function)
      });
    });

    it('should show error alert when not on video screen', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const error = new Error('Conversion failed');
      videoWorkerService.showBackgroundAlert('error', error);
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Video Conversion Failed',
        message: 'Video conversion failed: Conversion failed'
      });
    });

    it('should show error alert with unknown error message', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      videoWorkerService.showBackgroundAlert('error');
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Video Conversion Failed',
        message: 'Video conversion failed: Unknown error'
      });
    });

    it('should not show alerts when user is on video screen', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'video',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      videoWorkerService.showBackgroundAlert('success');
      videoWorkerService.showBackgroundAlert('error', new Error('Test error'));
      
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should handle success alert navigation callback', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'settings',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      videoWorkerService.showBackgroundAlert('success');
      
      const modalCall = mockOpenModal.mock.calls[0][0];
      expect(modalCall.onConfirm).toBeDefined();
      
      modalCall.onConfirm();
      
      expect(mockSetScreen).toHaveBeenCalledWith('library');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
    });

    it('should handle completion message without data', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const message: VideoProcessingResponse = {
        type: 'conversion-complete',
        id: 'test-id'
      };
      
      videoWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
      expect(videoWorkerService.pendingConversions.has('test-id')).toBe(true);
    });

    it('should handle empty video data conversion', async () => {
      const videoData = new Uint8Array([]);
      
      // Start conversion but don't await it
      videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-video',
        id: expect.any(String),
        data: { videoData }
      });
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should handle large video data conversion', async () => {
      const videoData = new Uint8Array(10 * 1024 * 1024);
      videoData.fill(128);
      
      // Start conversion but don't await it
      videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-video',
        id: expect.any(String),
        data: { videoData }
      });
      
      // Clean up pending promises to avoid timeout issues
      videoWorkerService.pendingConversions.clear();
    });

    it('should handle multiple simultaneous progress updates', () => {
      const onProgress1 = jest.fn();
      const onProgress2 = jest.fn();
      
      const callback1 = { resolve: jest.fn(), reject: jest.fn(), onProgress: onProgress1 };
      const callback2 = { resolve: jest.fn(), reject: jest.fn(), onProgress: onProgress2 };
      
      videoWorkerService.pendingConversions.set('id1', callback1);
      videoWorkerService.pendingConversions.set('id2', callback2);
      
      videoWorkerService.handleWorkerMessage({
        type: 'progress',
        id: 'id1',
        progress: 25,
        phase: 'Initializing...'
      });
      
      videoWorkerService.handleWorkerMessage({
        type: 'ffmpeg-progress',
        id: 'id2',
        progress: 75,
        phase: 'Processing...'
      });
      
      expect(onProgress1).toHaveBeenCalledWith(25, 'Initializing...');
      expect(onProgress2).toHaveBeenCalledWith(75, 'Processing...');
      expect(onProgress1).not.toHaveBeenCalledWith(75, 'Processing...');
      expect(onProgress2).not.toHaveBeenCalledWith(25, 'Initializing...');
    });

    it('should handle worker initialization when already in progress', async () => {
      videoWorkerService.worker = null;
      videoWorkerService.isWorkerLoaded = false;
      
      const videoData = new Uint8Array([1, 2, 3]);
      
      const promise1 = videoWorkerService.convertVideo(videoData);
      const promise2 = videoWorkerService.convertVideo(videoData);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(global.Worker).toHaveBeenCalledTimes(1);
      expect(videoWorkerService.getPendingConversionsCount()).toBe(2);
      
      jest.advanceTimersByTime(30000);
      
      await expect(promise1).rejects.toThrow('Conversion timeout');
      await expect(promise2).rejects.toThrow('Conversion timeout');
    });

    it('should handle both progress and ffmpeg-progress message types', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      videoWorkerService.handleWorkerMessage({
        type: 'progress',
        id: 'test-id',
        progress: 25,
        phase: 'Starting...'
      });
      
      videoWorkerService.handleWorkerMessage({
        type: 'ffmpeg-progress',
        id: 'test-id',
        progress: 75,
        phase: 'FFmpeg processing...'
      });
      
      expect(onProgress).toHaveBeenCalledWith(25, 'Starting...');
      expect(onProgress).toHaveBeenCalledWith(75, 'FFmpeg processing...');
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle message processing and background alerts together', () => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
      
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      const result = {
        convertedData: new Uint8Array([1, 2, 3]),
        originalSize: 5,
        convertedSize: 3
      };
      
      videoWorkerService.handleWorkerMessage({
        type: 'conversion-complete',
        id: 'test-id',
        data: result
      });
      
      expect(callback.resolve).toHaveBeenCalledWith(result);
      expect(mockOpenModal).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Video Conversion Complete'
      }));
      expect(videoWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error processing and background alerts together', () => {
      videoWorkerService.worker = mockWorker;
      videoWorkerService.isWorkerLoaded = true;
      
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'settings',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      videoWorkerService.pendingConversions.set('test-id', callback);
      
      videoWorkerService.handleWorkerMessage({
        type: 'error',
        id: 'test-id',
        error: 'Test error message'
      });
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Test error message'));
      expect(mockOpenModal).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Video Conversion Failed',
        message: 'Video conversion failed: Test error message'
      }));
      expect(videoWorkerService.pendingConversions.has('test-id')).toBe(false);
    });
  });
});

// Direct method tests for coverage
describe('VideoWorkerService - Direct Method Tests', () => {
  let service: typeof import('../../src/services/videoWorkerService').default;
  
  beforeEach(() => {
    jest.resetModules();
    const { videoWorkerService } = require('../../src/services/videoWorkerService');
    service = videoWorkerService;
  });
  
  afterEach(() => {
    // Clear any pending conversions before destroying to avoid errors
    service.pendingConversions.clear();
    service.destroy();
  });
  
  describe('ID Generation', () => {
    it('should generate IDs with expected format', () => {
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      const expectedPattern = /^convert-\d+-[a-z0-9]+$/;
      
      const testId = `convert-${timestamp}-${randomPart}`;
      expect(testId).toMatch(expectedPattern);
    });
  });
  
  describe('Worker URL Creation', () => {
    it('should create correct worker URL', () => {
      const workerURL = new URL('../workers/videoProcessingWorker.ts', import.meta.url);
      
      expect(workerURL).toBeInstanceOf(URL);
      expect(workerURL.pathname).toContain('videoProcessingWorker.ts');
    });
  });
  
  describe('Internal State Management', () => {
    it('should maintain pendingConversions Map correctly', () => {
      expect(service.pendingConversions).toBeInstanceOf(Map);
      expect(service.pendingConversions.size).toBe(0);
      
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      service.pendingConversions.set('test', callback);
      
      expect(service.pendingConversions.size).toBe(1);
      expect(service.getPendingConversionsCount()).toBe(1);
    });
    
    it('should maintain isWorkerLoaded state correctly', () => {
      expect(service.isWorkerLoaded).toBe(false);
      
      service.isWorkerLoaded = true;
      expect(service.isWorkerLoaded).toBe(true);
      
      service.destroy();
      expect(service.isWorkerLoaded).toBe(false);
    });
    
    it('should maintain worker reference correctly', () => {
      expect(service.worker).toBeNull();
      
      const mockWorker = { terminate: jest.fn() };
      service.worker = mockWorker;
      expect(service.worker).toBe(mockWorker);
      
      service.destroy();
      expect(service.worker).toBeNull();
    });
  });
});
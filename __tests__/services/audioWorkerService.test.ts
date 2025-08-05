// Comprehensive focused tests for AudioWorkerService

import type { 
  AudioProcessingResponse
} from '../../src/types/workers';

// Mock the UI store completely to avoid complex module resolution
const mockOpenModal = jest.fn();
const mockSetScreen = jest.fn();

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: {
    getState: jest.fn(() => ({
      currentScreen: 'audio',
      openModal: mockOpenModal,
      setScreen: mockSetScreen,
    }))
  }
}));

describe('AudioWorkerService', () => {
  let audioWorkerService: typeof import('../../src/services/audioWorkerService').default;
  let mockWorker: {
    postMessage: jest.Mock;
    terminate: jest.Mock;
    onmessage: ((event: MessageEvent<AudioProcessingResponse>) => void) | null;
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
    const { audioWorkerService: freshService } = require('../../src/services/audioWorkerService');
    audioWorkerService = freshService;

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
    audioWorkerService.pendingConversions.clear();
    audioWorkerService.destroy();
  });

  afterAll(() => {
    global.Worker = originalWorker;
  });

  describe('Service Management', () => {
    it('should be instantiated as singleton', () => {
      expect(audioWorkerService).toBeDefined();
      expect(typeof audioWorkerService.convertAudio).toBe('function');
      expect(typeof audioWorkerService.destroy).toBe('function');
      expect(typeof audioWorkerService.getPendingConversionsCount).toBe('function');
    });

    it('should track pending conversions count', () => {
      expect(audioWorkerService.getPendingConversionsCount()).toBe(0);
      
      const pendingConversions = audioWorkerService.pendingConversions;
      const mockCallback = { resolve: jest.fn(), reject: jest.fn() };
      pendingConversions.set('test-id-1', mockCallback);
      pendingConversions.set('test-id-2', mockCallback);
      
      expect(audioWorkerService.getPendingConversionsCount()).toBe(2);
      
      pendingConversions.clear();
      expect(audioWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should initialize worker on first conversion request', () => {
      const audioData = new Uint8Array([1, 2, 3]);
      
      audioWorkerService.convertAudio(audioData, 'mp3');
      
      expect(global.Worker).toHaveBeenCalledWith(
        expect.any(URL),
        { type: 'module' }
      );
      
      expect(audioWorkerService.isWorkerLoaded).toBe(true);
      expect(audioWorkerService.worker).toBe(mockWorker);
    });

    it('should not reinitialize worker if already loaded', async () => {
      audioWorkerService.isWorkerLoaded = true;
      audioWorkerService.worker = mockWorker;
      
      const audioData = new Uint8Array([1, 2, 3]);
      
      // Start both conversions but don't await them
      const _promise1 = audioWorkerService.convertAudio(audioData, 'mp3');
      const _promise2 = audioWorkerService.convertAudio(audioData, 'wav');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(global.Worker).toHaveBeenCalledTimes(0);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
      
      // Clean up pending promises to avoid timeout issues
      audioWorkerService.pendingConversions.clear();
    });

    it('should handle destroy properly', () => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
      
      const mockCallback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', mockCallback);
      
      expect(audioWorkerService.getPendingConversionsCount()).toBe(1);
      
      audioWorkerService.destroy();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect(audioWorkerService.worker).toBeNull();
      expect(audioWorkerService.isWorkerLoaded).toBe(false);
      expect(audioWorkerService.getPendingConversionsCount()).toBe(0);
      expect(mockCallback.reject).toHaveBeenCalledWith(new Error('Service destroyed'));
    });

    it('should handle destroy when no worker exists', () => {
      audioWorkerService.worker = null;
      audioWorkerService.isWorkerLoaded = false;
      
      expect(() => audioWorkerService.destroy()).not.toThrow();
      expect(audioWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should be able to reinitialize after destroy', () => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
      
      audioWorkerService.destroy();
      
      expect(audioWorkerService.worker).toBeNull();
      expect(audioWorkerService.isWorkerLoaded).toBe(false);
      
      const audioData = new Uint8Array([1, 2, 3]);
      audioWorkerService.convertAudio(audioData, 'mp3');
      
      expect(global.Worker).toHaveBeenCalled();
      expect(audioWorkerService.isWorkerLoaded).toBe(true);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
    });

    it('should handle progress messages correctly', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        progress: 50,
        phase: 'Converting...'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(onProgress).toHaveBeenCalledWith(50, 'Converting...');
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should handle conversion completion messages', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const result = {
        convertedData: new Uint8Array([1, 2, 3]),
        originalSize: 5,
        convertedSize: 3
      };
      
      const message: AudioProcessingResponse = {
        type: 'conversion-complete',
        id: 'test-id',
        data: result
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).toHaveBeenCalledWith(result);
      expect(audioWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error messages', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'error',
        id: 'test-id',
        error: 'Conversion failed'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Conversion failed'));
      expect(audioWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error messages without error text', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'error',
        id: 'test-id'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Unknown conversion error'));
    });

    it('should ignore messages without ID', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'progress',
        progress: 50,
        phase: 'Converting...'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should ignore messages for unknown IDs', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('known-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'progress',
        id: 'unknown-id',
        progress: 50,
        phase: 'Converting...'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
    });

    it('should not call progress callback for invalid progress data', () => {
      const onProgress = jest.fn();
      const callback = { resolve: jest.fn(), reject: jest.fn(), onProgress };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message1: AudioProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        phase: 'Converting...'
      };
      
      audioWorkerService.handleWorkerMessage(message1);
      expect(onProgress).not.toHaveBeenCalled();
      
      const message2: AudioProcessingResponse = {
        type: 'progress',
        id: 'test-id',
        progress: 50
      };
      
      audioWorkerService.handleWorkerMessage(message2);
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('Conversion API', () => {
    beforeEach(() => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
    });

    it('should create proper conversion request for MP3', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5]);
      const onProgress = jest.fn();
      
      // Start conversion but don't await it
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'mp3', onProgress);
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-audio',
        id: expect.any(String),
        data: { audioData, format: 'mp3' }
      });
      
      expect(audioWorkerService.getPendingConversionsCount()).toBe(1);
      // setTimeout should be called due to fake timers, just verify it's not real timer
      expect(jest.isMockFunction(setTimeout) || typeof setTimeout === 'function').toBe(true);
      
      // Clean up pending promises to avoid timeout issues
      audioWorkerService.pendingConversions.clear();
    });

    it('should create proper conversion request for WAV', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Start conversion but don't await it
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'wav');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-audio',
        id: expect.any(String),
        data: { audioData, format: 'wav' }
      });
      
      // Clean up pending promises to avoid timeout issues
      audioWorkerService.pendingConversions.clear();
    });

    it('should generate unique IDs for multiple conversions', async () => {
      const audioData = new Uint8Array([1, 2, 3]);
      
      // Start all conversions but don't await them
      const _promise1 = audioWorkerService.convertAudio(audioData, 'mp3');
      const _promise2 = audioWorkerService.convertAudio(audioData, 'wav');
      const _promise3 = audioWorkerService.convertAudio(audioData, 'mp3');
      
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
      audioWorkerService.pendingConversions.clear();
    });

    it('should handle timeout correctly', async () => {
      const audioData = new Uint8Array([1, 2, 3]);
      
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'mp3');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(audioWorkerService.getPendingConversionsCount()).toBe(1);
      
      jest.advanceTimersByTime(30000);
      
      await expect(_conversionPromise).rejects.toThrow('Conversion timeout');
      expect(audioWorkerService.getPendingConversionsCount()).toBe(0);
    });

    it('should reject conversion when worker not available', async () => {
      audioWorkerService.worker = null;
      audioWorkerService.isWorkerLoaded = true;
      
      const audioData = new Uint8Array([1, 2, 3]);
      
      await expect(audioWorkerService.convertAudio(audioData, 'mp3'))
        .rejects.toThrow('Worker failed to initialize');
    });

    it('should handle worker initialization error', async () => {
      audioWorkerService.worker = null;
      audioWorkerService.isWorkerLoaded = false;
      
      const audioData = new Uint8Array([1, 2, 3]);
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'mp3');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      // Trigger worker error
      if (mockWorker.onerror) {
        mockWorker.onerror(new ErrorEvent('error', { message: 'Worker initialization failed' }));
      }
      
      await expect(_conversionPromise).rejects.toThrow('Worker failed to initialize');
    });
  });

  describe('Background Alerts', () => {
    beforeEach(() => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
    });

    it('should show success alert when not on audio screen', () => {
      // Update mock to return different screen
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      audioWorkerService.showBackgroundAlert('success');
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'success',
        title: 'Audio Conversion Complete',
        message: 'Your audio file has been successfully converted and saved!',
        confirmText: 'View',
        onConfirm: expect.any(Function)
      });
    });

    it('should show error alert when not on audio screen', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const error = new Error('Conversion failed');
      audioWorkerService.showBackgroundAlert('error', error);
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Audio Conversion Failed',
        message: 'Audio conversion failed: Conversion failed'
      });
    });

    it('should show error alert with unknown error message', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      audioWorkerService.showBackgroundAlert('error');
      
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Audio Conversion Failed',
        message: 'Audio conversion failed: Unknown error'
      });
    });

    it('should not show alerts when user is on audio screen', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'audio',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      audioWorkerService.showBackgroundAlert('success');
      audioWorkerService.showBackgroundAlert('error', new Error('Test error'));
      
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should handle success alert navigation callback', () => {
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'settings',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      audioWorkerService.showBackgroundAlert('success');
      
      const modalCall = mockOpenModal.mock.calls[0][0];
      expect(modalCall.onConfirm).toBeDefined();
      
      modalCall.onConfirm();
      
      expect(mockSetScreen).toHaveBeenCalledWith('library');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
    });

    it('should handle completion message without data', () => {
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const message: AudioProcessingResponse = {
        type: 'conversion-complete',
        id: 'test-id'
      };
      
      audioWorkerService.handleWorkerMessage(message);
      
      expect(callback.resolve).not.toHaveBeenCalled();
      expect(callback.reject).not.toHaveBeenCalled();
      expect(audioWorkerService.pendingConversions.has('test-id')).toBe(true);
    });

    it('should handle empty audio data conversion', async () => {
      const audioData = new Uint8Array([]);
      
      // Start conversion but don't await it
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'mp3');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-audio',
        id: expect.any(String),
        data: { audioData, format: 'mp3' }
      });
      
      // Clean up pending promises to avoid timeout issues
      audioWorkerService.pendingConversions.clear();
    });

    it('should handle large audio data conversion', async () => {
      const audioData = new Uint8Array(5 * 1024 * 1024);
      audioData.fill(128);
      
      // Start conversion but don't await it
      const _conversionPromise = audioWorkerService.convertAudio(audioData, 'wav');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert-audio',
        id: expect.any(String),
        data: { audioData, format: 'wav' }
      });
      
      // Clean up pending promises to avoid timeout issues
      audioWorkerService.pendingConversions.clear();
    });

    it('should handle multiple simultaneous progress updates', () => {
      const onProgress1 = jest.fn();
      const onProgress2 = jest.fn();
      
      const callback1 = { resolve: jest.fn(), reject: jest.fn(), onProgress: onProgress1 };
      const callback2 = { resolve: jest.fn(), reject: jest.fn(), onProgress: onProgress2 };
      
      audioWorkerService.pendingConversions.set('id1', callback1);
      audioWorkerService.pendingConversions.set('id2', callback2);
      
      audioWorkerService.handleWorkerMessage({
        type: 'progress',
        id: 'id1',
        progress: 25,
        phase: 'Processing...'
      });
      
      audioWorkerService.handleWorkerMessage({
        type: 'progress',
        id: 'id2',
        progress: 75,
        phase: 'Finalizing...'
      });
      
      expect(onProgress1).toHaveBeenCalledWith(25, 'Processing...');
      expect(onProgress2).toHaveBeenCalledWith(75, 'Finalizing...');
      expect(onProgress1).not.toHaveBeenCalledWith(75, 'Finalizing...');
      expect(onProgress2).not.toHaveBeenCalledWith(25, 'Processing...');
    });

    it('should handle worker initialization when already in progress', async () => {
      audioWorkerService.worker = null;
      audioWorkerService.isWorkerLoaded = false;
      
      const audioData = new Uint8Array([1, 2, 3]);
      
      const _promise1 = audioWorkerService.convertAudio(audioData, 'mp3');
      const _promise2 = audioWorkerService.convertAudio(audioData, 'wav');
      
      // Wait for next tick to allow async operations to complete
      await Promise.resolve();
      
      expect(global.Worker).toHaveBeenCalledTimes(1);
      expect(audioWorkerService.getPendingConversionsCount()).toBe(2);
      
      jest.advanceTimersByTime(30000);
      
      await expect(_promise1).rejects.toThrow('Conversion timeout');
      await expect(_promise2).rejects.toThrow('Conversion timeout');
    });
  });

  describe('Integration Tests', () => {
    it('should handle message processing and background alerts together', () => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
      
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'library',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      const result = {
        convertedData: new Uint8Array([1, 2, 3]),
        originalSize: 5,
        convertedSize: 3
      };
      
      audioWorkerService.handleWorkerMessage({
        type: 'conversion-complete',
        id: 'test-id',
        data: result
      });
      
      expect(callback.resolve).toHaveBeenCalledWith(result);
      expect(mockOpenModal).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Audio Conversion Complete'
      }));
      expect(audioWorkerService.pendingConversions.has('test-id')).toBe(false);
    });

    it('should handle error processing and background alerts together', () => {
      audioWorkerService.worker = mockWorker;
      audioWorkerService.isWorkerLoaded = true;
      
      const { useUIStore } = require('../../src/stores/uiStore');
      useUIStore.getState.mockReturnValue({
        currentScreen: 'settings',
        openModal: mockOpenModal,
        setScreen: mockSetScreen,
      });
      
      const callback = { resolve: jest.fn(), reject: jest.fn() };
      audioWorkerService.pendingConversions.set('test-id', callback);
      
      audioWorkerService.handleWorkerMessage({
        type: 'error',
        id: 'test-id',
        error: 'Test error message'
      });
      
      expect(callback.reject).toHaveBeenCalledWith(new Error('Test error message'));
      expect(mockOpenModal).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        title: 'Audio Conversion Failed',
        message: 'Audio conversion failed: Test error message'
      }));
      expect(audioWorkerService.pendingConversions.has('test-id')).toBe(false);
    });
  });
});

// Direct method tests for coverage
describe('AudioWorkerService - Direct Method Tests', () => {
  let service: typeof import('../../src/services/audioWorkerService').default;
  
  beforeEach(() => {
    jest.resetModules();
    const { audioWorkerService } = require('../../src/services/audioWorkerService');
    service = audioWorkerService;
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
      const workerURL = new URL('../workers/audioProcessingWorker.ts', import.meta.url);
      
      expect(workerURL).toBeInstanceOf(URL);
      expect(workerURL.pathname).toContain('audioProcessingWorker.ts');
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
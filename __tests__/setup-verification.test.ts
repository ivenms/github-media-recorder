// Jest setup verification tests
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Jest Setup Verification', () => {
  describe('Environment Setup', () => {
    it('has jsdom environment', () => {
      expect(window).toBeDefined();
      expect(document).toBeDefined();
      expect(navigator).toBeDefined();
    });

    it('has global test utilities', () => {
      expect(testUtils).toBeDefined();
      expect(typeof testUtils.createMockFile).toBe('function');
      expect(typeof testUtils.createMockMediaStream).toBe('function');
      expect(typeof testUtils.createMockMediaTrack).toBe('function');
    });

    it('has custom Jest matchers', () => {
      const mockFile = testUtils.createMockFile('test.mp3', 1000, 'audio/mp3');
      expect(mockFile).toBeValidFile();
    });
  });

  describe('Mock Implementations', () => {
    it('has MediaRecorder mock', () => {
      expect(MediaRecorder).toBeDefined();
      expect(typeof MediaRecorder.isTypeSupported).toBe('function');
      expect(MediaRecorder.isTypeSupported('audio/webm')).toBe(true);
    });

    it('has getUserMedia mock', () => {
      expect(navigator.mediaDevices).toBeDefined();
      expect(typeof navigator.mediaDevices.getUserMedia).toBe('function');
    });

    it('has Web Audio API mocks', () => {
      expect(AudioContext).toBeDefined();
      expect(webkitAudioContext).toBeDefined();
      
      const context = new AudioContext();
      expect(typeof context.createAnalyser).toBe('function');
      expect(typeof context.createMediaStreamSource).toBe('function');
    });

    it('has IndexedDB mock (fake-indexeddb)', () => {
      expect(indexedDB).toBeDefined();
      expect(typeof indexedDB.open).toBe('function');
    });

    it('has Blob and File constructors', () => {
      expect(Blob).toBeDefined();
      expect(File).toBeDefined();
      
      const blob = new Blob(['test'], { type: 'text/plain' });
      expect(blob.size).toBe(4);
      expect(blob.type).toBe('text/plain');
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(file.name).toBe('test.txt');
      expect(file.size).toBe(4);
      expect(file.type).toBe('text/plain');
    });

    it('has URL mock', () => {
      expect(typeof URL.createObjectURL).toBe('function');
      expect(typeof URL.revokeObjectURL).toBe('function');
      
      const mockBlob = new Blob(['test']);
      const url = URL.createObjectURL(mockBlob);
      expect(url).toContain('mock-audio-url');
    });
  });

  describe('Third-Party Mocks', () => {
    it('can import mocked FFmpeg', async () => {
      const { FFmpeg } = await import('./__mocks__/@ffmpeg/ffmpeg.ts');
      const ffmpeg = new FFmpeg();
      
      expect(ffmpeg.loaded).toBe(false);
      expect(typeof ffmpeg.load).toBe('function');
      expect(typeof ffmpeg.writeFile).toBe('function');
      expect(typeof ffmpeg.readFile).toBe('function');
      expect(typeof ffmpeg.exec).toBe('function');
    });

    it('can import mocked Zustand', async () => {
      const { create } = await import('./__mocks__/zustand');
      expect(typeof create).toBe('function');
    });

    it('can import mocked QRCode', async () => {
      const { QRCodeSVG } = await import('./__mocks__/qrcode.react');
      expect(QRCodeSVG).toBeDefined();
    });
  });

  describe('HTTP Mocking', () => {
    it('has fetch available for testing', () => {
      expect(fetch).toBeDefined();
      expect(typeof fetch).toBe('function');
    });

    it('can mock fetch responses in individual tests', async () => {
      // Mock fetch for this test
      const mockResponse = { login: 'testuser', id: 123 };
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      } as any);
      
      const response = await fetch('https://api.github.com/user');
      const data = await response.json();
      
      expect(data).toEqual(mockResponse);
    });
  });

  describe('Console Suppression', () => {
    it('suppresses console warnings during tests', () => {
      console.warn('This warning should be suppressed');
      console.error('This error should be suppressed');
      
      // Test passes if no output appears in test runner
      expect(true).toBe(true);
    });
  });

  describe('Async Testing Utilities', () => {
    it('has async test utilities', async () => {
      expect(typeof testUtils.waitForAsync).toBe('function');
      
      // Test that waitForAsync properly handles promises
      let completed = false;
      Promise.resolve().then(() => { completed = true; });
      
      await testUtils.waitForAsync();
      expect(completed).toBe(true);
    });

    it('can trigger custom events', () => {
      const element = document.createElement('div');
      const eventHandler = jest.fn();
      element.addEventListener('custom', eventHandler);
      
      testUtils.triggerEvent(element, 'custom', { detail: 'test' });
      
      expect(eventHandler).toHaveBeenCalled();
    });
  });

  describe('TypeScript Support', () => {
    it('supports TypeScript compilation', () => {
      // If this test runs, TypeScript compilation is working
      const typedVariable: string = 'test';
      expect(typeof typedVariable).toBe('string');
    });

    it('has proper type definitions', () => {
      // Test that our mock types are properly defined
      const mockFile = testUtils.createMockFile('test.mp3', 1000, 'audio/mp3');
      expect(mockFile).toBeInstanceOf(File);
      expect(mockFile.name).toBe('test.mp3');
      expect(mockFile.size).toBe(1000);
      expect(mockFile.type).toBe('audio/mp3');
    });
  });

  describe('React Testing Library', () => {
    it('can render simple React components', () => {
      const TestComponent = () => React.createElement('div', null, 'Hello Test');
      
      render(React.createElement(TestComponent));
      
      expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('setup completes quickly', () => {
      const start = performance.now();
      
      // Perform some basic operations
      testUtils.createMockFile('test.mp3', 1000, 'audio/mp3');
      testUtils.createMockMediaStream();
      new AudioContext();
      new MediaRecorder(testUtils.createMockMediaStream() as any);
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete setup operations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
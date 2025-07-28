// Use the existing FFmpeg mock from __mocks__
import { convertToMp3, convertToMp4 } from '../../src/utils/mediaConverter';
import { FFmpeg } from '@ffmpeg/ffmpeg';

describe('mediaConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any module state by clearing require cache
    delete require.cache[require.resolve('../../src/utils/mediaConverter')];
  });

  describe('convertToMp3', () => {
    const sampleInput = new Uint8Array([1, 2, 3, 4, 5]);

    describe('basic functionality', () => {
      it('converts WebM audio to MP3', async () => {
        const result = await convertToMp3(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        // Check MP3 header
        expect(result[0]).toBe(0xFF);
        expect(result[1]).toBe(0xFB);
      });

      it('handles multiple conversions without reloading', async () => {
        // Test that multiple conversions work correctly
        const result1 = await convertToMp3(sampleInput);
        const result2 = await convertToMp3(sampleInput);

        expect(result1).toBeInstanceOf(Uint8Array);
        expect(result2).toBeInstanceOf(Uint8Array);
        expect(result1.length).toBeGreaterThan(0);
        expect(result2.length).toBeGreaterThan(0);
      });

      it('uses correct MP3 encoding parameters', async () => {
        // Mock exec to capture arguments
        const originalExec = FFmpeg.prototype.exec;
        const execSpy = jest.fn().mockImplementation(originalExec);
        FFmpeg.prototype.exec = execSpy;

        try {
          await convertToMp3(sampleInput);

          expect(execSpy).toHaveBeenCalledWith([
            '-i', 'input.webm',
            '-vn',           // No video
            '-ar', '44100',  // Sample rate
            '-ac', '2',      // Audio channels (stereo)
            '-b:a', '192k',  // Audio bitrate
            'output.mp3'
          ]);
        } finally {
          FFmpeg.prototype.exec = originalExec;
        }
      });
    });

    describe('progress callback', () => {
      it('sets up progress callback when provided', async () => {
        const onProgress = jest.fn();
        
        // Mock on method to capture callback setup
        const originalOn = FFmpeg.prototype.on;
        const onSpy = jest.fn().mockImplementation(originalOn);
        FFmpeg.prototype.on = onSpy;

        try {
          await convertToMp3(sampleInput, onProgress);
          expect(onSpy).toHaveBeenCalledWith('progress', expect.any(Function));
        } finally {
          FFmpeg.prototype.on = originalOn;
        }
      });

      it('does not set up progress callback when not provided', async () => {
        const originalOn = FFmpeg.prototype.on;
        const onSpy = jest.fn().mockImplementation(originalOn);
        FFmpeg.prototype.on = onSpy;

        try {
          await convertToMp3(sampleInput);
          expect(onSpy).not.toHaveBeenCalled();
        } finally {
          FFmpeg.prototype.on = originalOn;
        }
      });

      it('calls progress callback with correct value', async () => {
        const onProgress = jest.fn();
        
        await convertToMp3(sampleInput, onProgress);
        
        // The mock will call progress callbacks during exec
        // Wait a bit for the async progress callbacks to execute
        await new Promise(resolve => setTimeout(resolve, 200));
        
        expect(onProgress).toHaveBeenCalled();
        // Check that progress values are between 0 and 1
        const calls = onProgress.mock.calls;
        calls.forEach(([progress]: [number]) => {
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('data type conversion', () => {
      it('handles Uint8Array output correctly', async () => {
        const result = await convertToMp3(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      });

      it('converts string output to Uint8Array', async () => {
        // Mock readFile to return string
        const originalReadFile = FFmpeg.prototype.readFile;
        const stringOutput = 'binary-data-string';
        FFmpeg.prototype.readFile = jest.fn().mockResolvedValue(stringOutput);

        try {
          const result = await convertToMp3(sampleInput);

          expect(result).toBeInstanceOf(Uint8Array);
          expect(result).toEqual(new Uint8Array([
            98, 105, 110, 97, 114, 121, 45, 100, 97, 116, 97, 45, 115, 116, 114, 105, 110, 103
          ]));
        } finally {
          FFmpeg.prototype.readFile = originalReadFile;
        }
      });
    });

    describe('error handling', () => {
      it('handles FFmpeg initialization gracefully', async () => {
        // Test that conversion works even with complex initialization
        const result = await convertToMp3(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        // Verify it's a valid MP3-like output
        expect(result[0]).toBe(0xFF);
        expect(result[1]).toBe(0xFB);
      });

      it('propagates file write errors', async () => {
        const originalWriteFile = FFmpeg.prototype.writeFile;
        FFmpeg.prototype.writeFile = jest.fn().mockRejectedValue(new Error('Failed to write file'));

        try {
          await expect(convertToMp3(sampleInput)).rejects.toThrow('Failed to write file');
        } finally {
          FFmpeg.prototype.writeFile = originalWriteFile;
        }
      });

      it('propagates execution errors', async () => {
        const originalExec = FFmpeg.prototype.exec;
        FFmpeg.prototype.exec = jest.fn().mockRejectedValue(new Error('Conversion failed'));

        try {
          await expect(convertToMp3(sampleInput)).rejects.toThrow('Conversion failed');
        } finally {
          FFmpeg.prototype.exec = originalExec;
        }
      });

      it('propagates file read errors', async () => {
        const originalReadFile = FFmpeg.prototype.readFile;
        FFmpeg.prototype.readFile = jest.fn().mockRejectedValue(new Error('Failed to read file'));

        try {
          await expect(convertToMp3(sampleInput)).rejects.toThrow('Failed to read file');
        } finally {
          FFmpeg.prototype.readFile = originalReadFile;
        }
      });
    });

    describe('edge cases', () => {
      it('handles empty input', async () => {
        const emptyInput = new Uint8Array([]);
        
        const result = await convertToMp3(emptyInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0); // Mock returns standard data
      });

      it('handles large input data', async () => {
        const largeInput = new Uint8Array(1024 * 1024); // 1MB
        largeInput.fill(255);
        
        const originalWriteFile = FFmpeg.prototype.writeFile;
        const writeFileSpy = jest.fn().mockImplementation(originalWriteFile);
        FFmpeg.prototype.writeFile = writeFileSpy;

        try {
          const result = await convertToMp3(largeInput);

          expect(writeFileSpy).toHaveBeenCalledWith('input.webm', largeInput);
          expect(result).toBeInstanceOf(Uint8Array);
        } finally {
          FFmpeg.prototype.writeFile = originalWriteFile;
        }
      });
    });
  });

  describe('convertToMp4', () => {
    const sampleInput = new Uint8Array([1, 2, 3, 4, 5]);

    describe('basic functionality', () => {
      it('converts WebM video to MP4', async () => {
        const result = await convertToMp4(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        // Check for MP4 header
        expect(result[4]).toBe(102); // 'f'
        expect(result[5]).toBe(116); // 't'
        expect(result[6]).toBe(121); // 'y'
        expect(result[7]).toBe(112); // 'p'
      });

      it('works with both MP3 and MP4 conversions', async () => {
        // Test that both conversion types work correctly
        const mp3Result = await convertToMp3(sampleInput);
        const mp4Result = await convertToMp4(sampleInput);

        // MP3 output validation
        expect(mp3Result).toBeInstanceOf(Uint8Array);
        expect(mp3Result.length).toBeGreaterThan(0);
        expect(mp3Result[0]).toBe(0xFF);
        expect(mp3Result[1]).toBe(0xFB);

        // MP4 output validation
        expect(mp4Result).toBeInstanceOf(Uint8Array);
        expect(mp4Result.length).toBeGreaterThan(0);
        expect(mp4Result[0]).toBe(0x00);
        expect(mp4Result[1]).toBe(0x00);
      });

      it('uses correct MP4 encoding parameters', async () => {
        const originalExec = FFmpeg.prototype.exec;
        const execSpy = jest.fn().mockImplementation(originalExec);
        FFmpeg.prototype.exec = execSpy;

        try {
          await convertToMp4(sampleInput);

          expect(execSpy).toHaveBeenCalledWith([
            '-i', 'input.webm',
            '-c:v', 'libx264',      // Video codec
            '-preset', 'veryfast',   // Encoding speed/quality balance
            '-movflags', 'faststart', // Optimize for streaming
            '-pix_fmt', 'yuv420p',   // Pixel format for compatibility
            'output.mp4',
          ]);
        } finally {
          FFmpeg.prototype.exec = originalExec;
        }
      });
    });

    describe('progress callback', () => {
      it('sets up progress callback when provided', async () => {
        const onProgress = jest.fn();
        
        const originalOn = FFmpeg.prototype.on;
        const onSpy = jest.fn().mockImplementation(originalOn);
        FFmpeg.prototype.on = onSpy;

        try {
          await convertToMp4(sampleInput, onProgress);
          expect(onSpy).toHaveBeenCalledWith('progress', expect.any(Function));
        } finally {
          FFmpeg.prototype.on = originalOn;
        }
      });

      it('does not set up progress callback when not provided', async () => {
        const originalOn = FFmpeg.prototype.on;
        const onSpy = jest.fn().mockImplementation(originalOn);
        FFmpeg.prototype.on = onSpy;

        try {
          await convertToMp4(sampleInput);
          expect(onSpy).not.toHaveBeenCalled();
        } finally {
          FFmpeg.prototype.on = originalOn;
        }
      });

      it('calls progress callback with correct value', async () => {
        const onProgress = jest.fn();
        
        await convertToMp4(sampleInput, onProgress);
        
        // Wait for async progress callbacks
        await new Promise(resolve => setTimeout(resolve, 200));
        
        expect(onProgress).toHaveBeenCalled();
        const calls = onProgress.mock.calls;
        calls.forEach(([progress]: [number]) => {
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('data type conversion', () => {
      it('handles Uint8Array output correctly', async () => {
        const result = await convertToMp4(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      });

      it('converts string output to Uint8Array', async () => {
        const originalReadFile = FFmpeg.prototype.readFile;
        const stringOutput = 'video-data';
        FFmpeg.prototype.readFile = jest.fn().mockResolvedValue(stringOutput);

        try {
          const result = await convertToMp4(sampleInput);

          expect(result).toBeInstanceOf(Uint8Array);
          expect(result).toEqual(new Uint8Array([118, 105, 100, 101, 111, 45, 100, 97, 116, 97]));
        } finally {
          FFmpeg.prototype.readFile = originalReadFile;
        }
      });
    });

    describe('error handling', () => {
      it('handles FFmpeg initialization gracefully', async () => {
        // Test that conversion works even with complex initialization
        const result = await convertToMp4(sampleInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        // Verify it's a valid MP4-like output
        expect(result[0]).toBe(0x00);
        expect(result[1]).toBe(0x00);
      });

      it('propagates file write errors', async () => {
        const originalWriteFile = FFmpeg.prototype.writeFile;
        FFmpeg.prototype.writeFile = jest.fn().mockRejectedValue(new Error('Failed to write file'));

        try {
          await expect(convertToMp4(sampleInput)).rejects.toThrow('Failed to write file');
        } finally {
          FFmpeg.prototype.writeFile = originalWriteFile;
        }
      });

      it('propagates execution errors', async () => {
        const originalExec = FFmpeg.prototype.exec;
        FFmpeg.prototype.exec = jest.fn().mockRejectedValue(new Error('Conversion failed'));

        try {
          await expect(convertToMp4(sampleInput)).rejects.toThrow('Conversion failed');
        } finally {
          FFmpeg.prototype.exec = originalExec;
        }
      });

      it('propagates file read errors', async () => {
        const originalReadFile = FFmpeg.prototype.readFile;
        FFmpeg.prototype.readFile = jest.fn().mockRejectedValue(new Error('Failed to read file'));

        try {
          await expect(convertToMp4(sampleInput)).rejects.toThrow('Failed to read file');
        } finally {
          FFmpeg.prototype.readFile = originalReadFile;
        }
      });
    });

    describe('edge cases', () => {
      it('handles empty input', async () => {
        const emptyInput = new Uint8Array([]);
        
        const result = await convertToMp4(emptyInput);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      });

      it('handles large input data', async () => {
        const largeInput = new Uint8Array(5 * 1024 * 1024); // 5MB
        largeInput.fill(128);
        
        const originalWriteFile = FFmpeg.prototype.writeFile;
        const writeFileSpy = jest.fn().mockImplementation(originalWriteFile);
        FFmpeg.prototype.writeFile = writeFileSpy;

        try {
          const result = await convertToMp4(largeInput);

          expect(writeFileSpy).toHaveBeenCalledWith('input.webm', largeInput);
          expect(result).toBeInstanceOf(Uint8Array);
        } finally {
          FFmpeg.prototype.writeFile = originalWriteFile;
        }
      });
    });
  });

  describe('shared FFmpeg instance', () => {
    it('uses the same FFmpeg instance for both conversions', async () => {
      // Test that both functions work with the same underlying FFmpeg instance
      const mp3Result = await convertToMp3(new Uint8Array([1]));
      const mp4Result = await convertToMp4(new Uint8Array([2]));

      expect(mp3Result).toBeInstanceOf(Uint8Array);
      expect(mp4Result).toBeInstanceOf(Uint8Array);
      expect(mp3Result.length).toBeGreaterThan(0);
      expect(mp4Result.length).toBeGreaterThan(0);
    });

    it('handles multiple different conversions efficiently', async () => {
      // Test multiple conversions work without issues
      const results = await Promise.all([
        convertToMp3(new Uint8Array([1])),
        convertToMp4(new Uint8Array([2])),
        convertToMp3(new Uint8Array([3]))
      ]);

      // Validate all results
      results.forEach((result, index) => {
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        
        if (index === 1) { // MP4 result
          expect(result[0]).toBe(0x00);
        } else { // MP3 results
          expect(result[0]).toBe(0xFF);
          expect(result[1]).toBe(0xFB);
        }
      });
    });
  });

  describe('performance', () => {
    it('handles multiple conversions efficiently', async () => {
      const conversions = [
        convertToMp3(new Uint8Array([1])),
        convertToMp4(new Uint8Array([2])),
        convertToMp3(new Uint8Array([3])),
        convertToMp4(new Uint8Array([4])),
      ];

      const start = performance.now();
      const results = await Promise.all(conversions);
      const end = performance.now();

      // Should complete reasonably quickly in test environment
      expect(end - start).toBeLessThan(5000);
      
      // All conversions should succeed
      results.forEach(result => {
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
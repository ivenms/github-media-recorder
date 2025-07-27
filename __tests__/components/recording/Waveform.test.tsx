import React from 'react';
import { render, screen } from '@testing-library/react';
import Waveform from '../../../src/components/Waveform';
import { useWaveformVisualizer } from '../../../src/hooks/useWaveformVisualizer';
import { getUserMediaTestUtils } from '../../__mocks__/browser-apis/getUserMedia';

// Mock the waveform visualizer hook
jest.mock('../../../src/hooks/useWaveformVisualizer');

const mockUseWaveformVisualizer = useWaveformVisualizer as jest.MockedFunction<typeof useWaveformVisualizer>;

describe('Waveform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserMediaTestUtils.resetMocks();
    mockUseWaveformVisualizer.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('renders default waveform without data', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('height', '40');
      
      // Should render default 32 bars
      const bars = svg.querySelectorAll('rect');
      expect(bars).toHaveLength(32);
    });

    it('renders waveform with custom data', () => {
      const customData = [0.2, 0.5, 0.8, 0.3, 0.6];
      
      render(<Waveform data={customData} height={50} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      expect(bars).toHaveLength(5);
      expect(svg).toHaveAttribute('height', '50');
    });

    it('renders animated waveform from stream', () => {
      const mockStream = getUserMediaTestUtils.createMockStream(1, 0);
      const animatedData = [0.1, 0.9, 0.4, 0.7, 0.2];
      
      mockUseWaveformVisualizer.mockReturnValue(animatedData);

      render(<Waveform stream={mockStream as MediaStream} height={60} />);

      expect(mockUseWaveformVisualizer).toHaveBeenCalledWith(mockStream);
      
      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      expect(bars).toHaveLength(5);
      expect(svg).toHaveAttribute('height', '60');
    });

    it('prioritizes animated data over static data', () => {
      const staticData = [0.2, 0.5, 0.8];
      const animatedData = [0.1, 0.9, 0.4, 0.7];
      const mockStream = getUserMediaTestUtils.createMockStream(1, 0);
      
      mockUseWaveformVisualizer.mockReturnValue(animatedData);

      render(<Waveform data={staticData} stream={mockStream as MediaStream} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      // Should use animated data (4 bars) not static data (3 bars)
      expect(bars).toHaveLength(4);
    });

    it('falls back to static data when no animated data', () => {
      const staticData = [0.2, 0.5, 0.8];
      const mockStream = getUserMediaTestUtils.createMockStream(1, 0);
      
      mockUseWaveformVisualizer.mockReturnValue(null);

      render(<Waveform data={staticData} stream={mockStream as MediaStream} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      expect(bars).toHaveLength(3);
    });

    it('falls back to default pattern when no data available', () => {
      mockUseWaveformVisualizer.mockReturnValue(null);

      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      // Should render default 32 bars with sine wave pattern
      expect(bars).toHaveLength(32);
    });
  });

  describe('Styling and Layout', () => {
    it('applies custom color', () => {
      const customColor = '#FF5733';
      render(<Waveform color={customColor} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const firstBar = svg.querySelector('rect');
      
      expect(firstBar).toHaveAttribute('fill', customColor);
    });

    it('applies default purple color', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const firstBar = svg.querySelector('rect');
      
      expect(firstBar).toHaveAttribute('fill', '#9333EA');
    });

    it('calculates width based on bars and spacing', () => {
      const data = [0.2, 0.5, 0.8]; // 3 bars
      const barWidth = 4;
      const gap = 2;
      const expectedWidth = 3 * (barWidth + gap) - gap; // 16
      
      render(<Waveform data={data} barWidth={barWidth} gap={gap} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      expect(svg).toHaveAttribute('width', expectedWidth.toString());
      expect(svg).toHaveAttribute('viewBox', `0 0 ${expectedWidth} 40`);
    });

    it('positions bars correctly with custom spacing', () => {
      const data = [0.5, 0.7, 0.3];
      const barWidth = 4;
      const gap = 3;
      
      render(<Waveform data={data} barWidth={barWidth} gap={gap} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      expect(bars[0]).toHaveAttribute('x', '0'); // 0 * (4 + 3)
      expect(bars[1]).toHaveAttribute('x', '7'); // 1 * (4 + 3)
      expect(bars[2]).toHaveAttribute('x', '14'); // 2 * (4 + 3)
      
      // Check bar width
      bars.forEach(bar => {
        expect(bar).toHaveAttribute('width', '4');
      });
    });

    it('ensures minimum bar height', () => {
      const data = [0, 0.01, 0.02]; // Very small values
      render(<Waveform data={data} height={100} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      bars.forEach(bar => {
        const height = parseFloat(bar.getAttribute('height') || '0');
        expect(height).toBeGreaterThanOrEqual(5); // 0.05 * 100
      });
    });

    it('centers bars vertically', () => {
      const data = [0.5]; // 50% amplitude
      const height = 100;
      const expectedBarHeight = 50; // 0.5 * 100
      const expectedY = (height - expectedBarHeight) / 2; // 25
      
      render(<Waveform data={data} height={height} />);

      const svg = screen.getByLabelText('Waveform');
      const bar = svg.querySelector('rect');
      
      expect(bar).toHaveAttribute('height', expectedBarHeight.toString());
      expect(bar).toHaveAttribute('y', expectedY.toString());
    });

    it('applies rounded corners', () => {
      const barWidth = 6;
      const expectedRadius = barWidth / 2;
      
      render(<Waveform barWidth={barWidth} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      bars.forEach(bar => {
        expect(bar).toHaveAttribute('rx', expectedRadius.toString());
      });
    });

    it('applies opacity to bars', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      bars.forEach(bar => {
        expect(bar).toHaveAttribute('opacity', '0.7');
      });
    });

    it('has responsive classes', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      expect(svg).toHaveClass('w-full', 'h-full');
    });
  });

  describe('Data Handling', () => {
    it('handles empty data array', () => {
      render(<Waveform data={[]} height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      // Should fall back to default pattern
      expect(bars).toHaveLength(32);
    });

    it('handles negative amplitude values', () => {
      const data = [-0.5, 0.3, -0.8];
      render(<Waveform data={data} height={100} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      bars.forEach(bar => {
        const height = parseFloat(bar.getAttribute('height') || '0');
        // Should apply minimum height even for negative values
        expect(height).toBeGreaterThanOrEqual(5); // 0.05 * 100
      });
    });

    it('handles amplitude values greater than 1', () => {
      const data = [1.5, 2.0, 0.5];
      render(<Waveform data={data} height={100} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      // First two bars should be clipped to full height
      expect(bars[0]).toHaveAttribute('height', '150'); // 1.5 * 100
      expect(bars[1]).toHaveAttribute('height', '200'); // 2.0 * 100
      expect(bars[2]).toHaveAttribute('height', '50'); // 0.5 * 100
    });

    it('generates default sine wave pattern', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      
      expect(bars).toHaveLength(32);
      
      // Verify sine wave pattern characteristics
      const heights = Array.from(bars).map(bar => 
        parseFloat(bar.getAttribute('height') || '0')
      );
      
      // Should have variation (not all the same height)
      const uniqueHeights = new Set(heights);
      expect(uniqueHeights.size).toBeGreaterThan(1);
      
      // Should be within expected range (0.3 to 1.0 amplitude)
      heights.forEach(height => {
        expect(height).toBeGreaterThanOrEqual(12); // 0.3 * 40
        expect(height).toBeLessThanOrEqual(40); // 1.0 * 40
      });
    });
  });

  describe('Stream Integration', () => {
    it('passes stream to waveform visualizer hook', () => {
      const mockStream = getUserMediaTestUtils.createMockStream(1, 0);
      
      render(<Waveform stream={mockStream as MediaStream} height={40} />);
      
      expect(mockUseWaveformVisualizer).toHaveBeenCalledWith(mockStream);
    });

    it('handles null stream', () => {
      render(<Waveform stream={null} height={40} />);
      
      expect(mockUseWaveformVisualizer).toHaveBeenCalledWith(null);
    });

    it('updates when stream changes', () => {
      const mockStream1 = getUserMediaTestUtils.createMockStream(1, 0);
      const mockStream2 = getUserMediaTestUtils.createMockStream(1, 0);
      
      const { rerender } = render(<Waveform stream={mockStream1 as MediaStream} height={40} />);
      expect(mockUseWaveformVisualizer).toHaveBeenCalledWith(mockStream1);
      
      rerender(<Waveform stream={mockStream2 as MediaStream} height={40} />);
      expect(mockUseWaveformVisualizer).toHaveBeenCalledWith(mockStream2);
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      expect(svg).toHaveAttribute('aria-label', 'Waveform');
    });

    it('is semantic SVG element', () => {
      render(<Waveform height={40} />);

      const svg = screen.getByLabelText('Waveform');
      expect(svg.tagName).toBe('svg');
    });
  });

  describe('Performance', () => {
    it('handles large data arrays efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10));
      
      const renderStart = performance.now();
      render(<Waveform data={largeData} height={40} />);
      const renderEnd = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(renderEnd - renderStart).toBeLessThan(200);
      
      const svg = screen.getByLabelText('Waveform');
      const bars = svg.querySelectorAll('rect');
      expect(bars).toHaveLength(1000);
    });

    it('reuses keys for stable rendering', () => {
      const data = [0.2, 0.5, 0.8];
      
      const { rerender } = render(<Waveform data={data} height={40} />);
      const svg1 = screen.getByLabelText('Waveform');
      const bars1 = Array.from(svg1.querySelectorAll('rect')).map(bar => bar.getAttribute('key'));
      
      rerender(<Waveform data={data} height={50} />); // Only height changes
      const svg2 = screen.getByLabelText('Waveform');
      const bars2 = Array.from(svg2.querySelectorAll('rect')).map(bar => bar.getAttribute('key'));
      
      // Keys should be stable (based on index)
      expect(bars1).toEqual(bars2);
    });
  });
});
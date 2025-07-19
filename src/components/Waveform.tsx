import React from 'react';
import { useWaveformVisualizer } from '../hooks/useWaveformVisualizer';

interface WaveformProps {
  data?: number[]; // Array of amplitude values (0-1)
  color?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
  stream?: MediaStream;
}

const DEFAULT_BARS = 32;

const Waveform: React.FC<WaveformProps> = ({
  data,
  color = '#9333EA',
  height = 40,
  barWidth = 3,
  gap = 2,
  stream,
}) => {
  // Use the custom hook for animation if stream is present
  const animatedData = useWaveformVisualizer(stream);

  // Priority: animatedData (from stream) > data (from prop) > placeholder
  const bars = animatedData && animatedData.length > 0
    ? animatedData
    : data && data.length > 0
    ? data
    : Array.from({ length: DEFAULT_BARS }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i / 3)));
  const width = bars.length * (barWidth + gap) - gap;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-label="Waveform">
      {bars.map((amp, i) => {
        const barHeight = Math.max(amp, 0.05) * height;
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={(height - barHeight) / 2}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={color}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
};

export default Waveform; 
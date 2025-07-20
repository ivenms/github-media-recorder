import React from 'react';

interface RecordIconProps {
  className?: string;
  width?: number;
  height?: number;
  state?: 'idle' | 'recording' | 'paused' | 'play';
}

const RecordIcon: React.FC<RecordIconProps> = ({ 
  className = '', 
  width = 24, 
  height = 24,
  state = 'idle'
}) => {
  // For stop and pause states, render completely different SVG icons
  if (state === 'recording') {
    return (
      <svg width={width} height={height} className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stop button - solid red circle with white square */}
        <circle cx="256" cy="256" r="256" fill="url(#stopGradient)"/>
        <rect x="180" y="180" width="152" height="152" rx="16" fill="white"/>
        <defs>
          <linearGradient id="stopGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4444" stopOpacity="1" />
            <stop offset="100%" stopColor="#CC2222" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (state === 'paused') {
    return (
      <svg width={width} height={height} className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pause button - solid orange circle with white pause bars */}
        <circle cx="256" cy="256" r="256" fill="url(#pauseGradient)"/>
        <rect x="190" y="150" width="40" height="212" rx="8" fill="white"/>
        <rect x="282" y="150" width="40" height="212" rx="8" fill="white"/>
        <defs>
          <linearGradient id="pauseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (state === 'play') {
    return (
      <svg width={width} height={height} className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Play button - solid green circle with white play triangle */}
        <circle cx="256" cy="256" r="256" fill="url(#playGradient)"/>
        <path d="M200 150 L350 256 L200 362 Z" fill="white"/>
        <defs>
          <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="1" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Default idle state - keep the app icon template
  return (
    <svg width={width} height={height} className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="256" cy="256" r="256" fill="url(#gradient)"/>
      
      {/* Audio waveform background */}
      <g fill="white" opacity="0.3">
        <rect x="30" y="206" width="6" height="100" rx="3"/>
        <rect x="42" y="226" width="6" height="60" rx="3"/>
        <rect x="54" y="186" width="6" height="140" rx="3"/>
        <rect x="66" y="216" width="6" height="80" rx="3"/>
        <rect x="78" y="166" width="6" height="180" rx="3"/>
        <rect x="90" y="196" width="6" height="120" rx="3"/>
        <rect x="102" y="176" width="6" height="160" rx="3"/>
        <rect x="114" y="206" width="6" height="100" rx="3"/>
        <rect x="126" y="156" width="6" height="200" rx="3"/>
        <rect x="138" y="186" width="6" height="140" rx="3"/>
        <rect x="150" y="216" width="6" height="80" rx="3"/>
        
        <rect x="356" y="216" width="6" height="80" rx="3"/>
        <rect x="368" y="186" width="6" height="140" rx="3"/>
        <rect x="380" y="156" width="6" height="200" rx="3"/>
        <rect x="392" y="206" width="6" height="100" rx="3"/>
        <rect x="404" y="176" width="6" height="160" rx="3"/>
        <rect x="416" y="196" width="6" height="120" rx="3"/>
        <rect x="428" y="166" width="6" height="180" rx="3"/>
        <rect x="440" y="216" width="6" height="80" rx="3"/>
        <rect x="452" y="186" width="6" height="140" rx="3"/>
        <rect x="464" y="226" width="6" height="60" rx="3"/>
        <rect x="476" y="206" width="6" height="100" rx="3"/>
      </g>
      
      {/* Outer ring */}
      <circle cx="256" cy="256" r="120" fill="none" stroke="white" strokeWidth="8" opacity="0.9"/>
      
      {/* Record button (main circle) */}
      <circle cx="256" cy="256" r="90" fill="#FF4444"/>
      
      {/* Record button (inner highlight) */}
      <circle cx="256" cy="256" r="75" fill="url(#recordGradient)"/>
      
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" stopOpacity="1" />
          <stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="recordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6666" stopOpacity="1" />
          <stop offset="100%" stopColor="#CC2222" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default RecordIcon; 
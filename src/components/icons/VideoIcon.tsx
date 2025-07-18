import React from 'react';

interface VideoIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const VideoIcon: React.FC<VideoIconProps> = ({ className = '', width = 16, height = 16 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      fill="currentColor" 
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  );
};

export default VideoIcon;
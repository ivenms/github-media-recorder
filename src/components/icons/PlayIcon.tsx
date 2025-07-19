import React from 'react';

interface PlayIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const PlayIcon: React.FC<PlayIconProps> = ({ width = 24, height = 24, className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`flex-shrink-0 ${className}`}
    >
      <path d="M8 5v14l11-7z"/>
    </svg>
  );
};

export default PlayIcon;
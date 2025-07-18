import React from 'react';

interface AudioIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const AudioIcon: React.FC<AudioIconProps> = ({ className = '', width = 16, height = 16 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      fill="currentColor" 
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  );
};

export default AudioIcon;
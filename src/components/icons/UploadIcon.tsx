import React from 'react';

interface UploadIconProps {
  className?: string;
  width?: number;
  height?: number;
}

const UploadIcon: React.FC<UploadIconProps> = ({ className = '', width = 16, height = 16 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      className={`flex-shrink-0 ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
      />
    </svg>
  );
};

export default UploadIcon;
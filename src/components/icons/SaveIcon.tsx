import React from 'react';
import type { IconProps } from '../../types';

const SaveIcon: React.FC<IconProps> = ({ className = '', width = 16, height = 16 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      fill="currentColor" 
      viewBox="0 0 20 20"
      className={`flex-shrink-0 ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <path 
        fillRule="evenodd" 
        d="M3 4a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm3 0v3h8V4H6zm8 5H6v7h8V9z" 
        clipRule="evenodd" 
      />
      <rect x="7" y="5" width="6" height="1" fill="white" />
      <rect x="7" y="11" width="6" height="4" fill="white" />
    </svg>
  );
};

export default SaveIcon;
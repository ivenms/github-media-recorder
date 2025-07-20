import React from 'react';
import type { DeleteIconProps } from '../../types';

const DeleteIcon: React.FC<DeleteIconProps> = ({ className = '', width = 18, height = 18 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      fill="currentColor" 
      viewBox="0 0 24 24"
      className={`flex-shrink-0 ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  );
};

export default DeleteIcon;
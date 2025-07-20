import React from 'react';
import type { CheckIconProps } from '../../types';

const CheckIcon: React.FC<CheckIconProps> = ({ className = '', width = 16, height = 16 }) => {
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
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
        clipRule="evenodd" 
      />
    </svg>
  );
};

export default CheckIcon;
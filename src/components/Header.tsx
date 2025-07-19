import React from 'react';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  children, 
  showBackButton = false, 
  onBackClick 
}) => {
  return (
    <div className="sticky top-0 z-10">
      <div className="bg-white rounded-b-3xl shadow-lg border border-purple-600" style={{ borderWidth: '0.5px' }}>
        {/* Header Bar */}
        <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section */}
        <div className="flex items-center min-w-0">
          {showBackButton && (
            <button
              onClick={onBackClick}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Center Section - Title */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        </div>
        
        {/* Right Section - Action Buttons */}
        <div className="flex items-center gap-2 min-w-0">
          {children}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
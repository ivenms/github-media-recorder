import React from 'react';
import HomeIcon from './icons/HomeIcon';
import MicIcon from './icons/MicIcon';
import LibraryIcon from './icons/LibraryIcon';
import SettingsIcon from './icons/SettingsIcon';
import VideoRecorderIcon from './icons/VideoRecorderIcon';

const BottomMenu: React.FC<{ active?: string; onNavigate?: (key: string) => void }> = ({ active = 'library', onNavigate }) => {
  const menu = [
    { key: 'library', icon: <LibraryIcon />, label: 'Library' },
    { key: 'home', icon: <MicIcon />, label: 'Audio' },
    { key: 'record', icon: <VideoRecorderIcon />, label: 'Video' },
    { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50">
      <div className="bg-white rounded-t-3xl shadow-lg border border-purple-600" style={{ borderWidth: '0.5px' }}>
        <div className="flex justify-around items-end px-6 pt-3 pb-2 relative">
          {menu.map((item) => (
            <button
              key={item.key}
              className="flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-300 relative bg-transparent border-0 outline-none focus:outline-none"
              onClick={() => onNavigate?.(item.key)}
            >
              {active === item.key ? (
                <>
                  {/* Floating active state */}
                  <div className="absolute -top-8 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300">
                    <div className="w-6 h-6 flex items-center justify-center text-white">
                      {item.icon}
                    </div>
                  </div>
                  <div className="h-6 mb-2"></div> {/* Spacer for floating icon */}
                  <span className="text-xs font-medium text-purple-600">
                    {item.label}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 flex items-center justify-center mb-2 text-gray-400 transition-colors duration-200">
                    {item.icon}
                  </div>
                  <span className="text-xs font-normal text-gray-400">
                    {item.label}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomMenu; 
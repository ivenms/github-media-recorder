import React from 'react';
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
      <div className="bg-white rounded-t-3xl shadow-2xl border border-purple-600" style={{ 
        borderWidth: '0.5px',
        boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.15), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
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
                  <div className="absolute -top-8 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center transition-all duration-300" style={{
                    boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}>
                    <div className="w-6 h-6 flex items-center justify-center text-white" style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                    }}>
                      {item.icon}
                    </div>
                  </div>
                  <div className="h-6 mb-2"></div> {/* Spacer for floating icon */}
                  <span className="text-xs font-medium text-purple-600" style={{
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}>
                    {item.label}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 flex items-center justify-center mb-2 text-gray-400 transition-colors duration-200" style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
                  }}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-normal text-gray-400" style={{
                    textShadow: '0 1px 1px rgba(0, 0, 0, 0.05)'
                  }}>
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
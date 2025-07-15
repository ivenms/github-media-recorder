import React from 'react';
import HomeIcon from './icons/HomeIcon';
import MicIcon from './icons/MicIcon';
import LibraryIcon from './icons/LibraryIcon';
import SettingsIcon from './icons/SettingsIcon';

const BottomMenu: React.FC<{ active?: string; onNavigate?: (key: string) => void }> = ({ active = 'home', onNavigate }) => {
  const menu = [
    { key: 'home', icon: <HomeIcon />, label: 'Home' },
    { key: 'record', icon: <MicIcon />, label: 'Record' },
    { key: 'library', icon: <LibraryIcon />, label: 'Library' },
    { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center bg-white/70 backdrop-blur-md py-2 shadow-neumorph z-50">
      {menu.map((item) => (
        <button
          key={item.key}
          className={`flex flex-col items-center px-2 py-1 rounded-xl transition-all ${active === item.key ? 'bg-blue-100 shadow-inner' : ''}`}
          onClick={() => onNavigate?.(item.key)}
        >
          <span className={active === item.key ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
          <span className="text-xs mt-1 font-medium text-gray-700">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomMenu; 
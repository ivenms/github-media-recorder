import React, { useState, useEffect } from 'react';
import type { AppSettings, SettingsProps } from '../types';
import { getStoredUsername, clearTokenData } from '../utils/tokenAuth';
import { LOCALSTORAGE_KEYS } from '../utils/appConfig';

const getInitialSettings = (): AppSettings => {
  const saved = localStorage.getItem(LOCALSTORAGE_KEYS.githubSettings);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      repo: parsed.repo || '',
      path: parsed.path || 'media/',
      thumbnailPath: parsed.thumbnailPath || 'thumbnails/',
      thumbnailWidth: parsed.thumbnailWidth || 320,
      thumbnailHeight: parsed.thumbnailHeight || 240
    };
  }
  return { 
    repo: '', 
    path: 'media/', 
    thumbnailPath: 'thumbnails/',
    thumbnailWidth: 320,
    thumbnailHeight: 240
  };
};

const Settings: React.FC<SettingsProps> = ({ audioFormat, setAudioFormat, onLogout }) => {
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings());
  const [status, setStatus] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    setSettings(getInitialSettings());
    setUsername(getStoredUsername() || '');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings({ 
      ...settings, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    });
  };

  const handleSave = () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.githubSettings, JSON.stringify(settings));
    setStatus('Settings saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? You will need to enter your GitHub token again.')) {
      clearTokenData();
      onLogout();
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      
      {/* GitHub Account Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">GitHub Account</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Logged in as:</span>
            <div className="font-semibold text-gray-900">{username}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Repository Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Repository Settings</h3>
        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Repository Name</span>
          <input
            type="text"
            name="repo"
            value={settings.repo}
            onChange={handleChange}
            placeholder="my-media-repo"
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>
        
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Media Path</span>
          <input
            type="text"
            name="path"
            value={settings.path || ''}
            onChange={handleChange}
            placeholder="media/"
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-xs text-gray-500 mt-1 block">Path in repository where media files will be uploaded</span>
        </label>
        
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Thumbnail Path</span>
          <input
            type="text"
            name="thumbnailPath"
            value={settings.thumbnailPath || ''}
            onChange={handleChange}
            placeholder="thumbnails/"
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-xs text-gray-500 mt-1 block">Path in repository where thumbnail files will be uploaded</span>
        </label>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Thumbnail Width</span>
            <input
              type="number"
              name="thumbnailWidth"
              value={settings.thumbnailWidth || 320}
              onChange={handleChange}
              min="50"
              max="1920"
              className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 mt-1 block">Width in pixels</span>
          </label>
          
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Thumbnail Height</span>
            <input
              type="number"
              name="thumbnailHeight"
              value={settings.thumbnailHeight || 240}
              onChange={handleChange}
              min="50"
              max="1080"
              className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 mt-1 block">Height in pixels</span>
          </label>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Audio Settings</h3>
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Audio Format</span>
          <select
            name="audioFormat"
            value={audioFormat}
            onChange={(e) => setAudioFormat(e.target.value as 'mp3' | 'wav')}
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="mp3">MP3 (Compressed)</option>
            <option value="wav">WAV (Uncompressed)</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
      >
        Save Settings
      </button>
      
      {status && (
        <div className="mt-3 p-2 bg-green-100 text-green-700 rounded text-sm text-center">
          {status}
        </div>
      )}
    </div>
  );
};

export default Settings;
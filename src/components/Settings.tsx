import React, { useState, useEffect } from 'react';
import type { AppSettings, SettingsProps, MediaCategory } from '../types';
import { getStoredUsername, clearTokenData } from '../utils/tokenAuth';
import { LOCALSTORAGE_KEYS, DEFAULT_MEDIA_CATEGORIES } from '../utils/appConfig';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

const getInitialSettings = (): AppSettings => {
  const saved = localStorage.getItem(LOCALSTORAGE_KEYS.githubSettings);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      repo: parsed.repo || '',
      path: parsed.path || 'media/',
      thumbnailPath: parsed.thumbnailPath || 'thumbnails/',
      thumbnailWidth: parsed.thumbnailWidth || 320,
      thumbnailHeight: parsed.thumbnailHeight || 240,
      customCategories: parsed.customCategories || DEFAULT_MEDIA_CATEGORIES.slice()
    };
  }
  return { 
    repo: '', 
    path: 'media/', 
    thumbnailPath: 'thumbnails/',
    thumbnailWidth: 320,
    thumbnailHeight: 240,
    customCategories: DEFAULT_MEDIA_CATEGORIES.slice()
  };
};

const Settings: React.FC<SettingsProps> = ({ audioFormat, setAudioFormat, onLogout }) => {
  const { modalState, showConfirm, closeModal } = useModal();
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings());
  const [status, setStatus] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

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
    showConfirm(
      'Are you sure you want to logout? You will need to enter your GitHub token again.',
      () => {
        clearTokenData();
        onLogout();
      },
      'Confirm Logout',
      'Logout',
      'Cancel'
    );
  };

  const addCategory = () => {
    if (newCategoryName.trim() && settings.customCategories) {
      const newCategory: MediaCategory = {
        id: newCategoryName.trim(),
        name: newCategoryName.trim()
      };
      
      // Check if category already exists
      const exists = settings.customCategories.some(cat => cat.id === newCategory.id);
      if (!exists) {
        setSettings({
          ...settings,
          customCategories: [...settings.customCategories, newCategory]
        });
        setNewCategoryName('');
      }
    }
  };

  const removeCategory = (categoryId: string) => {
    if (settings.customCategories && settings.customCategories.length > 1) {
      setSettings({
        ...settings,
        customCategories: settings.customCategories.filter(cat => cat.id !== categoryId)
      });
    }
  };

  const resetCategories = () => {
    showConfirm(
      'Reset to default categories? This will remove all custom categories.',
      () => {
        setSettings({
          ...settings,
          customCategories: DEFAULT_MEDIA_CATEGORIES.slice()
        });
      },
      'Reset Categories',
      'Reset',
      'Cancel'
    );
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
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="mp3">MP3 (Compressed)</option>
            <option value="wav">WAV (Uncompressed)</option>
          </select>
        </label>
      </div>

      {/* Category Management */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Media Categories</h3>
        
        {/* Current Categories */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 block mb-2">Current Categories</span>
          <div className="flex flex-wrap gap-2 mb-3">
            {settings.customCategories?.map((category) => (
              <div key={category.id} className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                <span>{category.name}</span>
                {settings.customCategories && settings.customCategories.length > 1 && (
                  <button
                    onClick={() => removeCategory(category.id)}
                    className="ml-2 text-purple-600 hover:text-purple-800 font-bold"
                    title="Remove category"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add New Category */}
        <div className="mb-3">
          <span className="text-sm font-medium text-gray-700 block mb-2">Add New Category</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              placeholder="Category name"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-2 bg-purple-400 text-white rounded text-sm hover:bg-purple-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetCategories}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Reset to default categories
        </button>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-purple-400 text-white px-4 py-2 rounded font-medium hover:bg-purple-500 transition-colors"
      >
        Save Settings
      </button>
      
      {status && (
        <div className="mt-3 p-2 bg-green-100 text-green-700 rounded text-sm text-center">
          {status}
        </div>
      )}
      
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default Settings;
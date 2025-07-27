import React, { useState, useEffect } from 'react';
import type { AppSettings, SettingsProps, MediaCategory } from '../types';
import { getStoredUsername, clearTokenData } from '../utils/tokenAuth';
import { DEFAULT_MEDIA_CATEGORIES } from '../utils/appConfig';
import Modal from './Modal';
import Header from './Header';
import InputField from './InputField';
import SaveButton from './SaveButton';
import { useUIStore } from '../stores/uiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';

const getInitialSettings = (): AppSettings => {
  // Default settings - the store will load persisted data
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
  const { modal, openModal, closeModal } = useUIStore();
  const { appSettings, setAppSettings } = useSettingsStore();
  const { userInfo, logout: authLogout } = useAuthStore();
  
  const [settings, setSettings] = useState<AppSettings>(appSettings || getInitialSettings());
  const [status, setStatus] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  useEffect(() => {
    if (appSettings) {
      setSettings(appSettings);
    } else {
      const initialSettings = getInitialSettings();
      setSettings(initialSettings);
      setAppSettings(initialSettings);
    }
  }, [appSettings, setAppSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings({ 
      ...settings, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    });
  };

  const handleSave = () => {
    setAppSettings(settings);
    setStatus('Settings saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleLogout = () => {
    openModal({
      type: 'confirm',
      title: 'Confirm Logout',
      message: 'Are you sure you want to logout? You will need to enter your GitHub token again.',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: () => {
        clearTokenData();
        authLogout();
        onLogout();
      }
    });
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
    openModal({
      type: 'confirm',
      title: 'Reset Categories',
      message: 'Reset to default categories? This will remove all custom categories.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      onConfirm: () => {
        setSettings({
          ...settings,
          customCategories: DEFAULT_MEDIA_CATEGORIES.slice()
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Settings" />
      <div className="p-4 max-w-md mx-auto">
      
      {/* GitHub Account Section */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-2">GitHub Account</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Logged in as:</span>
            <div className="font-semibold text-gray-900">{userInfo?.login || userInfo?.name || getStoredUsername() || 'Unknown'}</div>
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
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Repository Settings</h3>
        <div className="space-y-4">
        <InputField
          label="Repository Name"
          type="text"
          name="repo"
          value={settings.repo}
          onChange={handleChange}
          placeholder="my-media-repo"
        />
        
        <div>
          <InputField
            label="Media Path"
            type="text"
            name="path"
            value={settings.path || ''}
            onChange={handleChange}
            placeholder="media/"
          />
          <span className="text-xs text-gray-500 mt-1 block">Path in repository where media files will be uploaded</span>
        </div>
        
        <div>
          <InputField
            label="Thumbnail Path"
            type="text"
            name="thumbnailPath"
            value={settings.thumbnailPath || ''}
            onChange={handleChange}
            placeholder="thumbnails/"
          />
          <span className="text-xs text-gray-500 mt-1 block">Path in repository where thumbnail files will be uploaded</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <InputField
              label="Thumbnail Width"
              type="number"
              name="thumbnailWidth"
              value={String(settings.thumbnailWidth || 320)}
              onChange={handleChange}
            />
            <span className="text-xs text-gray-500 mt-1 block">Width in pixels (50-1920)</span>
          </div>
          
          <div>
            <InputField
              label="Thumbnail Height"
              type="number"
              name="thumbnailHeight"
              value={String(settings.thumbnailHeight || 240)}
              onChange={handleChange}
            />
            <span className="text-xs text-gray-500 mt-1 block">Height in pixels (50-1080)</span>
          </div>
        </div>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Audio Settings</h3>
        <InputField
          label="Audio Format"
          type="select"
          name="audioFormat"
          value={audioFormat}
          onChange={(e) => setAudioFormat(e.target.value as 'mp3' | 'wav')}
          options={[
            { id: 'mp3', name: 'MP3 (Compressed)' },
            { id: 'wav', name: 'WAV (Uncompressed)' }
          ]}
        />
      </div>

      {/* Category Management */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Media Categories</h3>
        
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
                    className="ml-2 w-4 h-4 rounded-full bg-purple-200 hover:bg-purple-300 text-purple-700 hover:text-purple-900 text-xs font-bold flex items-center justify-center transition-colors"
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
            <div className="flex-1">
              <InputField
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="mb-0"
              />
            </div>
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-400 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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

      <SaveButton
        saving={false}
        saved={status !== ''}
        disabled={false}
        onClick={handleSave}
        label="Save Settings"
      />
      
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message || ''}
        type={modal.type || 'alert'}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
      </div>
    </div>
  );
};

export default Settings;
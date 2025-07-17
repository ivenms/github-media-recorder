import React, { useState, useEffect } from 'react';
import type { GitHubSettings, SettingsProps } from '../types';
import { logoutGithub, getGithubUsername } from '../utils/githubOAuth';
import { LOCALSTORAGE_KEYS } from '../utils/appConfig';

const getInitialSettings = (): GitHubSettings => {
  const saved = localStorage.getItem(LOCALSTORAGE_KEYS.githubSettings);
  if (saved) return { audioFormat: 'mp3', ...JSON.parse(saved) };
  return { token: '', owner: '', repo: '', audioFormat: 'mp3' };
};

const Settings: React.FC<SettingsProps> = ({ audioFormat, setAudioFormat }) => {
  const [settings, setSettings] = useState<GitHubSettings>(getInitialSettings());
  const [status, setStatus] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    setSettings(getInitialSettings());
    setUsername(getGithubUsername());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.githubSettings, JSON.stringify(settings));
    setStatus('Settings saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleLogout = () => {
    logoutGithub();
    window.location.reload();
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">GitHub Settings</h2>
      <div className="mb-4">
        <span className="text-sm">Logged in as:</span>
        <span className="ml-2 font-semibold">{username}</span>
        <button
          onClick={handleLogout}
          className="ml-4 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      <label className="block mb-2">
        <span className="text-sm">Repository Name</span>
        <input
          type="text"
          name="repo"
          value={settings.repo}
          onChange={handleChange}
          className="w-full border rounded px-2 py-1 mt-1"
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm">Media Path (e.g. media/)</span>
        <input
          type="text"
          name="path"
          value={settings.path || ''}
          onChange={handleChange}
          className="w-full border rounded px-2 py-1 mt-1"
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm">Audio Format</span>
        <select
          name="audioFormat"
          value={audioFormat}
          onChange={(e) => setAudioFormat(e.target.value as 'mp3' | 'wav')}
          className="w-full border rounded px-2 py-1 mt-1"
        >
          <option value="mp3">MP3</option>
          <option value="wav">WAV</option>
        </select>
      </label>
      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save
      </button>
      {status && <div className="mt-2 text-green-600">{status}</div>}
    </div>
  );
};

export default Settings;
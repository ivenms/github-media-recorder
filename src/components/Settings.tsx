import React, { useState, useEffect } from 'react';

const SETTINGS_KEY = 'githubSettings';

interface GitHubSettings {
  token: string;
  owner: string;
  repo: string;
  audioFormat: 'mp3' | 'wav';
}

const getInitialSettings = (): GitHubSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) return { audioFormat: 'mp3', ...JSON.parse(saved) };
  return { token: '', owner: '', repo: '', audioFormat: 'mp3' };
};

interface SettingsProps {
  audioFormat: 'mp3' | 'wav';
  setAudioFormat: (format: 'mp3' | 'wav') => void;
}

const Settings: React.FC<SettingsProps> = ({ audioFormat, setAudioFormat }) => {
  const [settings, setSettings] = useState<GitHubSettings>(getInitialSettings());
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setSettings(getInitialSettings());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setStatus('Settings saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">GitHub Settings</h2>
      <label className="block mb-2">
        <span className="text-sm">Personal Access Token</span>
        <input
          type="password"
          name="token"
          value={settings.token}
          onChange={handleChange}
          className="w-full border rounded px-2 py-1 mt-1"
          autoComplete="off"
        />
      </label>
      <label className="block mb-2">
        <span className="text-sm">Repository Owner</span>
        <input
          type="text"
          name="owner"
          value={settings.owner}
          onChange={handleChange}
          className="w-full border rounded px-2 py-1 mt-1"
        />
      </label>
      <label className="block mb-4">
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
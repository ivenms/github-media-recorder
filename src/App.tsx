import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import UploadManager from './components/UploadManager';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';

const SETTINGS_KEY = 'githubSettings';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  const [screen, setScreen] = React.useState<'audio' | 'video' | 'files' | 'upload' | 'settings'>('audio');
  const [audioFormat, setAudioFormat] = React.useState<'mp3' | 'wav'>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return (JSON.parse(saved).audioFormat as 'mp3' | 'wav') || 'mp3';
    return 'mp3';
  });

  // Sync audioFormat to localStorage when changed
  React.useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const settings = saved ? JSON.parse(saved) : {};
    if (settings.audioFormat !== audioFormat) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, audioFormat }));
    }
  }, [audioFormat]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-black">
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto">
        {screen === 'audio' && <AudioRecorder audioFormat={audioFormat} />}
        {screen === 'video' && <VideoRecorder />}
        {screen === 'files' && <FileList />}
        {screen === 'upload' && <UploadManager />}
        {screen === 'settings' && <Settings audioFormat={audioFormat} setAudioFormat={setAudioFormat} />}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex justify-around py-2">
        <button onClick={() => setScreen('audio')}>Audio</button>
        <button onClick={() => setScreen('video')}>Video</button>
        <button onClick={() => setScreen('files')}>Files</button>
        <button onClick={() => setScreen('upload')}>Upload</button>
        <button onClick={() => setScreen('settings')}>Settings</button>
      </nav>
    </div>
  );
};

export default App;

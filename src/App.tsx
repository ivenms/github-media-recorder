import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';
import BottomMenu from './components/BottomMenu';
import DesktopAlert from './components/DesktopAlert';

const SETTINGS_KEY = 'githubSettings';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  const [screen, setScreen] = React.useState<'home' | 'record' | 'library' | 'settings'>('home');
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
    <div className="min-h-screen w-full flex flex-col">
      <DesktopAlert />
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto pb-20">
        {screen === 'home' && <AudioRecorder audioFormat={audioFormat} />}
        {screen === 'record' && <VideoRecorder />}
        {screen === 'library' && <FileList />}
        {screen === 'settings' && <Settings audioFormat={audioFormat} setAudioFormat={setAudioFormat} />}
      </main>
      <BottomMenu
        active={screen}
        onNavigate={(key) => {
          if (key === 'home' || key === 'record' || key === 'library' || key === 'settings') {
            setScreen(key);
          }
        }}
      />
    </div>
  );
};

export default App;

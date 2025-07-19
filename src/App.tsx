import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';
import BottomMenu from './components/BottomMenu';
import DesktopAlert from './components/DesktopAlert';
import TokenSetup from './components/TokenSetup';
import Modal from './components/Modal';
import { useModal } from './hooks/useModal';
import { useAuth } from './hooks/useAuth';

const SETTINGS_KEY = 'githubSettings';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  const [screen, setScreen] = React.useState<'home' | 'record' | 'library' | 'settings'>('home');
  const [highlightFileId, setHighlightFileId] = React.useState<string | undefined>(undefined);
  const { modalState, showAlert, closeModal } = useModal();
  const { authenticated, isLoading, setAuthenticated } = useAuth(showAlert);
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

  // Handle navigation to library with optional highlight
  const handleNavigateToLibrary = React.useCallback((highlightId?: string) => {
    setHighlightFileId(highlightId);
    setScreen('library');
  }, []);

  // Clear highlight when navigating away from library
  React.useEffect(() => {
    if (screen !== 'library') {
      setHighlightFileId(undefined);
    }
  }, [screen]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show token setup screen if not authenticated
  if (!authenticated) {
    return <TokenSetup onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: 'linear-gradient(135deg, #e0e7ef 0%, #f7faff 100%)' }}>
      <DesktopAlert />
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto pb-20">
        {screen === 'home' && <AudioRecorder audioFormat={audioFormat} onNavigateToLibrary={handleNavigateToLibrary} />}
        {screen === 'record' && <VideoRecorder />}
        {screen === 'library' && <FileList highlightId={highlightFileId} />}
        {screen === 'settings' && <Settings audioFormat={audioFormat} setAudioFormat={setAudioFormat} onLogout={() => setAuthenticated(false)} />}
      </main>
      <BottomMenu
        active={screen}
        onNavigate={(key) => {
          if (key === 'home' || key === 'record' || key === 'library' || key === 'settings') {
            setScreen(key);
          }
        }}
      />
      
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

export default App;

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
import { useSettingsStore } from './stores/settingsStore';
import { useUIStore } from './stores/uiStore';


const App: React.FC = () => {
  // Global state management
  const { audioFormat, setAudioFormat } = useSettingsStore();
  const { currentScreen, highlightFileId, setScreen } = useUIStore();
  const { modalState, showAlert, closeModal } = useModal();
  const { authenticated, isLoading, setAuthenticated } = useAuth(showAlert);


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
        {currentScreen === 'audio' && <AudioRecorder audioFormat={audioFormat} />}
        {currentScreen === 'video' && <VideoRecorder />}
        {currentScreen === 'library' && <FileList highlightId={highlightFileId} />}
        {currentScreen === 'settings' && <Settings audioFormat={audioFormat} setAudioFormat={setAudioFormat} onLogout={() => setAuthenticated(false)} />}
      </main>
      <BottomMenu
        active={currentScreen === 'audio' ? 'home' : currentScreen === 'video' ? 'record' : currentScreen}
        onNavigate={(key) => {
          if (key === 'home') setScreen('audio');
          else if (key === 'record') setScreen('video');
          else if (key === 'library') setScreen('library');
          else if (key === 'settings') setScreen('settings');
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

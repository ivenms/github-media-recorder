import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import UploadManager from './components/UploadManager';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  const [screen, setScreen] = React.useState<'audio' | 'video' | 'files' | 'upload' | 'settings'>('audio');
  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-black">
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto">
        {screen === 'audio' && <AudioRecorder />}
        {screen === 'video' && <VideoRecorder />}
        {screen === 'files' && <FileList />}
        {screen === 'upload' && <UploadManager />}
        {screen === 'settings' && <Settings />}
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

import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import UploadManager from './components/UploadManager';
import InstallPrompt from './components/InstallPrompt';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto">
        {/* TODO: Add navigation logic and routes */}
        <AudioRecorder />
        <VideoRecorder />
        <FileList />
        <UploadManager />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex justify-around py-2">
        {/* TODO: Add bottom navigation bar */}
        <button>Audio</button>
        <button>Video</button>
        <button>Files</button>
        <button>Upload</button>
      </nav>
    </div>
  );
};

export default App;

import React from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoRecorder from './components/VideoRecorder';
import FileList from './components/FileList';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';
import BottomMenu from './components/BottomMenu';
import DesktopAlert from './components/DesktopAlert';
import TokenSetup from './components/TokenSetup';
import { isAuthenticated, checkTokenValidity, clearTokenData } from './utils/tokenAuth';

const SETTINGS_KEY = 'githubSettings';

const App: React.FC = () => {
  // State: navigation (audio, video, files, upload)
  // Mobile-first layout, bottom nav, responsive
  // Show InstallPrompt, main content, and bottom nav
  const [screen, setScreen] = React.useState<'home' | 'record' | 'library' | 'settings'>('home');
  const [authenticated, setAuthenticated] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [audioFormat, setAudioFormat] = React.useState<'mp3' | 'wav'>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return (JSON.parse(saved).audioFormat as 'mp3' | 'wav') || 'mp3';
    return 'mp3';
  });

  // Check token validity on app load
  React.useEffect(() => {
    const checkAuth = async () => {
      // First check if user has basic auth data
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with GitHub API
        const tokenResult = await checkTokenValidity();
        
        if (tokenResult.isValid) {
          setAuthenticated(true);
        } else {
          // Token is invalid or expired, clear data
          clearTokenData();
          setAuthenticated(false);
          
          if (tokenResult.isExpired) {
            alert('Your GitHub token has expired. Please enter a new token to continue.');
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Sync audioFormat to localStorage when changed
  React.useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const settings = saved ? JSON.parse(saved) : {};
    if (settings.audioFormat !== audioFormat) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, audioFormat }));
    }
  }, [audioFormat]);

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
    <div className="min-h-screen w-full flex flex-col">
      <DesktopAlert />
      <InstallPrompt />
      <main className="flex-1 overflow-y-auto pb-20">
        {screen === 'home' && <AudioRecorder audioFormat={audioFormat} />}
        {screen === 'record' && <VideoRecorder />}
        {screen === 'library' && <FileList />}
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
    </div>
  );
};

export default App;

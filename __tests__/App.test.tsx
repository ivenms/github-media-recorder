import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

// Mock all component dependencies
jest.mock('../src/components/AudioRecorder', () => {
  return function MockAudioRecorder({ audioFormat }: { audioFormat: string }) {
    return <div data-testid="audio-recorder">Audio Recorder - Format: {audioFormat}</div>;
  };
});

jest.mock('../src/components/VideoRecorder', () => {
  return function MockVideoRecorder() {
    return <div data-testid="video-recorder">Video Recorder</div>;
  };
});

jest.mock('../src/components/FileList', () => {
  return function MockFileList({ highlightId }: { highlightId?: string }) {
    return (
      <div data-testid="file-list">
        File List {highlightId && <span data-testid="highlight-id">Highlight: {highlightId}</span>}
      </div>
    );
  };
});

jest.mock('../src/components/Settings', () => {
  return function MockSettings({ 
    audioFormat, 
    setAudioFormat, 
    onLogout 
  }: { 
    audioFormat: string; 
    setAudioFormat: (format: string) => void; 
    onLogout: () => void; 
  }) {
    return (
      <div data-testid="settings">
        Settings - Format: {audioFormat}
        <button onClick={() => setAudioFormat('wav')}>Change Format</button>
        <button onClick={onLogout}>Logout</button>
      </div>
    );
  };
});

jest.mock('../src/components/InstallPrompt', () => {
  return function MockInstallPrompt() {
    return <div data-testid="install-prompt">Install Prompt</div>;
  };
});

jest.mock('../src/components/DesktopAlert', () => {
  return function MockDesktopAlert() {
    return <div data-testid="desktop-alert">Desktop Alert</div>;
  };
});

jest.mock('../src/components/TokenSetup', () => {
  return function MockTokenSetup({ onSuccess }: { onSuccess: () => void }) {
    return (
      <div data-testid="token-setup">
        Token Setup
        <button onClick={onSuccess}>Setup Success</button>
      </div>
    );
  };
});

jest.mock('../src/components/BottomMenu', () => {
  return function MockBottomMenu({ 
    active, 
    onNavigate 
  }: { 
    active: string; 
    onNavigate: (key: string) => void; 
  }) {
    return (
      <div data-testid="bottom-menu">
        Bottom Menu - Active: {active}
        <button onClick={() => onNavigate('home')}>Home</button>
        <button onClick={() => onNavigate('record')}>Record</button>
        <button onClick={() => onNavigate('library')}>Library</button>
        <button onClick={() => onNavigate('settings')}>Settings</button>
      </div>
    );
  };
});

jest.mock('../src/components/Modal', () => {
  return function MockModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type, 
    confirmText, 
    cancelText 
  }: any) {
    return isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <p>Type: {type}</p>
        <button onClick={onClose}>Close</button>
        {onConfirm && <button onClick={onConfirm}>{confirmText || 'Confirm'}</button>}
        {cancelText && <button>{cancelText}</button>}
      </div>
    ) : null;
  };
});

// Mock hooks
jest.mock('../src/hooks/useAuth');
jest.mock('../src/stores/settingsStore');
jest.mock('../src/stores/uiStore');

const { useAuth } = require('../src/hooks/useAuth');
const { useSettingsStore } = require('../src/stores/settingsStore');
const { useUIStore } = require('../src/stores/uiStore');

describe('App', () => {
  // Default mock implementations
  const defaultUseAuth = {
    authenticated: true,
    isLoading: false,
    setAuthenticated: jest.fn()
  };

  const defaultUseSettingsStore = {
    audioFormat: 'mp3',
    setAudioFormat: jest.fn()
  };

  const defaultUseUIStore = {
    currentScreen: 'audio',
    highlightFileId: null,
    setScreen: jest.fn(),
    modal: { isOpen: false },
    openModal: jest.fn(),
    closeModal: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useAuth.mockReturnValue(defaultUseAuth);
    useSettingsStore.mockReturnValue(defaultUseSettingsStore);
    useUIStore.mockReturnValue(defaultUseUIStore);
  });

  // BASIC RENDERING TESTS
  it('renders without crashing when authenticated', () => {
    render(<App />);
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-menu')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-alert')).toBeInTheDocument();
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      isLoading: true
    });

    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Check for loading spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows TokenSetup when not authenticated', () => {
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      authenticated: false
    });

    render(<App />);
    expect(screen.getByTestId('token-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('audio-recorder')).not.toBeInTheDocument();
  });

  // AUTHENTICATION FLOW TESTS
  it('handles successful token setup', () => {
    const mockSetAuthenticated = jest.fn();
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      authenticated: false,
      setAuthenticated: mockSetAuthenticated
    });

    render(<App />);
    
    fireEvent.click(screen.getByText('Setup Success'));
    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
  });

  it('passes openModal callback to useAuth', () => {
    const mockOpenModal = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      openModal: mockOpenModal
    });

    // Verify useAuth is called with the modal callback
    render(<App />);
    
    // useAuth should have been called with a callback function
    expect(useAuth).toHaveBeenCalledWith(expect.any(Function));
    
    // Test the callback by calling it
    const callback = useAuth.mock.calls[0][0];
    callback('Test message', 'Test title');
    
    expect(mockOpenModal).toHaveBeenCalledWith({
      type: 'alert',
      message: 'Test message',
      title: 'Test title'
    });
  });

  // SCREEN NAVIGATION TESTS
  it('renders audio recorder on audio screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'audio'
    });

    render(<App />);
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
    expect(screen.queryByTestId('video-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
  });

  it('renders video recorder on video screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'video'
    });

    render(<App />);
    expect(screen.getByTestId('video-recorder')).toBeInTheDocument();
    expect(screen.queryByTestId('audio-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
  });

  it('renders file list on library screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'library'
    });

    render(<App />);
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
    expect(screen.queryByTestId('audio-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
  });

  it('renders settings on settings screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'settings'
    });

    render(<App />);
    expect(screen.getByTestId('settings')).toBeInTheDocument();
    expect(screen.queryByTestId('audio-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-recorder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-list')).not.toBeInTheDocument();
  });

  it('passes highlightFileId to FileList component', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'library',
      highlightFileId: 'test-file-123'
    });

    render(<App />);
    expect(screen.getByTestId('highlight-id')).toHaveTextContent('Highlight: test-file-123');
  });

  // BOTTOM MENU NAVIGATION TESTS
  it('handles home navigation from bottom menu', () => {
    const mockSetScreen = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      setScreen: mockSetScreen
    });

    render(<App />);
    fireEvent.click(screen.getByText('Home'));
    expect(mockSetScreen).toHaveBeenCalledWith('audio');
  });

  it('handles record navigation from bottom menu', () => {
    const mockSetScreen = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      setScreen: mockSetScreen
    });

    render(<App />);
    fireEvent.click(screen.getByText('Record'));
    expect(mockSetScreen).toHaveBeenCalledWith('video');
  });

  it('handles library navigation from bottom menu', () => {
    const mockSetScreen = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      setScreen: mockSetScreen
    });

    render(<App />);
    fireEvent.click(screen.getByText('Library'));
    expect(mockSetScreen).toHaveBeenCalledWith('library');
  });

  it('handles settings navigation from bottom menu', () => {
    const mockSetScreen = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      setScreen: mockSetScreen
    });

    render(<App />);
    fireEvent.click(screen.getByText('Settings'));
    expect(mockSetScreen).toHaveBeenCalledWith('settings');
  });

  // BOTTOM MENU ACTIVE STATE TESTS
  it('sets bottom menu active state correctly for audio screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'audio'
    });

    render(<App />);
    expect(screen.getByText('Bottom Menu - Active: home')).toBeInTheDocument();
  });

  it('sets bottom menu active state correctly for video screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'video'
    });

    render(<App />);
    expect(screen.getByText('Bottom Menu - Active: record')).toBeInTheDocument();
  });

  it('sets bottom menu active state correctly for library screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'library'
    });

    render(<App />);
    expect(screen.getByText('Bottom Menu - Active: library')).toBeInTheDocument();
  });

  it('sets bottom menu active state correctly for settings screen', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'settings'
    });

    render(<App />);
    expect(screen.getByText('Bottom Menu - Active: settings')).toBeInTheDocument();
  });

  // AUDIO FORMAT TESTS
  it('passes audio format to AudioRecorder', () => {
    useSettingsStore.mockReturnValue({
      ...defaultUseSettingsStore,
      audioFormat: 'wav'
    });

    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'audio'
    });

    render(<App />);
    expect(screen.getByText('Audio Recorder - Format: wav')).toBeInTheDocument();
  });

  it('passes audio format to Settings component', () => {
    useSettingsStore.mockReturnValue({
      ...defaultUseSettingsStore,
      audioFormat: 'wav'
    });

    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'settings'
    });

    render(<App />);
    expect(screen.getByText('Settings - Format: wav')).toBeInTheDocument();
  });

  it('handles audio format change from Settings', () => {
    const mockSetAudioFormat = jest.fn();
    useSettingsStore.mockReturnValue({
      ...defaultUseSettingsStore,
      setAudioFormat: mockSetAudioFormat
    });

    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'settings'
    });

    render(<App />);
    fireEvent.click(screen.getByText('Change Format'));
    expect(mockSetAudioFormat).toHaveBeenCalledWith('wav');
  });

  // LOGOUT FUNCTIONALITY TESTS
  it('handles logout from Settings', () => {
    const mockSetAuthenticated = jest.fn();
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      setAuthenticated: mockSetAuthenticated
    });

    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'settings'
    });

    render(<App />);
    fireEvent.click(screen.getByText('Logout'));
    expect(mockSetAuthenticated).toHaveBeenCalledWith(false);
  });

  // MODAL TESTS
  it('renders modal when modal.isOpen is true', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      modal: {
        isOpen: true,
        title: 'Test Modal',
        message: 'Test message',
        type: 'alert'
      }
    });

    render(<App />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Type: alert')).toBeInTheDocument();
  });

  it('does not render modal when modal.isOpen is false', () => {
    render(<App />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('handles modal close', () => {
    const mockCloseModal = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      modal: {
        isOpen: true,
        title: 'Test Modal',
        message: 'Test message'
      },
      closeModal: mockCloseModal
    });

    render(<App />);
    fireEvent.click(screen.getByText('Close'));
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('handles modal confirm', () => {
    const mockOnConfirm = jest.fn();
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      modal: {
        isOpen: true,
        title: 'Test Modal',
        message: 'Test message',
        onConfirm: mockOnConfirm,
        confirmText: 'OK'
      }
    });

    render(<App />);
    fireEvent.click(screen.getByText('OK'));
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('passes all modal props correctly', () => {
    const mockOnConfirm = jest.fn();
    const mockCloseModal = jest.fn();
    
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      modal: {
        isOpen: true,
        title: 'Confirm Action',
        message: 'Are you sure?',
        type: 'confirm',
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm: mockOnConfirm
      },
      closeModal: mockCloseModal
    });

    render(<App />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Type: confirm')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  // LAYOUT AND STYLING TESTS
  it('applies correct layout structure', () => {
    const { container } = render(<App />);
    const appContainer = container.firstChild as HTMLElement;
    
    expect(appContainer).toHaveClass('min-h-screen', 'w-full', 'flex', 'flex-col');
    expect(appContainer).toHaveStyle('background: linear-gradient(135deg, #e0e7ef 0%, #f7faff 100%)');
  });

  it('renders main content area with correct classes', () => {
    render(<App />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveClass('flex-1', 'overflow-y-auto', 'pb-20');
  });

  // EDGE CASES AND ERROR HANDLING
  it('handles missing modal props gracefully', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      modal: {
        isOpen: true,
        message: undefined,
        type: undefined
      }
    });

    render(<App />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Type: alert')).toBeInTheDocument(); // Default fallback
  });

  it('handles undefined highlightFileId', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'library',
      highlightFileId: undefined
    });

    render(<App />);
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
    expect(screen.queryByTestId('highlight-id')).not.toBeInTheDocument();
  });

  it('handles null highlightFileId', () => {
    useUIStore.mockReturnValue({
      ...defaultUseUIStore,
      currentScreen: 'library',
      highlightFileId: null
    });

    render(<App />);
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
    expect(screen.queryByTestId('highlight-id')).not.toBeInTheDocument();
  });

  // COMPONENT INTEGRATION TESTS
  it('renders all static components regardless of screen', () => {
    render(<App />);
    expect(screen.getByTestId('desktop-alert')).toBeInTheDocument();
    expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-menu')).toBeInTheDocument();
  });

  it('maintains component order in layout', () => {
    const { container } = render(<App />);
    const elements = container.querySelectorAll('[data-testid]');
    
    // Check that DesktopAlert and InstallPrompt come before main content
    expect(elements[0]).toHaveAttribute('data-testid', 'desktop-alert');
    expect(elements[1]).toHaveAttribute('data-testid', 'install-prompt');
  });

  // STATE TRANSITIONS
  it('transitions from loading to authenticated state', async () => {
    const { rerender } = render(<App />);
    
    // Start with loading
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      isLoading: true
    });
    rerender(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Transition to authenticated
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      isLoading: false,
      authenticated: true
    });
    rerender(<App />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
  });

  it('transitions from unauthenticated to authenticated state', () => {
    const { rerender } = render(<App />);
    
    // Start unauthenticated
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      authenticated: false
    });
    rerender(<App />);
    expect(screen.getByTestId('token-setup')).toBeInTheDocument();
    
    // Transition to authenticated
    useAuth.mockReturnValue({
      ...defaultUseAuth,
      authenticated: true
    });
    rerender(<App />);
    expect(screen.queryByTestId('token-setup')).not.toBeInTheDocument();
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
  });
});
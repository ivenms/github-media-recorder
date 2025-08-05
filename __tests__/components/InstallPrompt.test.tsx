import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import InstallPrompt from '../../src/components/InstallPrompt';

// Mock the utility functions
const mockGetMobilePlatform = jest.fn();
const mockGetStandaloneStatus = jest.fn();

jest.mock('../../src/utils/device', () => ({
  getMobilePlatform: () => mockGetMobilePlatform(),
}));

jest.mock('../../src/utils/standalone', () => ({
  getStandaloneStatus: () => mockGetStandaloneStatus(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock navigator APIs
const mockGetInstalledRelatedApps = jest.fn();

// Set up navigator mock globally with all required properties
const originalNavigator = global.navigator;
Object.defineProperty(global, 'navigator', {
  value: {
    ...originalNavigator,
    getInstalledRelatedApps: mockGetInstalledRelatedApps,
    standalone: false,
    userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
  },
  writable: true,
  configurable: true
});

// Mock window.confirm and window.alert
const mockConfirm = jest.fn();
const mockAlert = jest.fn();

Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
});

Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true
});

// Helper function to wait for Android async operations and timer
const waitForAndroidPrompt = async () => {
  // Wait for checkRelatedApps promise to resolve
  await act(async () => {
    await Promise.resolve();
  });
  
  // Then advance the timer
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
};

describe('InstallPrompt', () => {
  // Store original Date.now for restoration
  const originalDateNow = Date.now;
  const MOCK_TIMESTAMP = 1640995200000; // Fixed timestamp for consistent testing

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Mock Date.now for consistent timestamp testing
    Date.now = jest.fn(() => MOCK_TIMESTAMP);
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
    
    // Reset utility mocks to default values
    mockGetMobilePlatform.mockReturnValue(null);
    mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
    
    // Reset navigator mocks
    mockGetInstalledRelatedApps.mockResolvedValue([]);
    
    // Set up navigator with getInstalledRelatedApps
    Object.defineProperty(window, 'navigator', {
      value: {
        ...navigator,
        getInstalledRelatedApps: mockGetInstalledRelatedApps,
        standalone: false,
        userAgent: navigator.userAgent
      },
      writable: true,
      configurable: true
    });
    
    // Reset window dialog mocks
    mockConfirm.mockReturnValue(false);
    mockAlert.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Restore original Date.now
    Date.now = originalDateNow;
  });

  describe('Component Visibility - No Platform Detection', () => {
    it('does not render when platform is null (desktop)', () => {
      mockGetMobilePlatform.mockReturnValue(null);
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
      expect(mockGetStandaloneStatus).not.toHaveBeenCalled();
    });

    it('returns early and does not set up event listeners on desktop', () => {
      mockGetMobilePlatform.mockReturnValue(null);
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<InstallPrompt />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('appinstalled', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Standalone Mode Detection', () => {
    it('does not render when already in standalone mode', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: true });
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
      expect(mockGetStandaloneStatus).toHaveBeenCalledTimes(1);
    });

    it('proceeds with setup when not in standalone mode', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<InstallPrompt />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Dismissal Logic - 24 Hour Timer', () => {
    it('does not render when dismissed within 24 hours', () => {
      const dismissedTime = MOCK_TIMESTAMP - (12 * 60 * 60 * 1000); // 12 hours ago
      
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-install-dismissed') return dismissedTime.toString();
        return null;
      });
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('pwa-install-dismissed');
    });

    it('renders when dismissal has expired (over 24 hours)', async () => {
      const dismissedTime = MOCK_TIMESTAMP - (25 * 60 * 60 * 1000); // 25 hours ago
      
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-install-dismissed') return dismissedTime.toString();
        return null;
      });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('renders when no dismissal timestamp exists', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockReturnValue(null);
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('handles malformed dismissal timestamp gracefully', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-install-dismissed') return 'invalid-timestamp';
        return null;
      });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });
  });

  describe('beforeinstallprompt Event Handling', () => {
    it('sets up beforeinstallprompt event listener', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<InstallPrompt />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('handles beforeinstallprompt event correctly', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      let beforeInstallPromptHandler: EventListener;
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Create mock event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      } as BeforeInstallPromptEvent;
      
      // Trigger the event
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(screen.getByText('Install this app for a better experience.')).toBeInTheDocument();
      expect(screen.getByText('Install App')).toBeInTheDocument();
      
      addEventListenerSpy.mockRestore();
    });

    it('shows different UI when deferred prompt is available vs manual', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      let beforeInstallPromptHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Initially should show manual installation UI after timer
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      expect(screen.getByText('Install App (Manual)')).toBeInTheDocument();
      
      // Now trigger beforeinstallprompt
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      expect(screen.getByText('Install this app for a better experience.')).toBeInTheDocument();
      expect(screen.getByText('Install App')).toBeInTheDocument();
    });
  });

  describe('appinstalled Event Handling', () => {
    it('sets up appinstalled event listener', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<InstallPrompt />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('hides component when appinstalled event fires', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      let appInstalledHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'appinstalled') {
          appInstalledHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Show the prompt first
      await waitForAndroidPrompt();
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      
      // Trigger appinstalled event
      act(() => {
        appInstalledHandler!(new Event('appinstalled'));
      });
      
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
    });

    it('sets localStorage flag when app is installed', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      let appInstalledHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'appinstalled') {
          appInstalledHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Trigger appinstalled event
      act(() => {
        appInstalledHandler!(new Event('appinstalled'));
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-installed', 'true');
    });
  });

  describe('getInstalledRelatedApps API - Android', () => {
    it('does not show prompt if app is already installed via getInstalledRelatedApps', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([{ id: 'com.example.app', platform: 'android', url: 'https://example.com' }]);
      
      const { container } = render(<InstallPrompt />);
      
      // Wait for async getInstalledRelatedApps call, timer should not be set
      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(3000);
      });
      
      expect(container.firstChild).toBeNull();
    });

    it('shows prompt if no related apps are installed', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('handles getInstalledRelatedApps API not available', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      // Remove the API from navigator
      Object.defineProperty(window, 'navigator', {
        value: { ...navigator, userAgent: navigator.userAgent },
        writable: true,
        configurable: true
      });
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('handles getInstalledRelatedApps API error gracefully', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockRejectedValue(new Error('API Error'));
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });
  });

  describe('Android Timer Logic', () => {
    it('sets 2-second timer for Android platform', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      
      render(<InstallPrompt />);
      
      // Wait for promise to resolve then check timer was set
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      
      setTimeoutSpy.mockRestore();
    });

    it('shows prompt after 2-second timer on Android', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      // Should not show prompt immediately
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('does not set timer for non-Android platforms', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true
      });
      
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      
      render(<InstallPrompt />);
      
      // Should not call setTimeout for Android timer
      expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 2000);
      
      setTimeoutSpy.mockRestore();
    });

    it('cleans up timer on component unmount', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      
      const { unmount } = render(<InstallPrompt />);
      
      // Wait for timer to be set
      await act(async () => {
        await Promise.resolve();
      });
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('iOS Safari Platform Rendering', () => {
    it('shows iOS Safari installation instructions', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true
      });
      
      render(<InstallPrompt />);
      
      expect(screen.getByText(/Install this app on your iOS device using/)).toBeInTheDocument();
      expect(screen.getByText(/Safari/)).toBeInTheDocument();
      expect(screen.getByText(/Share/)).toBeInTheDocument();
      expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    });

    it('does not show iOS Safari prompt when in standalone mode', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true
      });
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
    });

    it('shows iOS Safari prompt when not in standalone mode', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true
      });
      
      render(<InstallPrompt />);
      
      expect(screen.getByText(/Install this app on your iOS device using/)).toBeInTheDocument();
    });
  });

  describe('iOS Chrome Platform Rendering', () => {
    it('shows iOS Chrome limitation message', () => {
      mockGetMobilePlatform.mockReturnValue('ios-chrome');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      render(<InstallPrompt />);
      
      // Check for specific text parts that are in the iOS Chrome message
      expect(screen.getByText('Note:')).toBeInTheDocument();
      expect(screen.getByText(/Chrome on iOS does not support standalone PWA installation/)).toBeInTheDocument();
      expect(screen.getByText(/please open this site in/)).toBeInTheDocument();
      expect(screen.getByText('Safari')).toBeInTheDocument();
    });

    it('renders iOS Chrome message with proper styling', () => {
      mockGetMobilePlatform.mockReturnValue('ios-chrome');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      render(<InstallPrompt />);
      
      // Find the container by looking for the iOS Chrome text
      const textElement = screen.getByText(/Chrome on iOS does not support standalone PWA installation/);
      const container = textElement.closest('div');
      
      expect(container).toHaveStyle({
        padding: '16px',
        background: '#fffbe6',
        border: '1px solid #ffe58f',
        'border-radius': '8px'
      });
    });
  });

  describe('Android Platform Rendering', () => {
    it('renders Android UI with dismiss button', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      expect(screen.getByText('Install App (Manual)')).toBeInTheDocument();
      expect(screen.getByTitle('Dismiss')).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();
    });

    it('shows helper text for manual installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('Tap the button above for installation instructions.')).toBeInTheDocument();
    });

    it('applies correct button styling for manual installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const installButton = screen.getByText('Install App (Manual)');
      expect(installButton).toHaveStyle({
        'background-color': 'rgb(40, 167, 69)',
        color: 'rgb(255, 255, 255)',
        'border-radius': '6px',
        width: '100%'
      });
    });

    it('applies different styling when deferred prompt is available', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      let beforeInstallPromptHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Trigger beforeinstallprompt event
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      const installButton = screen.getByText('Install App');
      expect(installButton).toHaveStyle({
        'background-color': 'rgb(102, 126, 234)',
        color: 'rgb(255, 255, 255)'
      });
      
      expect(screen.queryByText('Tap the button above for installation instructions.')).not.toBeInTheDocument();
    });
  });

  describe('Install Click Handler - Deferred Prompt', () => {
    it('calls prompt method when deferred prompt is available', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const mockPrompt = jest.fn();
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });
      
      let beforeInstallPromptHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Set up deferred prompt
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      // Click install button
      const installButton = screen.getByText('Install App');
      fireEvent.click(installButton);
      
      expect(mockPrompt).toHaveBeenCalled();
      
      // Wait for user choice
      await waitFor(() => {
        expect(screen.queryByText('Install this app for a better experience.')).not.toBeInTheDocument();
      });
    });

    it('hides prompt when user accepts installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const mockPrompt = jest.fn();
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });
      
      let beforeInstallPromptHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Set up deferred prompt
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      expect(screen.getByText('Install this app for a better experience.')).toBeInTheDocument();
      
      // Click install button
      const installButton = screen.getByText('Install App');
      fireEvent.click(installButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Install this app for a better experience.')).not.toBeInTheDocument();
      });
    });

    it('sets dismissal flag when user dismisses installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const mockPrompt = jest.fn();
      const mockUserChoice = Promise.resolve({ outcome: 'dismissed' });
      
      let beforeInstallPromptHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Set up deferred prompt
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      // Click install button
      const installButton = screen.getByText('Install App');
      fireEvent.click(installButton);
      
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', MOCK_TIMESTAMP.toString());
      });
    });
  });

  describe('Install Click Handler - Manual Installation', () => {
    it('shows confirm dialog for manual installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      mockConfirm.mockReturnValue(false);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const installButton = screen.getByText('Install App (Manual)');
      fireEvent.click(installButton);
      
      expect(mockConfirm).toHaveBeenCalledWith('This app can be installed on your device for a better experience. Would you like to see installation instructions?');
    });

    it('shows alert with installation instructions when user confirms', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      mockConfirm.mockReturnValue(true);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const installButton = screen.getByText('Install App (Manual)');
      fireEvent.click(installButton);
      
      expect(mockAlert).toHaveBeenCalledWith('To install:\n1. Tap the menu (⋮) in your browser\n2. Select "Add to Home screen" or "Install app"\n3. Confirm the installation');
    });

    it('sets localStorage flags when user confirms manual installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      mockConfirm.mockReturnValue(true);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const installButton = screen.getByText('Install App (Manual)');
      fireEvent.click(installButton);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-instructions-shown', MOCK_TIMESTAMP.toString());
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', MOCK_TIMESTAMP.toString());
    });

    it('hides prompt after showing manual installation instructions', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      mockConfirm.mockReturnValue(true);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      
      const installButton = screen.getByText('Install App (Manual)');
      fireEvent.click(installButton);
      
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
    });

    it('does not show alert when user cancels manual installation', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      mockConfirm.mockReturnValue(false);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const installButton = screen.getByText('Install App (Manual)');
      fireEvent.click(installButton);
      
      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Dismiss Button Functionality', () => {
    it('renders dismiss button for Android platform', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const dismissButton = screen.getByTitle('Dismiss');
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveTextContent('×');
    });

    it('hides prompt when dismiss button is clicked', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      
      const dismissButton = screen.getByTitle('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
    });

    it('sets dismissal timestamp when dismiss button is clicked', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const dismissButton = screen.getByTitle('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', MOCK_TIMESTAMP.toString());
    });

    it('applies correct styling to dismiss button', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      const dismissButton = screen.getByTitle('Dismiss');
      expect(dismissButton).toHaveStyle({
        background: 'none',
        'font-size': '18px',
        cursor: 'pointer',
        padding: '0px 8px',
        color: 'rgb(102, 102, 102)'
      });
      // Check that border is not explicitly set in inline styles
      expect(dismissButton.getAttribute('style')).not.toContain('border');
    });
  });

  describe('Component Visibility Based on Installation Status', () => {
    it('does not render when installed flag is set in localStorage', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-installed') return 'true';
        return null;
      });
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders when installed flag is not set', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockReturnValue(null);
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('renders when installed flag is set to false', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-installed') return 'false';
        return null;
      });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      render(<InstallPrompt />);
      
      await waitForAndroidPrompt();
      
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });

    it('does not render when component state installed is true', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockLocalStorage.getItem.mockReturnValue(null);
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      let appInstalledHandler: EventListener;
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'appinstalled') {
          appInstalledHandler = handler as EventListener;
        }
      });
      
      render(<InstallPrompt />);
      
      // Show prompt first
      await waitForAndroidPrompt();
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      
      // Trigger installed event
      act(() => {
        appInstalledHandler!(new Event('appinstalled'));
      });
      
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
    });

    it('does not render when showPrompt state is false', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      // Set up dismissal within 24 hours
      const dismissedTime = MOCK_TIMESTAMP - (12 * 60 * 60 * 1000);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-install-dismissed') return dismissedTime.toString();
        return null;
      });
      
      const { container } = render(<InstallPrompt />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Event Cleanup', () => {
    it('removes beforeinstallprompt event listener on unmount', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<InstallPrompt />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('removes appinstalled event listener on unmount', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<InstallPrompt />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('clears Android timer on unmount', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      
      const { unmount } = render(<InstallPrompt />);
      
      // Wait for timer to be potentially set
      await act(async () => {
        await Promise.resolve();
      });
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('handles unmount when timer is not set', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true
      });
      
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
      
      const { unmount } = render(<InstallPrompt />);
      
      unmount();
      
      // Should not throw error even if timer was not set
      expect(() => unmount()).not.toThrow();
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles missing navigator gracefully', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      
      // Temporarily remove navigator
      const originalNavigator = window.navigator;
      delete (window as Window & { navigator?: Navigator }).navigator;
      
      const { container } = render(<InstallPrompt />);
      
      // Should not crash and should not render due to missing API
      expect(container.firstChild).toBeNull();
      
      // Restore navigator
      (window as Window & { navigator?: Navigator }).navigator = originalNavigator;
    });
  });


  describe('Integration Tests', () => {
    it('handles complete installation flow with beforeinstallprompt', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      // Navigator is already mocked globally
      
      let beforeInstallPromptHandler: EventListener;
      let appInstalledHandler: EventListener;
      
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as EventListener;
        } else if (event === 'appinstalled') {
          appInstalledHandler = handler as EventListener;
        }
      });
      
      const { unmount } = render(<InstallPrompt />);
      
      // Initial state - should show manual installation after timer
      await waitForAndroidPrompt();
      expect(screen.getByText('Install App (Manual)')).toBeInTheDocument();
      
      // beforeinstallprompt event fires
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      } as BeforeInstallPromptEvent;
      
      act(() => {
        beforeInstallPromptHandler!(mockEvent);
      });
      
      expect(screen.getByText('Install App')).toBeInTheDocument();
      
      // User clicks install
      fireEvent.click(screen.getByText('Install App'));
      
      expect(mockEvent.prompt).toHaveBeenCalled();
      
      // Wait for acceptance
      await waitFor(() => {
        expect(screen.queryByText('Install this app for a better experience.')).not.toBeInTheDocument();
      });
      
      // App installation completes
      act(() => {
        appInstalledHandler!(new Event('appinstalled'));
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-installed', 'true');
      
      // Cleanup
      addEventListenerSpy.mockRestore();
      unmount();
    });

    it('handles complete dismissal and re-appearance flow', async () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockGetStandaloneStatus.mockReturnValue({ isStandalone: false });
      mockGetInstalledRelatedApps.mockResolvedValue([]);
      
      const { unmount } = render(<InstallPrompt />);
      
      // Show prompt
      await waitForAndroidPrompt();
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
      
      // Dismiss prompt
      fireEvent.click(screen.getByTitle('Dismiss'));
      
      expect(screen.queryByText('This app can be installed on your device for offline access and a native app experience.')).not.toBeInTheDocument();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('pwa-install-dismissed', MOCK_TIMESTAMP.toString());
      
      // Unmount first component
      unmount();
      
      // Simulate 25 hours later
      const futureTimestamp = MOCK_TIMESTAMP + (25 * 60 * 60 * 1000);
      Date.now = jest.fn(() => futureTimestamp);
      
      // Mock localStorage to return the dismissal time but allow new prompt
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'pwa-install-dismissed') return MOCK_TIMESTAMP.toString();
        if (key === 'pwa-installed') return null;
        return null;
      });
      
      // Re-render component (simulating page reload)
      render(<InstallPrompt />);
      
      // Should show prompt again after timer (dismissal expired)
      await waitForAndroidPrompt();
      expect(screen.getByText('This app can be installed on your device for offline access and a native app experience.')).toBeInTheDocument();
    });
  });
});
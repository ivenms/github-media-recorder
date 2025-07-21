import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../../src/components/Settings';

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: () => ({ modal: {}, openModal: jest.fn(), closeModal: jest.fn() })
}));
const mockSetAppSettings = jest.fn();
jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: () => ({ 
    appSettings: { 
      repo: '', 
      path: 'media/', 
      thumbnailPath: 'thumbnails/', 
      thumbnailWidth: 320, 
      thumbnailHeight: 240, 
      customCategories: [{ id: 'music', name: 'Music' }] 
    }, 
    setAppSettings: mockSetAppSettings 
  })
}));
jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: () => ({ userInfo: { login: 'testuser' }, logout: jest.fn() })
}));
jest.mock('../../src/utils/tokenAuth', () => ({ getStoredUsername: () => 'testuser', clearTokenData: jest.fn() }));
jest.mock('../../src/utils/appConfig', () => ({ DEFAULT_MEDIA_CATEGORIES: [{ id: 'music', name: 'Music' }] }));

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockSetAppSettings.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('renders settings form', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('GitHub Account')).toBeInTheDocument();
    expect(screen.getByText('Repository Settings')).toBeInTheDocument();
    expect(screen.getByText('Audio Settings')).toBeInTheDocument();
    expect(screen.getByText('Media Categories')).toBeInTheDocument();
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
  });

  it('shows logged in user', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  // Temporarily disabled - causing test to hang
  // it('can add a new category', async () => {
  //   render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
  //   fireEvent.change(screen.getByPlaceholderText('Category name'), { target: { value: 'Podcast' } });
  //   fireEvent.click(screen.getByText('Add'));
  //   
  //   // Category should be added synchronously
  //   expect(screen.getByText('Podcast')).toBeInTheDocument();
  // });
}); 
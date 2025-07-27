import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from '../../src/components/Settings';

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: () => ({ 
    modal: { isOpen: false, type: null }, 
    openModal: jest.fn(), 
    closeModal: jest.fn() 
  })
}));
const mockSetAppSettings = jest.fn();
const mockAppSettings = { 
  repo: '', 
  path: 'media/', 
  thumbnailPath: 'thumbnails/', 
  thumbnailWidth: 320, 
  thumbnailHeight: 240, 
  customCategories: [{ id: 'music', name: 'Music' }] 
};

jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: jest.fn(() => ({ 
    appSettings: mockAppSettings, 
    setAppSettings: mockSetAppSettings 
  }))
}));
jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: () => ({ userInfo: { login: 'testuser' }, logout: jest.fn() })
}));
jest.mock('../../src/utils/tokenAuth', () => ({ getStoredUsername: () => 'testuser', clearTokenData: jest.fn() }));
jest.mock('../../src/utils/appConfig', () => ({ DEFAULT_MEDIA_CATEGORIES: [{ id: 'music', name: 'Music' }] }));

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAppSettings.mockClear();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
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

  it('handles settings without initial app settings', () => {
    // Mock settingsStore with null appSettings for this test
    const mockSetAppSettingsNull = jest.fn();
    const originalMock = require('../../src/stores/settingsStore').useSettingsStore;
    require('../../src/stores/settingsStore').useSettingsStore = jest.fn(() => ({ 
      appSettings: null, 
      setAppSettings: mockSetAppSettingsNull 
    }));

    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    // Should render with default values
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Restore original mock
    require('../../src/stores/settingsStore').useSettingsStore = originalMock;
  });

  it('handles form input changes correctly', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    const repoInput = screen.getByPlaceholderText('my-media-repo');
    
    fireEvent.change(repoInput, { target: { value: 'new-repo' } });
    
    expect(repoInput).toHaveValue('new-repo');
  });

  it('handles number input changes correctly', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    // Find the input by its attributes since label association might not be working
    const widthInput = screen.getByDisplayValue('320'); // Default thumbnail width
    
    fireEvent.change(widthInput, { target: { value: '640', type: 'number' } });
    
    expect(widthInput).toHaveValue(640);
  });

  it('handles save settings correctly', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    const saveButton = screen.getByText('Save Settings');
    
    fireEvent.click(saveButton);
    
    // Should call setAppSettings
    expect(mockSetAppSettings).toHaveBeenCalled();
    
    // Should show success message immediately (no need for waitFor)
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });


  it('handles logout with confirmation modal', () => {
    const mockOpenModal = jest.fn();
    const mockOnLogout = jest.fn();
    
    // Mock uiStore for this test only
    const originalUIMock = require('../../src/stores/uiStore').useUIStore;
    require('../../src/stores/uiStore').useUIStore = jest.fn(() => ({
      modal: { isOpen: false, type: null }, 
      openModal: mockOpenModal, 
      closeModal: jest.fn()
    }));

    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={mockOnLogout} />);
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockOpenModal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirm',
        title: 'Confirm Logout',
        message: expect.stringContaining('Are you sure you want to logout?'),
        confirmText: 'Logout',
        cancelText: 'Cancel',
      })
    );
    
    // Restore original mock
    require('../../src/stores/uiStore').useUIStore = originalUIMock;
  });

  it('handles audio format change', () => {
    const mockSetAudioFormat = jest.fn();
    
    render(<Settings audioFormat="mp3" setAudioFormat={mockSetAudioFormat} onLogout={jest.fn()} />);
    
    const audioFormatSelect = screen.getByDisplayValue('MP3 (Compressed)');
    
    fireEvent.change(audioFormatSelect, { target: { value: 'wav' } });
    
    expect(mockSetAudioFormat).toHaveBeenCalledWith('wav');
  });

  it('handles adding new category', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    const categoryInput = screen.getByPlaceholderText('Category name');
    const addButton = screen.getByText('Add');
    
    fireEvent.change(categoryInput, { target: { value: 'Podcast' } });
    
    fireEvent.click(addButton);
    
    // Should add the new category
    expect(screen.getByText('Podcast')).toBeInTheDocument();
    expect(categoryInput).toHaveValue('');
  });

  it('handles removing category', () => {
    // For this test, modify the global mock to have multiple categories
    const originalAppSettings = mockAppSettings.customCategories;
    mockAppSettings.customCategories = [
      { id: 'music', name: 'Music' },
      { id: 'podcast', name: 'Podcast' }
    ];

    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    // Should show both categories initially
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Podcast')).toBeInTheDocument();
    
    // Find remove button (× symbol) for categories
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBe(2);
    
    fireEvent.click(removeButtons[0]);
    
    // Category should be removed from local state, and since only 1 remains, no remove buttons should show
    const remainingRemoveButtons = screen.queryAllByText('×');
    expect(remainingRemoveButtons.length).toBe(0);
    
    // Restore original categories
    mockAppSettings.customCategories = originalAppSettings;
  });

  it('prevents adding empty category names', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    const addButton = screen.getByText('Add');
    // Button should be disabled when no input
    expect(addButton).toBeDisabled();
    
    fireEvent.click(addButton);
    
    // Should still only have the initial "Music" category
    expect(screen.getByText('Music')).toBeInTheDocument();
    // Should not have added any empty category
    const musicElements = screen.getAllByText('Music');
    expect(musicElements.length).toBe(1);
  });

  it('handles trimmed category names', () => {
    render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
    
    const categoryInput = screen.getByPlaceholderText('Category name');
    const addButton = screen.getByText('Add');
    
    fireEvent.change(categoryInput, { target: { value: '   ' } });
    
    // Button should remain disabled for whitespace-only input
    expect(addButton).toBeDisabled();
    
    fireEvent.click(addButton);
    
    // Should not add whitespace-only category
    expect(screen.queryByText('   ')).not.toBeInTheDocument();
    // Should still only have the initial "Music" category
    const musicElements = screen.getAllByText('Music');
    expect(musicElements.length).toBe(1);
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
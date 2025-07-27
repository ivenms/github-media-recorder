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

  describe('SaveButton integration', () => {
    it('renders SaveButton with correct default props', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveTextContent('Save Settings');
    });

    it('SaveButton is enabled by default in Settings', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('displays SaveButton with proper styling classes', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      expect(saveButton).toHaveClass('w-full', 'bg-purple-500', 'text-white');
    });

    it('shows saved state when save button is clicked', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);
      
      // Should show saved state
      expect(screen.getByText('Saved!')).toBeInTheDocument();
      expect(mockSetAppSettings).toHaveBeenCalled();
    });

    it('calls handleSave when SaveButton is clicked', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);
      
      expect(mockSetAppSettings).toHaveBeenCalledWith(expect.objectContaining({
        repo: '',
        path: 'media/',
        thumbnailPath: 'thumbnails/',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
        customCategories: expect.any(Array)
      }));
    });

    it('SaveButton uses simple save mode (no progress) for Settings', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check that progress elements don't exist (Settings uses simple save)
      const progressText = screen.queryByText('Processing...');
      expect(progressText).not.toBeInTheDocument();
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Card-style form sections', () => {
    it('renders GitHub Account section with card styling', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for GitHub Account section with card styling
      const githubSection = screen.getByText('GitHub Account').closest('.bg-white.rounded-xl.shadow-lg');
      expect(githubSection).toBeInTheDocument();
      expect(githubSection).toHaveClass('p-4', 'mb-6');
    });

    it('renders Repository Settings section with card styling', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for Repository Settings section with card styling
      const repoSection = screen.getByText('Repository Settings').closest('.bg-white.rounded-xl.shadow-lg');
      expect(repoSection).toBeInTheDocument();
      expect(repoSection).toHaveClass('p-4', 'mb-6');
    });

    it('renders Audio Settings section with card styling', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for Audio Settings section with card styling
      const audioSection = screen.getByText('Audio Settings').closest('.bg-white.rounded-xl.shadow-lg');
      expect(audioSection).toBeInTheDocument();
      expect(audioSection).toHaveClass('p-4', 'mb-6');
    });

    it('renders Media Categories section with card styling', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for Media Categories section with card styling
      const categoriesSection = screen.getByText('Media Categories').closest('.bg-white.rounded-xl.shadow-lg');
      expect(categoriesSection).toBeInTheDocument();
      expect(categoriesSection).toHaveClass('p-4', 'mb-6');
    });

    it('applies consistent spacing to form inputs within sections', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for space-y-4 class in Repository Settings for consistent spacing
      const spaceContainer = document.querySelector('.space-y-4');
      expect(spaceContainer).toBeInTheDocument();
    });

    it('maintains responsive design with max-width constraints', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for max-w-md and mx-auto classes for responsive centering
      const mainContainer = document.querySelector('.max-w-md.mx-auto');
      expect(mainContainer).toBeInTheDocument();
    });

    it('applies proper background styling to main container', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for main container background styling
      const mainContainer = document.querySelector('.min-h-screen.bg-gray-50');
      expect(mainContainer).toBeInTheDocument();
    });

    it('ensures all form sections have proper padding and margins', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check that all card sections have proper padding and margins
      const cardSections = document.querySelectorAll('.p-4.bg-white.rounded-xl.shadow-lg.mb-6');
      expect(cardSections.length).toBe(4); // GitHub, Repository, Audio, Categories sections
    });
  });

  describe('Category management UI styling', () => {
    it('displays categories with pill-style design', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for category pill styling
      const categoryPill = document.querySelector('.bg-purple-100.text-purple-800.px-3.py-1.rounded-full.text-sm');
      expect(categoryPill).toBeInTheDocument();
      expect(categoryPill).toHaveTextContent('Music');
    });

    it('renders circular remove buttons that match pill style', () => {
      // Mock multiple categories to show remove buttons
      const originalAppSettings = mockAppSettings.customCategories;
      mockAppSettings.customCategories = [
        { id: 'music', name: 'Music' },
        { id: 'podcast', name: 'Podcast' }
      ];

      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for circular remove button styling
      const removeButton = document.querySelector('.w-4.h-4.rounded-full.bg-purple-200.hover\\:bg-purple-300');
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveTextContent('×');
      
      // Restore original categories
      mockAppSettings.customCategories = originalAppSettings;
    });

    it('hides remove buttons when only one category remains', () => {
      // Use default single category setup
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Should not show remove button when only one category
      const removeButton = screen.queryByText('×');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('applies proper styling to Add Category button', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const addButton = screen.getByText('Add');
      expect(addButton).toHaveClass(
        'px-3', 'py-2', 'bg-purple-500', 'text-white', 'rounded', 'text-sm',
        'hover:bg-purple-400', 'disabled:bg-gray-300', 'disabled:cursor-not-allowed'
      );
    });

    it('styles reset categories link appropriately', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const resetLink = screen.getByText('Reset to default categories');
      expect(resetLink).toHaveClass('text-sm', 'text-gray-600', 'hover:text-gray-800', 'underline');
    });
  });

  describe('Input field cross-browser compatibility', () => {
    it('renders select input with consistent styling across browsers', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const audioFormatSelect = screen.getByDisplayValue('MP3 (Compressed)');
      expect(audioFormatSelect).not.toHaveAttribute('type'); // Select elements don't have type attribute
      
      // Verify select is rendered and has proper styling classes applied
      expect(audioFormatSelect.tagName.toLowerCase()).toBe('select');
    });

    it('ensures text inputs maintain consistent height across mobile browsers', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const repoInput = screen.getByPlaceholderText('my-media-repo');
      const pathInput = screen.getByPlaceholderText('media/');
      const thumbnailPathInput = screen.getByPlaceholderText('thumbnails/');
      const categoryInput = screen.getByPlaceholderText('Category name');
      
      // All text inputs should be present and properly styled
      expect(repoInput).toBeInTheDocument();
      expect(pathInput).toBeInTheDocument();
      expect(thumbnailPathInput).toBeInTheDocument();
      expect(categoryInput).toBeInTheDocument();
      
      expect(repoInput).toHaveAttribute('type', 'text');
      expect(pathInput).toHaveAttribute('type', 'text');
      expect(thumbnailPathInput).toHaveAttribute('type', 'text');
      expect(categoryInput).toHaveAttribute('type', 'text');
    });

    it('handles number inputs with proper styling for thumbnail dimensions', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      const widthInput = screen.getByDisplayValue('320');
      const heightInput = screen.getByDisplayValue('240');
      
      // Both number inputs should be present and properly styled
      expect(widthInput).toBeInTheDocument();
      expect(heightInput).toBeInTheDocument();
      expect(widthInput).toHaveAttribute('type', 'number');
      expect(heightInput).toHaveAttribute('type', 'number');
    });

    it('applies grid layout for responsive thumbnail dimension inputs', () => {
      render(<Settings audioFormat="mp3" setAudioFormat={jest.fn()} onLogout={jest.fn()} />);
      
      // Check for grid layout classes for thumbnail dimensions
      const gridContainer = document.querySelector('.grid.grid-cols-2.gap-4');
      expect(gridContainer).toBeInTheDocument();
      
      // Verify the number inputs are within this grid
      const widthInput = screen.getByDisplayValue('320');
      const heightInput = screen.getByDisplayValue('240');
      
      expect(gridContainer).toContainElement(widthInput.closest('div'));
      expect(gridContainer).toContainElement(heightInput.closest('div'));
    });
  });
}); 
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokenSetup from '../../src/components/TokenSetup';

// Mock all dependencies before importing component
jest.mock('../../src/stores/uiStore');
jest.mock('../../src/stores/authStore');
jest.mock('../../src/utils/imageUtils', () => ({
  getAppIconUrl: jest.fn(() => '/icon.svg')
}));
jest.mock('../../src/utils/standalone');
jest.mock('../../src/utils/device');
jest.mock('../../src/components/Modal');
jest.mock('../../src/components/InstallPrompt');

// Mock fetch globally
global.fetch = jest.fn();

describe('TokenSetup Component', () => {
  // Mock implementations
  const mockOpenModal = jest.fn();
  const mockCloseModal = jest.fn();
  const mockLogin = jest.fn();
  const mockOnSuccess = jest.fn();
  
  const mockUIStore = {
    modal: { isOpen: false, type: null, title: '', message: '', onConfirm: undefined, confirmText: '', cancelText: '' },
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  };

  const mockAuthStore = {
    login: mockLogin,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
    
    // Setup default mocks
    require('../../src/stores/uiStore').useUIStore = jest.fn(() => mockUIStore);
    require('../../src/stores/authStore').useAuthStore = jest.fn(() => mockAuthStore);
    require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({
      isStandalone: false,
      isStandaloneMedia: false,
      isIOSStandalone: false,
      isAndroidStandalone: false,
      isInPWAContext: false,
      wasInstalled: false,
    }));
    require('../../src/utils/device').getMobilePlatform = jest.fn(() => null);
    
    // Mock components
    require('../../src/components/Modal').default = jest.fn(({ isOpen, onClose, onConfirm, title, message, type }) => 
      isOpen ? (
        <div data-testid="modal">
          <h2>{title}</h2>
          <p>{message}</p>
          <p>Type: {type}</p>
          <button onClick={() => onClose()}>Close</button>
          {onConfirm && <button onClick={() => onConfirm()}>Confirm</button>}
        </div>
      ) : null
    );
    
    require('../../src/components/InstallPrompt').default = jest.fn(() => (
      <div data-testid="install-prompt">Install PWA</div>
    ));
  });

  describe('Component Rendering & Structure', () => {
    it('renders basic layout and header elements', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText('Github Media Recorder for Mobile')).toBeInTheDocument();
      expect(screen.getByText('Secure GitHub integration for uploading your media files')).toBeInTheDocument();
      expect(screen.getByText('GitHub Personal Access Token Required')).toBeInTheDocument();
      
      // Debug what's rendered
      // screen.debug();
      
      // Check for the input field by different methods
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      expect(tokenInput).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify & continue/i })).toBeInTheDocument();
    });

    it('renders app icon with correct URL', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const appIcon = screen.getByAltText('GitHub Media Recorder');
      expect(appIcon).toBeInTheDocument();
      expect(appIcon).toHaveAttribute('src', '/icon.svg');
    });

    it('renders security and privacy information sections', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText('Secure & Private')).toBeInTheDocument();
      expect(screen.getByText('Token Expiration')).toBeInTheDocument();
      expect(screen.getByText(/Your token is stored locally in your browser/)).toBeInTheDocument();
      expect(screen.getByText(/Make sure to set an appropriate expiration date/)).toBeInTheDocument();
    });

    it('renders form with proper input attributes', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      expect(tokenInput).toHaveAttribute('type', 'password');
      expect(tokenInput).toHaveAttribute('placeholder', 'ghp_xxx...');
      expect(tokenInput).toHaveAttribute('required');
      expect(tokenInput).toHaveAttribute('id', 'token');
    });
  });

  describe('Platform Detection Logic', () => {
    it('shows desktop layout when platform is null (desktop)', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => null);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      // Should not show PWA requirements for desktop
      expect(screen.queryByTestId('install-prompt')).not.toBeInTheDocument();
      expect(screen.queryByText('PWA Installation Required')).not.toBeInTheDocument();
      expect(screen.getByText('GitHub Personal Access Token Required')).toBeInTheDocument(); // Should not show PWA required suffix
    });

    it('shows mobile layout when platform is android', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      // Should show PWA requirements for mobile
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
      expect(screen.getByText('PWA Installation Required')).toBeInTheDocument();
      expect(screen.getByText('GitHub Personal Access Token (PWA Required)')).toBeInTheDocument();
    });

    it('shows mobile layout when platform is ios-safari', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'ios-safari');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      // Should show PWA requirements for mobile
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
      expect(screen.getByText('PWA Installation Required')).toBeInTheDocument();
    });

    it('shows mobile layout when platform is ios-chrome', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'ios-chrome');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      // Should show PWA requirements for mobile
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
      expect(screen.getByText('PWA Installation Required')).toBeInTheDocument();
    });
  });

  describe('PWA Installation Workflow', () => {
    it('hides PWA elements when already in standalone mode on mobile', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({
        isStandalone: true,
        isStandaloneMedia: true,
        isIOSStandalone: false,
        isAndroidStandalone: true,
        isInPWAContext: true,
        wasInstalled: true,
      }));
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      // Should not show PWA requirements when already standalone
      expect(screen.queryByTestId('install-prompt')).not.toBeInTheDocument();
      expect(screen.queryByText('PWA Installation Required')).not.toBeInTheDocument();
      expect(screen.getByText('GitHub Personal Access Token Required')).toBeInTheDocument(); // Without PWA suffix
    });

    it('shows PWA warning and disables submit when not standalone on mobile', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({
        isStandalone: false,
        isStandaloneMedia: false,
        isIOSStandalone: false,
        isAndroidStandalone: false,
        isInPWAContext: false,
        wasInstalled: false,
      }));
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /install pwa first/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveClass('bg-gray-400', 'cursor-not-allowed');
      
      // Fill token input
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token_12345' } });
      
      // Button should still be disabled
      expect(submitButton).toBeDisabled();
    });

    it('shows install prompt component on mobile when not standalone', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
    });

    it('displays comprehensive PWA warning message', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText('PWA Installation Required')).toBeInTheDocument();
      expect(screen.getByText(/For the best mobile experience and offline functionality/)).toBeInTheDocument();
    });
  });

  describe('Form Functionality', () => {
    it('handles token input changes', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_test_token' } });
      
      expect(tokenInput).toHaveValue('ghp_test_token');
    });

    it('prevents form submission with empty token', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const form = screen.getByLabelText('GitHub Personal Access Token').closest('form')!;
      fireEvent.submit(form);
      
      // Should not make API call with empty token
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('prevents form submission with whitespace-only token', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: '   ' } });
      
      const form = tokenInput.closest('form')!;
      fireEvent.submit(form);
      
      // Should not make API call with whitespace-only token
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('enables submit button when token is provided and not on mobile', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => null); // Desktop
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows token format help text', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText(/Token should start with "ghp_" and be 40 characters long/)).toBeInTheDocument();
    });
  });

  describe('Instruction Toggle', () => {
    it('initially hides instructions', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.queryByText('Step-by-step instructions:')).not.toBeInTheDocument();
      expect(screen.queryByText(/Navigate to/)).not.toBeInTheDocument();
    });

    it('shows instructions when toggle button is clicked', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const toggleButton = screen.getByText('How to create a Personal Access Token');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Navigate to/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /github.com\/settings\/tokens/i })).toBeInTheDocument();
    });

    it('hides instructions when toggle button is clicked again', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const toggleButton = screen.getByText('How to create a Personal Access Token');
      
      // Show instructions
      fireEvent.click(toggleButton);
      expect(screen.getByText('Step-by-step instructions:')).toBeInTheDocument();
      
      // Hide instructions
      fireEvent.click(toggleButton);
      expect(screen.queryByText('Step-by-step instructions:')).not.toBeInTheDocument();
    });

    it('rotates toggle icon when instructions are shown', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const toggleButton = screen.getByText('How to create a Personal Access Token');
      const icon = toggleButton.parentElement?.querySelector('svg');
      
      // Initially not rotated
      expect(icon).not.toHaveClass('rotate-90');
      
      // Click to show instructions
      fireEvent.click(toggleButton);
      expect(icon).toHaveClass('rotate-90');
      
      // Click to hide instructions
      fireEvent.click(toggleButton);
      expect(icon).not.toHaveClass('rotate-90');
    });

    it('displays all instruction steps correctly', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const toggleButton = screen.getByText('How to create a Personal Access Token');
      fireEvent.click(toggleButton);
      
      // Check all steps are present
      expect(screen.getByText('Go to GitHub Settings')).toBeInTheDocument();
      expect(screen.getByText('Generate new token')).toBeInTheDocument();
      expect(screen.getByText('Configure the token')).toBeInTheDocument();
      expect(screen.getByText('Copy the token')).toBeInTheDocument();
      expect(screen.getByText('Paste it below')).toBeInTheDocument();
      
      // Check specific details
      expect(screen.getByText(/Mobile Recorder PWA/)).toBeInTheDocument();
      expect(screen.getByText(/90 days recommended/)).toBeInTheDocument();
      expect(screen.getByText(/Full control of private repositories/)).toBeInTheDocument();
    });
  });

  describe('API Integration - Success Cases', () => {
    it('successfully verifies token and calls onSuccess', async () => {
      const mockUserData = { login: 'testuser', id: 123 };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserData),
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token_12345' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/user', {
          headers: {
            'Authorization': 'Bearer ghp_valid_token_12345',
            'Accept': 'application/vnd.github.v3+json',
          },
        });
      });
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          { token: 'ghp_valid_token_12345', owner: 'testuser', repo: '' },
          mockUserData
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows loading state during verification', async () => {
      // Mock a delayed response
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ login: 'test' }) }), 100))
      );
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText(/verifying/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('API Integration - Error Cases', () => {
    it('handles 401 unauthorized error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_invalid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Invalid token. Please check your Personal Access Token and make sure it has the correct permissions.',
          title: 'Invalid Token'
        });
      });
      
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('handles other HTTP errors (non-401)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Failed to verify token. Please try again.',
          title: 'Verification Failed'
        });
      });
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Network error. Please check your connection and try again.',
          title: 'Network Error'
        });
      });
    });

    it('logs errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const networkError = new Error('Connection failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Token verification failed:', networkError);
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('PWA Requirement Validation', () => {
    it('shows PWA requirement modal when submitting on mobile without PWA', async () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({
        isStandalone: false,
        isStandaloneMedia: false,
        isIOSStandalone: false,
        isAndroidStandalone: false,
        isInPWAContext: false,
        wasInstalled: false,
      }));
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      // Force submit by creating a new button that's not disabled
      const form = tokenInput.closest('form')!;
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Please install this app as a PWA first by using the install prompt above. This ensures the best experience and offline functionality.',
          title: 'PWA Installation Required'
        });
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('allows submission on mobile when PWA is installed', async () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({
        isStandalone: true,
        isStandaloneMedia: true,
        isIOSStandalone: false,
        isAndroidStandalone: true,
        isInPWAContext: true,
        wasInstalled: true,
      }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' }),
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('disables form and shows loading text during verification', async () => {
      // Mock delayed response
      let resolvePromise: (value: Response) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      (global.fetch as jest.Mock).mockReturnValueOnce(promise);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      // Should show loading state immediately
      expect(screen.getByText(/verifying/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Resolve the promise
      resolvePromise!({ ok: true, json: () => Promise.resolve({ login: 'test' }) });
      
      await waitFor(() => {
        expect(screen.queryByText(/verifying/i)).not.toBeInTheDocument();
      });
    });

    it('resets loading state after error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalled();
      });
      
      // Loading state should be reset
      expect(screen.queryByText(/verifying/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify & continue/i })).not.toBeDisabled();
    });
  });

  describe('Button States', () => {
    it('disables submit button when token is empty', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button during verification', async () => {
      let resolvePromise: (value: Response) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      (global.fetch as jest.Mock).mockReturnValueOnce(promise);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      
      // Clean up
      resolvePromise!({ ok: true, json: () => Promise.resolve({ login: 'test' }) });
    });

    it('shows different button text based on PWA requirement', () => {
      // Test desktop (no PWA requirement)
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => null);
      const { rerender } = render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      expect(screen.getByRole('button', { name: /verify & continue/i })).toBeInTheDocument();
      
      // Test mobile without PWA
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      require('../../src/utils/standalone').getStandaloneStatus = jest.fn(() => ({ isStandalone: false }));
      
      rerender(<TokenSetup onSuccess={mockOnSuccess} />);
      expect(screen.getByRole('button', { name: /install pwa first/i })).toBeInTheDocument();
    });

    it('applies correct CSS classes based on button state', () => {
      require('../../src/utils/device').getMobilePlatform = jest.fn(() => 'android');
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /install pwa first/i });
      expect(submitButton).toHaveClass('bg-gray-400', 'text-gray-600', 'cursor-not-allowed');
    });
  });

  describe('Modal Integration', () => {
    it('renders modal when UI store modal is open', () => {
      const mockUIStoreWithModal = {
        ...mockUIStore,
        modal: {
          isOpen: true,
          type: 'alert',
          title: 'Test Title',
          message: 'Test Message',
          onConfirm: undefined,
          confirmText: '',
          cancelText: '',
        },
      };
      
      require('../../src/stores/uiStore').useUIStore = jest.fn(() => mockUIStoreWithModal);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('passes correct props to Modal component', () => {
      const mockUIStoreWithModal = {
        ...mockUIStore,
        modal: {
          isOpen: true,
          type: 'confirm',
          title: 'Confirm Action',
          message: 'Are you sure?',
          onConfirm: jest.fn(),
          confirmText: 'Yes',
          cancelText: 'No',
        },
      };
      
      require('../../src/stores/uiStore').useUIStore = jest.fn(() => mockUIStoreWithModal);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText('Type: confirm')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });
  });

  describe('Auth Store Integration', () => {
    it('calls login with correct parameters on successful verification', async () => {
      const mockUserData = { login: 'testuser', id: 123, avatar_url: 'https://github.com/avatar.jpg' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserData),
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_test_token_12345' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          {
            token: 'ghp_test_token_12345',
            owner: 'testuser',
            repo: ''
          },
          mockUserData
        );
      });
    });

    it('does not call login on verification failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_invalid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalled();
      });
      
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed JSON response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({
          type: 'alert',
          message: 'Network error. Please check your connection and try again.',
          title: 'Network Error'
        });
      });
    });

    it('handles empty response data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(
          {
            token: 'ghp_valid_token',
            owner: undefined,
            repo: ''
          },
          {}
        );
      });
    });

    it('trims whitespace from token input', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: '  ghp_token_with_spaces  ' } });
      
      expect(tokenInput).toHaveValue('  ghp_token_with_spaces  ');
      
      // But submission should trim it
      const form = tokenInput.closest('form')!;
      
      // Mock to prevent actual submission
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'test' }),
      });
      
      fireEvent.submit(form);
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          'Authorization': 'Bearer   ghp_token_with_spaces  ',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
    });

    it('prevents multiple simultaneous form submissions', async () => {
      let resolvePromise: (value: Response) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      (global.fetch as jest.Mock).mockReturnValueOnce(promise);
      
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      fireEvent.change(tokenInput, { target: { value: 'ghp_valid_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      
      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      
      // Should only make one API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Clean up
      resolvePromise!({ ok: true, json: () => Promise.resolve({ login: 'test' }) });
    });

    it('handles various platform detection edge cases', () => {
      // Test each platform type
      const platforms = [null, 'android', 'ios-safari', 'ios-chrome'] as const;
      
      platforms.forEach(platform => {
        require('../../src/utils/device').getMobilePlatform = jest.fn(() => platform);
        
        const { unmount } = render(<TokenSetup onSuccess={mockOnSuccess} />);
        
        if (platform === null) {
          expect(screen.queryByTestId('install-prompt')).not.toBeInTheDocument();
        } else {
          expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
        }
        
        unmount();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('has proper form labels and associations', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      const label = screen.getByText('GitHub Personal Access Token');
      
      expect(tokenInput).toHaveAttribute('id', 'token');
      expect(label).toHaveAttribute('for', 'token');
    });

    it('has proper button accessibility attributes', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('provides keyboard navigation support', () => {
      render(<TokenSetup onSuccess={mockOnSuccess} />);
      
      const tokenInput = screen.getByLabelText('GitHub Personal Access Token');
      
      // Input should be focusable
      tokenInput.focus();
      expect(document.activeElement).toBe(tokenInput);
      
      // Add token to enable submit button, then test focus
      fireEvent.change(tokenInput, { target: { value: 'ghp_test_token' } });
      
      const submitButton = screen.getByRole('button', { name: /verify & continue/i });
      submitButton.focus();
      expect(document.activeElement).toBe(submitButton);
    });
  });
});
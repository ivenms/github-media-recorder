import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../../src/hooks/useAuth';

// Mock the dependencies
jest.mock('../../src/utils/tokenAuth', () => ({
  isAuthenticated: jest.fn(),
  checkTokenValidity: jest.fn(),
  clearTokenData: jest.fn(),
}));

jest.mock('../../src/utils/device', () => ({
  isMobile: jest.fn(),
}));

// Import mocked functions for type safety
import { isAuthenticated, checkTokenValidity, clearTokenData } from '../../src/utils/tokenAuth';
import { isMobile } from '../../src/utils/device';

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockCheckTokenValidity = checkTokenValidity as jest.MockedFunction<typeof checkTokenValidity>;
const mockClearTokenData = clearTokenData as jest.MockedFunction<typeof clearTokenData>;
const mockIsMobile = isMobile as jest.MockedFunction<typeof isMobile>;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use fake timers to control async operations
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Desktop Environment', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(false);
    });

    it('should authenticate immediately on desktop', async () => {
      const { result } = renderHook(() => useAuth());

      // Wait for the effect to run since it's async
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(true);
      expect(mockIsAuthenticated).not.toHaveBeenCalled();
      expect(mockCheckTokenValidity).not.toHaveBeenCalled();
    });

    it('should provide setAuthenticated function', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.setAuthenticated).toBe('function');
    });
  });

  describe('Mobile Environment - Not Authenticated', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(false);
    });

    it('should not authenticate when no basic auth data', async () => {
      const { result } = renderHook(() => useAuth());

      // Wait for the effect to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockCheckTokenValidity).not.toHaveBeenCalled();
    });
  });

  describe('Mobile Environment - Token Validation', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(true);
    });

    it('should authenticate when token is valid', async () => {
      mockCheckTokenValidity.mockResolvedValue({ isValid: true, isExpired: false });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.authenticated).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockCheckTokenValidity).toHaveBeenCalledTimes(1);
      expect(mockClearTokenData).not.toHaveBeenCalled();
    });

    it('should not authenticate when token is invalid', async () => {
      mockCheckTokenValidity.mockResolvedValue({ isValid: false, isExpired: false });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      expect(mockClearTokenData).toHaveBeenCalledTimes(1);
    });

    it('should show alert when token is expired', async () => {
      const mockShowAlert = jest.fn();
      mockCheckTokenValidity.mockResolvedValue({ isValid: false, isExpired: true });

      const { result } = renderHook(() => useAuth(mockShowAlert));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      expect(mockClearTokenData).toHaveBeenCalledTimes(1);
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Your GitHub token has expired. Please enter a new token to continue.',
        'Token Expired'
      );
    });

    it('should not show alert when token is expired but no showAlert provided', async () => {
      mockCheckTokenValidity.mockResolvedValue({ isValid: false, isExpired: true });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      expect(mockClearTokenData).toHaveBeenCalledTimes(1);
    });

    it('should handle token validation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCheckTokenValidity.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Token validation error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(true);
      mockCheckTokenValidity.mockResolvedValue({ isValid: true, isExpired: false });
    });

    it('should allow manual authentication state change', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.authenticated).toBe(true);
      });

      // Test setAuthenticated function
      act(() => {
        result.current.setAuthenticated(false);
      });
      expect(result.current.authenticated).toBe(false);

      act(() => {
        result.current.setAuthenticated(true);
      });
      expect(result.current.authenticated).toBe(true);
    });

    it('should update when showAlert callback changes', async () => {
      const mockShowAlert1 = jest.fn();
      const mockShowAlert2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ showAlert }) => useAuth(showAlert),
        { initialProps: { showAlert: mockShowAlert1 } }
      );

      await waitFor(() => {
        expect(result.current.authenticated).toBe(true);
      });

      // Change the showAlert callback
      rerender({ showAlert: mockShowAlert2 });

      // Should trigger re-authentication
      expect(mockCheckTokenValidity).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loading States', () => {
    it('should start in loading state', () => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(true);
      mockCheckTokenValidity.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.authenticated).toBe(false);
    });

    it('should exit loading state after auth check completes', async () => {
      mockIsMobile.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined showAlert gracefully', async () => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(true);
      mockCheckTokenValidity.mockResolvedValue({ isValid: false, isExpired: true });

      const { result } = renderHook(() => useAuth(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.authenticated).toBe(false);
      // Should not throw error even with expired token and no showAlert
    });

    it('should handle multiple rapid re-renders', async () => {
      mockIsMobile.mockReturnValue(true);
      mockIsAuthenticated.mockReturnValue(true);
      mockCheckTokenValidity.mockResolvedValue({ isValid: true, isExpired: false });

      const { result, rerender } = renderHook(() => useAuth());

      // Trigger multiple re-renders
      rerender();
      rerender();
      rerender();

      await waitFor(() => {
        expect(result.current.authenticated).toBe(true);
      });

      // Should only call token validation once per dependency change
      expect(mockCheckTokenValidity).toHaveBeenCalledTimes(1);
    });
  });
});
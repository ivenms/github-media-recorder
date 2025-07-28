import {
  validateToken,
  getStoredToken,
  getStoredUsername,
  getTokenTimestamp,
  isTokenLikelyExpired,
  checkTokenValidity,
  clearTokenData,
  storeTokenData,
  isAuthenticated,
} from '../../src/utils/tokenAuth';

// Mock the auth store
jest.mock('../../src/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock console.error to prevent spam during tests
global.console.error = jest.fn();

describe('tokenAuth utilities', () => {
  let mockUseAuthStore: any;

  beforeEach(() => {
    // Get the mocked store
    mockUseAuthStore = require('../../src/stores/authStore').useAuthStore;
    jest.clearAllMocks();
    
    // Default mock auth state
    mockUseAuthStore.getState.mockReturnValue({
      isAuthenticated: false,
      githubConfig: null,
      tokenTimestamp: null,
      login: jest.fn(),
      logout: jest.fn(),
    });
  });

  describe('validateToken', () => {
    describe('successful validation', () => {
      it('validates a valid token', async () => {
        const mockUserData = { login: 'testuser' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserData),
        });

        const result = await validateToken('valid-token');

        expect(result).toEqual({
          isValid: true,
          isExpired: false,
          username: 'testuser',
        });
        expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/user', {
          headers: {
            'Authorization': 'Bearer valid-token',
            'Accept': 'application/vnd.github.v3+json',
          },
        });
      });
    });

    describe('invalid/expired tokens', () => {
      it('handles expired/invalid token (401)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await validateToken('expired-token');

        expect(result).toEqual({
          isValid: false,
          isExpired: true,
          error: 'Token is invalid or expired',
        });
      });

      it('handles API errors (non-401)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

        const result = await validateToken('token');

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          error: 'API error: 403',
        });
      });
    });

    describe('network errors', () => {
      it('handles network errors gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await validateToken('token');

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          error: 'Network error',
        });
      });

      it('handles fetch rejections without error message', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

        const result = await validateToken('token');

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          error: 'Network error',
        });
      });
    });

    describe('edge cases', () => {
      it('handles empty token', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await validateToken('');

        expect(result).toEqual({
          isValid: false,
          isExpired: true,
          error: 'Token is invalid or expired',
        });
      });

      it('handles malformed response', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.reject(new Error('JSON parse error')),
        });

        const result = await validateToken('token');

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          error: 'Network error',
        });
      });
    });
  });

  describe('getStoredToken', () => {
    describe('successful retrieval', () => {
      it('returns token when authenticated', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'stored-token',
            owner: 'user',
          },
        });

        const result = getStoredToken();

        expect(result).toBe('stored-token');
      });
    });

    describe('no token available', () => {
      it('returns null when not authenticated', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
          githubConfig: null,
        });

        const result = getStoredToken();

        expect(result).toBeNull();
      });

      it('returns null when githubConfig is missing', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: null,
        });

        const result = getStoredToken();

        expect(result).toBeNull();
      });

      it('returns null when token is missing from config', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            owner: 'user',
          },
        });

        const result = getStoredToken();

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('handles store errors gracefully', () => {
        mockUseAuthStore.getState.mockImplementation(() => {
          throw new Error('Store error');
        });

        const result = getStoredToken();

        expect(result).toBeNull();
        expect(global.console.error).toHaveBeenCalledWith('Failed to get token from AuthStore:', expect.any(Error));
      });
    });
  });

  describe('getStoredUsername', () => {
    describe('successful retrieval', () => {
      it('returns username when authenticated', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'token',
            owner: 'testuser',
          },
        });

        const result = getStoredUsername();

        expect(result).toBe('testuser');
      });
    });

    describe('no username available', () => {
      it('returns null when not authenticated', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
          githubConfig: null,
        });

        const result = getStoredUsername();

        expect(result).toBeNull();
      });

      it('returns null when owner is missing', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'token',
          },
        });

        const result = getStoredUsername();

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('handles store errors gracefully', () => {
        mockUseAuthStore.getState.mockImplementation(() => {
          throw new Error('Store error');
        });

        const result = getStoredUsername();

        expect(result).toBeNull();
        expect(global.console.error).toHaveBeenCalledWith('Failed to get username from AuthStore:', expect.any(Error));
      });
    });
  });

  describe('getTokenTimestamp', () => {
    describe('successful retrieval', () => {
      it('returns timestamp when available', () => {
        const timestamp = Date.now() - 1000;
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: timestamp,
        });

        const result = getTokenTimestamp();

        expect(result).toBe(timestamp);
      });
    });

    describe('no timestamp available', () => {
      it('returns null when timestamp is missing', () => {
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: null,
        });

        const result = getTokenTimestamp();

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('handles store errors gracefully', () => {
        mockUseAuthStore.getState.mockImplementation(() => {
          throw new Error('Store error');
        });

        const result = getTokenTimestamp();

        expect(result).toBeNull();
        expect(global.console.error).toHaveBeenCalledWith('Failed to get token timestamp from AuthStore:', expect.any(Error));
      });
    });
  });

  describe('isTokenLikelyExpired', () => {
    describe('fresh tokens', () => {
      it('returns false for recent tokens', () => {
        const recentTimestamp = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: recentTimestamp,
        });

        const result = isTokenLikelyExpired();

        expect(result).toBe(false);
      });
    });

    describe('old tokens', () => {
      it('returns true for tokens older than 90 days', () => {
        const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: oldTimestamp,
        });

        const result = isTokenLikelyExpired();

        expect(result).toBe(true);
      });

      it('returns true when no timestamp is available', () => {
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: null,
        });

        const result = isTokenLikelyExpired();

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles exactly 90 days old token', () => {
        const exactlyNinetyDays = Date.now() - (90 * 24 * 60 * 60 * 1000);
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: exactlyNinetyDays,
        });

        const result = isTokenLikelyExpired();

        expect(result).toBe(false);
      });

      it('handles slightly over 90 days old token', () => {
        const slightlyOver = Date.now() - (90 * 24 * 60 * 60 * 1000 + 1000);
        mockUseAuthStore.getState.mockReturnValue({
          tokenTimestamp: slightlyOver,
        });

        const result = isTokenLikelyExpired();

        expect(result).toBe(true);
      });
    });
  });

  describe('checkTokenValidity', () => {
    describe('valid tokens', () => {
      it('validates fresh token with API', async () => {
        const recentTimestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'valid-token',
            owner: 'user',
          },
          tokenTimestamp: recentTimestamp,
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'user' }),
        });

        const result = await checkTokenValidity();

        expect(result).toEqual({
          isValid: true,
          isExpired: false,
          username: 'user',
        });
      });
    });

    describe('no token', () => {
      it('returns error when no token is stored', async () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
          githubConfig: null,
        });

        const result = await checkTokenValidity();

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          error: 'No token found',
        });
      });
    });

    describe('expired tokens', () => {
      it('returns expired for old tokens without API call', async () => {
        const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'old-token',
            owner: 'user',
          },
          tokenTimestamp: oldTimestamp,
        });

        const result = await checkTokenValidity();

        expect(result).toEqual({
          isValid: false,
          isExpired: true,
          error: 'Token is likely expired based on age',
        });
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('API validation failures', () => {
      it('handles API validation failure for fresh token', async () => {
        const recentTimestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'invalid-token',
            owner: 'user',
          },
          tokenTimestamp: recentTimestamp,
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await checkTokenValidity();

        expect(result).toEqual({
          isValid: false,
          isExpired: true,
          error: 'Token is invalid or expired',
        });
      });
    });
  });

  describe('clearTokenData', () => {
    describe('successful clearing', () => {
      it('calls logout on auth store', () => {
        const mockLogout = jest.fn();
        mockUseAuthStore.getState.mockReturnValue({
          logout: mockLogout,
        });

        clearTokenData();

        expect(mockLogout).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('handles store errors gracefully', () => {
        mockUseAuthStore.getState.mockImplementation(() => {
          throw new Error('Store error');
        });

        expect(() => clearTokenData()).not.toThrow();
        expect(global.console.error).toHaveBeenCalledWith('Failed to clear AuthStore:', expect.any(Error));
      });
    });
  });

  describe('storeTokenData', () => {
    describe('successful storing', () => {
      it('calls login on auth store with correct data', () => {
        const mockLogin = jest.fn();
        mockUseAuthStore.getState.mockReturnValue({
          login: mockLogin,
        });

        storeTokenData('new-token', 'newuser');

        expect(mockLogin).toHaveBeenCalledWith({
          token: 'new-token',
          owner: 'newuser',
          repo: '',
        });
      });
    });

    describe('error handling', () => {
      it('handles store errors gracefully', () => {
        mockUseAuthStore.getState.mockImplementation(() => {
          throw new Error('Store error');
        });

        expect(() => storeTokenData('token', 'user')).not.toThrow();
        expect(global.console.error).toHaveBeenCalledWith('Failed to store in AuthStore:', expect.any(Error));
      });
    });
  });

  describe('isAuthenticated', () => {
    describe('authenticated state', () => {
      it('returns true when both token and username are available', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'token',
            owner: 'user',
          },
        });

        const result = isAuthenticated();

        expect(result).toBe(true);
      });
    });

    describe('unauthenticated states', () => {
      it('returns false when token is missing', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            owner: 'user',
          },
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });

      it('returns false when username is missing', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'token',
          },
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });

      it('returns false when not authenticated', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: false,
          githubConfig: null,
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });

      it('returns false when githubConfig is null', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: null,
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('returns false for empty token', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: '',
            owner: 'user',
          },
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });

      it('returns false for empty username', () => {
        mockUseAuthStore.getState.mockReturnValue({
          isAuthenticated: true,
          githubConfig: {
            token: 'token',
            owner: '',
          },
        });

        const result = isAuthenticated();

        expect(result).toBe(false);
      });
    });
  });

  describe('integration tests', () => {
    it('handles complete authentication workflow', async () => {
      // Start unauthenticated
      mockUseAuthStore.getState.mockReturnValue({
        isAuthenticated: false,
        githubConfig: null,
        tokenTimestamp: null,
        login: jest.fn(),
        logout: jest.fn(),
      });

      expect(isAuthenticated()).toBe(false);
      expect(await checkTokenValidity()).toEqual({
        isValid: false,
        isExpired: false,
        error: 'No token found',
      });

      // Store token
      const mockLogin = jest.fn();
      mockUseAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        githubConfig: {
          token: 'new-token',
          owner: 'testuser',
        },
        tokenTimestamp: Date.now(),
        login: mockLogin,
        logout: jest.fn(),
      });

      storeTokenData('new-token', 'testuser');
      expect(mockLogin).toHaveBeenCalled();

      // Validate token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' }),
      });

      const validity = await checkTokenValidity();
      expect(validity.isValid).toBe(true);
      expect(validity.username).toBe('testuser');

      // Clear token
      const mockLogout = jest.fn();
      mockUseAuthStore.getState.mockReturnValue({
        isAuthenticated: false,
        githubConfig: null,
        tokenTimestamp: null,
        login: jest.fn(),
        logout: mockLogout,
      });

      clearTokenData();
      expect(mockLogout).toHaveBeenCalled();
    });

    it('handles token expiration workflow', async () => {
      // Old token
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
      mockUseAuthStore.getState.mockReturnValue({
        isAuthenticated: true,
        githubConfig: {
          token: 'old-token',
          owner: 'user',
        },
        tokenTimestamp: oldTimestamp,
      });

      expect(isTokenLikelyExpired()).toBe(true);
      expect(await checkTokenValidity()).toEqual({
        isValid: false,
        isExpired: true,
        error: 'Token is likely expired based on age',
      });
    });
  });
});
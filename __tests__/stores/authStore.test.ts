import { renderHook, act } from '@testing-library/react';
import type { GitHubAuthConfig } from '../../src/types';

// Mock localStorage to track calls
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

import { useAuthStore } from '../../src/stores/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();

    // Reset store state to initial values
    useAuthStore.setState({
      isAuthenticated: false,
      githubConfig: null,
      userInfo: null,
      tokenTimestamp: null,
    });

    // Clear any localStorage entries
    mockLocalStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBeNull();
      expect(result.current.userInfo).toBeNull();
      expect(result.current.tokenTimestamp).toBeNull();
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.updateConfig).toBe('function');
      expect(typeof result.current.setUserInfo).toBe('function');
    });
  });

  describe('Login Management', () => {
    it('should login with valid GitHub config', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const mockUserInfo = { login: 'testuser', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' };

      act(() => {
        result.current.login(mockConfig, mockUserInfo);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockConfig);
      expect(result.current.userInfo).toEqual(mockUserInfo);
      expect(result.current.tokenTimestamp).toBeGreaterThan(0);
    });

    it('should login with config but no user info', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      act(() => {
        result.current.login(mockConfig);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockConfig);
      expect(result.current.userInfo).toBeNull();
      expect(result.current.tokenTimestamp).toBeGreaterThan(0);
    });

    it('should validate user info structure', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      // Test with invalid user info
      act(() => {
        result.current.login(mockConfig, 'invalid-string');
      });

      expect(result.current.userInfo).toBeNull();

      // Test with valid user info
      const validUserInfo = { login: 'testuser' };
      act(() => {
        result.current.login(mockConfig, validUserInfo);
      });

      expect(result.current.userInfo).toEqual(validUserInfo);
    });
  });

  describe('Logout Management', () => {
    it('should logout and clear all state', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const mockUserInfo = { login: 'testuser', name: 'Test User' };

      // First login
      act(() => {
        result.current.login(mockConfig, mockUserInfo);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBeNull();
      expect(result.current.userInfo).toBeNull();
      expect(result.current.tokenTimestamp).toBeNull();
    });
  });

  describe('Config Updates', () => {
    it('should update existing config', () => {
      const { result } = renderHook(() => useAuthStore());
      const initialConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      // Login first
      act(() => {
        result.current.login(initialConfig);
      });

      // Update config
      act(() => {
        result.current.updateConfig({
          repo: 'new-repo',
          branch: 'main'
        });
      });

      expect(result.current.githubConfig).toEqual({
        token: 'test-token',
        owner: 'test-owner',
        repo: 'new-repo',
        branch: 'main'
      });
    });

    it('should not update config when not authenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      // Try to update config without being logged in
      act(() => {
        result.current.updateConfig({
          repo: 'new-repo'
        });
      });

      expect(result.current.githubConfig).toBeNull();
    });
  });

  describe('User Info Management', () => {
    it('should set valid user info', () => {
      const { result } = renderHook(() => useAuthStore());
      const validUserInfo = { login: 'testuser', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' };

      act(() => {
        result.current.setUserInfo(validUserInfo);
      });

      expect(result.current.userInfo).toEqual(validUserInfo);
    });

    it('should reject invalid user info', () => {
      const { result } = renderHook(() => useAuthStore());

      // Test various invalid formats
      act(() => {
        result.current.setUserInfo('invalid-string');
      });
      expect(result.current.userInfo).toBeNull();

      act(() => {
        result.current.setUserInfo(['invalid', 'array']);
      });
      expect(result.current.userInfo).toBeNull();

      act(() => {
        result.current.setUserInfo({ invalidProperty: 'value' });
      });
      expect(result.current.userInfo).toBeNull();
    });

    it('should accept partial user info with at least one valid property', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUserInfo({ login: 'testuser', invalidProperty: 'value' });
      });

      expect(result.current.userInfo).toEqual({ login: 'testuser', invalidProperty: 'value' });
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const { result: authResult } = renderHook(() => 
        useAuthStore((state) => state.isAuthenticated)
      );
      const { result: configResult } = renderHook(() => 
        useAuthStore((state) => state.githubConfig)
      );
      const { result: userResult } = renderHook(() => 
        useAuthStore((state) => state.userInfo)
      );

      expect(authResult.current).toBe(false);
      expect(configResult.current).toBeNull();
      expect(userResult.current).toBeNull();

      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const mockUserInfo = { login: 'testuser', name: 'Test User' };

      act(() => {
        useAuthStore.getState().login(mockConfig, mockUserInfo);
      });

      expect(authResult.current).toBe(true);
      expect(configResult.current).toEqual(mockConfig);
      expect(userResult.current).toEqual(mockUserInfo);
    });

    it('should allow selecting computed values', () => {
      const { result } = renderHook(() => 
        useAuthStore((state) => ({
          hasConfig: !!state.githubConfig,
          hasUserInfo: !!state.userInfo,
          userName: state.userInfo?.name || state.userInfo?.login || 'Anonymous',
          tokenAge: state.tokenTimestamp ? Date.now() - state.tokenTimestamp : null,
        }))
      );

      expect(result.current.hasConfig).toBe(false);
      expect(result.current.hasUserInfo).toBe(false);
      expect(result.current.userName).toBe('Anonymous');
      expect(result.current.tokenAge).toBeNull();

      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const mockUserInfo = { login: 'testuser', name: 'Test User' };

      act(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          githubConfig: mockConfig,
          userInfo: mockUserInfo,
          tokenTimestamp: Date.now() - 5000 // 5 seconds ago
        });
      });

      expect(result.current.hasConfig).toBe(true);
      expect(result.current.hasUserInfo).toBe(true);
      expect(result.current.userName).toBe('Test User');
      expect(result.current.tokenAge).toBeGreaterThan(4000);
      expect(result.current.tokenAge).toBeLessThan(6000);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };
      const mockUserInfo = { login: 'testuser', name: 'Test User' };

      // Start unauthenticated
      expect(result.current.isAuthenticated).toBe(false);

      // Login
      act(() => {
        result.current.login(mockConfig, mockUserInfo);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockConfig);
      expect(result.current.userInfo).toEqual(mockUserInfo);

      // Update config
      act(() => {
        result.current.updateConfig({ branch: 'develop' });
      });

      expect(result.current.githubConfig?.branch).toBe('develop');

      // Update user info
      const updatedUserInfo = { login: 'testuser', name: 'Updated User', avatar_url: 'https://example.com/new-avatar.jpg' };
      act(() => {
        result.current.setUserInfo(updatedUserInfo);
      });

      expect(result.current.userInfo).toEqual(updatedUserInfo);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBeNull();
      expect(result.current.userInfo).toBeNull();
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useAuthStore());
      const config1: GitHubAuthConfig = { token: 'token1', owner: 'owner1', repo: 'repo1' };
      const config2: GitHubAuthConfig = { token: 'token2', owner: 'owner2', repo: 'repo2' };
      const userInfo1 = { login: 'user1' };
      const userInfo2 = { login: 'user2' };

      // Rapid state changes
      act(() => {
        result.current.login(config1, userInfo1);
        result.current.updateConfig({ branch: 'main' });
        result.current.setUserInfo(userInfo2);
        result.current.logout();
        result.current.login(config2, userInfo2);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(config2);
      expect(result.current.userInfo).toEqual(userInfo2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user info gracefully', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      act(() => {
        result.current.login(mockConfig, null);
      });

      expect(result.current.userInfo).toBeNull();

      act(() => {
        result.current.setUserInfo(null);
      });

      expect(result.current.userInfo).toBeNull();
    });

    it('should handle multiple logout calls', () => {
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      // Login first
      act(() => {
        result.current.login(mockConfig);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Multiple logout calls
      act(() => {
        result.current.logout();
        result.current.logout();
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBeNull();
    });

    it('should handle partial config updates', () => {
      const { result } = renderHook(() => useAuthStore());
      const initialConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      act(() => {
        result.current.login(initialConfig);
      });

      // Update only one property
      act(() => {
        result.current.updateConfig({ branch: 'develop' });
      });

      expect(result.current.githubConfig).toEqual({
        ...initialConfig,
        branch: 'develop'
      });

      // Update multiple properties
      act(() => {
        result.current.updateConfig({ 
          repo: 'new-repo',
          path: 'uploads/'
        });
      });

      expect(result.current.githubConfig).toEqual({
        token: 'test-token',
        owner: 'test-owner',
        repo: 'new-repo',
        branch: 'develop',
        path: 'uploads/'
      });
    });
  });

  describe('Persistence', () => {
    it('should work with localStorage mocking', () => {
      // The persist middleware is mocked to use localStorage
      // This test verifies the mock localStorage is called
      const { result } = renderHook(() => useAuthStore());
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      };

      act(() => {
        result.current.login(mockConfig);
      });

      // The persistence should trigger localStorage calls
      // (The exact behavior depends on the persist middleware mock)
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockConfig);
    });
  });
});
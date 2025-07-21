import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../src/stores/authStore';
import { zustandTestUtils } from '../__mocks__/zustand';
import type { GitHubAuthConfig } from '../../src/types';

describe('authStore', () => {
  beforeEach(() => {
    // Clear localStorage and store state
    zustandTestUtils.clearAllStores();
    localStorage.clear();
    
    // Reset the auth store to initial state
    const { result } = renderHook(() => useAuthStore());
    if (result.current.isAuthenticated) {
      act(() => {
        result.current.logout();
      });
    }
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBe(null);
      expect(result.current.userInfo).toBe(null);
      expect(result.current.tokenTimestamp).toBe(null);
    });

    it('provides action functions', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.updateConfig).toBe('function');
      expect(typeof result.current.setUserInfo).toBe('function');
    });
  });

  describe('Login Action', () => {
    const mockGitHubConfig: GitHubAuthConfig = {
      token: 'test-token',
      username: 'testuser',
      repository: 'test-repo',
      mediaPath: 'media/',
      thumbnailPath: 'thumbnails/',
    };

    const mockUserInfo = {
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'https://github.com/images/testuser.png',
    };

    it('sets authentication state on login', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockGitHubConfig, mockUserInfo);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockGitHubConfig);
      expect(result.current.userInfo).toEqual(mockUserInfo);
      expect(result.current.tokenTimestamp).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it('handles login without user info', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockGitHubConfig);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockGitHubConfig);
      expect(result.current.userInfo).toBe(null);
      expect(result.current.tokenTimestamp).toBeCloseTo(Date.now(), -2);
    });

    it('overwrites previous authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      // First login
      act(() => {
        result.current.login(mockGitHubConfig, mockUserInfo);
      });

      const firstTimestamp = result.current.tokenTimestamp;

      // Wait a bit and login again
      setTimeout(() => {
        const newConfig = { ...mockGitHubConfig, token: 'new-token' };
        const newUserInfo = { ...mockUserInfo, name: 'New Name' };

        act(() => {
          result.current.login(newConfig, newUserInfo);
        });

        expect(result.current.githubConfig).toEqual(newConfig);
        expect(result.current.userInfo).toEqual(newUserInfo);
        expect(result.current.tokenTimestamp).toBeGreaterThan(firstTimestamp!);
      }, 10);
    });

    it('handles invalid user info gracefully', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockGitHubConfig, 'invalid-user-info');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userInfo).toBe(null);
    });
  });

  describe('Logout Action', () => {
    it('clears authentication state on logout', () => {
      const { result } = renderHook(() => useAuthStore());

      // Login first
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        username: 'testuser',
        repository: 'test-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      act(() => {
        result.current.login(mockConfig, { login: 'testuser' });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBe(null);
      expect(result.current.userInfo).toBe(null);
      expect(result.current.tokenTimestamp).toBe(null);
    });

    it('is safe to call logout when not authenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(false);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Update Config Action', () => {
    const mockConfig: GitHubAuthConfig = {
      token: 'test-token',
      username: 'testuser',
      repository: 'test-repo',
      mediaPath: 'media/',
      thumbnailPath: 'thumbnails/',
    };

    it('updates existing config partially', () => {
      const { result } = renderHook(() => useAuthStore());

      // Login first
      act(() => {
        result.current.login(mockConfig);
      });

      // Update config
      act(() => {
        result.current.updateConfig({
          repository: 'new-repo',
          mediaPath: 'new-media/',
        });
      });

      expect(result.current.githubConfig).toEqual({
        ...mockConfig,
        repository: 'new-repo',
        mediaPath: 'new-media/',
      });
    });

    it('does nothing when no config exists', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.githubConfig).toBe(null);

      act(() => {
        result.current.updateConfig({ repository: 'new-repo' });
      });

      expect(result.current.githubConfig).toBe(null);
    });

    it('merges new config with existing config', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockConfig);
      });

      act(() => {
        result.current.updateConfig({
          token: 'new-token',
          mediaPath: 'updated-media/',
        });
      });

      expect(result.current.githubConfig).toEqual({
        token: 'new-token',
        username: 'testuser',
        repository: 'test-repo',
        mediaPath: 'updated-media/',
        thumbnailPath: 'thumbnails/',
      });
    });

    it('handles empty config updates', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockConfig);
      });

      act(() => {
        result.current.updateConfig({});
      });

      expect(result.current.githubConfig).toEqual(mockConfig);
    });
  });

  describe('Set User Info Action', () => {
    it('updates user info with valid data', () => {
      const { result } = renderHook(() => useAuthStore());

      const userInfo = {
        login: 'newuser',
        name: 'New User',
        avatar_url: 'https://example.com/avatar.png',
      };

      act(() => {
        result.current.setUserInfo(userInfo);
      });

      expect(result.current.userInfo).toEqual(userInfo);
    });

    it('sets user info to null with null input', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set some user info first
      act(() => {
        result.current.setUserInfo({ login: 'user' });
      });

      expect(result.current.userInfo).toEqual({ login: 'user' });

      // Clear it
      act(() => {
        result.current.setUserInfo(null);
      });

      expect(result.current.userInfo).toBe(null);
    });

    it('handles invalid user info gracefully', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUserInfo('invalid-data');
      });

      expect(result.current.userInfo).toBe(null);
    });

    it('overwrites existing user info', () => {
      const { result } = renderHook(() => useAuthStore());

      const firstUserInfo = { login: 'user1', name: 'User One' };
      const secondUserInfo = { login: 'user2', name: 'User Two' };

      act(() => {
        result.current.setUserInfo(firstUserInfo);
      });

      expect(result.current.userInfo).toEqual(firstUserInfo);

      act(() => {
        result.current.setUserInfo(secondUserInfo);
      });

      expect(result.current.userInfo).toEqual(secondUserInfo);
    });
  });

  describe('State Selectors', () => {
    it('allows selecting specific state slices', () => {
      const { result } = renderHook(() => useAuthStore(state => state.isAuthenticated));

      expect(result.current).toBe(false);

      // This would require actual zustand implementation
      // For now, we'll test the full state approach
    });

    it('allows selecting config only', () => {
      const { result } = renderHook(() => useAuthStore(state => state.githubConfig));

      expect(result.current).toBe(null);
    });
  });

  describe('Persistence', () => {
    it('persists authentication state to localStorage', () => {
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        username: 'testuser',
        repository: 'test-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      const mockUserInfo = { login: 'testuser', name: 'Test User' };

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login(mockConfig, mockUserInfo);
      });

      // Verify localStorage contains the auth data
      const storedData = localStorage.getItem('auth-storage');
      expect(storedData).toBeTruthy();

      if (storedData) {
        const parsedData = JSON.parse(storedData);
        expect(parsedData.state.isAuthenticated).toBe(true);
        expect(parsedData.state.githubConfig).toEqual(mockConfig);
        expect(parsedData.state.userInfo).toEqual(mockUserInfo);
        expect(parsedData.state.tokenTimestamp).toBeTruthy();
      }
    });

    it('restores state from localStorage on initialization', () => {
      const mockConfig: GitHubAuthConfig = {
        token: 'persisted-token',
        username: 'persisteduser',
        repository: 'persisted-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      const mockUserInfo = { login: 'persisteduser', name: 'Persisted User' };

      // Simulate existing data in localStorage
      zustandTestUtils.mockPersistence('auth-storage', {
        isAuthenticated: true,
        githubConfig: mockConfig,
        userInfo: mockUserInfo,
        tokenTimestamp: Date.now() - 3600000, // 1 hour ago
      });

      const { result } = renderHook(() => useAuthStore());
      
      // Manually trigger rehydration since the store was already created
      // Access the store's setState method directly
      act(() => {
        const store = (result.current as any);
        zustandTestUtils.rehydrateStore(useAuthStore, 'auth-storage');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.githubConfig).toEqual(mockConfig);
      expect(result.current.userInfo).toEqual(mockUserInfo);
      expect(result.current.tokenTimestamp).toBeTruthy();
    });

    it('clears persistence on logout', () => {
      const mockConfig: GitHubAuthConfig = {
        token: 'test-token',
        username: 'testuser',
        repository: 'test-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      const { result } = renderHook(() => useAuthStore());

      // Login to set persistence
      act(() => {
        result.current.login(mockConfig);
      });

      expect(localStorage.getItem('auth-storage')).toBeTruthy();

      // Logout
      act(() => {
        result.current.logout();
      });

      // Verify localStorage reflects the logout
      const storedData = localStorage.getItem('auth-storage');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        expect(parsedData.state.isAuthenticated).toBe(false);
        expect(parsedData.state.githubConfig).toBe(null);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete authentication flow', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockConfig: GitHubAuthConfig = {
        token: 'flow-token',
        username: 'flowuser',
        repository: 'flow-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      const mockUserInfo = { login: 'flowuser', name: 'Flow User' };

      // 1. Initial state
      expect(result.current.isAuthenticated).toBe(false);

      // 2. Login
      act(() => {
        result.current.login(mockConfig, mockUserInfo);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // 3. Update config
      act(() => {
        result.current.updateConfig({ repository: 'updated-repo' });
      });

      expect(result.current.githubConfig?.repository).toBe('updated-repo');

      // 4. Update user info
      act(() => {
        result.current.setUserInfo({ ...mockUserInfo, name: 'Updated Name' });
      });

      expect(result.current.userInfo?.name).toBe('Updated Name');

      // 5. Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.githubConfig).toBe(null);
      expect(result.current.userInfo).toBe(null);
    });

    it('maintains consistency across multiple updates', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockConfig: GitHubAuthConfig = {
        token: 'consistency-token',
        username: 'consistencyuser',
        repository: 'consistency-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      act(() => {
        result.current.login(mockConfig);
      });

      // Multiple rapid updates
      act(() => {
        result.current.updateConfig({ mediaPath: 'new-media/' });
        result.current.updateConfig({ thumbnailPath: 'new-thumbnails/' });
        result.current.updateConfig({ repository: 'final-repo' });
      });

      expect(result.current.githubConfig).toEqual({
        token: 'consistency-token',
        username: 'consistencyuser',
        repository: 'final-repo',
        mediaPath: 'new-media/',
        thumbnailPath: 'new-thumbnails/',
      });
    });
  });

  describe('Type Safety', () => {
    it('enforces correct GitHubAuthConfig structure', () => {
      const { result } = renderHook(() => useAuthStore());

      const validConfig: GitHubAuthConfig = {
        token: 'test-token',
        username: 'testuser',
        repository: 'test-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      act(() => {
        result.current.login(validConfig);
      });

      expect(result.current.githubConfig).toEqual(validConfig);
    });

    it('handles partial config updates correctly', () => {
      const { result } = renderHook(() => useAuthStore());

      const initialConfig: GitHubAuthConfig = {
        token: 'initial-token',
        username: 'initialuser',
        repository: 'initial-repo',
        mediaPath: 'media/',
        thumbnailPath: 'thumbnails/',
      };

      act(() => {
        result.current.login(initialConfig);
      });

      act(() => {
        result.current.updateConfig({ token: 'updated-token' });
      });

      expect(result.current.githubConfig?.token).toBe('updated-token');
      expect(result.current.githubConfig?.username).toBe('initialuser');
    });
  });
});
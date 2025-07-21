import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GitHubAuthConfig, AuthState } from '../types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      githubConfig: null,
      userInfo: null,
      tokenTimestamp: null,

      login: (config: GitHubAuthConfig, userInfo?: unknown) => {
        // Validate userInfo structure - should be object with expected properties or null
        let validatedUserInfo = null;
        if (userInfo && typeof userInfo === 'object' && !Array.isArray(userInfo)) {
          const info = userInfo as any;
          if (typeof info.login === 'string' || typeof info.name === 'string' || typeof info.avatar_url === 'string') {
            validatedUserInfo = userInfo as { login?: string; name?: string; avatar_url?: string };
          }
        }
        
        set({
          isAuthenticated: true,
          githubConfig: config,
          userInfo: validatedUserInfo,
          tokenTimestamp: Date.now(),
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          githubConfig: null,
          userInfo: null,
          tokenTimestamp: null,
        });
      },

      updateConfig: (newConfig: Partial<GitHubAuthConfig>) => {
        const currentConfig = get().githubConfig;
        if (currentConfig) {
          set({
            githubConfig: { ...currentConfig, ...newConfig },
          });
        }
      },

      setUserInfo: (userInfo: unknown) => {
        // Validate userInfo structure - should be object with expected properties or null
        let validatedUserInfo = null;
        if (userInfo && typeof userInfo === 'object' && !Array.isArray(userInfo)) {
          const info = userInfo as any;
          if (typeof info.login === 'string' || typeof info.name === 'string' || typeof info.avatar_url === 'string') {
            validatedUserInfo = userInfo as { login?: string; name?: string; avatar_url?: string };
          }
        }
        
        set({ userInfo: validatedUserInfo });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        githubConfig: state.githubConfig,
        userInfo: state.userInfo,
        tokenTimestamp: state.tokenTimestamp,
      }),
    }
  )
);
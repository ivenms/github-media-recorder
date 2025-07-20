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
        set({
          isAuthenticated: true,
          githubConfig: config,
          userInfo: (userInfo as { login?: string; name?: string; avatar_url?: string }) || null,
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
        set({ userInfo: userInfo as { login?: string; name?: string; avatar_url?: string } | null });
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
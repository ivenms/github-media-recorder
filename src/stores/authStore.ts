import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GitHubConfig } from '../types';

interface AuthState {
  // Authentication state
  isAuthenticated: boolean;
  githubConfig: GitHubConfig | null;
  userInfo: {
    login?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  tokenTimestamp: number | null;

  // Actions
  login: (config: GitHubConfig, userInfo?: unknown) => void;
  logout: () => void;
  updateConfig: (config: Partial<GitHubConfig>) => void;
  setUserInfo: (userInfo: unknown) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      githubConfig: null,
      userInfo: null,
      tokenTimestamp: null,

      login: (config: GitHubConfig, userInfo?: unknown) => {
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

      updateConfig: (newConfig: Partial<GitHubConfig>) => {
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
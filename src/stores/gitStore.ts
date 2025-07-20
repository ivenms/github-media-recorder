import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GitState } from '../types';
import { fetchRemoteFiles as fetchRemoteFilesFromGithub, fetchRemoteThumbnails } from '../utils/githubUtils';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';

// Helper to get repository last commit timestamp
async function getRepositoryLastCommit(): Promise<number> {
  const authState = useAuthStore.getState();
  const settingsState = useSettingsStore.getState();
  
  if (!authState.isAuthenticated || !authState.githubConfig || !settingsState.appSettings) {
    throw new Error('GitHub configuration not available');
  }

  const { githubConfig } = authState;
  const { appSettings } = settingsState;
  
  if (!githubConfig.token || !githubConfig.owner || !appSettings.repo) {
    throw new Error('Incomplete GitHub configuration');
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubConfig.owner}/${appSettings.repo}/commits?per_page=1`,
      {
        headers: { Authorization: `Bearer ${githubConfig.token}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch commits: ${response.status}`);
    }

    const commits = await response.json();
    if (commits.length === 0) {
      return Date.now(); // No commits, return current time
    }

    const lastCommitDate = new Date(commits[0].commit.committer.date);
    return lastCommitDate.getTime();
  } catch (error) {
    console.warn('Failed to fetch repository last commit:', error);
    return Date.now(); // Fallback to current time
  }
}

export const useGitStore = create<GitState>()(
  persist(
    (set, get) => ({
      remoteFiles: [],
      remoteThumbnails: {},
      isLoadingRemote: false,
      lastRemoteFetch: 0,
      remoteError: null,
      lastCommitTimestamp: 0,

      fetchRemoteFiles: async (forceRefresh: boolean = false) => {
        const state = get();
        
        // Check if we need to refresh based on repository changes
        if (!forceRefresh && state.lastRemoteFetch > 0) {
          try {
            const repoLastCommit = await getRepositoryLastCommit();
            
            // If our cache is newer than the last commit, no need to refresh
            if (state.lastCommitTimestamp >= repoLastCommit) {
              console.log('Repository unchanged, using cached data');
              return;
            }
            
            console.log('Repository has new changes, refreshing...');
          } catch {
            console.warn('Could not check repository status, proceeding with refresh');
          }
        }

        set({ isLoadingRemote: true, remoteError: null });
        
        try {
          // Fetch both media files and thumbnails
          const files = await fetchRemoteFilesFromGithub();
          const thumbnails = await fetchRemoteThumbnails();
          const lastCommitTimestamp = await getRepositoryLastCommit();
          
          set({ 
            remoteFiles: files,
            remoteThumbnails: thumbnails,
            isLoadingRemote: false,
            lastRemoteFetch: Date.now(),
            lastCommitTimestamp
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch remote files';
          set({ 
            remoteError: errorMessage,
            isLoadingRemote: false 
          });
          throw error;
        }
      },

      // Auto-refresh based on time interval (checks every 5 minutes if data is stale)
      autoRefreshIfStale: async () => {
        const state = get();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        // If last fetch was more than 5 minutes ago, check for updates
        if (state.lastRemoteFetch < fiveMinutesAgo) {
          try {
            await get().fetchRemoteFiles(false);
          } catch (autoRefreshError) {
            // Silent fail for auto-refresh
            console.log('Auto-refresh failed silently:', autoRefreshError);
          }
        }
      },

      setRemoteError: (error: string | null) => {
        set({ remoteError: error });
      },

      // Invalidate cache and force fresh fetch (useful after uploads)
      invalidateCache: () => {
        set({
          lastRemoteFetch: 0,
          lastCommitTimestamp: 0,
        });
      },

      reset: () => {
        set({
          remoteFiles: [],
          remoteThumbnails: {},
          isLoadingRemote: false,
          lastRemoteFetch: 0,
          remoteError: null,
          lastCommitTimestamp: 0,
        });
      },
    }),
    {
      name: 'git-store',
      // Only persist essential data, not loading states
      partialize: (state) => ({
        remoteFiles: state.remoteFiles,
        remoteThumbnails: state.remoteThumbnails,
        lastRemoteFetch: state.lastRemoteFetch,
        lastCommitTimestamp: state.lastCommitTimestamp,
      }),
    }
  )
);
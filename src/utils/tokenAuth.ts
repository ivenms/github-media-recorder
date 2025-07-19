import { useAuthStore } from '../stores/authStore';

// Token validation and management utilities

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  username?: string;
  error?: string;
}

export async function validateToken(token: string): Promise<TokenValidationResult> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        isValid: true,
        isExpired: false,
        username: userData.login,
      };
    } else if (response.status === 401) {
      return {
        isValid: false,
        isExpired: true,
        error: 'Token is invalid or expired',
      };
    } else {
      return {
        isValid: false,
        isExpired: false,
        error: `API error: ${response.status}`,
      };
    }
  } catch {
    return {
      isValid: false,
      isExpired: false,
      error: 'Network error',
    };
  }
}

export function getStoredToken(): string | null {
  try {
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated && authState.githubConfig?.token) {
      return authState.githubConfig.token;
    }
  } catch (error) {
    console.error('Failed to get token from AuthStore:', error);
  }
  
  return null;
}

export function getStoredUsername(): string | null {
  try {
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated && authState.githubConfig?.owner) {
      return authState.githubConfig.owner;
    }
  } catch (error) {
    console.error('Failed to get username from AuthStore:', error);
  }
  
  return null;
}

export function getTokenTimestamp(): number | null {
  try {
    const authState = useAuthStore.getState();
    return authState.tokenTimestamp;
  } catch (error) {
    console.error('Failed to get token timestamp from AuthStore:', error);
    return null;
  }
}

export function isTokenLikelyExpired(): boolean {
  const timestamp = getTokenTimestamp();
  if (!timestamp) return true;
  
  // Check if token is older than 90 days (conservative estimate)
  const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ninetyDaysInMs;
}

export async function checkTokenValidity(): Promise<TokenValidationResult> {
  const token = getStoredToken();
  
  if (!token) {
    return {
      isValid: false,
      isExpired: false,
      error: 'No token found',
    };
  }

  // First check if token is likely expired based on age
  if (isTokenLikelyExpired()) {
    return {
      isValid: false,
      isExpired: true,
      error: 'Token is likely expired based on age',
    };
  }

  // Validate token with GitHub API
  return await validateToken(token);
}

export function clearTokenData(): void {
  try {
    const authStore = useAuthStore.getState();
    authStore.logout();
  } catch (error) {
    console.error('Failed to clear AuthStore:', error);
  }
}

export function storeTokenData(token: string, username: string): void {
  try {
    const authStore = useAuthStore.getState();
    authStore.login({ token, owner: username, repo: '' });
  } catch (error) {
    console.error('Failed to store in AuthStore:', error);
  }
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();
  const username = getStoredUsername();
  return !!(token && username);
}
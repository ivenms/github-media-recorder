import { LOCALSTORAGE_KEYS } from './appConfig';

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
  return localStorage.getItem(LOCALSTORAGE_KEYS.githubToken);
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(LOCALSTORAGE_KEYS.githubUsername);
}

export function getTokenTimestamp(): number | null {
  const timestamp = localStorage.getItem('github_token_timestamp');
  return timestamp ? parseInt(timestamp, 10) : null;
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
  localStorage.removeItem(LOCALSTORAGE_KEYS.githubToken);
  localStorage.removeItem(LOCALSTORAGE_KEYS.githubUsername);
  localStorage.removeItem('github_token_timestamp');
}

export function storeTokenData(token: string, username: string): void {
  localStorage.setItem(LOCALSTORAGE_KEYS.githubToken, token);
  localStorage.setItem(LOCALSTORAGE_KEYS.githubUsername, username);
  localStorage.setItem('github_token_timestamp', Date.now().toString());
}

export function isAuthenticated(): boolean {
  const token = getStoredToken();
  const username = getStoredUsername();
  return !!(token && username);
}
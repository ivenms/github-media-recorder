import React, { useState } from 'react';
import type { TokenSetupProps } from '../types';
import { LOCALSTORAGE_KEYS } from '../utils/appConfig';

const TokenSetup: React.FC<TokenSetupProps> = ({ onSuccess }) => {
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsVerifying(true);
    
    try {
      // Verify token by making a test API call
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Store token, user data, and timestamp
        localStorage.setItem(LOCALSTORAGE_KEYS.githubToken, token);
        localStorage.setItem(LOCALSTORAGE_KEYS.githubUsername, userData.login);
        localStorage.setItem('github_token_timestamp', Date.now().toString());
        
        onSuccess();
      } else {
        if (response.status === 401) {
          alert('Invalid token. Please check your Personal Access Token and make sure it has the correct permissions.');
        } else {
          alert('Failed to verify token. Please try again.');
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-gray-700 mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mobile Recorder PWA
            </h1>
            <p className="text-gray-600">
              Secure GitHub integration for uploading your media files
            </p>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">GitHub Personal Access Token Required</h2>
            <p className="text-gray-600 mb-4">
              This app needs a GitHub Personal Access Token to upload your recorded media files to your repositories. 
              Your token is stored securely in your browser and never shared with third parties.
            </p>
            
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className={`w-5 h-5 mr-2 transform transition-transform ${showInstructions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              How to create a Personal Access Token
            </button>
          </div>

          {showInstructions && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">Step-by-step instructions:</h3>
              <ol className="text-sm text-blue-800 space-y-3">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <div>
                    <p className="font-medium">Go to GitHub Settings</p>
                    <p>Navigate to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">github.com/settings/tokens</a></p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <p className="font-medium">Generate new token</p>
                    <p>Click "Generate new token" → "Generate new token (classic)"</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <div>
                    <p className="font-medium">Configure the token</p>
                    <p>• <strong>Note:</strong> "Mobile Recorder PWA"</p>
                    <p>• <strong>Expiration:</strong> Choose your preferred duration (90 days recommended)</p>
                    <p>• <strong>Scopes:</strong> Select <code className="bg-gray-100 px-1 rounded">repo</code> (Full control of private repositories)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <div>
                    <p className="font-medium">Copy the token</p>
                    <p>Click "Generate token" and copy the token immediately (it won't be shown again)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                  <div>
                    <p className="font-medium">Paste it below</p>
                    <p>Enter the token in the field below and click "Verify & Continue"</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Token should start with "ghp_" and be 40 characters long
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isVerifying || !token.trim()}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Secure & Private</p>
                  <p className="text-xs text-green-700">Your token is stored locally in your browser and only used to communicate directly with GitHub's API.</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Token Expiration</p>
                  <p className="text-xs text-yellow-700">Make sure to set an appropriate expiration date. You'll need to update the token when it expires.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenSetup;
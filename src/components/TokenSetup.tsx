import React, { useState } from 'react';
import type { TokenSetupProps } from '../types';
import Modal from './Modal';
import { useUIStore } from '../stores/uiStore';
import { getAppIconUrl } from '../utils/imageUtils';
import { useAuthStore } from '../stores/authStore';
import { getStandaloneStatus } from '../utils/standalone';
import InstallPrompt from './InstallPrompt';
import { getMobilePlatform } from '../utils/device';

const TokenSetup: React.FC<TokenSetupProps> = ({ onSuccess }) => {
  const { modal, openModal, closeModal } = useUIStore();
  const { login } = useAuthStore();
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const platform = getMobilePlatform();
  const standaloneStatus = getStandaloneStatus();
  const requiresPWA = platform !== null; // Require PWA for mobile platforms

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    // Check if PWA installation is required
    if (requiresPWA && !standaloneStatus.isStandalone) {
      openModal({ 
        type: 'alert', 
        message: 'Please install this app as a PWA first by using the install prompt above. This ensures the best experience and offline functionality.', 
        title: 'PWA Installation Required' 
      });
      return;
    }

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
        
        // Store in AuthStore
        login({ token, owner: userData.login, repo: '' }, userData);
        
        onSuccess();
      } else {
        if (response.status === 401) {
          openModal({ 
            type: 'alert', 
            message: 'Invalid token. Please check your Personal Access Token and make sure it has the correct permissions.', 
            title: 'Invalid Token' 
          });
        } else {
          openModal({ 
            type: 'alert', 
            message: 'Failed to verify token. Please try again.', 
            title: 'Verification Failed' 
          });
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      openModal({ 
        type: 'alert', 
        message: 'Network error. Please check your connection and try again.', 
        title: 'Network Error' 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 md:py-8">
      <div className="w-full max-w-2xl mx-auto space-y-3 md:space-y-6">
        <div className="text-center">
          <div className="mb-3 md:mb-4">
            <div className="flex justify-center mb-4">
              <img src={getAppIconUrl()} alt="GitHub Media Recorder" className="w-20 h-20 md:w-24 md:h-24" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words">
              Github Media Recorder for Mobile
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Secure GitHub integration for uploading your media files
            </p>
          </div>
        </div>

        {/* PWA Install Prompt for Mobile */}
        {requiresPWA && !standaloneStatus.isStandalone && (
          <div className="mb-4">
            <InstallPrompt />
          </div>
        )}

        {/* PWA Requirement Warning */}
        {requiresPWA && !standaloneStatus.isStandalone && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-orange-800 font-medium mb-1">PWA Installation Required</h3>
                <p className="text-orange-700 text-sm">
                  For the best mobile experience and offline functionality, please install this app as a PWA using the prompt above before setting up your GitHub token.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-3 md:p-6 overflow-hidden">
          <div className="mb-3 md:mb-5">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 break-words">
              GitHub Personal Access Token {requiresPWA && !standaloneStatus.isStandalone ? '(PWA Required)' : 'Required'}
            </h2>
            <p className="text-gray-600 mb-2 md:mb-3 text-sm md:text-base leading-relaxed">
              This app needs a GitHub Personal Access Token to upload your recorded media files to your repositories. 
              Your token is stored securely in your browser and never shared with third parties.
            </p>
            
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm md:text-base break-words"
            >
              <svg className={`w-4 h-4 md:w-5 md:h-5 mr-2 flex-shrink-0 transform transition-transform ${showInstructions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="break-words">How to create a Personal Access Token</span>
            </button>
          </div>

          {showInstructions && (
            <div className="mb-3 md:mb-4 p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
              <h3 className="font-semibold text-purple-900 mb-2 text-sm md:text-base break-words">Step-by-step instructions:</h3>
              <ol className="text-sm text-purple-800 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">Go to GitHub Settings</p>
                    <p className="break-all">Navigate to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">github.com/settings/tokens</a></p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">Generate new token</p>
                    <p className="break-words">Click "Generate new token" → "Generate new token (classic)"</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">Configure the token</p>
                    <p className="break-words">• <strong>Note:</strong> "Mobile Recorder PWA"</p>
                    <p className="break-words">• <strong>Expiration:</strong> Choose your preferred duration (90 days recommended)</p>
                    <p className="break-words">• <strong>Scopes:</strong> Select <code className="bg-gray-100 px-1 rounded break-all">repo</code> (Full control of private repositories)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">Copy the token</p>
                    <p className="break-words">Click "Generate token" and copy the token immediately (it won't be shown again)</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">5</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">Paste it below</p>
                    <p className="break-words">Enter the token in the field below and click "Verify & Continue"</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="token" className="block text-sm md:text-base font-medium text-gray-700 mb-1 break-words">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxx..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base min-w-0 box-border"
                required
              />
              <p className="text-sm text-gray-500 mt-1 break-words">
                Token should start with "ghp_" and be 40 characters long
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isVerifying || !token.trim() || (requiresPWA && !standaloneStatus.isStandalone)}
              className={`w-full px-4 py-3 md:py-4 rounded-lg font-medium transition-colors text-sm md:text-base min-w-0 ${
                requiresPWA && !standaloneStatus.isStandalone
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-400 disabled:bg-gray-400 disabled:cursor-not-allowed'
              }`}
            >
              {isVerifying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : requiresPWA && !standaloneStatus.isStandalone ? (
                'Install PWA First'
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          <div className="mt-3 md:mt-4 space-y-2">
            <div className="p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm md:text-base font-medium text-green-800 break-words">Secure & Private</p>
                  <p className="text-sm text-green-700 break-words">Your token is stored locally in your browser and only used to communicate directly with GitHub's API.</p>
                </div>
              </div>
            </div>
            
            <div className="p-2 md:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm md:text-base font-medium text-yellow-800 break-words">Token Expiration</p>
                  <p className="text-sm text-yellow-700 break-words">Make sure to set an appropriate expiration date. You'll need to update the token when it expires.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message || ''}
        type={modal.type || 'alert'}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </div>
  );
};

export default TokenSetup;
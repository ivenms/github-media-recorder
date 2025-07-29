import React, { useEffect, useState } from 'react';
import { getMobilePlatform } from '../utils/device';
import { getStandaloneStatus, debugStandaloneStatus } from '../utils/standalone';
import { validatePWACriteria, logPWAValidation, type PWAValidationResult } from '../utils/pwaValidation';

// InstallPrompt: Show PWA install prompt and status
const InstallPrompt: React.FC = () => {
  // State: install event, status
  const [deferredPrompt, setDeferredPrompt] = useState<Event & {prompt: () => void; userChoice: Promise<{outcome: string}>} | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [pwaValidation, setPwaValidation] = useState<PWAValidationResult | null>(null);
  const platform = getMobilePlatform();

  // Debug logging (only in development)
  const debug = (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[InstallPrompt]', message);
      setDebugInfo(prev => prev + message + '\n');
    }
  };

  useEffect(() => {
    debug(`Platform detected: ${platform}`);
    if (!platform) return;

    // Check PWA installation criteria
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const hasManifest = !!manifestLink;
    const hasSW = 'serviceWorker' in navigator;
    
    debug(`PWA Criteria - HTTPS: ${isHTTPS}, Manifest: ${hasManifest}, ServiceWorker: ${hasSW}`);
    debug(`Current URL: ${location.href}`);
    
    // Check service worker registration status
    if (hasSW) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        debug(`Service Worker registrations: ${registrations.length}`);
        registrations.forEach((registration, index) => {
          debug(`SW ${index}: ${registration.scope} - ${registration.active ? 'active' : 'not active'}`);
        });
      });
    }
    if (manifestLink) {
      const manifestUrl = (manifestLink as HTMLLinkElement).href;
      debug(`Manifest URL: ${manifestUrl}`);
      
      // Test if manifest is actually accessible
      fetch(manifestUrl)
        .then(response => {
          debug(`Manifest fetch status: ${response.status} ${response.statusText}`);
          if (response.ok) {
            return response.json();
          }
          throw new Error(`Failed to fetch manifest: ${response.status}`);
        })
        .then(manifest => {
          debug(`Manifest loaded successfully: ${manifest.name}`);
        })
        .catch(error => {
          debug(`Manifest fetch error: ${error.message}`);
        });
    } else {
      debug('No manifest link found in DOM');
    }

    // Hide prompt if already installed (standalone mode)
    const standaloneStatus = getStandaloneStatus();
    
    debug(`Standalone checks - Media: ${standaloneStatus.isStandaloneMedia}, iOS: ${standaloneStatus.isIOSStandalone}, Android: ${standaloneStatus.isAndroidStandalone}, PWA Context: ${standaloneStatus.isInPWAContext}, Installed Flag: ${standaloneStatus.wasInstalled}`);
    debug(`Is standalone: ${standaloneStatus.isStandalone}`);
    
    // Debug in development and validate PWA criteria
    if (process.env.NODE_ENV === 'development') {
      debugStandaloneStatus();
      
      validatePWACriteria().then(result => {
        setPwaValidation(result);
        logPWAValidation(result);
      });
    }
    
    if (standaloneStatus.isStandalone) {
      debug('App is already in standalone mode, hiding install prompt');
      return;
    }

    // Check if user previously dismissed the install prompt (within 24 hours)
    const dismissedKey = 'pwa-install-dismissed';
    const dismissedTime = localStorage.getItem(dismissedKey);
    const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime)) < 24 * 60 * 60 * 1000;
    debug(`Install prompt dismissed: ${!!isDismissed}${dismissedTime ? ` (${new Date(parseInt(dismissedTime)).toLocaleString()})` : ''}`);
    
    if (isDismissed) {
      debug('Install prompt was recently dismissed, not showing');
      return;
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e: Event & {prompt: () => void; userChoice: Promise<{outcome: string}>}) => {
      debug('beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    debug('Added beforeinstallprompt listener');

    // Check if app is already installed via related apps
    const checkRelatedApps = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          debug(`Related apps: ${relatedApps.length}`);
          if (relatedApps.length > 0) {
            debug('App appears to be already installed');
            return true;
          }
        } catch (error) {
          debug(`getInstalledRelatedApps error: ${error}`);
        }
      }
      return false;
    };

    // Android: Show prompt immediately if supported, even if beforeinstallprompt hasn't fired
    let androidTimer: number | undefined;
    if (platform === 'android') {
      debug('Setting up Android fallback timer');
      
      checkRelatedApps().then(isInstalled => {
        if (isInstalled) {
          debug('App already installed, not showing prompt');
          return;
        }
        
        // Give beforeinstallprompt a chance to fire first
        androidTimer = window.setTimeout(() => {
          debug(`Fallback timer fired. deferredPrompt: ${!!deferredPrompt}`);
          setShowPrompt(true);
        }, 2000); // Increased to 2 seconds to give more time
      });
    }

    // Listen for appinstalled event
    const appInstalledHandler = () => {
      debug('App installed event fired');
      setInstalled(true);
      // Set a flag that the app has been installed
      localStorage.setItem('pwa-installed', 'true');
    };
    window.addEventListener('appinstalled', appInstalledHandler);
    
    // Check if app was previously installed
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    debug(`Previously installed flag: ${wasInstalled}`);

    // iOS Safari: Show prompt if not in standalone
    if (platform === 'ios-safari' && !(window.navigator as Navigator & {standalone?: boolean}).standalone) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('appinstalled', appInstalledHandler);
      if (androidTimer) {
        window.clearTimeout(androidTimer);
      }
    };
  }, [platform]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      debug('Triggering install prompt');
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      debug(`User choice: ${choiceResult.outcome}`);
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      } else {
        // Store dismissal for 24 hours
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
    } else {
      // Fallback: try to trigger browser's native add to home screen
      debug('No deferred prompt, trying fallback install method');
      
      // Show a more prominent message for manual installation
      if (confirm('This app can be installed on your device for a better experience. Would you like to see installation instructions?')) {
        alert('To install:\n1. Tap the menu (⋮) in your browser\n2. Select "Add to Home screen" or "Install app"\n3. Confirm the installation');
        
        // Set a flag indicating user was shown install instructions
        localStorage.setItem('pwa-install-instructions-shown', Date.now().toString());
        
        // Hide the prompt for a while since user got instructions
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    debug('User dismissed install prompt');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Check if app was previously installed via localStorage
  const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
  
  if (!showPrompt || installed || wasInstalled) return null;

  return (
    <div style={{ padding: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <details style={{ marginBottom: 16, fontSize: '12px', fontFamily: 'monospace' }}>
          <summary>Debug Info</summary>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
            {debugInfo}
          </pre>
        </details>
      )}
      
      {platform === 'android' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <p style={{ margin: 0, flex: 1 }}>
              {deferredPrompt 
                ? 'Install this app for a better experience.' 
                : 'This app can be installed on your device for offline access and a native app experience.'
              }
            </p>
            <button 
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 8px',
                color: '#666'
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
          
          <button 
            onClick={handleInstallClick}
            style={{
              padding: '12px 24px',
              backgroundColor: deferredPrompt ? '#667eea' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            {deferredPrompt ? 'Install App' : 'Install App (Manual)'}
          </button>
          
          {!deferredPrompt && (
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
              Tap the button above for installation instructions.
            </p>
          )}
          
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
              <p style={{ margin: 0 }}>beforeinstallprompt: {deferredPrompt ? 'Available' : 'Not available'}</p>
              {pwaValidation && (
                <div style={{ margin: '4px 0', padding: '4px', backgroundColor: pwaValidation.isValid ? '#d4edda' : '#f8d7da', borderRadius: '3px' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: pwaValidation.isValid ? '#155724' : '#721c24' }}>
                    PWA Criteria: {pwaValidation.isValid ? '✅ Valid' : '❌ Invalid'}
                  </p>
                  {pwaValidation.errors.length > 0 && (
                    <div style={{ marginTop: '2px' }}>
                      <p style={{ margin: 0, fontSize: '10px', color: '#721c24' }}>Errors:</p>
                      {pwaValidation.errors.slice(0, 2).map((error, i) => (
                        <p key={i} style={{ margin: 0, fontSize: '10px', color: '#721c24' }}>• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button 
                  onClick={() => {
                    localStorage.setItem('pwa-installed', 'true');
                    setShowPrompt(false);
                  }}
                  style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                >
                  Hide (Mark as Installed)
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('pwa-installed');
                    localStorage.removeItem('pwa-install-dismissed');
                    window.location.reload();
                  }}
                  style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                >
                  Reset PWA State
                </button>
              </div>
            </div>
          )}
        </>
      ) : platform === 'ios-safari' ? (
        <>
          <p>
            Install this app on your iOS device using <strong>Safari</strong>: tap <strong>Share</strong> <span aria-label="share" role="img">🔗</span> and then <strong>Add to Home Screen</strong>.
          </p>
        </>
      ) : platform === 'ios-chrome' ? (
        <>
          <p>
            <strong>Note:</strong> Chrome on iOS does not support standalone PWA installation.<br />
            For the best experience, please open this site in <strong>Safari</strong> and add it to your home screen.
          </p>
        </>
      ) : null}
    </div>
  );
};

export default InstallPrompt;
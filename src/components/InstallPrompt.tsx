import React, { useEffect, useState } from 'react';
import { getMobilePlatform } from '../utils/device';
import { getStandaloneStatus } from '../utils/standalone';

// InstallPrompt: Show PWA install prompt and status
const InstallPrompt: React.FC = () => {
  // State: install event, status
  const [deferredPrompt, setDeferredPrompt] = useState<Event & {prompt: () => void; userChoice: Promise<{outcome: string}>} | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const platform = getMobilePlatform();


  useEffect(() => {
    if (!platform) return;

    // Hide prompt if already installed (standalone mode)
    const standaloneStatus = getStandaloneStatus();
    
    if (standaloneStatus.isStandalone) {
      return;
    }

    // Check if user previously dismissed the install prompt (within 24 hours)
    const dismissedKey = 'pwa-install-dismissed';
    const dismissedTime = localStorage.getItem(dismissedKey);
    const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime)) < 24 * 60 * 60 * 1000;
    
    if (isDismissed) {
      return;
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e: Event & {prompt: () => void; userChoice: Promise<{outcome: string}>}) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);

    // Check if app is already installed via related apps
    const checkRelatedApps = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as Navigator & { getInstalledRelatedApps: () => Promise<Array<{ id: string; platform: string; url: string }>> }).getInstalledRelatedApps();
          if (relatedApps.length > 0) {
            return true;
          }
        } catch (error) {
          // Silently handle error
        }
      }
      return false;
    };

    // Android: Show prompt immediately if supported, even if beforeinstallprompt hasn't fired
    let androidTimer: number | undefined;
    if (platform === 'android') {
      checkRelatedApps().then(isInstalled => {
        if (isInstalled) {
          return;
        }
        
        // Give beforeinstallprompt a chance to fire first
        androidTimer = window.setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
      });
    }

    // Listen for appinstalled event
    const appInstalledHandler = () => {
      setInstalled(true);
      // Set a flag that the app has been installed
      localStorage.setItem('pwa-installed', 'true');
    };
    window.addEventListener('appinstalled', appInstalledHandler);

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
  }, [platform, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      } else {
        // Store dismissal for 24 hours
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
    } else {
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
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Check if app was previously installed via localStorage
  const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
  
  if (!showPrompt || installed || wasInstalled) return null;

  return (
    <div style={{ padding: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
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
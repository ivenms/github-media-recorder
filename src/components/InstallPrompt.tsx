import React, { useEffect, useState } from 'react';

// Utility: Detect mobile device and platform
function getMobilePlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) {
    if (/crios/i.test(ua)) return 'ios-chrome';
    return 'ios-safari';
  }
  return null;
}

// InstallPrompt: Show PWA install prompt and status
const InstallPrompt: React.FC = () => {
  // State: install event, status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const platform = getMobilePlatform();

  useEffect(() => {
    if (!platform) return;

    // Hide prompt if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (platform === 'ios-safari' && (window.navigator as any).standalone);

    if (isStandalone) return;

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => setInstalled(true));

    // iOS Safari: Show prompt if not in standalone
    if (platform === 'ios-safari' && !(window.navigator as any).standalone) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [platform]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') setShowPrompt(false);
    }
  };

  if (!showPrompt || installed || (platform === 'ios-safari' && (window.navigator as any).standalone)) return null;

  return (
    <div style={{ padding: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
      {platform === 'android' && deferredPrompt ? (
        <>
          <p>Install this app for a better experience.</p>
          <button onClick={handleInstallClick}>Install App</button>
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
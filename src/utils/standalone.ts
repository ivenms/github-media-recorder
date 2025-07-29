import { getMobilePlatform } from './device';

export interface StandaloneStatus {
  isStandalone: boolean;
  isStandaloneMedia: boolean;
  isIOSStandalone: boolean;
  isAndroidStandalone: boolean;
  isInPWAContext: boolean;
  wasInstalled: boolean;
}

export function getStandaloneStatus(): StandaloneStatus {
  const platform = getMobilePlatform();
  
  // Basic media query checks
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  
  // iOS specific standalone detection
  const isIOSStandalone = (platform === 'ios-safari' && (window.navigator as Navigator & {standalone?: boolean}).standalone) || false;
  
  // Android specific standalone detection
  const isAndroidStandalone = platform === 'android' && 
    (window.matchMedia('(display-mode: standalone)').matches || 
     window.matchMedia('(display-mode: fullscreen)').matches ||
     window.matchMedia('(display-mode: minimal-ui)').matches);
  
  // Additional checks for Android PWA context - more conservative approach
  const isInPWAContext = 
    document.referrer.includes('android-app://') ||
    window.location.search.includes('utm_source=web_app_manifest') ||
    // Only check WebView if we're actually in a mobile context and have display-mode indicators
    (platform === 'android' && window.navigator.userAgent.includes('wv') && 
     (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches));

  // Check localStorage flag
  const wasInstalled = localStorage.getItem('pwa-installed') === 'true';

  // Only consider truly standalone if we have reliable indicators
  const isStandalone = isStandaloneMedia || isIOSStandalone || wasInstalled || 
    // For Android, require both platform detection AND display mode
    (platform === 'android' && isAndroidStandalone) ||
    // Or specific PWA context indicators
    isInPWAContext;

  return {
    isStandalone,
    isStandaloneMedia,
    isIOSStandalone,
    isAndroidStandalone,
    isInPWAContext,
    wasInstalled
  };
}

export function requireStandaloneMode(): boolean {
  const { isStandalone } = getStandaloneStatus();
  return isStandalone;
}

export function debugStandaloneStatus(): void {
  const status = getStandaloneStatus();
  const platform = getMobilePlatform();
  
  console.group('🔍 Standalone Detection Debug');
  console.log('Platform:', platform);
  console.log('User Agent:', navigator.userAgent);
  console.log('Referrer:', document.referrer);
  console.log('URL:', window.location.href);
  console.log('Display Mode (standalone):', window.matchMedia('(display-mode: standalone)').matches);
  console.log('Display Mode (fullscreen):', window.matchMedia('(display-mode: fullscreen)').matches);
  console.log('Display Mode (minimal-ui):', window.matchMedia('(display-mode: minimal-ui)').matches);
  console.log('iOS navigator.standalone:', (window.navigator as any).standalone);
  console.log('localStorage pwa-installed:', localStorage.getItem('pwa-installed'));
  console.log('');
  console.log('Detection Results:');
  console.table(status);
  console.groupEnd();
}
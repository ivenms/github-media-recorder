// Device detection utilities

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isDesktop(): boolean {
  return !isMobile();
}

export type MobilePlatform = 'android' | 'ios-safari' | 'ios-chrome' | null;

export function getMobilePlatform(): MobilePlatform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) {
    if (/crios/i.test(ua)) return 'ios-chrome';
    return 'ios-safari';
  }
  return null;
}
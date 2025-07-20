// Device detection utilities
import type { MobilePlatform } from '../types';

export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isDesktop(): boolean {
  return !isMobile();
}

export function getMobilePlatform(): MobilePlatform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) {
    if (/crios/i.test(ua)) return 'ios-chrome';
    return 'ios-safari';
  }
  return null;
}
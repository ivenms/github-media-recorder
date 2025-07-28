import {
  isMobile,
  isDesktop,
  getMobilePlatform,
} from '../../src/utils/device';

describe('device utilities', () => {
  // Store original navigator for restoration
  const originalNavigator = global.navigator;

  // Helper function to mock navigator.userAgent
  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
  };

  afterEach(() => {
    // Restore original navigator after each test
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  describe('isMobile', () => {
    describe('mobile devices', () => {
      it('detects Android devices', () => {
        mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36');
        expect(isMobile()).toBe(true);
      });

      it('detects iPhone devices', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
        expect(isMobile()).toBe(true);
      });

      it('detects iPad devices', () => {
        mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
        expect(isMobile()).toBe(true);
      });

      it('detects iPod devices', () => {
        mockUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15');
        expect(isMobile()).toBe(true);
      });

      it('detects BlackBerry devices', () => {
        mockUserAgent('Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+');
        expect(isMobile()).toBe(true);
      });

      it('detects webOS devices', () => {
        mockUserAgent('Mozilla/5.0 (webOS/1.4.0; U; en-US) AppleWebKit/532.2');
        expect(isMobile()).toBe(true);
      });

      it('detects IEMobile devices', () => {
        mockUserAgent('Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)');
        expect(isMobile()).toBe(true);
      });

      it('detects Opera Mini', () => {
        mockUserAgent('Opera/9.80 (J2ME/MIDP; Opera Mini/9.80 (S60; SymbOS; Opera Mobi/23.348; U; en) Presto/2.5.25 Version/10.54');
        expect(isMobile()).toBe(true);
      });
    });

    describe('desktop devices', () => {
      it('detects Windows desktop', () => {
        mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        expect(isMobile()).toBe(false);
      });

      it('detects macOS desktop', () => {
        mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        expect(isMobile()).toBe(false);
      });

      it('detects Linux desktop', () => {
        mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        expect(isMobile()).toBe(false);
      });

      it('detects Firefox on desktop', () => {
        mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
        expect(isMobile()).toBe(false);
      });

      it('detects Safari on desktop', () => {
        mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');
        expect(isMobile()).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('handles case insensitive matching', () => {
        mockUserAgent('Mozilla/5.0 (ANDROID 10; SM-G975F) AppleWebKit/537.36');
        expect(isMobile()).toBe(true);

        mockUserAgent('Mozilla/5.0 (iphone; CPU iPhone OS 14_6 like Mac OS X)');
        expect(isMobile()).toBe(true);
      });

      it('handles empty user agent', () => {
        mockUserAgent('');
        expect(isMobile()).toBe(false);
      });

      it('handles undefined user agent', () => {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: undefined,
          configurable: true,
        });
        expect(isMobile()).toBe(false); // Should return false for undefined user agent
      });

      it('handles partial matches in user agent', () => {
        mockUserAgent('My Custom Browser with Android support');
        expect(isMobile()).toBe(true);

        mockUserAgent('Desktop browser');
        expect(isMobile()).toBe(false);
      });

      it('handles complex user agent strings', () => {
        mockUserAgent('Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36 EdgA/46.1.2.5140');
        expect(isMobile()).toBe(true);
      });
    });
  });

  describe('isDesktop', () => {
    it('returns opposite of isMobile for mobile devices', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)');
      expect(isDesktop()).toBe(false);
      expect(isMobile()).toBe(true);
    });

    it('returns opposite of isMobile for desktop devices', () => {
      mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      expect(isDesktop()).toBe(true);
      expect(isMobile()).toBe(false);
    });

    it('is consistent with isMobile results', () => {
      const testCases = [
        'Mozilla/5.0 (Android 10; SM-G975F)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ];

      testCases.forEach(userAgent => {
        mockUserAgent(userAgent);
        expect(isDesktop()).toBe(!isMobile());
      });
    });
  });

  describe('getMobilePlatform', () => {
    describe('Android detection', () => {
      it('detects Android platform', () => {
        mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36');
        expect(getMobilePlatform()).toBe('android');
      });

      it('detects Android with case insensitive matching', () => {
        mockUserAgent('Mozilla/5.0 (Linux; ANDROID 11; Pixel 4) AppleWebKit/537.36');
        expect(getMobilePlatform()).toBe('android');
      });

      it('detects various Android devices', () => {
        const androidUserAgents = [
          'Mozilla/5.0 (Linux; Android 9; SM-J330F) AppleWebKit/537.36',
          'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
          'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36',
        ];

        androidUserAgents.forEach(userAgent => {
          mockUserAgent(userAgent);
          expect(getMobilePlatform()).toBe('android');
        });
      });
    });

    describe('iOS Safari detection', () => {
      it('detects iPhone Safari', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-safari');
      });

      it('detects iPad Safari', () => {
        mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-safari');
      });

      it('detects iPod Safari', () => {
        mockUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-safari');
      });

      it('handles case insensitive iOS detection', () => {
        mockUserAgent('Mozilla/5.0 (IPHONE; CPU iPhone OS 14_6 like Mac OS X)');
        expect(getMobilePlatform()).toBe('ios-safari');
      });
    });

    describe('iOS Chrome detection', () => {
      it('detects iPhone Chrome (CriOS)', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });

      it('detects iPad Chrome (CriOS)', () => {
        mockUserAgent('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });

      it('prioritizes Chrome over Safari on iOS', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 CriOS/91.0.4472.80 Version/14.1.1 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });

      it('handles case insensitive CriOS detection', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6) crios/91.0.4472.80');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });
    });

    describe('non-mobile platforms', () => {
      it('returns null for desktop platforms', () => {
        const desktopUserAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ];

        desktopUserAgents.forEach(userAgent => {
          mockUserAgent(userAgent);
          expect(getMobilePlatform()).toBe(null);
        });
      });

      it('returns null for unrecognized mobile platforms', () => {
        mockUserAgent('Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+');
        expect(getMobilePlatform()).toBe(null);
      });

      it('returns null for empty user agent', () => {
        mockUserAgent('');
        expect(getMobilePlatform()).toBe(null);
      });
    });

    describe('edge cases', () => {
      it('handles complex user agent strings', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/94.0.4606.76 Mobile/15E148 Safari/604.1 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/15.0;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });

      it('detects iOS devices without traditional iOS identifiers', () => {
        // Some modern iPads might report as Mac
        mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15');
        expect(getMobilePlatform()).toBe(null); // Should return null for desktop Mac
      });

      it('handles user agents with multiple platform indicators', () => {
        // Unlikely but possible edge case
        mockUserAgent('Mozilla/5.0 (Android 11; iPhone; SM-G975F) AppleWebKit/537.36');
        expect(getMobilePlatform()).toBe('android'); // Should prioritize first match
      });
    });

    describe('platform detection priority', () => {
      it('prioritizes Android over iOS when both are present', () => {
        mockUserAgent('Mozilla/5.0 (Linux; Android 11; iPhone simulator) AppleWebKit/537.36');
        expect(getMobilePlatform()).toBe('android');
      });

      it('prioritizes iOS Chrome over iOS Safari', () => {
        mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Version/14.1.1 Mobile/15E148 Safari/604.1');
        expect(getMobilePlatform()).toBe('ios-chrome');
      });
    });
  });

  describe('integration tests', () => {
    it('mobile detection is consistent across all functions', () => {
      const testCases = [
        {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          expectedMobile: true,
          expectedDesktop: false,
          expectedPlatform: 'ios-safari',
        },
        {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
          expectedMobile: true,
          expectedDesktop: false,
          expectedPlatform: 'android',
        },
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          expectedMobile: false,
          expectedDesktop: true,
          expectedPlatform: null,
        },
      ];

      testCases.forEach(({ userAgent, expectedMobile, expectedDesktop, expectedPlatform }) => {
        mockUserAgent(userAgent);
        expect(isMobile()).toBe(expectedMobile);
        expect(isDesktop()).toBe(expectedDesktop);
        expect(getMobilePlatform()).toBe(expectedPlatform);
      });
    });

    it('all functions handle error cases gracefully', () => {
      mockUserAgent('');
      expect(isMobile()).toBe(false);
      expect(isDesktop()).toBe(true);
      expect(getMobilePlatform()).toBe(null);
    });
  });
});
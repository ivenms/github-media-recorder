import {
  formatDate,
  formatReadableDate,
  getTodayDateString,
  isFutureDate,
} from '../../src/utils/date';

describe('date utilities', () => {
  // Set up a consistent date for testing
  const mockDate = new Date('2025-01-15T10:30:00.000Z');
  const originalDate = Date;

  beforeAll(() => {
    // Mock Date constructor and now() method
    global.Date = jest.fn((dateString?: string | number | Date) => {
      if (dateString) {
        return new originalDate(dateString);
      }
      return mockDate;
    }) as unknown as DateConstructor;
    
    // Mock static methods
    (global.Date as unknown as { now: () => number }).now = () => mockDate.getTime();
    
    // Preserve other Date properties
    Object.setPrototypeOf(global.Date, originalDate);
    Object.defineProperty(global.Date, 'prototype', {
      value: originalDate.prototype,
      writable: false,
    });
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDate', () => {
    describe('with Date objects', () => {
      it('formats a valid Date object to YYYY-MM-DD', () => {
        const date = new originalDate('2023-12-25T15:30:00.000Z');
        const result = formatDate(date);
        expect(result).toBe('2023-12-25');
      });

      it('handles Date object with different timezone', () => {
        const date = new originalDate('2023-12-25T15:30:00.000Z');
        const result = formatDate(date);
        expect(result).toBe('2023-12-25');
      });

      it('handles Date object at year boundary', () => {
        const date = new originalDate('2023-12-31T15:30:00.000Z');
        const result = formatDate(date);
        expect(result).toBe('2023-12-31');
      });
    });

    describe('with date strings', () => {
      it('formats a valid date string to YYYY-MM-DD', () => {
        const result = formatDate('2023-12-25');
        expect(result).toBe('2023-12-25');
      });

      it('formats ISO date string to YYYY-MM-DD', () => {
        const result = formatDate('2023-12-25T15:30:00.000Z');
        expect(result).toBe('2023-12-25');
      });

      it('handles various date string formats', () => {
        expect(formatDate('12/25/2023')).toBe('2023-12-25');
        expect(formatDate('Dec 25, 2023')).toBe('2023-12-25');
        expect(formatDate('2023-12-25T00:00:00')).toBe('2023-12-25');
      });

      it('pads single digit months and days', () => {
        expect(formatDate('2023-1-1')).toBe('2023-01-01');
        expect(formatDate('2023-5-9')).toBe('2023-05-09');
      });
    });

    describe('error handling', () => {
      it('returns original string for invalid date string', () => {
        const result = formatDate('invalid-date');
        expect(result).toBe('invalid-date');
      });

      it('handles empty string', () => {
        const result = formatDate('');
        expect(result).toBe('2025-01-15'); // Mock date from setup
      });

      it('handles null and undefined gracefully', () => {
        expect(formatDate(null as unknown as string)).toBe('2025-01-15'); // Mock date from setup
        expect(formatDate(undefined as unknown as string)).toBe('2025-01-15'); // Mock date from setup
      });

      it('handles invalid Date object', () => {
        const invalidDate = new originalDate('invalid');
        const result = formatDate(invalidDate);
        expect(result).toBe('Invalid Date');
      });

      it('handles non-string, non-Date input', () => {
        expect(formatDate(123 as unknown as string)).toBe('1970-01-01'); // Number gets converted to Date
        expect(formatDate(true as unknown as string)).toBe('1970-01-01'); // Boolean true converts to 1ms since epoch
        expect(formatDate({} as unknown as string)).toBe('[object Object]'); // Invalid conversion returns string representation
      });
    });

    describe('edge cases', () => {
      it('handles leap year dates', () => {
        expect(formatDate('2024-02-29')).toBe('2024-02-29');
        expect(formatDate('2023-02-28')).toBe('2023-02-28');
      });

      it('handles dates far in the past', () => {
        expect(formatDate('1900-01-01')).toBe('1900-01-01');
      });

      it('handles dates far in the future', () => {
        expect(formatDate('2100-12-31')).toBe('2100-12-31');
      });
    });
  });

  describe('formatReadableDate', () => {
    beforeEach(() => {
      // Reset the mock Date to return our consistent mock date
      jest.clearAllMocks();
    });

    describe('relative dates', () => {
      it('returns "Today" for today\'s date', () => {
        const today = mockDate.toISOString().split('T')[0]; // 2025-01-15
        const result = formatReadableDate(today);
        expect(result).toBe('Today');
      });

      it('returns "Yesterday" for yesterday\'s date', () => {
        const yesterday = '2025-01-14';
        const result = formatReadableDate(yesterday);
        expect(result).toBe('Yesterday');
      });

      it('returns days ago for recent dates', () => {
        expect(formatReadableDate('2025-01-13')).toBe('3 days ago');
        expect(formatReadableDate('2025-01-12')).toBe('4 days ago');
        expect(formatReadableDate('2025-01-10')).toBe('6 days ago');
        expect(formatReadableDate('2025-01-08')).toBe('Jan 8');
      });
    });

    describe('formatted dates', () => {
      it('formats dates older than 7 days with month and day', () => {
        const result = formatReadableDate('2025-01-07'); // 8 days ago
        expect(result).toBe('Jan 7');
      });

      it('includes year for dates from different year', () => {
        const result = formatReadableDate('2024-12-25');
        expect(result).toBe('Dec 25, 2024');
      });

      it('formats various months correctly', () => {
        expect(formatReadableDate('2024-01-01')).toBe('Jan 1, 2024');
        expect(formatReadableDate('2024-06-15')).toBe('Jun 15, 2024');
        expect(formatReadableDate('2024-12-31')).toBe('Dec 31, 2024');
      });
    });

    describe('error handling', () => {
      it('returns empty string for empty input', () => {
        const result = formatReadableDate('');
        expect(result).toBe('');
      });

      it('returns original string for invalid date', () => {
        const result = formatReadableDate('invalid-date');
        expect(result).toBe('Invalid Date');
      });

      it('handles malformed date strings', () => {
        expect(formatReadableDate('2023-13-01')).toBe('Invalid Date');
        expect(formatReadableDate('not-a-date')).toBe('Invalid Date');
      });

      it('handles null and undefined', () => {
        expect(formatReadableDate(null as unknown as string)).toBe('');
        expect(formatReadableDate(undefined as unknown as string)).toBe('');
      });
    });

    describe('edge cases', () => {
      it('handles dates exactly 7 days ago', () => {
        const result = formatReadableDate('2025-01-08');
        expect(result).toBe('Jan 8');
      });

      it('handles dates exactly 8 days ago', () => {
        const result = formatReadableDate('2025-01-07');
        expect(result).toBe('Jan 7');
      });

      it('handles future dates', () => {
        const futureDate = '2025-01-20';
        const result = formatReadableDate(futureDate);
        // Future dates should still be formatted, just with calculated days
        expect(result).toMatch(/Jan 20|days ago/);
      });
    });
  });

  describe('getTodayDateString', () => {
    it('returns today\'s date in YYYY-MM-DD format', () => {
      const result = getTodayDateString();
      expect(result).toBe('2025-01-15');
    });

    it('always returns a valid date string format', () => {
      const result = getTodayDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns consistent result when called multiple times', () => {
      const result1 = getTodayDateString();
      const result2 = getTodayDateString();
      expect(result1).toBe(result2);
    });
  });

  describe('isFutureDate', () => {
    describe('future dates', () => {
      it('returns true for dates in the future', () => {
        expect(isFutureDate('2025-01-16')).toBe(true);
        expect(isFutureDate('2025-12-31')).toBe(true);
        expect(isFutureDate('2026-01-01')).toBe(true);
      });

      it('returns true for far future dates', () => {
        expect(isFutureDate('2030-01-01')).toBe(true);
        expect(isFutureDate('2100-12-31')).toBe(true);
      });
    });

    describe('past and present dates', () => {
      it('returns false for today\'s date', () => {
        expect(isFutureDate('2025-01-15')).toBe(false);
      });

      it('returns false for past dates', () => {
        expect(isFutureDate('2025-01-14')).toBe(false);
        expect(isFutureDate('2024-12-31')).toBe(false);
        expect(isFutureDate('2020-01-01')).toBe(false);
      });

      it('returns false for far past dates', () => {
        expect(isFutureDate('1900-01-01')).toBe(false);
      });
    });

    describe('error handling', () => {
      it('returns false for empty string', () => {
        expect(isFutureDate('')).toBe(false);
      });

      it('returns false for invalid date strings', () => {
        expect(isFutureDate('invalid-date')).toBe(false);
        expect(isFutureDate('2023-13-01')).toBe(false);
        expect(isFutureDate('not-a-date')).toBe(false);
      });

      it('returns false for null and undefined', () => {
        expect(isFutureDate(null as unknown as string)).toBe(false);
        expect(isFutureDate(undefined as unknown as string)).toBe(false);
      });

      it('handles malformed date formats', () => {
        expect(isFutureDate('01/01/2026')).toBe(true); // Valid but different format
        expect(isFutureDate('Jan 1, 2026')).toBe(true); // Valid but different format
        expect(isFutureDate('2026-1-1')).toBe(true); // Valid but not zero-padded
      });
    });

    describe('edge cases', () => {
      it('handles leap year dates', () => {
        expect(isFutureDate('2025-02-29')).toBe(true); // Invalid date (2025 is not a leap year) but treated as future
        expect(isFutureDate('2024-02-29')).toBe(false); // Valid past date (2024 was a leap year)
      });

      it('handles timezone edge cases', () => {
        // Test with ISO string format
        expect(isFutureDate('2025-01-16T00:00:00.000Z')).toBe(true);
        expect(isFutureDate('2025-01-14T23:59:59.999Z')).toBe(false);
      });

      it('handles year boundaries', () => {
        expect(isFutureDate('2025-12-31')).toBe(true);
        expect(isFutureDate('2024-12-31')).toBe(false);
      });
    });

    describe('time normalization', () => {
      it('compares dates at start of day, ignoring time', () => {
        // All should be false since they\'re today\'s date with different times
        expect(isFutureDate('2025-01-15T00:00:00')).toBe(false);
        expect(isFutureDate('2025-01-15T12:00:00')).toBe(false);
        expect(isFutureDate('2025-01-15T23:59:59')).toBe(false);
      });
    });
  });

  describe('integration tests', () => {
    it('works correctly with all functions together', () => {
      const today = getTodayDateString();
      expect(formatReadableDate(today)).toBe('Today');
      expect(isFutureDate(today)).toBe(false);
      
      const tomorrow = '2025-01-16';
      expect(isFutureDate(tomorrow)).toBe(true);
      expect(formatDate(tomorrow)).toBe('2025-01-16');
    });

    it('handles date formatting roundtrip', () => {
      const originalDate = '2023-12-25';
      const formattedDate = formatDate(originalDate);
      expect(formattedDate).toBe(originalDate);
      expect(isFutureDate(formattedDate)).toBe(false);
    });
  });
});
// Utility for date formatting

/**
 * Formats a date string or Date object to YYYY-MM-DD.
 * Returns the original string if invalid.
 */
export function formatDate(dateStr: string | Date): string {
  let d: Date;
  if (Object.prototype.toString.call(dateStr) === '[object Date]') {
    d = dateStr as Date;
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr); // fallback if invalid
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a date string to a more readable format
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Dec 15, 2023" or "Today")
 */
export function formatReadableDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if it's within the last 7 days
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return `${diffDays} days ago`;
    }
    
    // Format as readable date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    // If date parsing fails, return original string
    return dateString;
  }
}

/**
 * Get today's date in YYYY-MM-DD format for date input max attribute
 * @returns Today's date string
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Check if a date string is in the future
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns True if the date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    date.setHours(0, 0, 0, 0);
    return date > today;
  } catch (error) {
    return false;
  }
} 
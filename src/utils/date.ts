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
/**
 * PAM Date Formatting Utility
 *
 * Ensures all dates sent to PAM backend are in the strict YYYY-MM-DD format
 * that the backend validation expects (%Y-%m-%d format).
 */

/**
 * Format a date to YYYY-MM-DD format for PAM backend
 *
 * @param date - Date to format (can be Date object, ISO string, or YYYY-MM-DD string)
 * @returns Date string in YYYY-MM-DD format, or null if invalid
 */
export function formatDateForPam(date: Date | string | null | undefined): string | null {
  if (!date) {
    return null;
  }

  try {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Handle various string formats
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Already in YYYY-MM-DD format - validate it's a real date
        const testDate = new Date(date);
        if (isNaN(testDate.getTime())) {
          console.warn('Invalid date string in YYYY-MM-DD format:', date);
          return null;
        }
        return date;
      }

      // Parse ISO string or other formats
      dateObj = new Date(date);
    } else {
      return null;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDateForPam:', date);
      return null;
    }

    // Format to YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Error formatting date for PAM:', error, date);
    return null;
  }
}

/**
 * Format today's date in YYYY-MM-DD format for PAM backend
 *
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayForPam(): string {
  const today = new Date();
  return formatDateForPam(today) || '';
}

/**
 * Clean an object's date fields to ensure PAM compatibility
 * Automatically formats any fields containing 'date' in their name
 *
 * @param obj - Object that may contain date fields
 * @returns Object with date fields formatted for PAM
 */
export function cleanDatesForPam(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes('date') && value && !Array.isArray(value)) {
      // Format date fields (but not arrays containing 'date' in the key name)
      const formattedDate = formatDateForPam(value);
      cleaned[key] = formattedDate;
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively clean nested objects (but not arrays or dates)
      cleaned[key] = cleanDatesForPam(value);
    } else {
      // Keep other values as is (including arrays)
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Validate that a date string is in the correct PAM format
 *
 * @param dateString - Date string to validate
 * @returns True if the date is in YYYY-MM-DD format
 */
export function isValidPamDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}
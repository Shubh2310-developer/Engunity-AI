/**
 * Data Formatting Utilities for Engunity AI
 * Reusable formatting functions for consistent data display
 * 
 * Stack: Next.js 14 + TypeScript + Tailwind + ShadCN UI
 * File: frontend/src/lib/utils/formatters.ts
 */

// ========================================
// DATE & TIME FORMATTERS
// ========================================

/**
 * Formats a date into a readable format (e.g., "Jul 19, 2025")
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormat options for customization
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2025-07-19T10:35:00Z') // "Jul 19, 2025"
 * formatDate(new Date(), { weekday: 'long' }) // "Monday, Jul 19, 2025"
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats a date with time (e.g., "Jul 19, 2025 at 10:35 AM")
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormat options for customization
 * @returns Formatted date and time string
 * 
 * @example
 * formatTimestamp('2025-07-19T10:35:00Z') // "Jul 19, 2025 at 10:35 AM"
 * formatTimestamp(new Date(), { timeZone: 'UTC' }) // "Jul 19, 2025 at 3:35 PM"
 */
export function formatTimestamp(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.warn('Error formatting timestamp:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date string or Date object
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Relative time string
 * 
 * @example
 * timeAgo('2025-07-19T08:35:00Z') // "2 hours ago" (if current time is 10:35)
 * timeAgo('2025-07-21T10:35:00Z') // "in 2 days"
 */
export function timeAgo(date: string | Date, locale: string = 'en-US'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    // Handle future dates
    const isFuture = diffInSeconds < 0;
    const absDiff = Math.abs(diffInSeconds);

    // Time intervals in seconds
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];

    for (const interval of intervals) {
      const value = Math.floor(absDiff / interval.seconds);
      
      if (value >= 1) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        const timeValue = isFuture ? value : -value;
        return rtf.format(timeValue, interval.label as Intl.RelativeTimeFormatUnit);
      }
    }

    return 'just now';
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'Unknown time';
  }
}

/**
 * Formats time duration in a human-readable format
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(65000) // "1m 5s"
 * formatDuration(3661000) // "1h 1m 1s"
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 && parts.length < 2) parts.push(`${seconds % 60}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}

// ========================================
// NUMBER & CURRENCY FORMATTERS
// ========================================

/**
 * Formats a number as currency (e.g., "$1,299.00")
 * @param value - Numeric value to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1299.99) // "$1,299.99"
 * formatCurrency(1000, 'EUR', 'de-DE') // "1.000,00 €"
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (error) {
    console.warn('Error formatting currency:', error);
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Formats a number with thousand separators (e.g., "12,345")
 * @param value - Numeric value to format
 * @param locale - Locale for formatting (default: 'en-US')
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(12345) // "12,345"
 * formatNumber(12345.678, 'en-US', { maximumFractionDigits: 2 }) // "12,345.68"
 */
export function formatNumber(
  value: number,
  locale: string = 'en-US',
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (error) {
    console.warn('Error formatting number:', error);
    return value.toString();
  }
}

/**
 * Formats a number as a percentage (e.g., "75.5%")
 * @param value - Decimal value (0.755 for 75.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(0.755) // "75.5%"
 * formatPercentage(0.1234, 2) // "12.34%"
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (error) {
    console.warn('Error formatting percentage:', error);
    return `${(value * 100).toFixed(decimals)}%`;
  }
}

/**
 * Formats large numbers with suffixes (e.g., "1.2K", "3.5M")
 * @param value - Numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number with suffix
 * 
 * @example
 * formatCompactNumber(1234) // "1.2K"
 * formatCompactNumber(1500000) // "1.5M"
 * formatCompactNumber(2500000000) // "2.5B"
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let tier = 0;
  let scaled = value;

  while (Math.abs(scaled) >= 1000 && tier < suffixes.length - 1) {
    scaled /= 1000;
    tier++;
  }

  if (tier === 0) {
    return value.toString();
  }

  return scaled.toFixed(decimals).replace(/\.0$/, '') + suffixes[tier];
}

// ========================================
// FILE SIZE & TYPE FORMATTERS
// ========================================

/**
 * Formats file size in bytes to human-readable format (e.g., "2.1 MB")
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size string
 * 
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(2048576) // "2.0 MB"
 * formatFileSize(1073741824) // "1.0 GB"
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Invalid Size';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = bytes / Math.pow(k, i);
  const formattedSize = i === 0 ? size.toString() : size.toFixed(decimals);

  return `${formattedSize} ${sizes[i]}`;
}

/**
 * Formats file type/extension to readable format (e.g., "PDF Document")
 * @param type - File type or MIME type
 * @returns Formatted file type string
 * 
 * @example
 * formatFileType('pdf') // "PDF Document"
 * formatFileType('application/pdf') // "PDF Document"
 * formatFileType('image/jpeg') // "JPEG Image"
 */
export function formatFileType(type: string): string {
  const typeMap: Record<string, string> = {
    // Documents
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document',
    'txt': 'Text File',
    'md': 'Markdown File',
    'rtf': 'Rich Text File',
    
    // Spreadsheets
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'csv': 'CSV File',
    
    // Presentations
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
    
    // Images
    'jpg': 'JPEG Image',
    'jpeg': 'JPEG Image',
    'png': 'PNG Image',
    'gif': 'GIF Image',
    'svg': 'SVG Image',
    'webp': 'WebP Image',
    'bmp': 'Bitmap Image',
    
    // Code files
    'js': 'JavaScript File',
    'ts': 'TypeScript File',
    'py': 'Python File',
    'java': 'Java File',
    'cpp': 'C++ File',
    'c': 'C File',
    'html': 'HTML File',
    'css': 'CSS File',
    'json': 'JSON File',
    'xml': 'XML File',
    'yaml': 'YAML File',
    'yml': 'YAML File',
    
    // Archives
    'zip': 'ZIP Archive',
    'rar': 'RAR Archive',
    '7z': '7-Zip Archive',
    'tar': 'TAR Archive',
    
    // Audio/Video
    'mp3': 'MP3 Audio',
    'mp4': 'MP4 Video',
    'avi': 'AVI Video',
    'mov': 'QuickTime Video',
    'wav': 'WAV Audio',
    
    // Other
    'sql': 'SQL File',
    'db': 'Database File',
    'log': 'Log File'
  };

  // Handle MIME types
  if (type.includes('/')) {
    const [category, subtype] = type.split('/');
    const extension = subtype.split('+')[0]; // Handle types like 'application/vnd.ms-excel'
    
    if (typeMap[extension]) {
      return typeMap[extension];
    }
    
    // Fallback for MIME types
    switch (category) {
      case 'image': return `${subtype.toUpperCase()} Image`;
      case 'video': return `${subtype.toUpperCase()} Video`;
      case 'audio': return `${subtype.toUpperCase()} Audio`;
      case 'text': return 'Text File';
      case 'application': return 'Application File';
      default: return 'Unknown File';
    }
  }

  // Handle extensions
  const extension = type.toLowerCase().replace('.', '');
  return typeMap[extension] || `${extension.toUpperCase()} File`;
}

// ========================================
// TEXT UTILITIES
// ========================================

/**
 * Truncates text to specified length with ellipsis (e.g., "This is a long str...")
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text string
 * 
 * @example
 * truncateText('This is a very long text', 15) // "This is a very..."
 * truncateText('Short text', 20) // "Short text"
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Capitalizes first letter of each word (e.g., "document q&a" → "Document Q&A")
 * @param text - Text to capitalize
 * @returns Capitalized text string
 * 
 * @example
 * capitalizeWords('document q&a') // "Document Q&A"
 * capitalizeWords('hello world') // "Hello World"
 */
export function capitalizeWords(text: string): string {
  if (!text) return text;

  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Capitalizes only the first letter of a string
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 * 
 * @example
 * capitalize('hello world') // "Hello world"
 * capitalize('HELLO WORLD') // "Hello world"
 */
export function capitalize(text: string): string {
  if (!text) return text;
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Converts text to slug format (e.g., "Hello World!" → "hello-world")
 * @param text - Text to convert to slug
 * @returns Slug-formatted string
 * 
 * @example
 * toSlug('Hello World!') // "hello-world"
 * toSlug('AI & Machine Learning') // "ai-machine-learning"
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extracts initials from a name (e.g., "John Doe" → "JD")
 * @param name - Full name string
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string
 * 
 * @example
 * getInitials('John Doe') // "JD"
 * getInitials('John Michael Doe', 3) // "JMD"
 */
export function getInitials(name: string, maxInitials: number = 2): string {
  if (!name) return '';

  return name
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Highlights search terms in text with HTML markers
 * @param text - Text to search in
 * @param searchTerm - Term to highlight
 * @param className - CSS class for highlighting (default: 'highlight')
 * @returns Text with highlighted search terms
 * 
 * @example
 * highlightText('Hello world', 'world') // 'Hello <mark class="highlight">world</mark>'
 */
export function highlightText(
  text: string,
  searchTerm: string,
  className: string = 'highlight'
): string {
  if (!text || !searchTerm) return text;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<mark class="${className}">$1</mark>`);
}

// ========================================
// SPECIALIZED FORMATTERS
// ========================================

/**
 * Formats API response time in a human-readable format
 * @param milliseconds - Response time in milliseconds
 * @returns Formatted response time string
 * 
 * @example
 * formatResponseTime(250) // "250ms"
 * formatResponseTime(1500) // "1.5s"
 */
export function formatResponseTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    return formatDuration(milliseconds);
  }
}

/**
 * Formats token count with appropriate suffix
 * @param tokens - Number of tokens
 * @returns Formatted token string
 * 
 * @example
 * formatTokens(1500) // "1.5K tokens"
 * formatTokens(500) // "500 tokens"
 */
export function formatTokens(tokens: number): string {
  const formatted = formatCompactNumber(tokens);
  const suffix = tokens === 1 ? 'token' : 'tokens';
  return `${formatted} ${suffix}`;
}

/**
 * Formats credit amount for display
 * @param credits - Number of credits
 * @returns Formatted credit string
 * 
 * @example
 * formatCredits(1500) // "1,500 credits"
 * formatCredits(1) // "1 credit"
 */
export function formatCredits(credits: number): string {
  const formatted = formatNumber(credits);
  const suffix = credits === 1 ? 'credit' : 'credits';
  return `${formatted} ${suffix}`;
}

/**
 * Formats user role for display
 * @param role - User role string
 * @returns Formatted role string
 * 
 * @example
 * formatUserRole('super_admin') // "Super Admin"
 * formatUserRole('beta_tester') // "Beta Tester"
 */
export function formatUserRole(role: string): string {
  return role
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Formats phone number for display
 * @param phone - Phone number string
 * @returns Formatted phone number
 * 
 * @example
 * formatPhoneNumber('1234567890') // "(123) 456-7890"
 * formatPhoneNumber('+1234567890') // "+1 (234) 567-890"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle different phone number lengths
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US format with country code: +1 (234) 567-8900
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else {
    // International format: just add spaces every 3-4 digits
    return cleaned.replace(/(\d{1,4})(?=\d)/g, '$1 ').trim();
  }
}
/**
 * Authentication Persistence Utilities
 * Handles 30-day persistent login functionality
 */

/**
 * Get the number of days since the user last logged in
 */
export function getDaysSinceLogin(): number {
  const loginTime = localStorage.getItem('engunity-login-time');
  if (!loginTime) return 0;
  
  const daysSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60 * 24);
  return Math.max(0, daysSinceLogin);
}

/**
 * Get the number of days remaining until the user needs to log in again
 */
export function getDaysUntilExpiry(): number {
  const daysSinceLogin = getDaysSinceLogin();
  return Math.max(0, 30 - daysSinceLogin);
}

/**
 * Check if the user's persistent session has expired
 */
export function isSessionExpired(): boolean {
  const loginTime = localStorage.getItem('engunity-login-time');
  if (!loginTime) return true;
  
  const daysSinceLogin = getDaysSinceLogin();
  return daysSinceLogin > 30;
}

/**
 * Format the time remaining until session expiry
 */
export function formatTimeUntilExpiry(): string {
  const daysRemaining = getDaysUntilExpiry();
  
  if (daysRemaining <= 0) return 'Session expired';
  if (daysRemaining === 1) return '1 day remaining';
  if (daysRemaining < 30) return `${Math.floor(daysRemaining)} days remaining`;
  
  return '30 days of persistent login';
}

/**
 * Clear all persistence data (used on explicit sign out)
 */
export function clearPersistenceData(): void {
  localStorage.removeItem('engunity-auth-token');
  localStorage.removeItem('engunity-login-time');
}

/**
 * Set the login time for tracking 30-day persistence
 */
export function setLoginTime(): void {
  localStorage.setItem('engunity-login-time', Date.now().toString());
}
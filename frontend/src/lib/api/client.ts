/**
 * API Client for Engunity AI
 * Type-safe HTTP client with authentication and error handling
 * 
 * Stack: Next.js 14 + TypeScript + Supabase Auth
 * File: frontend/src/lib/api/client.ts
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

// ========================================
// TYPE DEFINITIONS
// ========================================

/** Standard API response wrapper */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
}

/** API error details */
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/** HTTP methods supported by the API client */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Request configuration options */
export interface RequestConfig extends Omit<RequestInit, 'method' | 'body'> {
  /** HTTP method */
  method?: HttpMethod;
  /** Request body data */
  data?: any;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include auth token automatically */
  requiresAuth?: boolean;
  /** Base URL override */
  baseUrl?: string;
  /** Whether to parse response as JSON */
  parseJson?: boolean;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

/** Fetch response wrapper */
export interface FetchResult<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  response?: Response;
}

// ========================================
// CONFIGURATION
// ========================================

/** API base URL from environment variables */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/** External API base URL */
const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_EXTERNAL_API_URL;

/** Default request timeout */
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG = {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential' as const
};

/** Default headers for all requests */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client': 'engunity-ai-web',
  'X-Client-Version': '1.0.0'
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Build URL with query parameters
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns URL with query string
 */
function buildUrl(baseUrl: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  return url.toString();
}

/**
 * Get current authentication token from Supabase
 * @returns Promise resolving to auth token or null
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClientComponentClient<Database>();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Create timeout promise for request cancellation
 * @param timeout - Timeout in milliseconds
 * @returns Promise that rejects on timeout
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });
}

/**
 * Delay execution for retry logic
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with backoff strategy
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param backoff - Backoff strategy
 * @returns Delay for next attempt
 */
function calculateRetryDelay(
  attempt: number, 
  baseDelay: number, 
  backoff: 'linear' | 'exponential' = 'exponential'
): number {
  if (backoff === 'exponential') {
    return baseDelay * Math.pow(2, attempt);
  }
  return baseDelay * (attempt + 1);
}

/**
 * Check if error should trigger a retry
 * @param error - Error object
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum retry attempts
 * @returns Whether to retry the request
 */
function shouldRetry(error: any, attempt: number, maxAttempts: number): boolean {
  if (attempt >= maxAttempts) return false;
  
  // Retry on network errors or 5xx server errors
  if (error instanceof TypeError || (error.statusCode >= 500 && error.statusCode < 600)) {
    return true;
  }
  
  // Retry on specific 429 (rate limited) errors
  if (error.statusCode === 429) {
    return true;
  }
  
  return false;
}

// ========================================
// CORE API CLIENT FUNCTIONS
// ========================================

/**
 * Parse response body as JSON with error handling
 * @param response - Fetch response object
 * @returns Parsed JSON data or error details
 */
async function parseResponse<T>(response: Response): Promise<{ data?: T; error?: ApiError }> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  try {
    if (isJson) {
      const json = await response.json();
      
      if (!response.ok) {
        return {
          error: {
            message: json.message || json.error || 'Request failed',
            code: json.code || json.errorCode,
            statusCode: response.status,
            details: json.details || json,
            timestamp: new Date().toISOString(),
            requestId: response.headers.get('x-request-id') || undefined
          }
        };
      }
      
      return { data: json };
    } else {
      const text = await response.text();
      
      if (!response.ok) {
        return {
          error: {
            message: text || 'Request failed',
            statusCode: response.status,
            timestamp: new Date().toISOString(),
            requestId: response.headers.get('x-request-id') || undefined
          }
        };
      }
      
      return { data: text as any };
    }
  } catch (parseError) {
    return {
      error: {
        message: 'Failed to parse response',
        statusCode: response.status,
        details: parseError,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Core fetch function with retry logic and error handling
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Promise resolving to fetch result
 */
async function coreFetch<T>(url: string, config: RequestConfig = {}): Promise<FetchResult<T>> {
  const {
    method = 'GET',
    data,
    params,
    headers: customHeaders = {},
    timeout = DEFAULT_TIMEOUT,
    requiresAuth = false,
    baseUrl = API_BASE_URL,
    retry = DEFAULT_RETRY_CONFIG,
    ...fetchOptions
  } = config;

  // Build full URL
  const fullUrl = buildUrl(url.startsWith('http') ? url : `${baseUrl}${url}`, params);
  
  // Prepare headers
  const headers = { ...DEFAULT_HEADERS, ...customHeaders };
  
  // Add auth token if required
  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      return {
        success: false,
        error: {
          message: 'Authentication required but no token available',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers,
    ...fetchOptions
  };
  
  // Add body for non-GET requests
  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      // Let the browser set Content-Type for FormData
      delete headers['Content-Type'];
      requestOptions.body = data;
    } else {
      requestOptions.body = JSON.stringify(data);
    }
  }
  
  // Retry logic
  let lastError: any;
  
  for (let attempt = 0; attempt <= retry.attempts; attempt++) {
    try {
      // Create fetch promise with timeout
      const fetchPromise = fetch(fullUrl, requestOptions);
      const timeoutPromise = createTimeoutPromise(timeout);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const parseResult = await parseResponse<T>(response);
      
      if (parseResult.error) {
        lastError = parseResult.error;
        
        // Check if we should retry
        if (shouldRetry(parseResult.error, attempt, retry.attempts)) {
          const delayMs = calculateRetryDelay(attempt, retry.delay, retry.backoff);
          console.warn(`Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retry.attempts + 1})`);
          await delay(delayMs);
          continue;
        }
        
        return {
          success: false,
          error: parseResult.error,
          response
        };
      }
      
      return {
        success: true,
        data: parseResult.data,
        response
      };
      
    } catch (error) {
      lastError = {
        message: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
        timestamp: new Date().toISOString()
      };
      
      // Check if we should retry
      if (shouldRetry(error, attempt, retry.attempts)) {
        const delayMs = calculateRetryDelay(attempt, retry.delay, retry.backoff);
        console.warn(`Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retry.attempts + 1}):`, error);
        await delay(delayMs);
        continue;
      }
      
      break;
    }
  }
  
  return {
    success: false,
    error: lastError
  };
}

// ========================================
// PUBLIC API FUNCTIONS
// ========================================

/**
 * Perform a type-safe JSON fetch request
 * 
 * @param url - Request URL (absolute or relative to API base)
 * @param options - Fetch options
 * @returns Promise resolving to parsed JSON response
 * 
 * @example
 * const user = await fetchJson<User>('/users/123');
 * const posts = await fetchJson<Post[]>('/posts', { method: 'GET' });
 */
export async function fetchJson<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const config: RequestConfig = {
    method: (options.method as HttpMethod) || 'GET',
    headers: options.headers as Record<string, string>,
    ...options
  };
  
  const result = await coreFetch<T>(url, config);
  
  if (!result.success) {
    throw new Error(result.error?.message || 'Request failed');
  }
  
  return result.data as T;
}

/**
 * Perform a type-safe fetch request with authentication
 * 
 * @param url - Request URL
 * @param token - Authentication token (optional, will use Supabase session if not provided)
 * @param options - Request configuration
 * @returns Promise resolving to fetch result
 * 
 * @example
 * const result = await fetchWithAuth<User>('/user/profile');
 * if (result.success) {
 *   console.log('User:', result.data);
 * }
 */
export async function fetchWithAuth<T = any>(
  url: string,
  token?: string,
  options: RequestConfig = {}
): Promise<FetchResult<T>> {
  const config: RequestConfig = {
    ...options,
    requiresAuth: true
  };
  
  // Override auth token if provided
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
    config.requiresAuth = false; // Skip automatic token fetching
  }
  
  return coreFetch<T>(url, config);
}

/**
 * Perform a safe API request that returns a result object
 * 
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Promise resolving to result with success/error status
 * 
 * @example
 * const result = await apiRequest<User[]>('/users', { method: 'GET' });
 * if (result.success) {
 *   console.log('Users:', result.data);
 * } else {
 *   console.error('Error:', result.error?.message);
 * }
 */
export async function apiRequest<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<FetchResult<T>> {
  return coreFetch<T>(url, config);
}

// ========================================
// CONVENIENCE HTTP METHODS
// ========================================

/**
 * Perform a GET request
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function get<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
  return fetchJson<T>(url, { ...config, method: 'GET' });
}

/**
 * Perform a POST request
 * @param url - Request URL
 * @param data - Request body data
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function post<T = any>(
  url: string, 
  data?: any, 
  config: Omit<RequestConfig, 'method' | 'data'> = {}
): Promise<T> {
  return fetchJson<T>(url, { ...config, method: 'POST', body: data ? JSON.stringify(data) : undefined });
}

/**
 * Perform a PUT request
 * @param url - Request URL
 * @param data - Request body data
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function put<T = any>(
  url: string, 
  data?: any, 
  config: Omit<RequestConfig, 'method' | 'data'> = {}
): Promise<T> {
  return fetchJson<T>(url, { ...config, method: 'PUT', body: data ? JSON.stringify(data) : undefined });
}

/**
 * Perform a PATCH request
 * @param url - Request URL
 * @param data - Request body data
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function patch<T = any>(
  url: string, 
  data?: any, 
  config: Omit<RequestConfig, 'method' | 'data'> = {}
): Promise<T> {
  return fetchJson<T>(url, { ...config, method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
}

/**
 * Perform a DELETE request
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function del<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
  return fetchJson<T>(url, { ...config, method: 'DELETE' });
}

// ========================================
// SPECIALIZED API FUNCTIONS
// ========================================

/**
 * Upload file with progress tracking
 * @param url - Upload URL
 * @param file - File to upload
 * @param onProgress - Progress callback
 * @param config - Request configuration
 * @returns Promise resolving to upload result
 */
export async function uploadFile<T = any>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  config: Omit<RequestConfig, 'method' | 'data'> = {}
): Promise<FetchResult<T>> {
  const formData = new FormData();
  formData.append('file', file);
  
  // Create XMLHttpRequest for progress tracking
  if (onProgress) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', async () => {
        try {
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText
          });
          const parseResult = await parseResponse<T>(response);
          
          resolve({
            success: !parseResult.error,
            data: parseResult.data,
            error: parseResult.error,
            response
          });
        } catch (error) {
          resolve({
            success: false,
            error: {
              message: 'Upload failed',
              statusCode: xhr.status,
              timestamp: new Date().toISOString()
            }
          });
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: {
            message: 'Upload failed',
            statusCode: 0,
            timestamp: new Date().toISOString()
          }
        });
      });
      
      xhr.open('POST', url.startsWith('http') ? url : `${API_BASE_URL}${url}`);
      
      // Add auth header if required
      if (config.requiresAuth) {
        getAuthToken().then(token => {
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.send(formData);
        });
      } else {
        xhr.send(formData);
      }
    });
  }
  
  // Fallback to regular fetch for uploads without progress
  return coreFetch<T>(url, {
    ...config,
    method: 'POST',
    data: formData
  });
}

/**
 * Make request to external API
 * @param url - External API URL
 * @param config - Request configuration
 * @returns Promise resolving to response data
 */
export async function externalApi<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<FetchResult<T>> {
  const externalUrl = url.startsWith('http') ? url : `${EXTERNAL_API_URL}${url}`;
  
  return coreFetch<T>(externalUrl, {
    ...config,
    baseUrl: '' // Don't prepend base URL for external requests
  });
}

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

/**
 * Check if error is a network error
 * @param error - Error object
 * @returns Whether error is network-related
 */
export function isNetworkError(error: any): boolean {
  return error instanceof TypeError || error.message?.includes('fetch');
}

/**
 * Check if error is an authentication error
 * @param error - Error object
 * @returns Whether error is auth-related
 */
export function isAuthError(error: ApiError): boolean {
  return error.statusCode === 401 || error.statusCode === 403;
}

/**
 * Check if error is a validation error
 * @param error - Error object
 * @returns Whether error is validation-related
 */
export function isValidationError(error: ApiError): boolean {
  return error.statusCode === 400 || error.statusCode === 422;
}

/**
 * Extract error message from various error formats
 * @param error - Error object
 * @returns Human-readable error message
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
}

// ========================================
// CONFIGURATION UTILITIES
// ========================================

/**
 * Set default request timeout
 * @param timeout - Timeout in milliseconds
 */
export function setDefaultTimeout(timeout: number): void {
  Object.assign(DEFAULT_HEADERS, { timeout });
}

/**
 * Set default headers for all requests
 * @param headers - Headers to merge with defaults
 */
export function setDefaultHeaders(headers: Record<string, string>): void {
  Object.assign(DEFAULT_HEADERS, headers);
}

/**
 * Get current API configuration
 * @returns Current configuration object
 */
export function getApiConfig(): {
  baseUrl: string;
  externalUrl?: string;
  timeout: number;
  headers: Record<string, string>;
} {
  return {
    baseUrl: API_BASE_URL,
    externalUrl: EXTERNAL_API_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: { ...DEFAULT_HEADERS }
  };
}

// ========================================
// EXPORTED CONSTANTS
// ========================================

/** HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

/** Common content types */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html'
} as const;

// ========================================
// DEFAULT EXPORT
// ========================================

/**
 * Default API client object with all methods
 */
const apiClient = {
  // Core methods
  fetchJson,
  fetchWithAuth,
  apiRequest,
  
  // HTTP methods
  get,
  post,
  put,
  patch,
  delete: del,
  
  // Specialized methods
  uploadFile,
  externalApi,
  
  // Error utilities
  isNetworkError,
  isAuthError,
  isValidationError,
  getErrorMessage,
  
  // Configuration
  setDefaultTimeout,
  setDefaultHeaders,
  getApiConfig,
  
  // Constants
  HTTP_STATUS,
  CONTENT_TYPES
};

export default apiClient;
/**
 * Exponential backoff retry logic for API requests
 *
 * Handles transient errors and rate limiting from Google Calendar API
 * with configurable retry parameters and jitter to prevent thundering herd.
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Initial delay in milliseconds (default: 1000ms) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 60000ms) */
  maxDelay?: number;
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Jitter range as percentage of delay (default: 0.2 for ±20%) */
  jitterRange?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  initialDelay: 1000,
  maxDelay: 60000,
  maxRetries: 5,
  backoffMultiplier: 2,
  jitterRange: 0.2,
};

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = new Set([
  429, // Too Many Requests (rate limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

/**
 * HTTP status codes that should NOT trigger a retry
 */
const NON_RETRYABLE_STATUS_CODES = new Set([
  400, // Bad Request (client error)
  401, // Unauthorized (handled by token refresh)
  403, // Forbidden (permission denied)
  404, // Not Found (resource doesn't exist)
]);

/**
 * Adds random jitter to a delay value
 *
 * @param delay - Base delay in milliseconds
 * @param jitterRange - Jitter range as percentage (e.g., 0.2 for ±20%)
 * @returns Delay with jitter applied
 */
function addJitter(delay: number, jitterRange: number): number {
  const jitter = delay * jitterRange * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/**
 * Calculates exponential backoff delay for a given attempt
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds with jitter applied
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const baseDelay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  return addJitter(baseDelay, config.jitterRange);
}

/**
 * Determines if an error is retryable
 *
 * @param error - Error to check
 * @returns True if the error should trigger a retry
 */
function isRetryableError(error: unknown): boolean {
  // Handle fetch network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Handle errors with status code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code;

    // Don't retry non-retryable codes
    if (NON_RETRYABLE_STATUS_CODES.has(code)) {
      return false;
    }

    // Retry retryable codes
    if (RETRYABLE_STATUS_CODES.has(code)) {
      return true;
    }
  }

  // Don't retry by default
  return false;
}

/**
 * Sleeps for a specified duration
 *
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with exponential backoff retry logic
 *
 * @param fn - Async function to wrap
 * @param config - Optional retry configuration
 * @returns Wrapped function with retry logic
 *
 * @example
 * ```typescript
 * const fetchWithRetry = retryWithBackoff(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   { maxRetries: 3 }
 * );
 *
 * const data = await fetchWithRetry();
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Success - log if we had to retry
      if (attempt > 0) {
        console.log(`[Retry] Success after ${attempt} retry attempt(s)`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if this is the last attempt
      if (attempt === finalConfig.maxRetries) {
        console.error(`[Retry] Max retries (${finalConfig.maxRetries}) exhausted`);
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log('[Retry] Non-retryable error encountered, not retrying');
        throw error;
      }

      // Calculate delay for this attempt
      const delay = calculateDelay(attempt, finalConfig);

      console.log(
        `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed, ` +
        `retrying in ${Math.round(delay)}ms...`,
        error
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted - throw the last error
  throw lastError;
}

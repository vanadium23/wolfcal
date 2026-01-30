/**
 * OAuth credential validation utilities
 *
 * Provides format-only validation for Google OAuth credentials.
 * Real validation happens during the OAuth flow when credentials are used.
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates OAuth credentials using format checks only.
 * Does not make network calls - real validation happens during OAuth flow.
 *
 * @param clientId - Google OAuth Client ID
 * @param clientSecret - Google OAuth Client Secret
 * @returns ValidationResult with valid flag and error messages
 */
export function validateOAuthCredentials(
  clientId: string,
  clientSecret: string
): ValidationResult {
  const errors: string[] = []

  // Validate Client ID format
  if (!clientId || !clientId.trim()) {
    errors.push('Client ID is required')
  } else if (!clientId.endsWith('.apps.googleusercontent.com')) {
    errors.push('Client ID must end with .apps.googleusercontent.com')
  }

  // Validate Client Secret format
  if (!clientSecret || !clientSecret.trim()) {
    errors.push('Client Secret is required')
  } else if (clientSecret.trim().length < 24) {
    errors.push('Client Secret must be at least 24 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if OAuth credentials are configured in localStorage.
 *
 * @returns true if both clientId and clientSecret are stored
 */
export function areCredentialsConfigured(): boolean {
  const clientId = localStorage.getItem('wolfcal:oauth:clientId')
  const clientSecret = localStorage.getItem('wolfcal:oauth:clientSecret')

  return !!(clientId && clientSecret)
}

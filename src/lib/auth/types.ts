/**
 * OAuth-related types for Google Calendar authentication
 */

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
}

/**
 * Message types for postMessage communication between popup and parent window
 */
export interface OAuthSuccessMessage {
  type: 'oauth-success';
  tokens: OAuthTokenResponse;
}

export interface OAuthErrorMessage {
  type: 'oauth-error';
  error: string;
  description?: string;
}

export type OAuthMessage = OAuthSuccessMessage | OAuthErrorMessage;

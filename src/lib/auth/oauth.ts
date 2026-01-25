/**
 * OAuth 2.0 flow implementation for Google Calendar API
 */

import type { OAuthTokenResponse, OAuthMessage } from './types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = 'http://localhost:5173/callback';
const SCOPE =
  'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';

/**
 * Generates a random state parameter for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Initiates OAuth flow by opening a popup window to Google's consent screen
 * @param clientId - Google Cloud OAuth client ID
 * @param clientSecret - Google Cloud OAuth client secret (stored for token exchange)
 * @returns Promise that resolves with OAuth tokens or rejects on error
 */
export function initiateOAuth(
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  return new Promise((resolve, reject) => {
    // Generate CSRF state token
    const state = generateState();

    // Build authorization URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to ensure refresh token
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${authParams.toString()}`;

    // Open popup window
    const popup = window.open(
      authUrl,
      'GoogleOAuth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('Failed to open OAuth popup. Please allow popups for this site.'));
      return;
    }

    // Store client credentials temporarily for token exchange
    // These will be retrieved by the callback page
    sessionStorage.setItem('oauth_client_id', clientId);
    sessionStorage.setItem('oauth_client_secret', clientSecret);
    sessionStorage.setItem('oauth_state', state);

    console.log(`session state: ${sessionStorage.getItem('oauth_state')}`);

    // Listen for messages from the callback page
    const messageHandler = (event: MessageEvent<OAuthMessage>) => {
      // Verify message origin
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;

      if (message.type === 'oauth-success') {
        // Clean up
        window.removeEventListener('message', messageHandler);
        sessionStorage.removeItem('oauth_client_id');
        sessionStorage.removeItem('oauth_client_secret');
        sessionStorage.removeItem('oauth_state');
        // popup.close();

        resolve(message.tokens);
      } else if (message.type === 'oauth-error') {
        // Clean up
        window.removeEventListener('message', messageHandler);
        sessionStorage.removeItem('oauth_client_id');
        sessionStorage.removeItem('oauth_client_secret');
        sessionStorage.removeItem('oauth_state');
        // popup.close();

        reject(new Error(message.description || message.error));
      }
    };

    window.addEventListener('message', messageHandler);

    // Handle popup being closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        sessionStorage.removeItem('oauth_client_id');
        sessionStorage.removeItem('oauth_client_secret');
        sessionStorage.removeItem('oauth_state');
        reject(new Error('OAuth popup was closed before completing authentication'));
      }
    }, 500);
  });
}

/**
 * Exchanges authorization code for access and refresh tokens
 * Called by the callback page
 * @param code - Authorization code from Google
 * @param clientId - OAuth client ID
 * @param clientSecret - OAuth client secret
 * @returns Promise with token response
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  return response.json();
}

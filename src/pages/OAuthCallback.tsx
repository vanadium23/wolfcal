/**
 * OAuth callback page - handles the redirect from Google's consent screen
 * Exchanges authorization code for tokens and sends them to the parent window
 */

import { useEffect, useState } from 'react';
import { exchangeCodeForTokens } from '../lib/auth/oauth';
import type { OAuthMessage } from '../lib/auth/types';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        // Check for errors from Google
        if (error) {
          throw new Error(
            error === 'access_denied'
              ? 'OAuth access was denied by the user'
              : `OAuth error: ${error}`
          );
        }

        // Validate required parameters
        if (!code) {
          throw new Error('Authorization code not found in callback URL');
        }

        // Verify state parameter for CSRF protection
        const expectedState = sessionStorage.getItem('oauth_state');
        if (!expectedState || state !== expectedState) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Retrieve client credentials from session storage
        const clientSecret = sessionStorage.getItem('oauth_client_secret');
        const clientId = sessionStorage.getItem('oauth_client_id');

        if (!clientSecret || !clientId) {
          throw new Error('Client credentials not found - please restart OAuth flow');
        }

        setStatus('processing');

        // Exchange authorization code for tokens
        const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);

        // Send tokens to parent window
        const message: OAuthMessage = {
          type: 'oauth-success',
          tokens,
        };

        if (window.opener) {
          window.opener.postMessage(message, window.location.origin);
        }

        setStatus('success');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setStatus('error');

        // Send error to parent window
        const message: OAuthMessage = {
          type: 'oauth-error',
          error: 'OAuth Failed',
          description: errorMessage,
        };

        if (window.opener) {
          window.opener.postMessage(message, window.location.origin);
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      {status === 'processing' && (
        <>
          <h2>Processing OAuth...</h2>
          <p>Exchanging authorization code for tokens...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <h2>Success!</h2>
          <p>Authentication complete. This window will close automatically.</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            If it doesn't close, you can safely close this window.
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h2>Authentication Failed</h2>
          <p style={{ color: 'red' }}>{error}</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Please close this window and try again.
          </p>
        </>
      )}
    </div>
  );
}

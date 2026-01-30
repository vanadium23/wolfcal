/**
 * AddAccountButton component - triggers OAuth flow to add a new Google account
 */

import { useState, useEffect } from 'react';
import { initiateOAuth } from '../lib/auth/oauth';
import type { OAuthTokenResponse } from '../lib/auth/types';

interface AddAccountButtonProps {
  onAccountAdded?: (tokens: OAuthTokenResponse) => void;
  onError?: (error: Error) => void;
}

export default function AddAccountButton({ onAccountAdded, onError }: AddAccountButtonProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    const clientId = localStorage.getItem('wolfcal:oauth:clientId');
    const clientSecret = localStorage.getItem('wolfcal:oauth:clientSecret');
    setHasCredentials(!!clientId && !!clientSecret);
  }, []);

  const handleAddAccount = async () => {
    const clientId = localStorage.getItem('wolfcal:oauth:clientId');
    const clientSecret = localStorage.getItem('wolfcal:oauth:clientSecret');

    if (!clientId || !clientSecret) {
      const error = new Error('OAuth credentials not configured. Please configure them in Settings first.');
      if (onError) {
        onError(error);
      } else {
        alert(error.message);
      }
      return;
    }

    setIsAuthenticating(true);

    try {
      const tokens = await initiateOAuth(clientId, clientSecret);

      if (onAccountAdded) {
        onAccountAdded(tokens);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('OAuth failed');
      if (onError) {
        onError(error);
      } else {
        alert(`Authentication failed: ${error.message}`);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <button
      onClick={handleAddAccount}
      disabled={isAuthenticating || !hasCredentials}
      title={!hasCredentials ? 'Configure OAuth credentials in Settings to add accounts' : undefined}
      style={{
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: hasCredentials ? '#4285f4' : '#ccc',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: hasCredentials && !isAuthenticating ? 'pointer' : 'not-allowed',
        fontWeight: 'bold',
        opacity: isAuthenticating ? 0.6 : 1,
      }}
    >
      {isAuthenticating ? 'Authenticating...' : '+ Add Google Account'}
    </button>
  );
}

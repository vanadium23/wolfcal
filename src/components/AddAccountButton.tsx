/**
 * AddAccountButton component - triggers OAuth flow to add a new Google account
 */

import { useState } from 'react';
import { initiateOAuth } from '../lib/auth/oauth';
import type { OAuthTokenResponse } from '../lib/auth/types';

interface AddAccountButtonProps {
  onAccountAdded?: (tokens: OAuthTokenResponse) => void;
  onError?: (error: Error) => void;
}

export default function AddAccountButton({ onAccountAdded, onError }: AddAccountButtonProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showCredentialForm, setShowCredentialForm] = useState(false);

  const handleAddAccount = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      const error = new Error('Please provide both Client ID and Client Secret');
      if (onError) {
        onError(error);
      } else {
        alert(error.message);
      }
      return;
    }

    setIsAuthenticating(true);

    try {    
      const savedClientId = localStorage.getItem('wolfcal:oauth:clientId');
      const savedClientSecret = localStorage.getItem('wolfcal:oauth:clientSecret');

      const tokens = await initiateOAuth(savedClientId || clientId.trim(), savedClientSecret || clientSecret.trim());

      if (onAccountAdded) {
        onAccountAdded(tokens);
      }

      // Reset form
      setClientId('');
      setClientSecret('');
      setShowCredentialForm(false);
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

  if (!showCredentialForm) {
    return (
      <button
        onClick={() => setShowCredentialForm(true)}
        disabled={isAuthenticating}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        + Add Google Account
      </button>
    );
  }

  return (
    <div style={{
      border: '1px solid #ddd',
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      maxWidth: '500px',
    }}>
      <h3 style={{ marginTop: 0 }}>Add Google Account</h3>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Enter your Google Cloud OAuth credentials. You can create these at{' '}
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Cloud Console
        </a>
      </p>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Client ID:
        </label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="1234567890-abc123.apps.googleusercontent.com"
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Client Secret:
        </label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleAddAccount}
          disabled={isAuthenticating}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: isAuthenticating ? 0.6 : 1,
          }}
        >
          {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
        </button>

        <button
          onClick={() => {
            setShowCredentialForm(false);
            setClientId('');
            setClientSecret('');
          }}
          disabled={isAuthenticating}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#fff',
            color: '#666',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

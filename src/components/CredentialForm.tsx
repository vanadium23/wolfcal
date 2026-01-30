import { useState, useEffect } from 'react'
import { validateOAuthCredentials, type ValidationResult } from '../lib/auth/validation'

interface OAuthCredentials {
  clientId: string
  clientSecret: string
}

export default function CredentialForm() {
  const [credentials, setCredentials] = useState<OAuthCredentials>({
    clientId: '',
    clientSecret: '',
  })
  const [isSaved, setIsSaved] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationResult | null>(null)

  // Load credentials from localStorage on mount
  useEffect(() => {
    const savedClientId = localStorage.getItem('wolfcal:oauth:clientId')
    const savedClientSecret = localStorage.getItem('wolfcal:oauth:clientSecret')

    if (savedClientId || savedClientSecret) {
      setCredentials({
        clientId: savedClientId || '',
        clientSecret: savedClientSecret || '',
      })
      setIsSaved(true)
    }
  }, [])

  const handleValidate = () => {
    const result = validateOAuthCredentials(credentials.clientId, credentials.clientSecret)
    setValidationStatus(result)

    if (result.valid) {
      alert('Credentials format is valid')
    } else {
      alert(`Validation failed:\n${result.errors.join('\n')}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate credentials before saving
    const result = validateOAuthCredentials(credentials.clientId, credentials.clientSecret)
    if (!result.valid) {
      alert(`Please fix validation errors:\n${result.errors.join('\n')}`)
      setValidationStatus(result)
      return
    }

    // Save to localStorage (not IndexedDB as per spec)
    localStorage.setItem('wolfcal:oauth:clientId', credentials.clientId.trim())
    localStorage.setItem('wolfcal:oauth:clientSecret', credentials.clientSecret.trim())

    setIsSaved(true)
    setValidationStatus(result)
    alert('OAuth configured successfully. You can now add accounts.')
  }

  const handleClear = () => {
    if (!confirm('Are you sure you want to clear your OAuth credentials? You will need to re-enter them to add new accounts.')) {
      return
    }

    localStorage.removeItem('wolfcal:oauth:clientId')
    localStorage.removeItem('wolfcal:oauth:clientSecret')
    setCredentials({ clientId: '', clientSecret: '' })
    setIsSaved(false)
    setValidationStatus(null)
  }

  return (
    <form className="credential-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="client-id">
          Client ID
        </label>
        <input
          id="client-id"
          type="text"
          value={credentials.clientId}
          onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
          placeholder="123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="client-secret">
          Client Secret
        </label>
        <div className="input-with-toggle">
          <input
            id="client-secret"
            type={showSecret ? 'text' : 'password'}
            value={credentials.clientSecret}
            onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
            placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
            className="form-input"
          />
          <button
            type="button"
            className="toggle-visibility-btn"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={showSecret ? 'Hide secret' : 'Show secret'}
          >
            {showSecret ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={handleValidate}>
          Validate
        </button>
        <button type="submit" className="btn btn-primary">
          {isSaved ? 'Update Credentials' : 'Save Credentials'}
        </button>
        {isSaved && (
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            Clear Credentials
          </button>
        )}
      </div>

      {validationStatus && (
        <div className={validationStatus.valid ? 'validation-success' : 'validation-error'}>
          {validationStatus.valid ? (
            <p>✓ Valid - Credentials format is correct</p>
          ) : (
            <div>
              <p>✗ Invalid - Please fix the following:</p>
              <ul>
                {validationStatus.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isSaved && validationStatus?.valid && (
        <p className="success-message">
          ✓ OAuth credentials are configured. You can now add Google accounts.
        </p>
      )}
    </form>
  )
}

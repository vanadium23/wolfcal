import './App.css'
import Calendar from './components/Calendar'
import AddAccountButton from './components/AddAccountButton'
import type { OAuthTokenResponse } from './lib/auth/types'
import { encryptToken } from './lib/auth/encryption'
import { addAccount } from './lib/db'

function App() {
  const handleAccountAdded = async (tokens: OAuthTokenResponse) => {
    try {
      console.log('Account added successfully, encrypting and storing...')

      // Encrypt tokens
      const encryptedAccessToken = await encryptToken(tokens.access_token)
      const encryptedRefreshToken = await encryptToken(tokens.refresh_token)

      // Decode JWT to get email (simple base64 decode of middle part)
      const payload = JSON.parse(atob(tokens.access_token.split('.')[1]))
      const email = payload.email || `user_${Date.now()}@unknown.com`

      // Calculate token expiry timestamp
      const tokenExpiry = Date.now() + (tokens.expires_in * 1000)

      // Store in IndexedDB
      const accountId = await addAccount({
        id: email,
        email,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiry,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      console.log('Account stored successfully:', accountId)
      alert(`Account added: ${email}`)
    } catch (error) {
      console.error('Failed to store account:', error)
      alert(`Failed to store account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleError = (error: Error) => {
    console.error('OAuth error:', error)
    alert(`Failed to add account: ${error.message}`)
  }

  return (
    <div>
      <h1>WolfCal</h1>
      <p>Local-First Google Calendar Wrapper</p>
      <div style={{ marginBottom: '20px' }}>
        <AddAccountButton onAccountAdded={handleAccountAdded} onError={handleError} />
      </div>
      <Calendar />
    </div>
  )
}

export default App

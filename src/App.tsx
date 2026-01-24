import { useState } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import AddAccountButton from './components/AddAccountButton'
import Settings from './pages/Settings'
import { SyncStatusBar } from './components/SyncStatusBar'
import { RefreshButton } from './components/RefreshButton'
import { useSyncScheduler } from './hooks/useSyncScheduler'
import type { OAuthTokenResponse } from './lib/auth/types'
import { encryptToken } from './lib/auth/encryption'
import { addAccount } from './lib/db'

type View = 'calendar' | 'settings'

function App() {
  const [currentView, setCurrentView] = useState<View>('calendar')
  const { isSyncing } = useSyncScheduler()
  const [manualSyncing, setManualSyncing] = useState(false)

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
      <header className="app-header">
        <div className="header-content">
          <h1>WolfCal</h1>
          <nav className="app-nav">
            <button
              className={`nav-link ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </button>
            <button
              className={`nav-link ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              Settings
            </button>
          </nav>
          <div className="header-actions">
            <SyncStatusBar isSyncing={isSyncing || manualSyncing} />
            <RefreshButton
              onSyncStart={() => setManualSyncing(true)}
              onSyncComplete={() => setManualSyncing(false)}
              onSyncError={() => setManualSyncing(false)}
            />
          </div>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <AddAccountButton onAccountAdded={handleAccountAdded} onError={handleError} />
            </div>
            <Calendar />
          </>
        )}

        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App

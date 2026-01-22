import './App.css'
import Calendar from './components/Calendar'
import AddAccountButton from './components/AddAccountButton'
import type { OAuthTokenResponse } from './lib/auth/types'

function App() {
  const handleAccountAdded = (tokens: OAuthTokenResponse) => {
    console.log('Account added successfully:', tokens)
    // TODO: Store tokens in IndexedDB with encryption (next task)
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

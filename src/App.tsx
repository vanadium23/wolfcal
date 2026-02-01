import { useState } from 'react'
import './App.css'
import Calendar from './components/Calendar'
import Settings from './pages/Settings'
import { SyncStatusBar } from './components/SyncStatusBar'
import { RefreshButton } from './components/RefreshButton'
import { useSyncScheduler } from './hooks/useSyncScheduler'

type View = 'calendar' | 'settings'

function App() {
  const [currentView, setCurrentView] = useState<View>('calendar')
  const { isSyncing } = useSyncScheduler()
  const [manualSyncing, setManualSyncing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
              onSyncComplete={() => {
                setManualSyncing(false)
                setRefreshTrigger(prev => prev + 1)
              }}
              onSyncError={() => setManualSyncing(false)}
            />
          </div>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'calendar' && (
          <>
            <Calendar refreshTrigger={refreshTrigger} />
          </>
        )}

        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App

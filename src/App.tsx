import { useState, useEffect, useRef } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Also check if click is inside mobile-menu (which is a sibling, not a child of header-actions)
      const mobileMenu = document.querySelector('.mobile-menu')
      const clickedInsideHeaderActions = mobileMenuRef.current?.contains(event.target as Node)
      const clickedInsideMobileMenu = mobileMenu?.contains(event.target as Node)

      if (mobileMenuOpen && !clickedInsideHeaderActions && !clickedInsideMobileMenu) {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const handleNavClick = (view: View) => {
    setCurrentView(view)
    setMobileMenuOpen(false)
  }

  return (
    <div>
      <header className="app-header">
        <div className="header-content">
          <h1>WolfCal</h1>
          <nav className="app-nav">
            <button
              className={`nav-link ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => handleNavClick('calendar')}
            >
              Calendar
            </button>
            <button
              className={`nav-link ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              Settings
            </button>
          </nav>
          <div className="header-actions" ref={mobileMenuRef}>
            <button
              className="hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
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
          {mobileMenuOpen && (
            <div className="mobile-menu">
              <button
                className={`mobile-menu-link ${currentView === 'calendar' ? 'active' : ''}`}
                onClick={() => handleNavClick('calendar')}
              >
                Calendar
              </button>
              <button
                className={`mobile-menu-link ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => handleNavClick('settings')}
              >
                Settings
              </button>
            </div>
          )}
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

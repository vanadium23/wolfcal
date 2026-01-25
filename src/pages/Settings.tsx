import { useState, useEffect } from 'react'
import CredentialForm from '../components/CredentialForm'
import AccountList from '../components/AccountList'
import ErrorLog from '../components/ErrorLog'
import './Settings.css'

interface SyncSettings {
  autoSync: boolean
  syncInterval: number // in minutes
}

export default function Settings() {
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncInterval: 15,
  })

  // Load sync settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('wolfcal:syncSettings')
    if (savedSettings) {
      try {
        setSyncSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to load sync settings:', error)
      }
    }
  }, [])

  // Save sync settings to localStorage when changed
  const updateSyncSettings = (updates: Partial<SyncSettings>) => {
    const newSettings = { ...syncSettings, ...updates }
    setSyncSettings(newSettings)
    localStorage.setItem('wolfcal:syncSettings', JSON.stringify(newSettings))
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>OAuth Credentials</h2>
        <p className="section-description">
          Configure your Google Cloud OAuth credentials. You need to create a Google Cloud project
          and OAuth 2.0 credentials to use WolfCal. See documentation for setup instructions.
        </p>
        <CredentialForm />
      </section>

      <section className="settings-section">
        <h2>Connected Accounts</h2>
        <p className="section-description">
          Manage your connected Google accounts. You can add multiple accounts and remove them at any time.
        </p>
        <AccountList />
      </section>

      <section className="settings-section">
        <h2>Sync Settings</h2>
        <p className="section-description">
          Configure automatic synchronization with Google Calendar.
        </p>

        <div className="sync-settings-form">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={syncSettings.autoSync}
                onChange={(e) => updateSyncSettings({ autoSync: e.target.checked })}
              />
              <span>Enable automatic sync</span>
            </label>
            <p className="form-help">
              When enabled, WolfCal will automatically sync with Google Calendar at regular intervals.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="sync-interval">
              Sync interval
            </label>
            <select
              id="sync-interval"
              value={syncSettings.syncInterval}
              onChange={(e) => updateSyncSettings({ syncInterval: parseInt(e.target.value) })}
              disabled={!syncSettings.autoSync}
            >
              <option value={15}>Every 15 minutes</option>
              <option value={20}>Every 20 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
            <p className="form-help">
              How often WolfCal should sync with Google Calendar when auto-sync is enabled.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Error Log</h2>
        <p className="section-description">
          View and troubleshoot synchronization errors. Errors are logged automatically when sync operations fail.
        </p>
        <ErrorLog />
      </section>
    </div>
  )
}

import { useState, useEffect } from 'react'
import CredentialForm from '../components/CredentialForm'
import AccountList from '../components/AccountList'
import CalendarManagement from '../components/CalendarManagement'
import ErrorLog from '../components/ErrorLog'
import AddAccountButton from '../components/AddAccountButton'
import ExportConfiguration from '../components/ExportConfiguration'
import type { OAuthTokenResponse } from '../lib/auth/types'
import { encryptToken } from '../lib/auth/encryption'
import { addAccount, addCalendar } from '../lib/db'
import { CalendarClient } from '../lib/api'
import { SyncEngine } from '../lib/sync/engine'
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

  const handleAccountAdded = async (tokens: OAuthTokenResponse) => {
    try {
      console.log('Account added successfully, encrypting and storing...')

      const calendarClient = new CalendarClient()

      // Fetch user email from Google API (not from access token JWT)
      const userInfo = await calendarClient.getUserInfo(tokens.access_token)
      const email = userInfo.email?.trim()
      if (!email) {
        throw new Error('Failed to determine account email from Google API')
      }

      // Encrypt tokens
      const encryptedAccessToken = await encryptToken(tokens.access_token)
      const encryptedRefreshToken = await encryptToken(tokens.refresh_token)

      // Calculate token expiry timestamp
      const tokenExpiry = Date.now() + tokens.expires_in * 1000

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

      // Fetch all calendars with pagination
      const allCalendars = []
      let pageToken: string | undefined
      do {
        const response = await calendarClient.listCalendars(accountId, 250, pageToken)
        allCalendars.push(...response.items)
        pageToken = response.nextPageToken
      } while (pageToken)

      if (allCalendars.length === 0) {
        throw new Error(`No calendars found for account ${email}`)
      }

      // Find primary calendar
      const primaryCalendar =
        allCalendars.find((calendar) => calendar.primary) ||
        allCalendars.find((calendar) => calendar.id === email) ||
        allCalendars.find((calendar) => calendar.summary === email)

      if (!primaryCalendar) {
        throw new Error(`Primary calendar not found for account ${email}`)
      }

      // Store all calendars in IndexedDB
      for (const calendar of allCalendars) {
        const isPrimary =
          calendar.primary === true ||
          calendar.id === email ||
          calendar.summary === email

        await addCalendar({
          id: calendar.id,
          accountId,
          summary: calendar.summary || email,
          description: calendar.description,
          color: calendar.colorId,
          backgroundColor: calendar.backgroundColor,
          visible: isPrimary, // Only primary calendar visible by default
          primary: isPrimary,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      // Initial sync to fetch events into IndexedDB (primary calendar only)
      const syncEngine = new SyncEngine()
      await syncEngine.syncCalendar(accountId, primaryCalendar.id)

      console.log('Account stored successfully:', accountId)
      alert(`Account added and synced: ${email}`)
    } catch (error) {
      console.error('Failed to store account:', error)
      alert(`Failed to store account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleError = (error: Error) => {
    console.error('OAuth error:', error)
    alert(`Failed to add account: ${error.message}`)
  }

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
        <div style={{ marginBottom: '16px' }}>
          <AddAccountButton onAccountAdded={handleAccountAdded} onError={handleError} />
        </div>
        <AccountList />
      </section>

      <section className="settings-section">
        <h2>Calendar Management</h2>
        <p className="section-description">
          Enable or disable calendars for each connected account. You can sync up to 20 calendars per account.
          Disabled calendars will not be synced but their events remain in local storage.
        </p>
        <CalendarManagement />
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
              <option value={5}>Every 5 minutes</option>
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

      <section className="settings-section">
        <h2>Cross-Device Configuration</h2>
        <p className="section-description">
          Export your configuration to transfer it to another device. Your OAuth credentials,
          calendar settings, and preferences will be encrypted with a passphrase you choose.
        </p>
        <ExportConfiguration className="btn btn-primary" />
      </section>
    </div>
  )
}

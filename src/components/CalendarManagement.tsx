import { useState, useEffect } from 'react'
import {
  getAllAccounts,
  getCalendarsByAccount,
  updateCalendar,
  addCalendar,
} from '../lib/db'
import type { Account, Calendar } from '../lib/db/types'
import { CalendarClient } from '../lib/api'
import { SyncEngine } from '../lib/sync/engine'
import './CalendarManagement.css'

interface AccountWithCalendars extends Account {
  calendars: Calendar[]
  isExpanded: boolean
  isLoading: boolean
}

interface LoadingState {
  [accountId: string]: boolean
}

interface ErrorState {
  [accountId: string]: string
}

export default function CalendarManagement() {
  const [accountsWithCalendars, setAccountsWithCalendars] = useState<AccountWithCalendars[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCalendars, setLoadingCalendars] = useState<LoadingState>({})
  const [syncingCalendar, setSyncingCalendar] = useState<string | null>(null)
  const [errors, setErrors] = useState<ErrorState>({})

  // Load initial data
  useEffect(() => {
    loadAccountsAndCalendars()
  }, [])

  const loadAccountsAndCalendars = async () => {
    setLoading(true)
    try {
      const allAccounts = await getAllAccounts()
      const accountsData = await Promise.all(
        allAccounts.map(async (account) => ({
          ...account,
          calendars: await getCalendarsByAccount(account.id),
          isExpanded: false,
          isLoading: false,
        }))
      )
      setAccountsWithCalendars(accountsData)
    } catch (error) {
      console.error('Failed to load accounts and calendars:', error)
      alert('Failed to load accounts and calendars. See console for details.')
    } finally {
      setLoading(false)
    }
  }

  const toggleAccountExpanded = (accountId: string) => {
    setAccountsWithCalendars((accounts) =>
      accounts.map((account) =>
        account.id === accountId ? { ...account, isExpanded: !account.isExpanded } : account
      )
    )
  }

  const getEnabledCalendarCount = (accountId: string): number => {
    const account = accountsWithCalendars.find((a) => a.id === accountId)
    return account ? account.calendars.filter((c) => c.visible).length : 0
  }

  const handleRefreshCalendars = async (accountId: string) => {
    try {
      setLoadingCalendars((prev) => ({ ...prev, [accountId]: true }))
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[accountId]
        return newErrors
      })

      const calendarClient = new CalendarClient()

      // Fetch all calendars with pagination
      const allCalendars = []
      let pageToken: string | undefined
      do {
        const response = await calendarClient.listCalendars(accountId, 250, pageToken)
        allCalendars.push(...response.items)
        pageToken = response.nextPageToken
      } while (pageToken)

      if (allCalendars.length === 0) {
        alert('No calendars found for this account.')
        return
      }

      // Get existing calendars to preserve visibility state
      const account = accountsWithCalendars.find((a) => a.id === accountId)
      const existingCalendars = account?.calendars || []
      const existingCalendarMap = new Map(existingCalendars.map((c) => [c.id, c]))

      // Update or add calendars
      for (const calendar of allCalendars) {
        const existing = existingCalendarMap.get(calendar.id)

        if (existing) {
          // Update existing calendar - preserve visibility
          await updateCalendar({
            ...existing,
            summary: calendar.summary || existing.summary,
            description: calendar.description,
            color: calendar.colorId,
            backgroundColor: calendar.backgroundColor,
            updatedAt: Date.now(),
          })
        } else {
          // New calendar - add as hidden by default
          await addCalendar({
            id: calendar.id,
            accountId,
            summary: calendar.summary || 'Untitled Calendar',
            description: calendar.description,
            color: calendar.colorId,
            backgroundColor: calendar.backgroundColor,
            visible: false, // New calendars default to hidden
            primary: calendar.primary === true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        }
      }

      // Reload calendars
      await loadAccountsAndCalendars()
      alert(`Refreshed ${allCalendars.length} calendars`)
    } catch (error) {
      console.error('Failed to refresh calendars:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setErrors((prev) => ({ ...prev, [accountId]: errorMessage }))
    } finally {
      setLoadingCalendars((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  const handleToggleCalendar = async (accountId: string, calendar: Calendar) => {
    try {
      const newVisibleState = !calendar.visible
      const enabledCount = getEnabledCalendarCount(accountId)

      // Check 20 calendar limit when enabling
      if (newVisibleState && enabledCount >= 20) {
        alert('Maximum 20 calendars per account (20/20 enabled). Disable a calendar to add more.')
        return
      }

      // If enabling, show sync message
      if (newVisibleState) {
        setSyncingCalendar(calendar.id)

        try {
          // Trigger immediate sync
          const syncEngine = new SyncEngine()
          await syncEngine.syncCalendar(accountId, calendar.id)

          // Update visibility in IndexedDB
          await updateCalendar({
            ...calendar,
            visible: true,
            updatedAt: Date.now(),
          })

          alert(`Calendar synced successfully: ${calendar.summary}`)
        } catch (syncError) {
          console.error('Failed to sync calendar:', syncError)
          alert(`Failed to sync calendar: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`)
          return
        } finally {
          setSyncingCalendar(null)
        }
      } else {
        // Disabling - just update visibility
        await updateCalendar({
          ...calendar,
          visible: false,
          updatedAt: Date.now(),
        })
      }

      // Reload to reflect changes
      await loadAccountsAndCalendars()
    } catch (error) {
      console.error('Failed to update calendar visibility:', error)
      alert(`Failed to update calendar: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="calendar-management-loading">
        <p>Loading calendars...</p>
      </div>
    )
  }

  if (accountsWithCalendars.length === 0) {
    return (
      <div className="calendar-management-empty">
        <p>No connected accounts yet.</p>
        <p className="help-text">Add an account in the "Connected Accounts" section above to manage calendars.</p>
      </div>
    )
  }

  return (
    <div className="calendar-management">
      {accountsWithCalendars.map((account) => (
        <div key={account.id} className="calendar-account-section">
          <div className="calendar-account-header" onClick={() => toggleAccountExpanded(account.id)}>
            <span className="calendar-account-toggle">
              {account.isExpanded ? '▼' : '▶'}
            </span>
            <span className="calendar-account-email">{account.email}</span>
            <span className="calendar-account-count">
              {account.calendars.length > 0 && `(${getEnabledCalendarCount(account.id)}/${account.calendars.length})`}
            </span>
          </div>

          {account.isExpanded && (
            <div className="calendar-account-content">
              <div className="calendar-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRefreshCalendars(account.id)}
                  disabled={loadingCalendars[account.id]}
                >
                  {loadingCalendars[account.id] ? 'Refreshing...' : 'Refresh Calendars'}
                </button>
              </div>

              {errors[account.id] && (
                <div className="calendar-error-message">
                  <p>Failed to load calendars: {errors[account.id]}</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRefreshCalendars(account.id)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {loadingCalendars[account.id] && (
                <div className="calendar-loading-message">
                  <p>Fetching calendars from Google...</p>
                </div>
              )}

              {account.calendars.length === 0 ? (
                <div className="calendar-empty-message">
                  <p>No calendars found for this account.</p>
                </div>
              ) : (
                <div className="calendar-list">
                  {account.calendars.map((calendar) => (
                    <div key={calendar.id} className="calendar-item">
                      <div className="calendar-item-content">
                        <div className="calendar-item-header">
                          <div className="calendar-item-info">
                            {calendar.backgroundColor && (
                              <div
                                className="calendar-color-indicator"
                                style={{ backgroundColor: calendar.backgroundColor }}
                              />
                            )}
                            <span className="calendar-name">{calendar.summary}</span>
                            {calendar.primary && <span className="calendar-primary-badge">Primary</span>}
                          </div>
                        </div>
                        {calendar.description && (
                          <p className="calendar-description">{calendar.description}</p>
                        )}
                      </div>

                      <label className="calendar-toggle-label">
                        <input
                          type="checkbox"
                          checked={calendar.visible}
                          onChange={() => handleToggleCalendar(account.id, calendar)}
                          disabled={
                            syncingCalendar === calendar.id ||
                            (getEnabledCalendarCount(account.id) >= 20 && !calendar.visible)
                          }
                        />
                        <span>{calendar.visible ? 'Enabled' : 'Disabled'}</span>
                      </label>

                      {syncingCalendar === calendar.id && (
                        <div className="calendar-syncing">
                          <p>Syncing...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {account.calendars.length > 0 && getEnabledCalendarCount(account.id) >= 20 && (
                <div className="calendar-limit-warning">
                  <p>Maximum 20 calendars enabled. Disable a calendar to add more.</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

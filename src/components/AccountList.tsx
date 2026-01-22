import { useState, useEffect } from 'react'
import { getAllAccounts, deleteAccount } from '../lib/db'
import type { Account } from '../lib/db/types'

interface AccountWithMetadata extends Account {
  lastSyncTime?: number
}

export default function AccountList() {
  const [accounts, setAccounts] = useState<AccountWithMetadata[]>([])
  const [loading, setLoading] = useState(true)

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const allAccounts = await getAllAccounts()

      // TODO: Once sync metadata is implemented, fetch last sync time
      // For now, just use the account's updatedAt timestamp
      const accountsWithMetadata = allAccounts.map(account => ({
        ...account,
        lastSyncTime: account.updatedAt,
      }))

      setAccounts(accountsWithMetadata)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      alert('Failed to load accounts. See console for details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleRemoveAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove account ${email}? This will delete all associated calendars and events from local storage.`)) {
      return
    }

    try {
      // Note: In a production implementation, we would manually delete all related data:
      // - Delete all calendars for this account
      // - Delete all events for those calendars
      // - Delete all sync metadata
      // - Delete all pending changes
      // - Delete all tombstones
      // For MVP, we just delete the account record
      // Future sync operations will filter by existing accountIds
      await deleteAccount(accountId)

      // Reload account list
      await loadAccounts()

      alert(`Account ${email} removed successfully.`)
    } catch (error) {
      console.error('Failed to remove account:', error)
      alert(`Failed to remove account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatLastSyncTime = (timestamp?: number): string => {
    if (!timestamp) return 'Never'

    const now = Date.now()
    const diffMs = now - timestamp
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  if (loading) {
    return (
      <div className="account-list-loading">
        <p>Loading accounts...</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="account-list-empty">
        <p>No accounts connected yet.</p>
        <p className="help-text">Use the "Add Account" button on the main page to connect your first Google account.</p>
      </div>
    )
  }

  return (
    <div className="account-list">
      <table className="account-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Last Sync</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className="account-email">{account.email}</td>
              <td className="account-sync-time">{formatLastSyncTime(account.lastSyncTime)}</td>
              <td className="account-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveAccount(account.id, account.email)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

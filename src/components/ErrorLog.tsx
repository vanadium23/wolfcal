import { useState, useEffect } from 'react'
import {
  getAllErrorLogs,
  clearAllErrorLogs,
  clearErrorLogsByDateRange,
  getAllAccounts,
} from '../lib/db'
import type { ErrorLog as ErrorLogType, Account } from '../lib/db/types'
import './ErrorLog.css'

type DateRangeFilter = 'all' | '24h' | '7d' | '30d'

export default function ErrorLog() {
  const [errorLogs, setErrorLogs] = useState<ErrorLogType[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ErrorLogType[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load accounts and error logs
  useEffect(() => {
    loadData()
  }, [])

  // Filter logs when filters change
  useEffect(() => {
    filterLogs()
  }, [errorLogs, selectedAccount, dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      const [logsData, accountsData] = await Promise.all([
        getAllErrorLogs(),
        getAllAccounts(),
      ])

      // Sort by timestamp descending (newest first)
      logsData.sort((a, b) => b.timestamp - a.timestamp)

      setErrorLogs(logsData)
      setAccounts(accountsData)
    } catch (error) {
      console.error('Failed to load error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = [...errorLogs]

    // Filter by account
    if (selectedAccount !== 'all') {
      filtered = filtered.filter((log) => log.accountId === selectedAccount)
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = Date.now()
      let cutoffTime = 0

      switch (dateRange) {
        case '24h':
          cutoffTime = now - 24 * 60 * 60 * 1000
          break
        case '7d':
          cutoffTime = now - 7 * 24 * 60 * 60 * 1000
          break
        case '30d':
          cutoffTime = now - 30 * 24 * 60 * 60 * 1000
          break
      }

      filtered = filtered.filter((log) => log.timestamp >= cutoffTime)
    }

    setFilteredLogs(filtered)
  }

  const handleClearAll = async () => {
    try {
      await clearAllErrorLogs()
      await loadData()
      setShowClearConfirm(false)
    } catch (error) {
      console.error('Failed to clear error logs:', error)
      alert('Failed to clear error logs. Please try again.')
    }
  }

  const handleClearByDateRange = async () => {
    if (dateRange === 'all') {
      // Clear all logs
      await handleClearAll()
      return
    }

    try {
      const now = Date.now()
      let startTime = 0
      let endTime = now

      switch (dateRange) {
        case '24h':
          startTime = now - 24 * 60 * 60 * 1000
          break
        case '7d':
          startTime = now - 7 * 24 * 60 * 60 * 1000
          break
        case '30d':
          startTime = now - 30 * 24 * 60 * 60 * 1000
          break
      }

      await clearErrorLogsByDateRange(startTime, endTime)
      await loadData()
      setShowClearConfirm(false)
    } catch (error) {
      console.error('Failed to clear error logs:', error)
      alert('Failed to clear error logs. Please try again.')
    }
  }

  const toggleExpanded = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getAccountEmail = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId)
    return account?.email || accountId
  }

  const getErrorTypeLabel = (errorType: ErrorLogType['errorType']): string => {
    const labels: Record<ErrorLogType['errorType'], string> = {
      sync_failure: 'Sync Failure',
      api_error: 'API Error',
      conflict_detection: 'Conflict Detection',
      token_refresh: 'Token Refresh',
      network_error: 'Network Error',
      other: 'Other',
    }
    return labels[errorType] || errorType
  }

  const getErrorTypeClass = (errorType: ErrorLogType['errorType']): string => {
    return `error-type-badge error-type-${errorType.replace('_', '-')}`
  }

  if (loading) {
    return (
      <div className="error-log-container">
        <p>Loading error logs...</p>
      </div>
    )
  }

  return (
    <div className="error-log-container">
      <div className="error-log-header">
        <h3>Error Log</h3>
        <p className="error-log-description">
          View and troubleshoot sync errors. Errors are logged automatically when synchronization fails.
        </p>
      </div>

      <div className="error-log-filters">
        <div className="filter-group">
          <label htmlFor="account-filter">Filter by account:</label>
          <select
            id="account-filter"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.email}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-filter">Filter by date:</label>
          <select
            id="date-filter"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
          >
            <option value="all">All time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        <button
          className="clear-log-btn"
          onClick={() => setShowClearConfirm(true)}
          disabled={filteredLogs.length === 0}
        >
          Clear Log
        </button>
      </div>

      {showClearConfirm && (
        <div className="clear-confirm-dialog">
          <p>
            Are you sure you want to clear {dateRange === 'all' ? 'all' : `${dateRange}`} error logs?
            This action cannot be undone.
          </p>
          <div className="confirm-actions">
            <button onClick={handleClearByDateRange} className="btn-danger">
              Yes, Clear
            </button>
            <button onClick={() => setShowClearConfirm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="error-log-stats">
        <p>
          Showing {filteredLogs.length} of {errorLogs.length} errors
        </p>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="no-errors">
          <p>No errors found. Your sync is running smoothly!</p>
        </div>
      ) : (
        <div className="error-log-list">
          {filteredLogs.map((log) => (
            <div key={log.id} className="error-log-item">
              <div className="error-log-summary" onClick={() => toggleExpanded(log.id)}>
                <div className="error-log-main">
                  <span className={getErrorTypeClass(log.errorType)}>
                    {getErrorTypeLabel(log.errorType)}
                  </span>
                  <span className="error-message">{log.errorMessage}</span>
                </div>
                <div className="error-log-meta">
                  <span className="error-timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span className="error-account">{getAccountEmail(log.accountId)}</span>
                  {log.calendarId && <span className="error-calendar">Calendar: {log.calendarId}</span>}
                  <span className="expand-icon">{expandedLogId === log.id ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedLogId === log.id && (
                <div className="error-log-details">
                  <h4>Error Details:</h4>
                  <pre>{log.errorDetails}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock modules BEFORE importing the component
const { mockUseOnlineStatus, mockProcessQueue, mockSyncAccount, mockGetAllAccounts } = vi.hoisted(() => ({
  mockUseOnlineStatus: vi.fn(() => ({ isOnline: true })),
  mockProcessQueue: vi.fn(),
  mockSyncAccount: vi.fn(),
  mockGetAllAccounts: vi.fn(),
}))

vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: mockUseOnlineStatus,
}))

vi.mock('../../lib/sync/processor', () => ({
  processQueue: mockProcessQueue,
}))

vi.mock('../../lib/sync/engine', () => ({
  SyncEngine: class {
    syncAccount = mockSyncAccount
  },
}))

vi.mock('../../lib/db', () => ({
  getAllAccounts: mockGetAllAccounts,
}))

import { RefreshButton } from '../../components/RefreshButton'

describe('RefreshButton Component', () => {
  const mockOnSyncStart = vi.fn()
  const mockOnSyncComplete = vi.fn()
  const mockOnSyncError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations to defaults
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    mockProcessQueue.mockResolvedValue({ processed: 0, failed: 0 })
    mockGetAllAccounts.mockResolvedValue([
      { id: 'account-1', email: 'user@example.com' }
    ])
    mockSyncAccount.mockResolvedValue(undefined)
  })

  describe('Render States', () => {
    it('should show refresh button when online and not syncing', () => {
      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
          onSyncError={mockOnSyncError}
        />
      )

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    it('should show syncing state while syncing', async () => {
      const user = userEvent.setup()
      let resolveSync: (value: void) => void
      mockSyncAccount.mockImplementation(() => new Promise((resolve) => {
        resolveSync = resolve
      }))

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      const button = screen.getByRole('button', { name: /refresh/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should show spinner span (by className)
      expect(document.querySelector('.spinner')).toBeInTheDocument()

      // Clean up
      resolveSync!()
    })

    it('should be disabled when offline', () => {
      mockUseOnlineStatus.mockReturnValue({ isOnline: false })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      const button = screen.getByRole('button', { name: /refresh/i })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', 'Cannot sync while offline')
    })

    it('should be disabled while syncing', async () => {
      const user = userEvent.setup()
      let resolveSync: (value: void) => void

      mockSyncAccount.mockImplementation(() => new Promise((resolve) => {
        resolveSync = resolve
      }))

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      const button = screen.getByRole('button', { name: /refresh/i })
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      }, { timeout: 3000 })

      // Clean up
      resolveSync!()
    })
  })

  describe('Sync Behavior', () => {
    it('should process queue first when clicked', async () => {
      const user = userEvent.setup()
      mockProcessQueue.mockResolvedValue({
        processed: 2,
        failed: 0
      })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(mockProcessQueue).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should sync all accounts after processing queue', async () => {
      const user = userEvent.setup()
      mockGetAllAccounts.mockResolvedValue([
        { id: 'account-1', email: 'user1@example.com' },
        { id: 'account-2', email: 'user2@example.com' },
      ])

      const calls: string[] = []
      mockSyncAccount.mockImplementation((accountId: string) => {
        calls.push(accountId)
        return Promise.resolve(undefined)
      })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(calls).toContain('account-1')
        expect(calls).toContain('account-2')
      }, { timeout: 3000 })
    })

    it('should call onSyncStart when sync begins', async () => {
      const user = userEvent.setup()

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(mockOnSyncStart).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should call onSyncComplete when sync finishes successfully', async () => {
      const user = userEvent.setup()

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(mockOnSyncComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should call onSyncError when sync fails', async () => {
      const user = userEvent.setup()
      const testError = new Error('Sync failed')

      mockProcessQueue.mockRejectedValue(testError)

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
          onSyncError={mockOnSyncError}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(mockOnSyncError).toHaveBeenCalledWith(testError)
      }, { timeout: 3000 })
    })

    it('should re-enable button after sync completes', async () => {
      const user = userEvent.setup()

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      const button = screen.getByRole('button', { name: /refresh/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockOnSyncComplete).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Button should be enabled again
      expect(button).not.toBeDisabled()
    })

    it('should continue syncing other accounts if one fails', async () => {
      const user = userEvent.setup()
      mockGetAllAccounts.mockResolvedValue([
        { id: 'account-1', email: 'user1@example.com' },
        { id: 'account-2', email: 'user2@example.com' },
        { id: 'account-3', email: 'user3@example.com' },
      ])

      const calls: string[] = []
      mockSyncAccount.mockImplementation((accountId: string) => {
        calls.push(accountId)
        if (accountId === 'account-2') {
          return Promise.reject(new Error('Account 2 failed'))
        }
        return Promise.resolve(undefined)
      })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(mockOnSyncComplete).toHaveBeenCalled()
      }, { timeout: 3000 })

      // All accounts should have been attempted
      expect(calls).toEqual(['account-1', 'account-2', 'account-3'])
    })

    it('should not trigger sync when offline and button is clicked', async () => {
      const user = userEvent.setup()
      mockUseOnlineStatus.mockReturnValue({ isOnline: false })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      await user.click(screen.getByRole('button', { name: /refresh/i }))

      // Sync callbacks should not be called
      expect(mockOnSyncStart).not.toHaveBeenCalled()
      expect(mockOnSyncComplete).not.toHaveBeenCalled()

      // Sync functions should not be called
      expect(mockProcessQueue).not.toHaveBeenCalled()
    })

    it('should not trigger sync when already syncing', async () => {
      const user = userEvent.setup()
      let syncCount = 0
      let resolveFirstSync: (value: void) => void

      mockSyncAccount.mockImplementation(() => {
        syncCount++
        return new Promise((resolve) => {
          resolveFirstSync = resolve
        })
      })

      render(
        <RefreshButton
          onSyncStart={mockOnSyncStart}
          onSyncComplete={mockOnSyncComplete}
        />
      )

      const button = screen.getByRole('button', { name: /refresh/i })

      // First click
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify sync started once
      expect(syncCount).toBe(1)

      // Try to click again while syncing
      await user.click(button)

      // Wait a bit to ensure second click didn't trigger anything
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still only be syncing once
      expect(syncCount).toBe(1)

      // Clean up
      resolveFirstSync!()

      // Wait for completion
      await waitFor(() => {
        expect(mockOnSyncComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
  })
})

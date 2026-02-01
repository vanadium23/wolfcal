import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncEngine } from '../../lib/sync/engine'
import type { SyncMetadata, CalendarEvent } from '../../lib/db/types'
import type { GoogleEvent } from '../../lib/api/types'

// We need to hoist the mock functions before any imports
const { mockListEventsImpl } = vi.hoisted(() => ({
  mockListEventsImpl: vi.fn(),
}))

// Mock the CalendarClient at the module level
vi.mock('../../lib/api/calendar', () => ({
  CalendarClient: class MockCalendarClient {
    listEvents = mockListEventsImpl
  },
}))

// Mock all the DB functions
vi.mock('../../lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/db')>()
  return {
    ...actual,
    getCalendarsByAccount: vi.fn(),
    getSyncMetadata: vi.fn(),
    updateSyncMetadata: vi.fn(),
    addSyncMetadata: vi.fn(),
    getEventsByCalendar: vi.fn(),
    addEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getTombstone: vi.fn(),
    getAllTombstones: vi.fn().mockResolvedValue([]),
    deleteTombstone: vi.fn(),
    addErrorLog: vi.fn(),
    getPendingChangesByCalendar: vi.fn().mockResolvedValue([]),
  }
})

// Mock conflict detection
vi.mock('../../lib/sync/conflicts', () => ({
  detectConflict: vi.fn().mockResolvedValue({ hasConflict: false }),
  eventsAreDifferent: vi.fn(() => false),
  createConflictedEvent: vi.fn(),
}))

// Mock encryption
vi.mock('../../lib/auth/encryption', () => ({
  decryptToken: vi.fn().mockResolvedValue('mock-token'),
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
}))

// Mock retry
vi.mock('../../lib/api/retry', () => ({
  retryWithBackoff: (fn: () => unknown) => fn(),
}))

const db = await import('../../lib/db')

describe('SyncEngine - Critical Flows', () => {
  let syncEngine: SyncEngine
  const mockAccountId = 'test-account-1'
  const mockCalendarId = 'test-calendar-1'

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a new SyncEngine for each test
    syncEngine = new SyncEngine()

    // Reset the mock implementation to default success
    mockListEventsImpl.mockResolvedValue({
      items: [],
      nextSyncToken: 'default-sync-token',
    })

    // Default DB mocks
    vi.mocked(db.getSyncMetadata).mockResolvedValue(undefined)
    vi.mocked(db.getEventsByCalendar).mockResolvedValue([])
    vi.mocked(db.getTombstone).mockResolvedValue(undefined)
  })

  describe('Critical Flow: Incremental Sync with New Events', () => {
    it('should fetch events from Google Calendar and store them in IndexedDB', async () => {
      // Setup: Existing sync token (incremental sync)
      const existingMetadata: SyncMetadata = {
        calendarId: mockCalendarId,
        accountId: mockAccountId,
        syncToken: 'existing-sync-token',
        lastSyncAt: Date.now() - 3600000,
        lastSyncStatus: 'success',
      }
      vi.mocked(db.getSyncMetadata).mockResolvedValue(existingMetadata)

      // Setup: Mock API response with new events
      const googleEvent: GoogleEvent = {
        id: 'event-1',
        summary: 'Team Standup',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        created: '2026-02-01T00:00:00Z',
        updated: '2026-02-01T00:00:00Z',
      }

      mockListEventsImpl.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'new-sync-token',
      })

      // Act
      const result = await syncEngine.syncCalendar(mockAccountId, mockCalendarId)

      // Assert: Critical flow verified
      expect(result.calendarId).toBe(mockCalendarId)
      expect(result.eventsAdded).toBe(1)
      expect(result.syncToken).toBe('new-sync-token')

      // Verify event was stored in DB
      expect(db.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          summary: 'Team Standup',
          accountId: mockAccountId,
          calendarId: mockCalendarId,
        })
      )

      // Verify sync metadata was updated
      expect(db.updateSyncMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: mockCalendarId,
          syncToken: 'new-sync-token',
          lastSyncStatus: 'success',
        })
      )
    })
  })

  describe('Critical Flow: Full Sync (First Time)', () => {
    it('should perform full sync when no syncToken exists', async () => {
      // Setup: No existing metadata (first-time sync)
      vi.mocked(db.getSyncMetadata).mockResolvedValue(undefined)

      const googleEvent: GoogleEvent = {
        id: 'event-1',
        summary: 'Initial Sync Event',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        created: '2026-02-01T00:00:00Z',
        updated: '2026-02-01T00:00:00Z',
      }

      mockListEventsImpl.mockResolvedValue({
        items: [googleEvent],
        nextSyncToken: 'initial-sync-token',
      })

      // Act
      const result = await syncEngine.syncCalendar(mockAccountId, mockCalendarId)

      // Assert
      expect(result.eventsAdded).toBe(1)
      expect(db.addSyncMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: mockCalendarId,
          syncToken: 'initial-sync-token',
        })
      )
    })
  })

  describe('Critical Flow: Event Deletion', () => {
    it('should handle cancelled events from Google Calendar', async () => {
      const existingMetadata: SyncMetadata = {
        calendarId: mockCalendarId,
        accountId: mockAccountId,
        syncToken: 'existing-sync-token',
        lastSyncAt: Date.now() - 3600000,
        lastSyncStatus: 'success',
      }
      vi.mocked(db.getSyncMetadata).mockResolvedValue(existingMetadata)

      // Setup: Cancelled event from Google
      const cancelledEvent: GoogleEvent = {
        id: 'event-to-delete',
        summary: 'Deleted Event',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'cancelled',
        created: '2026-02-01T00:00:00Z',
        updated: '2026-02-01T00:00:00Z',
      }

      mockListEventsImpl.mockResolvedValue({
        items: [cancelledEvent],
        nextSyncToken: 'new-sync-token',
      })

      // Act
      const result = await syncEngine.syncCalendar(mockAccountId, mockCalendarId)

      // Assert
      expect(result.eventsDeleted).toBe(1)
      expect(db.deleteEvent).toHaveBeenCalledWith('event-to-delete')
    })
  })

  describe('Critical Flow: Event Update', () => {
    it('should update existing events when remote version changes', async () => {
      const lastSyncAt = Date.now() - 3600000
      const existingMetadata: SyncMetadata = {
        calendarId: mockCalendarId,
        accountId: mockAccountId,
        syncToken: 'existing-sync-token',
        lastSyncAt,
        lastSyncStatus: 'success',
      }
      vi.mocked(db.getSyncMetadata).mockResolvedValue(existingMetadata)

      // Setup: Existing event in DB
      const existingEvent: CalendarEvent = {
        id: 'event-1',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        summary: 'Old Title',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        createdAt: lastSyncAt - 2000,
        updatedAt: lastSyncAt - 1000,
        lastSyncedAt: lastSyncAt,
      }
      vi.mocked(db.getEventsByCalendar).mockResolvedValue([existingEvent])

      // Setup: Updated event from Google
      const updatedEvent: GoogleEvent = {
        id: 'event-1',
        summary: 'New Title - Updated',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        created: '2026-02-01T00:00:00Z',
        updated: new Date(lastSyncAt + 1000).toISOString(),
      }

      mockListEventsImpl.mockResolvedValue({
        items: [updatedEvent],
        nextSyncToken: 'new-sync-token',
      })

      // Act
      const result = await syncEngine.syncCalendar(mockAccountId, mockCalendarId)

      // Assert
      expect(result.eventsUpdated).toBe(1)
      expect(db.updateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          summary: 'New Title - Updated',
        })
      )
    })
  })

  describe('Critical Flow: Multi-Calendar Sync', () => {
    it('should sync all visible calendars for an account', async () => {
      // Setup: Three calendars, two visible
      const mockCalendars = [
        { id: 'cal-1', accountId: mockAccountId, visible: true, summary: 'Cal 1', primary: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cal-2', accountId: mockAccountId, visible: true, summary: 'Cal 2', primary: false, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cal-3', accountId: mockAccountId, visible: false, summary: 'Cal 3', primary: false, createdAt: Date.now(), updatedAt: Date.now() },
      ]
      vi.mocked(db.getCalendarsByAccount).mockResolvedValue(mockCalendars)

      let callCount = 0
      mockListEventsImpl.mockImplementation(async () => {
        callCount++
        return {
          items: [
            {
              id: `event-call-${callCount}`,
              summary: `Event ${callCount}`,
              start: { dateTime: '2026-02-01T10:00:00Z' },
              end: { dateTime: '2026-02-01T11:00:00Z' },
              status: 'confirmed',
              created: '2026-02-01T00:00:00Z',
              updated: '2026-02-01T00:00:00Z',
            },
          ],
          nextSyncToken: `sync-token-${callCount}`,
        }
      })

      // Act
      const result = await syncEngine.syncAccount(mockAccountId)

      // Assert
      expect(result.calendarsProcessed).toBe(2) // Only visible calendars
      expect(result.totalEventsAdded).toBe(2)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Critical Flow: Error Handling', () => {
    it('should log error and update metadata on sync failure', async () => {
      vi.mocked(db.getSyncMetadata).mockResolvedValue({
        calendarId: mockCalendarId,
        accountId: mockAccountId,
        syncToken: 'existing-sync-token',
        lastSyncAt: Date.now() - 3600000,
        lastSyncStatus: 'success',
      })

      mockListEventsImpl.mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      // Act & Assert
      await expect(
        syncEngine.syncCalendar(mockAccountId, mockCalendarId)
      ).rejects.toThrow()

      expect(db.updateSyncMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSyncStatus: 'error',
          errorMessage: 'API rate limit exceeded',
        })
      )
      expect(db.addErrorLog).toHaveBeenCalled()
    })

    it('should continue syncing other calendars if one fails', async () => {
      const mockCalendars = [
        { id: 'cal-1', accountId: mockAccountId, visible: true, summary: 'Cal 1', primary: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'cal-2', accountId: mockAccountId, visible: true, summary: 'Cal 2', primary: false, createdAt: Date.now(), updatedAt: Date.now() },
      ]
      vi.mocked(db.getCalendarsByAccount).mockResolvedValue(mockCalendars)

      let callCount = 0
      mockListEventsImpl.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Calendar not found')
        }
        return {
          items: [
            {
              id: 'event-success',
              summary: 'Success Event',
              start: { dateTime: '2026-02-01T10:00:00Z' },
              end: { dateTime: '2026-02-01T11:00:00Z' },
              status: 'confirmed',
              created: '2026-02-01T00:00:00Z',
              updated: '2026-02-01T00:00:00Z',
            },
          ],
          nextSyncToken: 'sync-token',
        }
      })

      // Act
      const result = await syncEngine.syncAccount(mockAccountId)

      // Assert
      expect(result.calendarsProcessed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].calendarId).toBe('cal-1')
      expect(result.totalEventsAdded).toBe(1)
    })
  })

  describe('Critical Flow: Pagination', () => {
    it('should handle paginated responses correctly', async () => {
      const existingMetadata: SyncMetadata = {
        calendarId: mockCalendarId,
        accountId: mockAccountId,
        syncToken: 'existing-sync-token',
        lastSyncAt: Date.now() - 3600000,
        lastSyncStatus: 'success',
      }
      vi.mocked(db.getSyncMetadata).mockResolvedValue(existingMetadata)

      let callCount = 0
      mockListEventsImpl.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return {
            items: [
              {
                id: 'event-page1',
                summary: 'Page 1 Event',
                start: { dateTime: '2026-02-01T10:00:00Z' },
                end: { dateTime: '2026-02-01T11:00:00Z' },
                status: 'confirmed',
                created: '2026-02-01T00:00:00Z',
                updated: '2026-02-01T00:00:00Z',
              },
            ],
            nextPageToken: 'page-token-2',
          }
        }
        return {
          items: [
            {
              id: 'event-page2',
              summary: 'Page 2 Event',
              start: { dateTime: '2026-02-01T10:00:00Z' },
              end: { dateTime: '2026-02-01T11:00:00Z' },
              status: 'confirmed',
              created: '2026-02-01T00:00:00Z',
              updated: '2026-02-01T00:00:00Z',
            },
          ],
          nextSyncToken: 'final-sync-token',
        }
      })

      // Act
      const result = await syncEngine.syncCalendar(mockAccountId, mockCalendarId)

      // Assert
      expect(result.eventsAdded).toBe(2)
      expect(callCount).toBe(2) // Both pages fetched
      expect(result.syncToken).toBe('final-sync-token')
    })
  })
})

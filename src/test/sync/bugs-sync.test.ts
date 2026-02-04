/**
 * Regression tests for sync bugs (BUG-1, BUG-2)
 *
 * BUG-1: Event added does not sync to destination
 * BUG-2: Event deleted from Google stays as "unsync" in UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processQueue } from '../../lib/sync/processor'
import type { PendingChange, CalendarEvent } from '../../lib/db/types'
import type { GoogleEvent } from '../../lib/api/types'

// Hoisted mock functions
const { mockCreateEvent, mockGetPendingChanges, mockDeletePendingChange, mockUpdatePendingChange, mockAddEvent, mockDeleteEvent, mockUpdateEvent, mockDeleteTombstone, mockGetAccount } = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockGetPendingChanges: vi.fn(),
  mockDeletePendingChange: vi.fn(),
  mockUpdatePendingChange: vi.fn(),
  mockAddEvent: vi.fn(),
  mockDeleteEvent: vi.fn(),
  mockUpdateEvent: vi.fn(),
  mockDeleteTombstone: vi.fn(),
  mockGetAccount: vi.fn(),
}))

// Mock CalendarClient
vi.mock('../../lib/api/calendar', () => ({
  CalendarClient: class MockCalendarClient {
    createEvent = mockCreateEvent
  },
}))

// Mock DB functions
vi.mock('../../lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/db')>()
  return {
    ...actual,
    getPendingChangesOrderedByDate: mockGetPendingChanges,
    deletePendingChange: mockDeletePendingChange,
    updatePendingChange: mockUpdatePendingChange,
    addEvent: mockAddEvent,
    deleteEvent: mockDeleteEvent,
    updateEvent: mockUpdateEvent,
    deleteTombstone: mockDeleteTombstone,
    getAccount: mockGetAccount,
  }
})

// Mock encryption
vi.mock('../../lib/auth/encryption', () => ({
  decryptToken: vi.fn().mockResolvedValue('mock-access-token'),
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
}))

// Mock retry
vi.mock('../../lib/api/retry', () => ({
  retryWithBackoff: (fn: () => unknown) => fn(),
}))

describe('BUG-1: Event sync to destination', () => {
  const mockAccountId = 'test-account@example.com'
  const mockCalendarId = 'primary'
  const tempEventId = 'temp-abc123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock: no pending changes
    mockGetPendingChanges.mockResolvedValue([])

    // Default mock: account exists
    mockGetAccount.mockResolvedValue({
      email: mockAccountId,
      encryptedAccessToken: 'encrypted-token',
      encryptedRefreshToken: 'encrypted-refresh-token',
      tokenExpiry: Date.now() + 3600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })

  describe('Happy path: Event creation and sync', () => {
    it('should sync event to Google Calendar when online', async () => {
      // Setup: Event queued for sync
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Mock successful Google Calendar API response
      const googleEvent: GoogleEvent = {
        id: 'google-event-123',
        summary: 'Test Event',
        start: { dateTime: '2026-02-05T10:00:00Z' },
        end: { dateTime: '2026-02-05T11:00:00Z' },
        status: 'confirmed',
        created: '2026-02-05T00:00:00Z',
        updated: '2026-02-05T00:00:00Z',
      }
      mockCreateEvent.mockResolvedValue(googleEvent)

      // Act: Process queue
      const result = await processQueue()

      // Assert: Event was synced successfully
      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)

      // Verify API was called
      expect(mockCreateEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({
          summary: 'Test Event',
        })
      )

      // Verify temp event was deleted
      expect(mockDeleteEvent).toHaveBeenCalledWith(tempEventId)

      // Verify real event was added with pendingSync: false
      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'google-event-123',
          summary: 'Test Event',
          pendingSync: false,
        })
      )

      // Verify pending change was removed from queue
      expect(mockDeletePendingChange).toHaveBeenCalledWith('change-1')
    })

    it('should process multiple queued events in FIFO order', async () => {
      // Setup: Multiple events queued
      const now = Date.now()
      const pendingChanges: PendingChange[] = [
        {
          id: 'change-1',
          operation: 'create',
          accountId: mockAccountId,
          calendarId: mockCalendarId,
          eventId: 'temp-1',
          eventData: {
            summary: 'First Event',
            start: { dateTime: '2026-02-05T10:00:00Z' },
            end: { dateTime: '2026-02-05T11:00:00Z' },
          } as Partial<CalendarEvent>,
          createdAt: now - 2000,
          retryCount: 0,
        },
        {
          id: 'change-2',
          operation: 'create',
          accountId: mockAccountId,
          calendarId: mockCalendarId,
          eventId: 'temp-2',
          eventData: {
            summary: 'Second Event',
            start: { dateTime: '2026-02-05T11:00:00Z' },
            end: { dateTime: '2026-02-05T12:00:00Z' },
          } as Partial<CalendarEvent>,
          createdAt: now - 1000,
          retryCount: 0,
        },
        {
          id: 'change-3',
          operation: 'create',
          accountId: mockAccountId,
          calendarId: mockCalendarId,
          eventId: 'temp-3',
          eventData: {
            summary: 'Third Event',
            start: { dateTime: '2026-02-05T12:00:00Z' },
            end: { dateTime: '2026-02-05T13:00:00Z' },
          } as Partial<CalendarEvent>,
          createdAt: now,
          retryCount: 0,
        },
      ]
      mockGetPendingChanges.mockResolvedValue(pendingChanges)

      // Mock API responses
      mockCreateEvent
        .mockResolvedValueOnce({
          id: 'google-1',
          summary: 'First Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
          status: 'confirmed',
          created: '2026-02-05T00:00:00Z',
          updated: '2026-02-05T00:00:00Z',
        } as GoogleEvent)
        .mockResolvedValueOnce({
          id: 'google-2',
          summary: 'Second Event',
          start: { dateTime: '2026-02-05T11:00:00Z' },
          end: { dateTime: '2026-02-05T12:00:00Z' },
          status: 'confirmed',
          created: '2026-02-05T00:00:00Z',
          updated: '2026-02-05T00:00:00Z',
        } as GoogleEvent)
        .mockResolvedValueOnce({
          id: 'google-3',
          summary: 'Third Event',
          start: { dateTime: '2026-02-05T12:00:00Z' },
          end: { dateTime: '2026-02-05T13:00:00Z' },
          status: 'confirmed',
          created: '2026-02-05T00:00:00Z',
          updated: '2026-02-05T00:00:00Z',
        } as GoogleEvent)

      // Act
      const result = await processQueue()

      // Assert
      expect(result.totalProcessed).toBe(3)
      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)

      // Verify FIFO order (first event should be called first)
      expect(mockCreateEvent).toHaveBeenNthCalledWith(1,
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({ summary: 'First Event' })
      )
      expect(mockCreateEvent).toHaveBeenNthCalledWith(2,
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({ summary: 'Second Event' })
      )
      expect(mockCreateEvent).toHaveBeenNthCalledWith(3,
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({ summary: 'Third Event' })
      )
    })
  })

  describe('Offline scenario: Queue events while offline', () => {
    it('should not call API when there are no pending changes', async () => {
      // Setup: No pending changes (user hasn't created events)
      mockGetPendingChanges.mockResolvedValue([])

      // Act
      const result = await processQueue()

      // Assert
      expect(result.totalProcessed).toBe(0)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(0)

      // API should not be called
      expect(mockCreateEvent).not.toHaveBeenCalled()
    })

    it('should preserve event data when queued', async () => {
      // This test verifies that events can be queued with various properties
      // and those properties are preserved when syncing

      const eventData: Partial<CalendarEvent> = {
        summary: 'Complex Event',
        description: 'Event with multiple properties',
        location: '123 Main St',
        start: { dateTime: '2026-02-05T10:00:00Z', timeZone: 'America/New_York' },
        end: { dateTime: '2026-02-05T11:00:00Z', timeZone: 'America/New_York' },
        attendees: [
          { email: 'attendee1@example.com', responseStatus: 'accepted' },
          { email: 'attendee2@example.com', responseStatus: 'needsAction' },
        ],
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
      }

      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      const googleEvent: GoogleEvent = {
        id: 'google-event-123',
        summary: 'Complex Event',
        description: 'Event with multiple properties',
        location: '123 Main St',
        start: { dateTime: '2026-02-05T10:00:00Z', timeZone: 'America/New_York' },
        end: { dateTime: '2026-02-05T11:00:00Z', timeZone: 'America/New_York' },
        attendees: [
          { email: 'attendee1@example.com', responseStatus: 'accepted' },
          { email: 'attendee2@example.com', responseStatus: 'needsAction' },
        ],
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
        status: 'confirmed',
        created: '2026-02-05T00:00:00Z',
        updated: '2026-02-05T00:00:00Z',
      }
      mockCreateEvent.mockResolvedValue(googleEvent)

      // Act
      await processQueue()

      // Assert: All properties sent to API
      expect(mockCreateEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({
          summary: 'Complex Event',
          description: 'Event with multiple properties',
          location: '123 Main St',
          attendees: eventData.attendees,
          recurrence: eventData.recurrence,
        })
      )
    })
  })

  describe('Error scenarios', () => {
    it('should retry on API failure (up to 3 times)', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Mock API failure
      mockCreateEvent.mockRejectedValue(new Error('Network error'))

      // Act
      const result = await processQueue()

      // Assert: Event failed but was updated with retry count
      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(1)

      // Verify retry count was updated
      expect(mockUpdatePendingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'change-1',
          retryCount: 1,
          lastError: 'Network error',
        })
      )

      // Verify temp event was NOT deleted (sync failed)
      expect(mockDeleteEvent).not.toHaveBeenCalled()
    })

    it('should mark as failed after 3 retries', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 2, // Already failed twice
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Mock API failure
      mockCreateEvent.mockRejectedValue(new Error('Network error'))

      // Act
      const result = await processQueue()

      // Assert
      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(1)

      // Verify marked as permanently failed
      expect(mockUpdatePendingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'change-1',
          retryCount: 3,
          lastError: expect.stringContaining('FAILED after 3 attempts'),
        })
      )
    })

    it('should skip changes that have already failed max retries', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 3,
        lastError: 'FAILED after 3 attempts: Network error',
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Act
      const result = await processQueue()

      // Assert: Should skip without calling API
      expect(result.totalProcessed).toBe(1)
      expect(result.failed).toBe(1)

      // API should not be called
      expect(mockCreateEvent).not.toHaveBeenCalled()

      // Should not update pending change (already marked as failed)
      expect(mockUpdatePendingChange).not.toHaveBeenCalled()
    })

    it('should handle missing eventData gracefully', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: undefined, // Missing event data
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Act
      const result = await processQueue()

      // Assert
      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(1)

      // Verify error was recorded
      expect(mockUpdatePendingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'change-1',
          retryCount: 1,
          lastError: 'eventData is required for create operation',
        })
      )

      // API should not be called
      expect(mockCreateEvent).not.toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      // Mock authentication error
      mockCreateEvent.mockRejectedValue(new Error('Invalid credentials'))

      // Act
      const result = await processQueue()

      // Assert
      expect(result.failed).toBe(1)
      expect(mockUpdatePendingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          lastError: 'Invalid credentials',
        })
      )
    })
  })

  describe('Data integrity', () => {
    it('should convert CalendarEvent to GoogleEvent format correctly', async () => {
      const eventData: Partial<CalendarEvent> = {
        summary: 'All Day Event',
        start: { date: '2026-02-05' },
        end: { date: '2026-02-06' },
        status: 'confirmed',
      }

      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      const googleEvent: GoogleEvent = {
        id: 'google-event-123',
        summary: 'All Day Event',
        start: { date: '2026-02-05' },
        end: { date: '2026-02-06' },
        status: 'confirmed',
        created: '2026-02-05T00:00:00Z',
        updated: '2026-02-05T00:00:00Z',
      }
      mockCreateEvent.mockResolvedValue(googleEvent)

      // Act
      await processQueue()

      // Assert: Correct format sent to API
      expect(mockCreateEvent).toHaveBeenCalledWith(
        mockAccountId,
        mockCalendarId,
        expect.objectContaining({
          summary: 'All Day Event',
          start: { date: '2026-02-05' },
          end: { date: '2026-02-06' },
          status: 'confirmed',
        })
      )
    })

    it('should ensure pendingSync is false after successful sync', async () => {
      const pendingChange: PendingChange = {
        id: 'change-1',
        operation: 'create',
        accountId: mockAccountId,
        calendarId: mockCalendarId,
        eventId: tempEventId,
        eventData: {
          summary: 'Test Event',
          start: { dateTime: '2026-02-05T10:00:00Z' },
          end: { dateTime: '2026-02-05T11:00:00Z' },
        } as Partial<CalendarEvent>,
        createdAt: Date.now(),
        retryCount: 0,
      }
      mockGetPendingChanges.mockResolvedValue([pendingChange])

      const googleEvent: GoogleEvent = {
        id: 'google-event-123',
        summary: 'Test Event',
        start: { dateTime: '2026-02-05T10:00:00Z' },
        end: { dateTime: '2026-02-05T11:00:00Z' },
        status: 'confirmed',
        created: '2026-02-05T00:00:00Z',
        updated: '2026-02-05T00:00:00Z',
      }
      mockCreateEvent.mockResolvedValue(googleEvent)

      // Act
      await processQueue()

      // Assert: Critical check - pendingSync must be false
      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingSync: false,
        })
      )
    })
  })
})

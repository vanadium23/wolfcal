import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CalendarEvent } from '../../lib/db/types'

// Mock the database functions BEFORE importing the component
const { mockUpdateEvent, mockAddPendingChange } = vi.hoisted(() => ({
  mockUpdateEvent: vi.fn().mockResolvedValue(undefined),
  mockAddPendingChange: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/db')>()
  return {
    ...actual,
    updateEvent: mockUpdateEvent,
    addPendingChange: mockAddPendingChange,
    getPendingChangesByEvent: vi.fn().mockResolvedValue([]),
  }
})

// Mock CalendarClient's respondToInvitation
const mockRespondToInvitation = vi.fn()

vi.mock('../../lib/api/calendar', () => ({
  CalendarClient: class MockCalendarClient {
    respondToInvitation = mockRespondToInvitation
  },
}))

import EventPopover from '../../components/EventPopover'

describe('BUG-3: Accept/decline event', () => {
  const mockEvent: CalendarEvent = {
    id: 'event-1',
    accountId: 'account-1',
    calendarId: 'primary',
    summary: 'Meeting Invitation',
    start: { dateTime: '2026-02-01T10:00:00Z' },
    end: { dateTime: '2026-02-01T11:00:00Z' },
    attendees: [
      {
        email: 'user@example.com',
        responseStatus: 'needsAction',
      },
      {
        email: 'organizer@example.com',
        responseStatus: 'accepted',
        organizer: true,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const defaultProps = {
    event: mockEvent,
    currentUserEmail: 'user@example.com',
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    position: { x: 100, y: 100 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.onLine to default online state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  describe('Online invitation response', () => {
    it('should accept event and call CalendarClient.respondToInvitation when online', async () => {
      // Setup: Mock successful API response
      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        summary: 'Meeting Invitation',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        attendees: [
          {
            email: 'user@example.com',
            self: true,
            responseStatus: 'accepted',
            organizer: false,
          },
          {
            email: 'organizer@example.com',
            self: false,
            responseStatus: 'accepted',
            organizer: true,
          },
        ],
        updated: new Date().toISOString(),
      })

      render(<EventPopover {...defaultProps} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: respondToInvitation was called
      expect(mockRespondToInvitation).toHaveBeenCalledWith(
        'account-1',
        'primary',
        'event-1',
        'accepted'
      )

      // Assert: updateEvent was called to update local IndexedDB
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: 'user@example.com',
              responseStatus: 'accepted',
            }),
          ]),
        })
      )
    })

    it('should decline event and call CalendarClient.respondToInvitation when online', async () => {
      // Setup: Mock successful API response
      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        summary: 'Meeting Invitation',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        attendees: [
          {
            email: 'user@example.com',
            self: true,
            responseStatus: 'declined',
            organizer: false,
          },
          {
            email: 'organizer@example.com',
            self: false,
            responseStatus: 'accepted',
            organizer: true,
          },
        ],
        updated: new Date().toISOString(),
      })

      render(<EventPopover {...defaultProps} />)

      // Click Decline button
      const declineButton = screen.getByRole('button', { name: /decline/i })
      await userEvent.click(declineButton)

      // Assert: respondToInvitation was called
      expect(mockRespondToInvitation).toHaveBeenCalledWith(
        'account-1',
        'primary',
        'event-1',
        'declined'
      )

      // Assert: updateEvent was called
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: 'user@example.com',
              responseStatus: 'declined',
            }),
          ]),
        })
      )
    })

    it('should only update current user response status (not other attendees)', async () => {
      // Setup: Event with multiple attendees
      const eventWithMultipleAttendees: CalendarEvent = {
        ...mockEvent,
        attendees: [
          {
            email: 'user@example.com',
            responseStatus: 'needsAction',
          },
          {
            email: 'organizer@example.com',
            responseStatus: 'accepted',
            organizer: true,
          },
          {
            email: 'attendee2@example.com',
            responseStatus: 'tentative',
          },
          {
            email: 'attendee3@example.com',
            responseStatus: 'declined',
          },
        ],
      }

      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        attendees: [
          { email: 'user@example.com', self: true, responseStatus: 'accepted', organizer: false },
          { email: 'organizer@example.com', self: false, responseStatus: 'accepted', organizer: true },
          { email: 'attendee2@example.com', self: false, responseStatus: 'tentative', organizer: false },
          { email: 'attendee3@example.com', self: false, responseStatus: 'declined', organizer: false },
        ],
        updated: new Date().toISOString(),
      } as unknown as Awaited<ReturnType<typeof mockRespondToInvitation>>)

      render(<EventPopover {...defaultProps} event={eventWithMultipleAttendees} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: Only current user's status changed
      const updateCall = mockUpdateEvent.mock.calls[0][0] as CalendarEvent
      expect(updateCall.attendees).toHaveLength(4)
      expect(updateCall.attendees?.find((a) => a.email === 'user@example.com')?.responseStatus).toBe('accepted')
      expect(updateCall.attendees?.find((a) => a.email === 'attendee2@example.com')?.responseStatus).toBe('tentative')
      expect(updateCall.attendees?.find((a) => a.email === 'attendee3@example.com')?.responseStatus).toBe('declined')
    })
  })

  describe('Offline invitation response', () => {
    beforeEach(() => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })
    })

    it('should queue accept response when offline', async () => {
      render(<EventPopover {...defaultProps} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: No API call was made
      expect(mockRespondToInvitation).not.toHaveBeenCalled()

      // Assert: Local event was updated optimistically
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: 'user@example.com',
              responseStatus: 'accepted',
            }),
          ]),
        })
      )

      // Assert: Pending change was queued
      expect(mockAddPendingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'event',
          eventId: 'event-1',
          operation: 'update',
          eventData: expect.objectContaining({
            attendees: expect.arrayContaining([
              expect.objectContaining({
                email: 'user@example.com',
                responseStatus: 'accepted',
              }),
            ]),
          }),
        })
      )
    })

    it('should queue decline response when offline', async () => {
      render(<EventPopover {...defaultProps} />)

      // Click Decline button
      const declineButton = screen.getByRole('button', { name: /decline/i })
      await userEvent.click(declineButton)

      // Assert: No API call was made
      expect(mockRespondToInvitation).not.toHaveBeenCalled()

      // Assert: Local event was updated optimistically
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: 'user@example.com',
              responseStatus: 'declined',
            }),
          ]),
        })
      )

      // Assert: Pending change was queued
      expect(mockAddPendingChange).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should show error when API call fails', async () => {
      // Setup: Mock API failure
      mockRespondToInvitation.mockRejectedValue(new Error('Event not found'))

      render(<EventPopover {...defaultProps} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Event not found|Failed to update response/i)).toBeInTheDocument()
      })

      // Assert: Local state was NOT changed on error
      expect(mockUpdateEvent).not.toHaveBeenCalled()
    })

    it('should handle API response without self flag gracefully', async () => {
      // BUG SCENARIO: Google API returns attendees WITHOUT self: true flag
      // This can happen when the current user email doesn't match the authenticated account
      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        summary: 'Meeting Invitation',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        // BUG: No attendee marked with self: true
        attendees: [
          {
            email: 'user@example.com',
            // NO self flag - Google doesn't recognize this as current user
            responseStatus: 'needsAction', // NOT updated to 'accepted'
            organizer: false,
          },
          {
            email: 'organizer@example.com',
            responseStatus: 'accepted',
            organizer: true,
          },
        ],
        updated: new Date().toISOString(),
      })

      render(<EventPopover {...defaultProps} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: respondToInvitation was called
      await waitFor(() => {
        expect(mockRespondToInvitation).toHaveBeenCalled()
      })

      // BUG: The response status is NOT updated because self: true was missing
      // The local DB will be updated with needsAction instead of accepted
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          attendees: expect.arrayContaining([
            expect.objectContaining({
              email: 'user@example.com',
              responseStatus: 'needsAction', // BUG: Should be 'accepted' but isn't
            }),
          ]),
        })
      )
    })

    it('should handle events without current user attendee gracefully', async () => {
      // Setup: Event where current user is NOT in attendees list
      const eventWithoutCurrentUser: CalendarEvent = {
        ...mockEvent,
        attendees: [
          {
            email: 'organizer@example.com',
            responseStatus: 'accepted',
            organizer: true,
          },
          {
            email: 'other@example.com',
            responseStatus: 'tentative',
          },
        ],
      }

      render(<EventPopover {...defaultProps} event={eventWithoutCurrentUser} />)

      // Note: The current implementation doesn't explicitly check if user is in attendees
      // It will call the API which may fail. This test documents current behavior.
      // After the fix, this should either:
      // 1. Hide the accept/decline buttons, or
      // 2. Show an error when user tries to respond

      const acceptButton = screen.queryByRole('button', { name: /accept/i })
      // If buttons are hidden for non-attendees, this would be null
      // If buttons are shown, we expect the API call to fail
      if (acceptButton) {
        await userEvent.click(acceptButton)
        // Should handle the error gracefully
        await waitFor(() => {
          expect(mockRespondToInvitation).toHaveBeenCalled()
        })
      }
    })
  })

  describe('UI updates', () => {
    it('should call onUpdate callback after successful response', async () => {
      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        attendees: [
          { email: 'user@example.com', self: true, responseStatus: 'accepted', organizer: false },
        ],
        updated: new Date().toISOString(),
      } as unknown as Awaited<ReturnType<typeof mockRespondToInvitation>>)

      const onUpdate = vi.fn()

      render(<EventPopover {...defaultProps} onUpdate={onUpdate} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: onUpdate callback was invoked
      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled()
      })
    })

    it('should close popover after successful response', async () => {
      mockRespondToInvitation.mockResolvedValue({
        id: 'event-1',
        attendees: [
          { email: 'user@example.com', self: true, responseStatus: 'accepted', organizer: false },
        ],
        updated: new Date().toISOString(),
      } as unknown as Awaited<ReturnType<typeof mockRespondToInvitation>>)

      const onClose = vi.fn()

      render(<EventPopover {...defaultProps} onClose={onClose} />)

      // Click Accept button
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await userEvent.click(acceptButton)

      // Assert: onClose callback was invoked
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })
})

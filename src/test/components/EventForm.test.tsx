import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventForm from '../../components/EventForm'
import type { CalendarEvent, Calendar } from '../../lib/db/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('EventForm Component', () => {
  const mockCalendars: Calendar[] = [
    {
      id: 'cal-1',
      accountId: 'account-1',
      summary: 'Primary Calendar',
      visible: true,
      backgroundColor: '#03a9f4',
      foregroundColor: '#ffffff',
    },
    {
      id: 'cal-2',
      accountId: 'account-1',
      summary: 'Secondary Calendar',
      visible: true,
      backgroundColor: '#795548',
      foregroundColor: '#ffffff',
    },
    {
      id: 'cal-hidden',
      accountId: 'account-1',
      summary: 'Hidden Calendar',
      visible: false,
      backgroundColor: '#ff0000',
      foregroundColor: '#ffffff',
    },
  ]

  const mockAccountMap = {
    'account-1': { email: 'user@example.com' },
  }

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Form Validation - Required Fields', () => {
    it('should show title is required error when submitting empty form', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Click submit without filling form
      const submitButton = screen.getByRole('button', { name: /create event/i })
      await user.click(submitButton)

      // Should show validation error
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })

    it('should show start date/time is required error', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Clear auto-filled start date and fill only title
      await user.clear(screen.getByLabelText(/start date/i))
      await user.type(screen.getByLabelText(/title/i), 'Test Event')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should show error for missing start date
      expect(screen.getByText('Start date and time is required')).toBeInTheDocument()
    })

    it('should show end date/time is required error', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Clear auto-filled end date and fill title/start
      await user.clear(screen.getByLabelText(/end date/i))
      await user.type(screen.getByLabelText(/title/i), 'Test Event')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should show error for missing end date
      expect(screen.getByText('End date and time is required')).toBeInTheDocument()
    })

    it('should validate end time is after start time', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Clear pre-filled dates and set end time before start time
      await user.clear(screen.getByLabelText(/start date/i))
      await user.clear(screen.getByLabelText(/end date/i))
      await user.type(screen.getByLabelText(/title/i), 'Test Event')
      await user.type(screen.getByLabelText(/start date/i), '2026-02-01T14:00')
      await user.type(screen.getByLabelText(/end date/i), '2026-02-01T12:00')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should show error for end time before start time
      expect(screen.getByText('End time must be after start time')).toBeInTheDocument()
    })

    it('should validate all-day event end date is on or after start date', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Enable all-day
      await user.click(screen.getByRole('checkbox', { name: /all-day/i }))

      // Clear auto-filled dates and set end before start
      await user.clear(screen.getByLabelText(/start date/i))
      await user.clear(screen.getByLabelText(/end date/i))
      await user.type(screen.getByLabelText(/title/i), 'Test Event')
      await user.type(screen.getByLabelText(/start date/i), '2026-02-05')
      await user.type(screen.getByLabelText(/end date/i), '2026-02-03')

      // Try to submit
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should show error
      expect(screen.getByText('End date must be on or after start date')).toBeInTheDocument()
    })
  })

  describe('All-Day Toggle Behavior', () => {
    it('should preserve chosen time when toggling all-day on', async () => {
      const user = userEvent.setup()

      const initialRange = {
        start: new Date('2026-02-01T10:00:00'),
        end: new Date('2026-02-01T11:00:00'),
        allDay: false,
      }

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          initialRange={initialRange}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Check initial datetime-local inputs are populated
      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement
      const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement

      expect(startInput.type).toBe('datetime-local')
      expect(startInput.value).toContain('10:00')
      expect(endInput.value).toContain('11:00')

      // Toggle all-day
      await user.click(screen.getByRole('checkbox', { name: /all-day/i }))

      // Should now be date inputs and preserve the chosen dates
      await waitFor(() => {
        expect(startInput.type).toBe('date')
        expect(endInput.type).toBe('date')
      })
      expect(startInput.value).toBe('2026-02-01')
      expect(endInput.value).toBe('2026-02-01')
    })

    it('should convert date to datetime when toggling all-day off', async () => {
      const user = userEvent.setup()

      const initialRange = {
        start: new Date('2026-02-01'),
        end: new Date('2026-02-01'),
        allDay: true,
      }

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          initialRange={initialRange}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement
      const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement

      // Initially all-day
      expect(startInput.type).toBe('date')
      expect(startInput.value).toBe('2026-02-01')

      // Toggle all-day off
      await user.click(screen.getByRole('checkbox', { name: /all-day/i }))

      // Should convert to datetime-local with 09:00 and 10:00 defaults
      await waitFor(() => {
        expect(startInput.type).toBe('datetime-local')
        expect(endInput.type).toBe('datetime-local')
      })
      expect(startInput.value).toContain('2026-02-01')
      expect(endInput.value).toContain('2026-02-01')
    })
  })

  describe('Form Submission', () => {
    it('should submit form data when validation passes', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Fill required fields
      await user.clear(screen.getByLabelText(/title/i))
      await user.type(screen.getByLabelText(/title/i), 'Team Meeting')

      // Submit (form auto-fills with current date/time on mount)
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should call onSubmit with form data
      expect(mockOnSubmit).toHaveBeenCalled()
      const submittedData = mockOnSubmit.mock.calls[0][0]
      expect(submittedData.summary).toBe('Team Meeting')
      expect(submittedData.calendarId).toBe('cal-1')
      expect(submittedData.allDay).toBe(false)
    })

    it('should save last used calendar ID to localStorage', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-2"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Select different calendar
      await user.selectOptions(screen.getByLabelText(/calendar/i), 'cal-1')

      // Fill and submit
      await user.clear(screen.getByLabelText(/title/i))
      await user.type(screen.getByLabelText(/title/i), 'Test Event')
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should save to localStorage
      expect(localStorageMock.getItem('wolfcal:lastUsedCalendarId')).toBe('cal-1')
    })

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup()
      let resolveSubmit: (value: void) => void

      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => {
          resolveSubmit = resolve
        })
      )

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Fill and submit
      await user.clear(screen.getByLabelText(/title/i))
      await user.type(screen.getByLabelText(/title/i), 'Async Event')
      await user.click(screen.getByRole('button', { name: /create event/i }))

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
      })

      // Resolve
      resolveSubmit!()
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument()
      })
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Calendar Selector', () => {
    it('should only show visible calendars', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      const select = screen.getByLabelText(/calendar/i) as HTMLSelectElement
      const options = Array.from(select.options)

      // Should have 2 visible calendars (not 3)
      expect(options).toHaveLength(2)
      expect(options.map((o) => o.value)).not.toContain('cal-hidden')
    })

    it('should display account email in calendar options', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      const select = screen.getByLabelText(/calendar/i) as HTMLSelectElement
      const primaryOption = select.options[0]

      // Should show "Primary Calendar (user@example.com)"
      expect(primaryOption.textContent).toContain('Primary Calendar')
      expect(primaryOption.textContent).toContain('user@example.com')
    })

    it('should use last used calendar as default', () => {
      localStorageMock.setItem('wolfcal:lastUsedCalendarId', 'cal-2')

      render(
        <EventForm
          calendars={mockCalendars}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      const select = screen.getByLabelText(/calendar/i) as HTMLSelectElement
      expect(select.value).toBe('cal-2')
    })
  })

  describe('Advanced Fields', () => {
    it('should not show advanced fields by default in create mode', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/location/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/attendees/i)).not.toBeInTheDocument()
    })

    it('should show advanced fields in edit mode', () => {
      const mockEvent: CalendarEvent = {
        id: 'event-1',
        accountId: 'account-1',
        calendarId: 'cal-1',
        summary: 'Existing Event',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        description: 'Test description',
        location: 'Test location',
        updatedAt: Date.now(),
      }

      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendees/i)).toBeInTheDocument()
    })

    it('should toggle advanced fields when more options is clicked', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Initially hidden
      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument()

      // Click more options
      await user.click(screen.getByRole('button', { name: /more options/i }))

      // Should now show
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendees/i)).toBeInTheDocument()
    })
  })

  describe('Attendees Management', () => {
    it('should add attendee when valid email is entered', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      // Click more options to show attendees field
      await user.click(screen.getByRole('button', { name: /more options/i }))

      // Add attendee
      await user.type(screen.getByLabelText(/attendees/i), 'attendee@example.com')
      await user.click(screen.getByRole('button', { name: /add/i }))

      // Should show attendee in list
      expect(screen.getByText('attendee@example.com')).toBeInTheDocument()
    })

    it('should show error for invalid email', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      await user.click(screen.getByRole('button', { name: /more options/i }))
      await user.type(screen.getByLabelText(/attendees/i), 'invalid-email')
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })

    it('should prevent duplicate attendees', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      await user.click(screen.getByRole('button', { name: /more options/i }))

      // Add attendee
      await user.type(screen.getByLabelText(/attendees/i), 'duplicate@example.com')
      await user.click(screen.getByRole('button', { name: /add/i }))

      // Try to add same attendee again
      await user.type(screen.getByLabelText(/attendees/i), 'duplicate@example.com')
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/already added/i)).toBeInTheDocument()
    })

    it('should remove attendee when remove button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <EventForm
          calendars={mockCalendars}
          defaultCalendarId="cal-1"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      await user.click(screen.getByRole('button', { name: /more options/i }))

      // Add attendee first
      await user.type(screen.getByLabelText(/attendees/i), 'removable@example.com')
      await user.click(screen.getByRole('button', { name: /add/i }))

      // Then remove
      await user.click(screen.getByRole('button', { name: /remove removable@example.com/i }))

      expect(screen.queryByText('removable@example.com')).not.toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should populate form with existing event data', () => {
      const mockEvent: CalendarEvent = {
        id: 'event-1',
        accountId: 'account-1',
        calendarId: 'cal-1',
        summary: 'Edit Me',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        description: 'Edit my description',
        location: 'Edit my location',
        attendees: [{ email: 'edit@example.com' }],
        updatedAt: Date.now(),
      }

      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      expect(screen.getByLabelText(/title/i)).toHaveValue('Edit Me')
      expect(screen.getByLabelText(/description/i)).toHaveValue('Edit my description')
      expect(screen.getByLabelText(/location/i)).toHaveValue('Edit my location')
    })

    it('should show update event button in edit mode', () => {
      const mockEvent: CalendarEvent = {
        id: 'event-1',
        accountId: 'account-1',
        calendarId: 'cal-1',
        summary: 'Edit Me',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        updatedAt: Date.now(),
      }

      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          accountMap={mockAccountMap}
        />
      )

      expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create event/i })).not.toBeInTheDocument()
    })
  })
})

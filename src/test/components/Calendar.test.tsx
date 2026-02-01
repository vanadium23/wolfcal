import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Calendar from '../../components/Calendar'

// Mock FullCalendar
vi.mock('@fullcalendar/react', () => ({
  default: vi.fn(({ events }: { events: any[] }) => (
    <div data-testid="fullcalendar">
      <div>Calendar View</div>
      {events && Array.isArray(events) && events.map((event: any) => (
        <div key={event.id} data-event-id={event.id}>
          {event.title}
        </div>
      ))}
    </div>
  )),
}))

// Mock useEvents hook
const mockRefresh = vi.fn()
const mockEvents: any[] = []
const mockCalendarColors = new Map()

vi.mock('../../hooks/useEvents', () => ({
  useEvents: vi.fn(() => ({
    events: mockEvents,
    calendarColors: mockCalendarColors,
    loading: false,
    refresh: mockRefresh,
    error: null,
  })),
}))

// Mock DB functions
vi.mock('../../lib/db', () => ({
  getEvent: vi.fn(),
  getAllAccounts: vi.fn(),
  getConflictedEvents: vi.fn(),
}))

// Mock event handlers
vi.mock('../../lib/events', () => ({
  handleEventDrop: vi.fn(),
  handleEventResize: vi.fn(),
}))

vi.mock('../../lib/events/delete', () => ({
  softDelete: vi.fn(),
}))

// Mock child components
vi.mock('../../components/FilterPanel', () => ({
  default: ({ onFilterChange: _onFilterChange }: { onFilterChange: () => void }) => (
    <div data-testid="filter-panel">Filter Panel</div>
  ),
}))

vi.mock('../../components/EventPopover', () => ({
  default: ({ event: _event, onClose: _onClose }: { event: any; onClose: () => void }) => (
    <div data-testid="event-popover">Event Popover</div>
  ),
}))

vi.mock('../../components/ConflictModal', () => ({
  default: ({ isOpen, conflictedEvents: _conflictedEvents, onClose: _onClose }: any) => (
    isOpen ? <div data-testid="conflict-modal">Conflict Modal</div> : null
  ),
}))

vi.mock('../../components/EventModal', () => ({
  default: ({ isOpen, eventId: _eventId, onClose: _onClose, onSaved: _onSaved }: any) => (
    isOpen ? <div data-testid="event-modal">Event Modal</div> : null
  ),
}))

import { useEvents } from '../../hooks/useEvents'
import { getEvent, getAllAccounts, getConflictedEvents } from '../../lib/db'
import { softDelete as _softDelete } from '../../lib/events/delete'

describe('Calendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents.length = 0
    mockCalendarColors.clear()

    // Default mock implementations
    vi.mocked(useEvents).mockReturnValue({
      events: mockEvents,
      calendarColors: mockCalendarColors,
      loading: false,
      refresh: mockRefresh,
      error: null,
    })

    vi.mocked(getAllAccounts).mockResolvedValue([
      {
        id: 'account-1',
        email: 'user@example.com',
        encryptedAccessToken: 'encrypted',
        encryptedRefreshToken: 'encrypted',
        tokenExpiry: Date.now() + 3600000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ])

    vi.mocked(getEvent).mockResolvedValue({
      id: 'event-1',
      accountId: 'account-1',
      calendarId: 'cal-1',
      summary: 'Test Event',
      start: { dateTime: '2026-02-01T10:00:00Z' },
      end: { dateTime: '2026-02-01T11:00:00Z' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    vi.mocked(getConflictedEvents).mockResolvedValue([])
  })

  describe('Render', () => {
    it('should render calendar component', () => {
      render(<Calendar />)

      expect(screen.getByTestId('fullcalendar')).toBeInTheDocument()
    })

    it('should show loading state when loading events', () => {
      vi.mocked(useEvents).mockReturnValue({
        events: mockEvents,
        calendarColors: mockCalendarColors,
        loading: true,
        refresh: mockRefresh,
        error: null,
      })

      render(<Calendar />)

      expect(screen.getByText('Loading events...')).toBeInTheDocument()
    })

    it('should render view toggle buttons', () => {
      render(<Calendar />)

      expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
    })

    it('should render toggle filters button', () => {
      render(<Calendar />)

      expect(screen.getByRole('button', { name: 'Show Filters' })).toBeInTheDocument()
    })

    it('should render calendar color legend when calendars exist', () => {
      mockCalendarColors.set('cal-1', {
        color: '#03a9f4',
        summary: 'Primary Calendar',
      })

      render(<Calendar />)

      expect(screen.getByText('Calendars:')).toBeInTheDocument()
      expect(screen.getByText('Primary Calendar')).toBeInTheDocument()
    })

    it('should not render color legend when no calendars', () => {
      render(<Calendar />)

      expect(screen.queryByText('Calendars:')).not.toBeInTheDocument()
    })
  })

  describe('Filter Toggle', () => {
    it('should show filter panel when toggle clicked', async () => {
      const user = userEvent.setup()
      render(<Calendar />)

      await user.click(screen.getByRole('button', { name: 'Show Filters' }))

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Hide Filters' })).toBeInTheDocument()
    })

    it('should hide filter panel when toggle clicked again', async () => {
      const user = userEvent.setup()
      render(<Calendar />)

      // Show filters
      await user.click(screen.getByRole('button', { name: 'Show Filters' }))
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument()

      // Hide filters
      await user.click(screen.getByRole('button', { name: 'Hide Filters' }))
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument()
    })
  })

  describe('View Changes', () => {
    it('should update view when Month button clicked', async () => {
      const user = userEvent.setup()
      render(<Calendar />)

      const monthButton = screen.getByRole('button', { name: 'Month' })
      await user.click(monthButton)

      // Button should be active (bold styling)
      expect(monthButton).toHaveStyle({ fontWeight: 'bold' })
    })

    it('should update view when Week button clicked', async () => {
      const user = userEvent.setup()
      render(<Calendar />)

      const weekButton = screen.getByRole('button', { name: 'Week' })
      await user.click(weekButton)

      // Button should be active (bold styling)
      expect(weekButton).toHaveStyle({ fontWeight: 'bold' })
    })

    it('should update view when Day button clicked', async () => {
      const user = userEvent.setup()
      render(<Calendar />)

      const dayButton = screen.getByRole('button', { name: 'Day' })
      await user.click(dayButton)

      // Button should be active (bold styling)
      expect(dayButton).toHaveStyle({ fontWeight: 'bold' })
    })
  })

  describe('Event Rendering', () => {
    it('should render events when events are available', () => {
      mockEvents.push({
        id: 'event-1',
        title: 'Test Event',
        start: '2026-02-01T10:00:00Z',
        end: '2026-02-01T11:00:00Z',
      })

      render(<Calendar />)

      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })

    it('should render multiple events', () => {
      mockEvents.push(
        {
          id: 'event-1',
          title: 'Event 1',
          start: '2026-02-01T10:00:00Z',
          end: '2026-02-01T11:00:00Z',
        },
        {
          id: 'event-2',
          title: 'Event 2',
          start: '2026-02-01T12:00:00Z',
          end: '2026-02-01T13:00:00Z',
        }
      )

      render(<Calendar />)

      expect(screen.getByText('Event 1')).toBeInTheDocument()
      expect(screen.getByText('Event 2')).toBeInTheDocument()
    })

    it('should not render events when events array is empty', () => {
      render(<Calendar />)

      expect(screen.queryByText('Test Event')).not.toBeInTheDocument()
    })
  })

  describe('Calendar Color Legend', () => {
    it('should display multiple calendars with their colors', () => {
      mockCalendarColors.set('cal-1', {
        color: '#03a9f4',
        summary: 'Primary Calendar',
      })
      mockCalendarColors.set('cal-2', {
        color: '#795548',
        summary: 'Work Calendar',
      })

      render(<Calendar />)

      expect(screen.getByText('Calendars:')).toBeInTheDocument()
      expect(screen.getByText('Primary Calendar')).toBeInTheDocument()
      expect(screen.getByText('Work Calendar')).toBeInTheDocument()
    })

  })

  describe('Data Loading', () => {
    it('should load user email on mount', async () => {
      render(<Calendar />)

      await waitFor(() => {
        expect(getAllAccounts).toHaveBeenCalled()
      })
    })

    it('should check for conflicts on mount', async () => {
      render(<Calendar />)

      await waitFor(() => {
        expect(getConflictedEvents).toHaveBeenCalled()
      })
    })
  })

  describe('Refresh Trigger', () => {
    it('should re-render when refreshTrigger prop changes', () => {
      const { rerender } = render(<Calendar refreshTrigger={0} />)

      // Should render without errors
      expect(screen.getByTestId('fullcalendar')).toBeInTheDocument()

      // Trigger refresh with new value
      rerender(<Calendar refreshTrigger={1} />)

      // Should still render without errors
      expect(screen.getByTestId('fullcalendar')).toBeInTheDocument()
    })
  })
})

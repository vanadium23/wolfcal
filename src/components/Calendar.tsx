import { useState, useEffect, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import type { DatesSetArg } from '@fullcalendar/core'
import { getAllEvents, getVisibleCalendars } from '../lib/db'
import { expandRecurringEvents, isRecurringEvent } from '../lib/events'
import type { CalendarEvent } from '../lib/db/types'
import './Calendar.css'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

/**
 * Convert CalendarEvent to FullCalendar EventInput format
 */
function convertToEventInput(event: CalendarEvent, calendarColor?: string): EventInput {
  const isAllDay = !!event.start.date && !event.start.dateTime

  return {
    id: event.id,
    title: event.summary,
    start: event.start.dateTime || event.start.date || '',
    end: event.end.dateTime || event.end.date || '',
    allDay: isAllDay,
    backgroundColor: calendarColor || '#3b82f6',
    extendedProps: {
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      attachments: event.attachments,
      accountId: event.accountId,
      calendarId: event.calendarId,
      isRecurring: isRecurringEvent(event),
    },
  }
}

export default function Calendar() {
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')
  const [events, setEvents] = useState<EventInput[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const calendarRef = useRef<FullCalendar>(null)

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
  }

  /**
   * Load events from IndexedDB and expand recurring events
   */
  const loadEvents = useCallback(async (range: { start: Date; end: Date }) => {
    try {
      // Get all events from IndexedDB
      const allEvents = await getAllEvents()

      // Get visible calendars to map colors
      const visibleCalendars = await getVisibleCalendars()
      const calendarColorMap = new Map(
        visibleCalendars.map((cal) => [cal.id, cal.backgroundColor || '#3b82f6'])
      )

      // Filter events to only include those from visible calendars
      const visibleCalendarIds = new Set(visibleCalendars.map((cal) => cal.id))
      const eventsToDisplay = allEvents.filter((event) =>
        visibleCalendarIds.has(event.calendarId)
      )

      // Expand recurring events within the visible date range
      const expandedEvents = expandRecurringEvents(eventsToDisplay, range)

      // Convert to FullCalendar format
      const fullCalendarEvents = expandedEvents.map((event) =>
        convertToEventInput(event, calendarColorMap.get(event.calendarId))
      )

      setEvents(fullCalendarEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
      setEvents([])
    }
  }, [])

  /**
   * Handle date range changes (when user navigates calendar)
   */
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const newRange = {
        start: arg.start,
        end: arg.end,
      }

      setDateRange(newRange)
      loadEvents(newRange)
    },
    [loadEvents]
  )

  /**
   * Initial load
   */
  useEffect(() => {
    if (dateRange) {
      loadEvents(dateRange)
    }
  }, [dateRange, loadEvents])

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => handleViewChange('dayGridMonth')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentView === 'dayGridMonth' ? '#3b82f6' : '#e5e7eb',
            color: currentView === 'dayGridMonth' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: currentView === 'dayGridMonth' ? 'bold' : 'normal',
          }}
        >
          Month
        </button>
        <button
          onClick={() => handleViewChange('timeGridWeek')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentView === 'timeGridWeek' ? '#3b82f6' : '#e5e7eb',
            color: currentView === 'timeGridWeek' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: currentView === 'timeGridWeek' ? 'bold' : 'normal',
          }}
        >
          Week
        </button>
        <button
          onClick={() => handleViewChange('timeGridDay')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentView === 'timeGridDay' ? '#3b82f6' : '#e5e7eb',
            color: currentView === 'timeGridDay' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: currentView === 'timeGridDay' ? 'bold' : 'normal',
          }}
        >
          Day
        </button>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        key={currentView} // Force re-render when view changes
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        events={events}
        datesSet={handleDatesSet}
        editable={true}
        selectable={true}
        dayMaxEventRows={3} // Show all-day events in separate section at top
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  )
}

import { useState, useCallback, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventDropArg, EventClickArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { handleEventDrop, handleEventResize } from '../lib/events'
import { useEvents } from '../hooks/useEvents'
import FilterPanel from './FilterPanel'
import EventPopover from './EventPopover'
import ConflictModal from './ConflictModal'
import { getEvent, getAllAccounts, getConflictedEvents } from '../lib/db'
import type { CalendarEvent } from '../lib/db/types'
import './Calendar.css'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

export default function Calendar() {
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [conflictedEvents, setConflictedEvents] = useState<CalendarEvent[]>([])
  const [showConflictModal, setShowConflictModal] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)
  const { events, accountColors, loading, refresh } = useEvents()

  /**
   * Load current user email from the first account
   */
  useEffect(() => {
    async function loadUserEmail() {
      const accounts = await getAllAccounts()
      if (accounts.length > 0) {
        setCurrentUserEmail(accounts[0].email)
      }
    }
    loadUserEmail()
  }, [])

  /**
   * Check for conflicted events and show modal if any exist
   */
  useEffect(() => {
    async function checkConflicts() {
      const conflicts = await getConflictedEvents()
      if (conflicts.length > 0) {
        setConflictedEvents(conflicts)
        setShowConflictModal(true)
      }
    }
    checkConflicts()
  }, [events]) // Re-check when events change (after sync)

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
  }

  /**
   * Handle date range changes (when user navigates calendar)
   */
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const newRange = {
        start: arg.start,
        end: arg.end,
      }
      refresh(newRange)
    },
    [refresh]
  )

  /**
   * Handle event drag-and-drop
   */
  const onEventDrop = useCallback(
    async (dropInfo: EventDropArg) => {
      await handleEventDrop(dropInfo, () => {
        // Reload events after successful drop to update pending indicators
        const api = calendarRef.current?.getApi()
        if (api) {
          const view = api.view
          refresh({ start: view.activeStart, end: view.activeEnd })
        }
      })
    },
    [refresh]
  )

  /**
   * Handle event resize
   */
  const onEventResize = useCallback(
    async (resizeInfo: EventResizeDoneArg) => {
      await handleEventResize(resizeInfo, () => {
        // Reload events after successful resize to update pending indicators
        const api = calendarRef.current?.getApi()
        if (api) {
          const view = api.view
          refresh({ start: view.activeStart, end: view.activeEnd })
        }
      })
    },
    [refresh]
  )

  /**
   * Handle filter changes - refresh events when filters are toggled
   */
  const handleFilterChange = useCallback(() => {
    const api = calendarRef.current?.getApi()
    if (api) {
      const view = api.view
      refresh({ start: view.activeStart, end: view.activeEnd })
    }
  }, [refresh])

  /**
   * Handle event click - show popover with event details
   */
  const handleEventClick = useCallback(async (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id

    // Fetch full event details from IndexedDB
    const fullEvent = await getEvent(eventId)
    if (!fullEvent) {
      console.error('Event not found:', eventId)
      return
    }

    // Position popover near the clicked event
    const rect = clickInfo.el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.bottom + 10

    setSelectedEvent(fullEvent)
    setPopoverPosition({ x, y })
  }, [])

  /**
   * Close popover
   */
  const handleClosePopover = useCallback(() => {
    setSelectedEvent(null)
  }, [])

  /**
   * Handle event update from popover
   */
  const handleEventUpdate = useCallback(() => {
    const api = calendarRef.current?.getApi()
    if (api) {
      const view = api.view
      refresh({ start: view.activeStart, end: view.activeEnd })
    }
  }, [refresh])

  /**
   * Handle conflict resolution
   */
  const handleConflictResolved = useCallback(async () => {
    // Refresh conflicts list
    const conflicts = await getConflictedEvents()
    setConflictedEvents(conflicts)

    // If no more conflicts, close modal
    if (conflicts.length === 0) {
      setShowConflictModal(false)
    }

    // Refresh calendar events
    const api = calendarRef.current?.getApi()
    if (api) {
      const view = api.view
      refresh({ start: view.activeStart, end: view.activeEnd })
    }
  }, [refresh])

  /**
   * Handle conflict modal close
   */
  const handleConflictModalClose = useCallback(() => {
    setShowConflictModal(false)
  }, [])

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Sidebar with filter panel (collapsible) */}
      {showFilters && (
        <div style={{ width: '300px', flexShrink: 0 }}>
          <FilterPanel onFilterChange={handleFilterChange} />
        </div>
      )}

      {/* Main calendar area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px',
              backgroundColor: showFilters ? '#3b82f6' : '#e5e7eb',
              color: showFilters ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: showFilters ? 'bold' : 'normal',
              marginRight: '10px',
            }}
            title="Toggle filters"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
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

        {/* Account Color Legend */}
        {accountColors.size > 0 && (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
              Accounts:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {Array.from(accountColors.entries()).map(([accountId, info]) => (
                <div
                  key={accountId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: info.color,
                      borderRadius: '3px',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>{info.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            Loading events...
          </div>
        )}

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
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          eventClick={handleEventClick}
          dayMaxEventRows={3} // Show all-day events in separate section at top
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
        />
      </div>

      {/* Event popover */}
      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          currentUserEmail={currentUserEmail}
          onClose={handleClosePopover}
          onUpdate={handleEventUpdate}
          position={popoverPosition}
        />
      )}

      {/* Conflict resolution modal */}
      <ConflictModal
        isOpen={showConflictModal}
        conflictedEvents={conflictedEvents}
        onClose={handleConflictModalClose}
        onResolved={handleConflictResolved}
      />
    </div>
  )
}

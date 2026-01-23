import { useState, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { handleEventDrop, handleEventResize } from '../lib/events'
import { useEvents } from '../hooks/useEvents'
import './Calendar.css'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

export default function Calendar() {
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')
  const calendarRef = useRef<FullCalendar>(null)
  const { events, accountColors, loading, refresh } = useEvents()

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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
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
        dayMaxEventRows={3} // Show all-day events in separate section at top
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  )
}

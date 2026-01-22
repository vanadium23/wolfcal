import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import './Calendar.css'

type ViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

// Placeholder events for testing
const placeholderEvents: EventInput[] = [
  {
    id: '1',
    title: 'Team Meeting',
    start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    end: new Date(Date.now() + 3 * 60 * 60 * 1000),
    backgroundColor: '#3b82f6',
  },
  {
    id: '2',
    title: 'All-Day Conference',
    start: new Date().toISOString().split('T')[0], // today
    allDay: true,
    backgroundColor: '#10b981',
  },
  {
    id: '3',
    title: 'Lunch Break',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // tomorrow at noon
    end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000),
    backgroundColor: '#f59e0b',
  },
  {
    id: '4',
    title: 'Project Deadline',
    start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // next week
    allDay: true,
    backgroundColor: '#ef4444',
  },
]

export default function Calendar() {
  const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
  }

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
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        key={currentView} // Force re-render when view changes
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        events={placeholderEvents}
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

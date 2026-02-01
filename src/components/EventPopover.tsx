/**
 * Event popover component for displaying event details and invitation actions
 */

import { useState, useEffect, useRef } from 'react';
import type { CalendarEvent, PendingChange } from '../lib/db/types';
import { CalendarClient } from '../lib/api/calendar';
import { updateEvent, addPendingChange, getPendingChangesByEvent, updatePendingChange } from '../lib/db';

interface EventPopoverProps {
  event: CalendarEvent;
  currentUserEmail: string;
  onClose: () => void;
  onUpdate: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void | Promise<void>;
  position: { x: number; y: number };
}

export default function EventPopover({
  event,
  currentUserEmail,
  onClose,
  onUpdate,
  onEdit,
  onDelete,
  position,
}: EventPopoverProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<PendingChange | null>(null);
  const [safePosition, setSafePosition] = useState(position);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Check for pending errors when event changes
  useEffect(() => {
    async function checkPendingErrors() {
      const pendingChanges = await getPendingChangesByEvent(event.id);
      const failedChange = pendingChanges.find(
        (change) => change.lastError && change.lastError.length > 0
      );
      setPendingError(failedChange || null);
    }
    checkPendingErrors();
  }, [event.id]);

  /**
   * Calculate safe position to keep popover within viewport
   */
  useEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let adjustedY = position.y;
      let adjustedX = position.x;

      // Flip to above if would go below viewport
      if (position.y + rect.height > viewportHeight - 20) {
        adjustedY = Math.max(10, position.y - rect.height - 10);
      }

      // Shift left if would go beyond right edge
      if (position.x + rect.width > viewportWidth - 20) {
        adjustedX = Math.max(10, viewportWidth - rect.width - 20);
      }

      // Keep within left edge
      if (adjustedX < 10) adjustedX = 10;

      // Keep within top edge
      if (adjustedY < 10) adjustedY = 10;

      setSafePosition({ x: adjustedX, y: adjustedY });
    } else {
      // Initial render with no ref yet, use original position
      setSafePosition(position);
    }
  }, [position]);

  // Find current user's attendee info
  const currentUserAttendee = event.attendees?.find(
    (attendee) => attendee.email === currentUserEmail
  );
  const responseStatus = currentUserAttendee?.responseStatus || 'needsAction';
  const needsResponse = responseStatus === 'needsAction';
  const isOwner =
    event.accountId === currentUserEmail ||
    event.attendees?.some((attendee) => attendee.email === currentUserEmail && attendee.organizer);

  /**
   * Handle invitation response (accept/decline)
   */
  const handleResponse = async (response: 'accepted' | 'declined') => {
    setLoading(true);
    setError(null);

    try {
      // Check if online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: Update via API
        const client = new CalendarClient();
        const updatedEvent = await client.respondToInvitation(
          event.accountId,
          event.calendarId,
          event.id,
          response
        );

        // Update local event in IndexedDB
        // Map Google API attendee format to local format
        const localAttendees = updatedEvent.attendees?.map((att) => ({
          email: att.email || '',
          displayName: att.displayName,
          responseStatus: att.responseStatus || 'needsAction',
          organizer: att.organizer,
        }));

        const localEvent: CalendarEvent = {
          ...event,
          attendees: localAttendees,
          updatedAt: Date.now(),
        };
        await updateEvent(localEvent);
      } else {
        // Offline: Queue the response as a pending change
        const updatedAttendees = event.attendees?.map((attendee) =>
          attendee.email === currentUserEmail
            ? { ...attendee, responseStatus: response }
            : attendee
        );

        // Update local event optimistically
        const localEvent: CalendarEvent = {
          ...event,
          attendees: updatedAttendees,
          updatedAt: Date.now(),
        };
        await updateEvent(localEvent);

        // Queue pending change
        const pendingChange: PendingChange = {
          id: `${event.id}-respond-${Date.now()}`,
          entityType: 'event',
          accountId: event.accountId,
          calendarId: event.calendarId,
          eventId: event.id,
          operation: 'update',
          eventData: { attendees: updatedAttendees },
          createdAt: Date.now(),
          retryCount: 0,
        };
        await addPendingChange(pendingChange);
      }

      // Notify parent to refresh events
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to respond to invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update response');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle retry for failed pending changes
   */
  const handleRetry = async () => {
    if (!pendingError) return;

    setLoading(true);
    setError(null);

    try {
      // Reset retry count and clear error to re-queue for next processor run
      await updatePendingChange({
        ...pendingError,
        retryCount: 0,
        lastError: undefined,
      });

      // Notify parent to refresh events
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to retry pending change:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry sync');
    } finally {
      setLoading(false);
    }
  };

  // Format date/time for display
  const formatDateTime = (
    start: CalendarEvent['start'],
    end: CalendarEvent['end']
  ): string => {
    const isAllDay = !!start.date;

    if (isAllDay) {
      return `${start.date}${end.date && end.date !== start.date ? ` - ${end.date}` : ''}`;
    }

    const startDate = new Date(start.dateTime!);
    const endDate = new Date(end.dateTime!);

    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const endTimeStr = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
  };

  // Get response status display
  const getResponseStatusDisplay = (status: string): { text: string; color: string } => {
    switch (status) {
      case 'accepted':
        return { text: 'Accepted', color: '#10b981' };
      case 'declined':
        return { text: 'Declined', color: '#ef4444' };
      case 'tentative':
        return { text: 'Tentative', color: '#f59e0b' };
      case 'needsAction':
        return { text: 'Not Responded', color: '#6b7280' };
      default:
        return { text: status, color: '#6b7280' };
    }
  };

  const statusDisplay = getResponseStatusDisplay(responseStatus);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: safePosition.y,
        left: safePosition.x,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '16px',
        minWidth: '300px',
        maxWidth: '400px',
        zIndex: 1000,
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          color: '#6b7280',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Event Title */}
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#111827',
          paddingRight: '24px', // Make room for close button
        }}
      >
        {event.summary || 'Untitled Event'}
      </h3>

      {/* Date/Time */}
      <div
        style={{
          marginBottom: '12px',
          fontSize: '14px',
          color: '#4b5563',
        }}
      >
        {formatDateTime(event.start, event.end)}
      </div>

      {/* Location */}
      {event.location && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '14px',
            color: '#4b5563',
          }}
        >
          <strong>Location:</strong> {event.location}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '14px',
            color: '#4b5563',
            maxHeight: '100px',
            overflowY: 'auto',
          }}
        >
          <strong>Description:</strong> {event.description}
        </div>
      )}

      {/* Attendees */}
      {event.attendees && event.attendees.length > 0 && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '14px',
            color: '#4b5563',
          }}
        >
          <strong>Attendees:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            {event.attendees.map((attendee, index) => (
              <li key={index} style={{ marginBottom: '2px' }}>
                {attendee.displayName || attendee.email}
                {attendee.organizer && ' (Organizer)'}
                {attendee.email === currentUserEmail && ' (You)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current user response status */}
      {currentUserAttendee && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '14px',
            padding: '8px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
          }}
        >
          <strong>Your Response:</strong>{' '}
          <span style={{ color: statusDisplay.color, fontWeight: 'bold' }}>
            {statusDisplay.text}
          </span>
        </div>
      )}

      {/* Accept/Decline buttons */}
      {needsResponse && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => handleResponse('accepted')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {loading ? 'Updating...' : 'Accept'}
          </button>
          <button
            onClick={() => handleResponse('declined')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: loading ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {loading ? 'Updating...' : 'Decline'}
          </button>
        </div>
      )}

      {/* Edit/Delete actions for event owner */}
      {isOwner && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => {
              onEdit(event.id);
              onClose();
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Edit
          </button>
          <button
            onClick={async () => {
              const confirmed = confirm('Delete this event? This can be undone after sync conflict resolution.')
              if (!confirmed) return
              await onDelete(event.id)
              onClose()
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Sync failed message with retry button */}
      {pendingError && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            border: '1px solid #f59e0b',
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '13px', color: '#92400e', fontWeight: 'bold' }}>
            ⚠️ Sync failed
          </div>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#78350f' }}>
            {pendingError.lastError}
          </div>
          <button
            onClick={handleRetry}
            disabled={loading}
            style={{
              width: '100%',
              padding: '6px 12px',
              backgroundColor: loading ? '#d1d5db' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            {loading ? 'Retrying...' : 'Retry Sync'}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

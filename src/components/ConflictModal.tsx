import { useState } from 'react';
import type { CalendarEvent } from '../lib/db/types';
import { updateEvent } from '../lib/db';
import { resolveWithLocal, resolveWithRemote } from '../lib/sync/conflicts';
import './ConflictModal.css';

interface ConflictModalProps {
  isOpen: boolean;
  conflictedEvents: CalendarEvent[];
  onClose: () => void;
  onResolved?: () => void; // Callback after resolving a conflict
}

export default function ConflictModal({
  isOpen,
  conflictedEvents,
  onClose,
  onResolved,
}: ConflictModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || conflictedEvents.length === 0) return null;

  const currentConflict = conflictedEvents[currentIndex];
  const localVersion = currentConflict.localVersion;
  const remoteVersion = currentConflict.remoteVersion;

  if (!localVersion || !remoteVersion) {
    return null;
  }

  const handleResolve = async (chosenVersion: 'local' | 'remote') => {
    setIsResolving(true);
    setError(null);

    try {
      let resolvedEvent: CalendarEvent;

      if (chosenVersion === 'local') {
        resolvedEvent = resolveWithLocal(currentConflict);
      } else {
        resolvedEvent = resolveWithRemote(currentConflict);
      }

      // Update timestamp to indicate resolution
      resolvedEvent.lastSyncedAt = Date.now();

      // Save resolved event to IndexedDB
      await updateEvent(resolvedEvent);

      // Notify parent
      if (onResolved) {
        onResolved();
      }

      // Move to next conflict or close modal
      if (currentIndex < conflictedEvents.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  const handleDefer = () => {
    // Move to next conflict or close modal without resolving
    if (currentIndex < conflictedEvents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const formatDateTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    if (!start) return 'Unknown time';

    if (event.start.date) {
      // All-day event
      return `${start} (All day)`;
    }

    // Regular event with time
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    return `${startDate.toLocaleString()} - ${endDate ? endDate.toLocaleString() : 'Unknown'}`;
  };

  const formatAttendees = (event: CalendarEvent) => {
    if (!event.attendees || event.attendees.length === 0) {
      return 'None';
    }
    return event.attendees.map((a) => a.displayName || a.email).join(', ');
  };

  // Check which fields differ
  const fieldsDiffer = {
    summary: localVersion.summary !== remoteVersion.summary,
    time:
      localVersion.start.dateTime !== remoteVersion.start.dateTime ||
      localVersion.start.date !== remoteVersion.start.date ||
      localVersion.end.dateTime !== remoteVersion.end.dateTime ||
      localVersion.end.date !== remoteVersion.end.date,
    description: localVersion.description !== remoteVersion.description,
    location: localVersion.location !== remoteVersion.location,
    attendees:
      JSON.stringify(localVersion.attendees) !== JSON.stringify(remoteVersion.attendees),
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            Resolve Conflict {currentIndex + 1} of {conflictedEvents.length}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isResolving}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <p className="conflict-description">
            This event was modified both locally and remotely. Choose which version to keep:
          </p>

          <div className="conflict-comparison">
            {/* Local Version */}
            <div className="version-panel local-panel">
              <h3>Local Version</h3>
              <div className="version-content">
                <div className={`field ${fieldsDiffer.summary ? 'highlight' : ''}`}>
                  <label>Title:</label>
                  <div className="value">{localVersion.summary || '(No title)'}</div>
                </div>

                <div className={`field ${fieldsDiffer.time ? 'highlight' : ''}`}>
                  <label>Time:</label>
                  <div className="value">{formatDateTime(localVersion)}</div>
                </div>

                <div className={`field ${fieldsDiffer.description ? 'highlight' : ''}`}>
                  <label>Description:</label>
                  <div className="value">
                    {localVersion.description || '(No description)'}
                  </div>
                </div>

                <div className={`field ${fieldsDiffer.location ? 'highlight' : ''}`}>
                  <label>Location:</label>
                  <div className="value">{localVersion.location || '(No location)'}</div>
                </div>

                <div className={`field ${fieldsDiffer.attendees ? 'highlight' : ''}`}>
                  <label>Attendees:</label>
                  <div className="value">{formatAttendees(localVersion)}</div>
                </div>
              </div>
            </div>

            {/* Remote Version */}
            <div className="version-panel remote-panel">
              <h3>Remote Version</h3>
              <div className="version-content">
                <div className={`field ${fieldsDiffer.summary ? 'highlight' : ''}`}>
                  <label>Title:</label>
                  <div className="value">{remoteVersion.summary || '(No title)'}</div>
                </div>

                <div className={`field ${fieldsDiffer.time ? 'highlight' : ''}`}>
                  <label>Time:</label>
                  <div className="value">{formatDateTime(remoteVersion)}</div>
                </div>

                <div className={`field ${fieldsDiffer.description ? 'highlight' : ''}`}>
                  <label>Description:</label>
                  <div className="value">
                    {remoteVersion.description || '(No description)'}
                  </div>
                </div>

                <div className={`field ${fieldsDiffer.location ? 'highlight' : ''}`}>
                  <label>Location:</label>
                  <div className="value">{remoteVersion.location || '(No location)'}</div>
                </div>

                <div className={`field ${fieldsDiffer.attendees ? 'highlight' : ''}`}>
                  <label>Attendees:</label>
                  <div className="value">{formatAttendees(remoteVersion)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="conflict-actions">
            <button
              className="btn btn-local"
              onClick={() => handleResolve('local')}
              disabled={isResolving}
            >
              Use Local
            </button>
            <button
              className="btn btn-remote"
              onClick={() => handleResolve('remote')}
              disabled={isResolving}
            >
              Use Remote
            </button>
            <button
              className="btn btn-defer"
              onClick={handleDefer}
              disabled={isResolving}
            >
              Defer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

# fn-2-m4p.6 Add optimistic UI updates for event creation

## Description
Implement optimistic UI updates for event creation. Add events to calendar view immediately with 80% opacity before API confirmation. Revert event and show error toast on API failure.

**Size:** M
**Files:** src/components/EventModal.tsx, src/components/Calendar.tsx, src/hooks/useEvents.ts

## Approach

Update EventModal handleSubmit flow:
1. Generate temporary event ID (use timestamp or crypto.randomUUID())
2. Add event to IndexedDB with pendingSync flag
3. Update Calendar view immediately (useEvents hook returns pending events)
4. Apply 80% opacity to pending events in Calendar rendering
5. Call API in background
6. On success: clear pendingSync flag, update with real event ID from Google
7. On error: remove event from IndexedDB, show error toast, revert calendar view

Add toast notification utility or component for error messages.

Update useEvents hook to include events with pendingSync flag.

## Key Context

Per epic spec: "Add event to calendar immediately with 80% opacity, revert on API error with error message" and "Newly created events appear immediately in calendar view".

Note: fn-2-m4p.2 established that notifications use existing alert() approach (not custom toast system). Follow this pattern for error notifications.

Follow existing pending indicator pattern from src/hooks/useEvents.ts which already shows pending changes with clock icon.
## Acceptance
- [ ] EventModal generates temporary event ID for optimistic update
- [ ] Event added to IndexedDB with pendingSync flag before API call
- [ ] Calendar view shows event immediately with 80% opacity
- [ ] useEvents hook returns events with pendingSync flag
- [ ] Calendar.tsx applies 80% opacity style to pending events
- [ ] API call runs in background after UI update
- [ ] On API success: pendingSync flag cleared, real event ID updated
- [ ] On API failure: event removed from IndexedDB and calendar view
- [ ] Error toast notification shown on failure
- [ ] Toast component created or reused for error display
## Done summary
Implemented optimistic UI updates for event creation. New events appear immediately in calendar with 80% opacity before API confirmation. Added retry functionality in EventPopover for failed syncs. DB schema updated to version 3 with pendingSync field.
## Evidence
- Commits: 5920552bda1ef4d879076552266fef5fb3edbbc7
- Tests: npm run build
- PRs:
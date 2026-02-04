---
scope: Requires Google Tasks API OAuth scope; extends existing OAuth flow
kind: system
content_hash: 4013290ee5751fbaed0d5637c44cede0
---

# Hypothesis: Add Tasks/To-Do Integration with Calendar Overlay

Add a task management system alongside the calendar. Users can create tasks with due dates, priority, and completion status. Tasks overlay on calendar views on their due date. Tasks without due dates appear in a sidebar panel. Sync with Google Tasks API (requires OAuth scope). Tasks can be converted to events and vice versa. Support task recurrence and subtasks.

## Rationale
{"anomaly": "Users need to track to-dos alongside calendar events but currently must use separate apps", "approach": "Integrate Google Tasks API for unified task and event management", "alternatives_rejected": ["Local-only tasks (doesn't sync across devices)", "Custom task system (reinventing the wheel vs using Google Tasks)"]}
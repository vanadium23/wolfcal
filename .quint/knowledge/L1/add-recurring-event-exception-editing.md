---
scope: Requires Google Calendar API exception support
kind: system
content_hash: b14139781eeb0f9137eb3f1380e329c8
---

# Hypothesis: Add Recurring Event Exception Editing

Implement editing individual instances of recurring events while preserving the recurrence rule. When clicking a recurring event, prompt "Edit this occurrence only" or "Edit all occurrences". For "this only": create a one-time exception, store as separate event with link to parent recurring event. For "all": update the base recurrence rule. Support deleting individual instances. Handle Google Calendar's "exception" API for proper sync.

## Rationale
{"anomaly": "Users cannot modify individual instances of recurring events (e.g., change time for one meeting in a weekly series)", "approach": "Implement Google Calendar's exception mechanism for recurring events", "alternatives_rejected": ["Break recurrence into individual events (loses series relationship, sync issues)", "Clone entire series and delete others (inefficient, confusing)"]}
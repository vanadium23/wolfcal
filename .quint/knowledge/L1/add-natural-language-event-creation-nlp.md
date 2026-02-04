---
scope: English language initially; can extend to other languages
kind: system
content_hash: 3446d3c55e8672480479120499ec2baa
---

# Hypothesis: Add Natural Language Event Creation (NLP)

Implement natural language parsing for event creation. Users type "Lunch with John tomorrow at 2pm for 1 hour" in a single input field. Parse using a lightweight NLP library (e.g., chrono.js for dates, custom regex for patterns). Extract: title, date/time, duration, attendees, location. Show parsed results preview before creating event. Add keyboard shortcut (e.g., 'c') to focus input.

## Rationale
{"anomaly": "Event creation requires multiple form fields - slower than natural language input", "approach": "Add natural language parsing for quick event creation from free text", "alternatives_rejected": ["External NLP APIs (violates local-first, adds latency)", "Complex NLP models (overkill for date extraction)"]}
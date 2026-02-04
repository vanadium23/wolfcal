---
scope: All modern browsers; requires FileReader API for import
kind: system
content_hash: d53ff8bdf93780d5aca76467bddbb879
---

# Hypothesis: Add iCal Import/Export with VTIMEZONE Parsing

Implement iCal (.ics) file import and export functionality. For import: parse VEVENT components with VTIMEZONE support, handle RRULE for recurring events, validate against existing events to avoid duplicates, and show import preview UI. For export: generate standard iCal format with proper timezone handling, allow filtering by date range and selected calendars. Use a lightweight parser library or implement RFC 5545 parsing.

## Rationale
{"anomaly": "Users cannot migrate from other calendars or backup their calendar data to standard formats", "approach": "Implement RFC 5545 iCal format support for interoperability", "alternatives_rejected": ["CSV export (lossy for recurring events and timezones)", "Custom binary format (not interoperable with other tools)"]}
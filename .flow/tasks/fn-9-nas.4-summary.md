# Task fn-9-nas.4: Import flow detection and prompt

## Summary
Implemented import flow with URL hash detection, multi-step modal dialog, and merge strategy selection.

## Files Created/Modified
- src/components/ImportConfiguration.tsx (213 lines)
- src/App.tsx (added hash detection)
- src/pages/Settings.css (added import modal styles)

## Implementation Details
- Hash detection on app mount (#config=<encrypted>)
- Multi-step flow: passphrase → decrypt → merge choice → import → success
- Merge strategy: Replace all vs Merge with existing
- URL cleanup after import
- Auto-reload after successful import

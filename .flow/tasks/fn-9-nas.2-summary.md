# Task fn-9-nas.2: Configuration serialization/deserialization

## Summary
Implemented configuration serialization and deserialization for cross-device transfer. Created a ConfigBundle structure that reads from both IndexedDB (accounts) and localStorage (settings, filters).

## Files Created
- src/lib/config/serializer.ts (284 lines)
- src/test/config/serializer.test.ts (329 lines)

## Implementation Details
- exportConfig(): Reads accounts from IndexedDB, sync settings/filters from localStorage
- importConfig(bundle, mode): 'replace' clears all, 'merge' preserves existing
- ConfigBundle v1 structure for future migration support
- validateConfigBundle(): Validates structure before import

## Test Results
19 tests passed covering:
- Export with various account configurations
- Serialize/deserialize round-trip
- Import in replace mode (clears all existing)
- Import in merge mode (smart merge)
- Error handling for invalid bundles

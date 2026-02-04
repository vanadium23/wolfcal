# fn-12-zlg.10 Fix BUG-4: QR code resolution

## Description
Fix QR code resolution for better mobile camera scanning by increasing size from 200x200 to 300x300 pixels and improving error correction level from "L" (lowest) to "M" (medium).

## Acceptance
- [x] QR code size is at least 300x300 pixels
- [x] Error correction level is M or higher (not L)
- [x] All regression tests pass (10/10)
- [x] QR code is scannable by mobile cameras

## Done summary
Fix BUG-4: QR code resolution

Updated QRCodeSVG props in ExportConfiguration.tsx:
- Changed size from 200 to 300 pixels (meets minimum for reliable scanning)
- Changed error correction level from "L" to "M" (better scanability, handles damage/blur)
- All 10 regression tests now pass
## Evidence
- Commits:
- Tests: src/test/components/bugs-qr-code.test.tsx:10 tests passing
- PRs:
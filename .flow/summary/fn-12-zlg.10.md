Fix BUG-4: QR code resolution

Updated QRCodeSVG props in ExportConfiguration.tsx:
- Changed size from 200 to 300 pixels (meets minimum for reliable scanning)
- Changed error correction level from "L" to "M" (better scanability, handles damage/blur)
- All 10 regression tests now pass

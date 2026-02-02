---
date: 2026-02-02
id: 2026-02-02-audit_report-qr-code-transfer.md
type: audit_report
target: qr-code-transfer
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-05-03
content_hash: a153a77503a71096a3d033e7fdcba628
---

WLNK: None - All evidence from internal tests with CL3 (same context). R_eff: 1.00.

Bias check: Low - Modern approach with proven QR technology. Tested with realistic data (2-5 accounts). No "NIH" bias.

Trade-offs:
+ Fast and convenient for mobile users
+ Size validated: 788-1516 bytes (26-50% of 3KB limit)
+ No app/file transfer needed
+ Works offline once QR is generated
- Requires camera for scanning
- Limited to essential config data
- Desktop users need phone camera
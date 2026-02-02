---
valid_until: 2026-05-03
date: 2026-02-02
id: 2026-02-02-audit_report-manual-json-export-import.md
type: audit_report
target: manual-json-export-import
verdict: pass
assurance_level: L2
carrier_ref: auditor
content_hash: 80783e50bd397a9cd84835a8c078337e
---

WLNK: None - All evidence from internal tests with CL3 (same context). R_eff: 1.00.

Bias check: Low - Conservative, well-established approach used by many applications. No "pet idea" bias.

Trade-offs:
+ Unlimited file size (not constrained)
+ Simple to implement
+ Works offline
+ Can encrypt credentials before export
- Requires manual file transfer (email, USB, cloud storage)
- Users must understand file download/upload
- Less convenient than QR or URL methods
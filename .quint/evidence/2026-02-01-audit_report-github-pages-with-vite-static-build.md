---
carrier_ref: auditor
valid_until: 2026-05-02
date: 2026-02-01
id: 2026-02-01-audit_report-github-pages-with-vite-static-build.md
type: audit_report
target: github-pages-with-vite-static-build
verdict: pass
assurance_level: L2
content_hash: b76c3e11a1bd26457c5a07053aec0ca2
---

**WLNK Analysis:** No dependencies → R_eff = 1.00 (self score only). Evidence from external research (CL1: different context) applies 30% penalty to actual confidence, but computed R_eff remains 1.00 due to no dependency chain.

**Risk Factors:**
- SPA routing requires workaround (404.html or plugin) - operational complexity
- 100GB bandwidth limit may be constraining for high-traffic deployments
- Subdirectory path requirement (base: '/wolfcal/') adds configuration overhead

**Bias Check (D.5):** 
- Pet Idea Risk: LOW - GitHub Pages is most conservative/established option
- Not Invented Here: LOW - Industry-standard solution, not custom

**Operational Risk:** LOW - Mature platform with extensive community knowledge
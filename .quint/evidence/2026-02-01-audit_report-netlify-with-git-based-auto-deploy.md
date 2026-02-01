---
type: audit_report
target: netlify-with-git-based-auto-deploy
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-05-02
date: 2026-02-01
id: 2026-02-01-audit_report-netlify-with-git-based-auto-deploy.md
content_hash: c6fa21171fd1e0eae8eabe4d90f93ff6
---

**WLNK Analysis:** No dependencies → R_eff = 1.00 (self score only). Evidence from external research with official docs (CL2: similar context) would apply 10% penalty in dependency chain, but no dependencies exist.

**Risk Factors:**
- 100GB bandwidth limit - same constraint as GitHub Pages
- 300min build time limit may be insufficient for active development
- Some community reports of _redirects conflicts during development (not production)

**Bias Check (D.5):**
- Pet Idea Risk: LOW - Netlify is established platform, not novel
- Not Invented Here: LOW - Standard Git-based deployment pattern

**Operational Risk:** LOW - Official Vite support with documented workflows
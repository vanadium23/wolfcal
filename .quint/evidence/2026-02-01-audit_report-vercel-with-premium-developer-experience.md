---
valid_until: 2026-05-02
date: 2026-02-01
id: 2026-02-01-audit_report-vercel-with-premium-developer-experience.md
type: audit_report
target: vercel-with-premium-developer-experience
verdict: pass
assurance_level: L2
carrier_ref: auditor
content_hash: d7e3b0526c1ba095636399f3d97dfa1e
---

**WLNK Analysis:** No dependencies → R_eff = 1.00 (self score only). Evidence from official docs (CL2: similar context) + active community discussions (2025-2026) indicates strong current support.

**Risk Factors:**
- 100GB bandwidth limit - same scaling constraint as GitHub/Netlify
- Optimized for Next.js (Vite is second-class citizen)
- Some community reports of vercel.json being ignored (Dec 2025)
- Higher build time allowance could encourage inefficient build practices

**Bias Check (D.5):**
- Pet Idea Risk: MEDIUM - Premium DX features are appealing but may not be necessary for static calendar app
- Not Invented Here: LOW - Vercel is industry-standard for React deployments

**Operational Risk:** LOW - Mature platform with excellent DX, but may be over-engineered for simple static hosting needs.

**DX Advantage:** 6,000 build minutes is 20x Netlify's allowance - significant for active development.
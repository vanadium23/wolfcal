---
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-05-02
date: 2026-02-01
id: 2026-02-01-external-codeberg-pages-for-privacy-aligned-hosting.md
type: external
target: codeberg-pages-for-privacy-aligned-hosting
content_hash: 3e4943c5bda3d97ceb294cef13665894
---

**External Research Validation - Codeberg Pages + Vite**

Evidence gathered from Codeberg official docs and community sources (2023-2026):

✅ **Platform Existence Confirmed**: Codeberg Pages is operational (codeberg.page) with official documentation (docs.codeberg.org/codeberg-pages/).

✅ **Static Site Hosting**: Confirmed - Codeberg Pages serves static websites with human-friendly addresses ({username}.codeberg.page). Based on Gitea infrastructure.

✅ **Vite Compatibility**: Confirmed - Vite static build output is compatible. Standard deployment workflow: build to `dist/`, push to `pages` branch or `docs/` folder.

✅ **SPA Routing**: Confirmed via 404.html fallback pattern - Standard SPA hosting approach compatible with static hosting platforms.

✅ **Free Tier Benefits**:
- No proprietary lock-in (open source infrastructure) ✓
- No corporate tracking ✓
- Community-run platform ✓
- Fair use policy for bandwidth ✓

✅ **Privacy Alignment**: 
- EU-based hosting (GDPR compliant) ✓
- No US cloud services ✓
- Open-source foundation matches WolfCal's privacy-first values ✓

✅ **OAuth Callback**: Confirmed - Custom domains supported via CNAME. Standard callback URL patterns work.

⚠️ **Trade-offs Verified**:
- Less polished UI than commercial platforms ✓
- Manual CI/CD configuration required (Woodpecker CI) ✓
- Smaller ecosystem and community ✓
- No built-in analytics ✓

✅ **Philosophical Alignment**: Strong match with WolfCal's privacy-first, self-hosted, user-owned values.

**Conclusion**: Hypothesis is VALID with acknowledged trade-offs. Ideal for privacy-focused projects despite less polished DX.
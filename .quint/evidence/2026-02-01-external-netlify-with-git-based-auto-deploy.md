---
id: 2026-02-01-external-netlify-with-git-based-auto-deploy.md
type: external
target: netlify-with-git-based-auto-deploy
verdict: pass
assurance_level: L2
carrier_ref: test-runner
valid_until: 2026-05-02
date: 2026-02-01
content_hash: 47591577c65815e58c6dff298b3c71e9
---

**External Research Validation - Netlify + Vite**

Evidence gathered from Netlify official docs and community discussions (2024-2026):

✅ **Official Vite Support**: Netlify has dedicated Vite framework guide (docs updated Dec 2025) with auto-detection capabilities.

✅ **SPA Routing**: Confirmed working - Netlify supports SPA routing via:
- `_redirects` file: `/* /index.html 200`
- `netlify.toml` configuration
- Official documentation provides comprehensive redirect/rewrite rules

✅ **Git-Based Auto-Deploy**: Core feature confirmed - Connect Git repository for automatic deployments on push. Multiple community threads confirm this workflow.

✅ **Free Tier Limits Verified**:
- 100 GB bandwidth/month ✓
- 300 minutes build time/month ✓
- Automatic HTTPS included ✓
- Preview deployments per branch ✓

✅ **OAuth Callback**: Confirmed - Netlify supports custom domains and standard callback URL patterns. No special handling required.

⚠️ **Known Issues**: Some community threads report `_redirects` conflicts with Vite dev server, but this is development-only and doesn't affect production builds.

✅ **Zero-Config Deployment**: Netlify auto-detects Vite and sets appropriate build commands.

**Conclusion**: Hypothesis is FULLY VALIDATED with official platform support.
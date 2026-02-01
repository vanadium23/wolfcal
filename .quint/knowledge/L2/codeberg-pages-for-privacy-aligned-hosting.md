---
scope: Codeberg Pages hosting for privacy-focused projects;适用于开源隐私优先项目; requires Codeberg account
kind: system
content_hash: d1c35eb4ed26d21aa4f286af10546da4
---

# Hypothesis: Codeberg Pages for Privacy-Aligned Hosting

**Method: Codeberg Pages + Woodpecker CI (Privacy-Respecting Alternative)**

1. **Build Configuration:**
   - Set `base: '/wolfcal/'` for subdirectory hosting
   - Standard Vite build to `dist/`
   - Ensure SPA routing works with 404.html fallback

2. **Codeberg Pages Deployment:**
   - Host on Codeberg (Gitea-based, privacy-focused Git hosting)
   - Push to `pages` branch or use `docs/` folder
   - Woodpecker CI for automated builds
   - Deploy to `https://username.codeberg.page/wolfcal/`

3. **OAuth Callback Configuration:**
   - Update Google Cloud Console: `https://username.codeberg.page/wolfcal/callback`
   - Supports custom domains via CNAME

4. **Free Tier Benefits:**
   - No proprietary lock-in
   - Open source infrastructure
   - No corporate tracking
   - Community-run platform
   - Unlimited bandwidth (fair use policy)

5. **Privacy Alignment:**
   - Matches WolfCal's privacy-first philosophy
   - No US cloud services
   - GDPR-compliant hosting (EU-based)
   - Supports Code of Conduct enforcement

6. **Trade-offs:**
   - Less polished UI than GitHub/Netlify
   - Manual CI/CD configuration required
   - Smaller community and ecosystem
   - No built-in analytics

## Rationale
{"anomaly": "Need free static hosting aligned with WolfCal's privacy-first values", "approach": "Use Codeberg Pages for privacy-respecting, open-source hosting aligned with project philosophy", "alternatives_rejected": ["GitHub Pages (proprietary, US-based)", "Netlify/Vercel (corporate SaaS platforms)"]}
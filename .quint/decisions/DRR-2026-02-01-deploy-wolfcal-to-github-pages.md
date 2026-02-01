---
winner_id: github-pages-with-vite-static-build
created: 2026-02-01T14:52:51Z
type: DRR
content_hash: c6407bdd40c9e99eadc4bcc460aba542
---

# Deploy WolfCal to GitHub Pages

## Context
WolfCal is currently deployed using Docker + Caddy. The user wants to deploy as a static page on free tier hosting to eliminate container dependencies and reduce deployment complexity. Five L2 hypotheses were validated: GitHub Pages, Netlify, Cloudflare Pages, Vercel, and Codeberg Pages.

## Decision
**Selected Option:** github-pages-with-vite-static-build

We decided to deploy WolfCal to GitHub Pages using Vite static build with GitHub Actions for automated deployment.

## Rationale
GitHub Pages was selected for the following reasons:

1. **Conservative Choice**: Most mature platform (launched 2008) with proven reliability and extensive community knowledge.

2. **GitHub Ecosystem Integration**: WolfCal is already hosted on GitHub. Using GitHub Pages provides tight integration with existing repository, Issues, and Actions workflows.

3. **Zero Infrastructure Cost**: No additional accounts or services needed. deployment leverages existing GitHub infrastructure.

4. **Adequate Free Tier**: 100GB bandwidth/month is sufficient for a personal calendar application. WolfCal's text-heavy event data has minimal bandwidth requirements.

5. **R_eff = 1.00**: Full reliability score with no dependency risks.

**Trade-offs Accepted:**
- SPA routing requires workaround (404.html or vite-plugin-github-pages-spa)
- Subdirectory path configuration required (base: '/wolfcal/' or similar)
- 100GB bandwidth cap (Cloudflare offers unlimited)
- Less polished DX than Vercel/Netlify

**Why Not Others:**
- Cloudflare Pages: Unlimited bandwidth is attractive but platform is newer (2021) with smaller ecosystem
- Vercel: Premium DX is overkill for simple static hosting; 6,000 build minutes unnecessary
- Netlify: Similar to GitHub Pages but requires third-party account
- Codeberg: Privacy alignment is philosophically attractive but manual CI/CD adds operational overhead

### Characteristic Space (C.16)
{
  "conservatism": "HIGH",
  "operational_overhead": "LOW",
  "bandwidth_headroom": "MEDIUM (100GB cap)",
  "dx_quality": "MEDIUM (requires SPA routing workaround)",
  "eccosystem_maturity": "HIGH",
  "strategic_alignment": "MEDIUM (technical choice, not value-driven)"
}

## Consequences
**Immediate Actions:**
1. Configure Vite `base` path in vite.config.ts for GitHub Pages subdirectory
2. Create GitHub Actions workflow for automated build/deploy
3. Update Google Cloud Console OAuth redirect URI to GitHub Pages URL
4. Test SPA routing with 404.html fallback or vite-plugin-github-pages-spa
5. Remove Dockerfile, docker-compose.yml, and Caddyfile from repository

**Expected Outcomes:**
- Deployment time reduced from Docker build (~minutes) to static asset serving (~seconds)
- No container runtime required
- Automatic deployments on git push via GitHub Actions
- 100GB bandwidth limit should not be reached for personal use

**Revisit Conditions:**
- If bandwidth exceeds 80GB/month (approaching limit)
- If OAuth callback flow has issues with SPA routing workaround
- If deployment complexity becomes problematic
- If user base scales beyond personal use

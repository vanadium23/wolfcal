---
scope: GitHub Pages hosting for React SPA; requires GitHub account;适用于开源或个人项目
kind: system
content_hash: 4218c813cc09dd33135d235701213c55
---

# Hypothesis: GitHub Pages with Vite Static Build

**Method: Vite Static Build + GitHub Pages Deployment**

1. **Build Configuration:**
   - Set `base: '/wolfcal/'` in vite.config.ts for GitHub Pages subdirectory
   - Run `vite build` to generate static assets in `dist/`
   - Verify `_redirects` file or 404.html handles SPA routing

2. **GitHub Actions Workflow:**
   - Trigger on push to main branch
   - Run `npm ci` and `npm run build`
   - Deploy `dist/` to GitHub Pages via `actions/upload-pages-artifact` and `actions/deploy-pages`

3. **OAuth Callback Configuration:**
   - Update Google Cloud Console OAuth redirect URI: `https://username.github.io/wolfcal/callback`
   - Ensure callback route works with hash-based or history-based routing

4. **Free Tier Limits:**
   - 1 GB storage
   - 100 GB bandwidth/month
   - Unlimited sites per account
   - Custom domains supported

5. **No Docker Required:**
   - Pure static file serving
   - No container runtime
   - GitHub Actions CI/CD included

## Rationale
{"anomaly": "Need free static hosting for WolfCal SPA", "approach": "Use GitHub Pages with Vite static build and GitHub Actions for automated deployment", "alternatives_rejected": ["Docker deployment (requires container runtime)", "Netlify/Vercel (less generous free tiers)"]}
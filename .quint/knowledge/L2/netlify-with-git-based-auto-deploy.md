---
scope: Netlify hosting for React SPA;适用于Git-based工作流; requires connected Git repository
kind: system
content_hash: 969218749f18145642cc0606cf9fa999
---

# Hypothesis: Netlify with Git-Based Auto-Deploy

**Method: Vite Static Build + Netlify Deployment**

1. **Build Configuration:**
   - Keep default `base: '/'` in vite.config.ts (no subdirectory needed)
   - Run `vite build` to generate `dist/` directory
   - Create `netlify.toml` for redirect rules: `[[redirects]] from = "/*" to = "/index.html" status = 200`

2. **Netlify Deployment:**
   - Connect Git repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Auto-deploys on git push

3. **OAuth Callback Configuration:**
   - Update Google Cloud Console: `https://yoursite.netlify.app/callback`
   - Netlify supports custom domains with free SSL

4. **Free Tier Limits:**
   - 100 GB bandwidth/month
   - 300 minutes build time/month
   - Site-level form processing (100 submissions/month)
   - Edge functions (invocation limits apply)

5. **Advantages:**
   - Zero-config deployment from Git
   - Automatic HTTPS
   - Preview deployments per branch
   - Form handling built-in (future use)
   - Redirect rules via `netlify.toml`

## Rationale
{"anomaly": "Need free static hosting with better developer experience than GitHub Pages", "approach": "Use Netlify for zero-config Git-based deployment with preview deployments and automatic HTTPS", "alternatives_rejected": ["GitHub Pages (requires subdirectory path, no preview deployments)", "Vercel (similar but Next.js-optimized)"]}
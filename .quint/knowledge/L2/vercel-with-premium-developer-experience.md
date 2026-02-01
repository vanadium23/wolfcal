---
scope: Vercel hosting for React SPA;适用于团队协作和预览部署; requires Vercel account
kind: system
content_hash: 4cb951d12397d59cd9514941d458130b
---

# Hypothesis: Vercel with Premium Developer Experience

**Method: Vite Static Build + Vercel Deployment**

1. **Build Configuration:**
   - Standard Vite build, no config changes needed
   - Create `vercel.json` for routing: `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`

2. **Vercel Deployment:**
   - Import Git repository to Vercel
   - Framework preset: "Vite"
   - Auto-detects build settings
   - Deploy on git push

3. **OAuth Callback Configuration:**
   - Update Google Cloud Console: `https://wolfcal.vercel.app/callback`
   - Custom domains with free automated SSL

4. **Free Tier Limits:**
   - 100 GB bandwidth/month
   - 6,000 minutes build time/month
   - 100 GB serverless function execution (if needed later)
   - 100 edge function invocations/day (Hobby plan)
   - Automatic deployments

5. **Developer Experience:**
   - Best-in-class preview deployments
   - Analytics dashboard
   - Environment variables management
   - Team collaboration features
   - GitHub integration UI

6. **Considerations:**
   - Optimized for Next.js (but works with Vite)
   - More generous build time than Netlify
   - Serverless functions available for future OAuth proxy

## Rationale
{"anomaly": "Need premium developer experience on free tier with excellent preview deployments", "approach": "Use Vercel for best-in-class developer experience with generous build time and preview deployments", "alternatives_rejected": ["Cloudflare Pages (less mature DX)", "Netlify (less build time)"]}
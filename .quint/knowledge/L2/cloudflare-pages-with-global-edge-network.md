---
scope: Cloudflare Pages hosting;适用于全球用户访问; requires Cloudflare account
kind: system
content_hash: 5503fe089ff5be8937ecb0d2fea1cc76
---

# Hypothesis: Cloudflare Pages with Global Edge Network

**Method: Vite Static Build + Cloudflare Pages Deployment**

1. **Build Configuration:**
   - Standard Vite build with `npm run build`
   - No special configuration needed for routing
   - Create `_redirects` file: `/* /index.html 200`

2. **Cloudflare Pages Setup:**
   - Connect Git repository or use Wrangler CLI
   - Build command: `npm run build`
   - Output directory: `dist`
   - Preview deployments automatically

3. **OAuth Callback Configuration:**
   - Update Google Cloud Console: `https://wolfcal.pages.dev/callback`
   - Custom domains supported with free SSL

4. **Free Tier Limits:**
   - Unlimited bandwidth (truly unlimited)
   - Unlimited sites
   - Unlimited requests
   - 500 build minutes/month
   - Cloudflare Workers (100k requests/day free)

5. **Performance Advantages:**
   - Global edge network (200+ locations)
   - Automatic HTTP/3 support
   - Built-in DDoS protection
   - Instant cache invalidation
   - Serverless functions available for future enhancements

6. **Migration from Docker:**
   - Remove `Dockerfile`, `docker-compose.yml`, `Caddyfile`
   - Add `.cloudflare` configs if needed
   - Deploy purely static assets

## Rationale
{"anomaly": "Need free static hosting with unlimited bandwidth and global performance", "approach": "Use Cloudflare Pages for edge deployment with truly unlimited bandwidth and global CDN", "alternatives_rejected": ["GitHub Pages (limited bandwidth, no edge network)", "Netlify (100GB bandwidth limit)"]}
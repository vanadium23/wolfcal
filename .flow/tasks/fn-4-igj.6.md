# fn-4-igj.6 Update deployment documentation

## Description
Update project documentation to reflect the new GitHub Pages deployment method for production, while preserving Docker/Caddy instructions for local development with OAuth.

**Documentation files to update:**
- `README.md` - Update deployment section to clarify: GitHub Pages for production, Docker/Caddy for local dev
- `SETUP.md` - Update setup instructions (if exists)
- Create or update `DEPLOYMENT.md` with GitHub Pages specific instructions
- Any other docs referencing deployment

**Content to include:**
- GitHub Pages deployment overview (production)
- Automatic deployment on push to master
- Custom domain configuration (vanadium23.me)
- OAuth redirect URI setup (both localhost:5173 for dev and vanadium23.me/wolfcal for prod)
- Local development options: `npm run dev` OR Docker/Caddy for OAuth testing

**Content to preserve:**
- Docker/Caddy setup for local development with OAuth
- Docker Compose usage for local testing
- Container runtime for local dev environment

## Acceptance
- [ ] README.md deployment section updated for GitHub Pages (production)
- [ ] Docker/Caddy instructions preserved for local development
- [ ] Deployment docs reference the GitHub Actions workflow
- [ ] OAuth redirect URI documentation includes both localhost and production URLs
- [ ] Setup docs clearly distinguish between local dev (Docker/Caddy or npm) and production deployment (GitHub Pages)

## Done summary
Update documentation to reflect GitHub Pages deployment

**Updated:**
- README.md: Production deployment info, Docker/Caddy preserved for local dev
- docs/SETUP.md: GitHub Pages quick start, local dev options clarified
- docs/OAUTH_CONFIG.md: Production redirect URI added

**Manual steps remaining:**
- Configure Google Cloud Console OAuth redirect URI: https://vanadium23.me/wolfcal/callback
- Test OAuth flow on deployed site
## Evidence
- Commits: 394171d
- Tests: Documentation updated with production and local dev URLs
- PRs:
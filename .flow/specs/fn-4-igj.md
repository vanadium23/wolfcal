# fn-4-igj Deploy WolfCal to GitHub Pages with Vite static build

## Overview
Implement GitHub Pages deployment for WolfCal using Vite static build with GitHub Actions CI/CD. This eliminates container dependencies (Docker/Caddy) and simplifies deployment.

**Decision Reference:** `.quint/decisions/DRR-2026-02-01-deploy-wolfcal-to-github-pages.md`

## Scope
- Configure Vite for GitHub Pages production builds
- Set up GitHub Actions workflow for automated deployment on push to master
- Handle SPA routing with 404.html fallback
- Update OAuth configuration for new domain
- Update documentation to reflect GitHub Pages deployment

**Note:** Docker/Caddy configuration is retained for local development with OAuth.

## Approach

### 1. Vite Configuration
- Set `base: '/wolfcal/'` in vite.config.ts for subdirectory path
- Ensure all asset paths are relative to base

### 2. SPA Routing with 404.html
- Create `public/404.html` that redirects to index.html
- This handles client-side routing for deep links

### 3. GitHub Actions Workflow
- Trigger on push to master branch
- Run `npm install` and `npm run build`
- Deploy `dist/` directory to GitHub Pages
- Use peaceiris/actions-gh-pages@v3 action

### 4. OAuth Configuration
- Update Google Cloud Console OAuth redirect URI: `https://vanadium23.me/wolfcal/`
- Update any hardcoded localhost references in settings

### 5. Documentation Update
- Update deployment documentation to reflect GitHub Pages
- Note that Docker/Caddy remains available for local development

## Quick commands
```bash
# Local build test
npm run build

# Preview production build locally
npm run preview

# Check GitHub Actions status
gh workflow list
gh run list --workflow=deploy.yml
```

## Acceptance
- [ ] Vite builds successfully with base path configured
- [ ] 404.html exists and correctly redirects to index.html
- [ ] GitHub Actions workflow runs successfully on push to master
- [ ] Site is accessible at https://vanadium23.me/wolfcal/
- [ ] OAuth flow works with new redirect URI
- [ ] SPA routing works (refresh on any route loads correctly)
- [ ] Documentation updated (Docker/Caddy noted for local dev)

## References
- DRR: `.quint/decisions/DRR-2026-02-01-deploy-wolfcal-to-github-pages.md`
- GitHub Pages docs: https://docs.github.com/en/pages
- peaceiris/actions-gh-pages: https://github.com/peaceiris/actions-gh-pages
- Current vite.config.ts: `vite.config.ts:5`
- Existing OAuth setup: Check Settings UI for current redirect URIs

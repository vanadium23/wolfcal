# fn-1-yxs.4 Set up Docker Compose with Caddy

## Description
Create Docker Compose configuration to serve the built React application using Caddy static file server. Configure OAuth callback route handling.

**Size:** S
**Files:** docker-compose.yml, Dockerfile, Caddyfile, .dockerignore

## Approach

Create multi-stage Dockerfile:
1. Build stage: Install deps, run `npm run build`
2. Production stage: Copy dist/ to Caddy image

Create docker-compose.yml with Caddy service on port 8080.

Configure Caddyfile:
- Serve static files from /dist
- Handle /callback route (SPA routing - serve index.html)
- Enable gzip compression

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:16,24,154`:
- Deploy with Docker Compose + Caddy
- OAuth callback redirects to `http://localhost:8080/callback`
- Single-user per deployment (no auth needed for Caddy)

Caddy docs: https://caddyserver.com/docs/
## Acceptance
- [ ] Dockerfile created with multi-stage build (Node.js build + Caddy serve)
- [ ] docker-compose.yml defines Caddy service on port 8080
- [ ] Caddyfile configures static file serving from /dist
- [ ] Caddyfile handles /callback route (SPA fallback to index.html)
- [ ] .dockerignore excludes node_modules, .git, .flow
- [ ] `docker-compose up` builds and serves application
- [ ] Application accessible at http://localhost:8080
- [ ] /callback route serves index.html (tested with curl)
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:

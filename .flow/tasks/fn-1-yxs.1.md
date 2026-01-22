# fn-1-yxs.1 Bootstrap React + Vite + TypeScript project

## Description
Initialize a new React application using Vite build tool with TypeScript support. Set up project structure, install core dependencies, and configure build tooling for development and production.

**Size:** M
**Files:** package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx

## Approach

Create project using `npm create vite@latest` with React + TypeScript template. Install additional dependencies:
- React 18+
- React DOM 18+
- TypeScript 5+
- @types packages for React

Configure Vite for:
- Development server on port 5173 (default)
- Production build output to `dist/`
- OAuth callback route handling (proxy /callback during dev)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:24`, OAuth callback must redirect to `http://localhost:8080/callback`. During development, Vite dev server needs to handle this route (will be served by Caddy in production).

Modern browser support only (Chrome/Firefox latest) - no legacy polyfills needed (`.flow/specs/fn-1-yxs.md:77`).
## Acceptance
- [ ] React + Vite project initialized with TypeScript
- [ ] package.json includes React 18+, React DOM, TypeScript 5+
- [ ] vite.config.ts configures dev server and build output
- [ ] tsconfig.json configured for React with strict mode
- [ ] index.html entry point created
- [ ] src/main.tsx renders root App component
- [ ] src/App.tsx placeholder component created
- [ ] `npm run dev` starts development server
- [ ] `npm run build` creates production bundle in dist/
## Done summary
Initialized React 19.2.0 + Vite 7.2.4 project with TypeScript 5.9.3, configured dev server and build pipeline, created placeholder App component.
## Evidence
- Commits: 6ed5e82f472468feed3d6811bf870753720f4a05
- Tests: npm run build, timeout 10s npm run dev
- PRs:
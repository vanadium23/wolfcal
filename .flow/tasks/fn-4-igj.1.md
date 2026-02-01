# fn-4-igj.1 Configure Vite base path for GitHub Pages custom domain

## Description
Configure Vite to build assets with the correct base path for GitHub Pages deployment at `https://vanadium23.me/wolfcal/`. The app will be served from a subdirectory, so all asset paths need to be prefixed with `/wolfcal/`.

**File to modify:** `vite.config.ts`

**Change required:**
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/wolfcal/',  // Add this line
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
```

**Note:** The base path should NOT have a trailing slash according to Vite docs for subdirectory deployment.

## Acceptance
- [ ] `vite.config.ts` has `base: '/wolfcal'` configured
- [ ] `npm run build` completes successfully
- [ ] Built `dist/index.html` has asset paths prefixed with `/wolfcal/`
- [ ] Local dev server (`npm run dev`) still works correctly

## Done summary
Configure Vite base path to `/wolfcal` for GitHub Pages subdirectory deployment
## Evidence
- Commits: fbda155
- Tests: npm run build succeeded with asset paths prefixed with /wolfcal
- PRs:
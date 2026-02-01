# fn-4-igj.3 Create GitHub Actions workflow for automated build and deploy

## Description
Create a GitHub Actions workflow that automatically builds and deploys WolfCal to GitHub Pages on every push to the `master` branch.

**File to create:** `.github/workflows/deploy.yml`

**Content:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - master

  # Allows manual trigger from Actions tab
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**GitHub Pages configuration required (one-time setup in repo Settings):**
1. Go to Settings → Pages
2. Source: GitHub Actions
3. Custom domain: `vanadium23.me` (with `www` subdomain redirect if desired)
4. DNS: Configure CNAME records pointing to `username.github.io`

**Prerequisites for GitHub Pages with custom domain:**
- DNS A record: `185.199.108.153` (or other GitHub Pages IP)
- DNS CNAME for `www`: `username.github.io`

## Acceptance
- [ ] `.github/workflows/deploy.yml` file exists with correct configuration
- [ ] Workflow runs successfully on push to master
- [ ] Deployment completes and site is accessible at `https://vanadium23.me/wolfcal/`
- [ ] GitHub Pages is configured to use GitHub Actions as source

## Done summary
Create GitHub Actions workflow for automated build and deploy to GitHub Pages
## Evidence
- Commits: ed41cb6
- Tests: GitHub Actions workflow file created
- PRs:
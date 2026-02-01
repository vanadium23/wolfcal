# fn-4-igj.2 Create 404.html for SPA routing fallback

## Description
Create a `public/404.html` file that handles SPA routing for GitHub Pages. When users navigate directly to a deep link (e.g., `/wolfcal/settings`), GitHub Pages will serve the 404.html, which redirects to index.html, allowing React Router to handle the route.

**File to create:** `public/404.html`

**Content:**
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      // Redirect to the app's root, preserving the hash and query params
      var segment_count = 1; // number of path segments (e.g., /wolfcal/ = 1)
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + segment_count).join('/') + '/?p=/' +
        l.pathname.slice(1).split('/').slice(segment_count).join('/').replace(/&/g, '~and~') +
        (l.search ? '&q=' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
    <noscript>
      <meta http-equiv="refresh" content="0;url=/?p=/" />
      JavaScript is required. Please enable JavaScript to use this application.
    </noscript>
  </body>
</html>
```

**Alternative simpler approach:** Since we're using React Router, we can use a simpler redirect:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>WolfCal</title>
    <script>
      // Simple redirect to index.html - React Router will handle routing
      window.location.href = '/wolfcal/';
    </script>
  </head>
  <body></body>
</html>
```

**Use the simpler approach** for this implementation.

## Acceptance
- [ ] `public/404.html` file exists
- [ ] 404.html redirects to `/wolfcal/`
- [ ] Built `dist/404.html` exists after `npm run build`
- [ ] Direct navigation to any route works after deployment

## Done summary
Create 404.html for SPA routing fallback on GitHub Pages
## Evidence
- Commits: 3777c57
- Tests: dist/404.html exists after build
- PRs:
# fn-7-fv6.1 Add responsive header with mobile navigation

## Description
Add responsive header with hamburger menu that shows a dropdown on mobile (< 640px). Keep full navigation visible on desktop.

**User decision:** Dropdown menu (not slide-out drawer), full functionality on mobile.

**Files to modify:**
- `src/App.tsx` - Add mobile menu state and hamburger button
- `src/App.css` - Add responsive styles with media queries

**Implementation:**
1. Add `mobileMenuOpen` state to App.tsx
2. Add hamburger button (hidden on desktop, visible on mobile)
3. Create dropdown menu div with Calendar/Settings links
4. Add `@media (max-width: 640px)` styles to App.css:
   - Hide nav links on mobile
   - Show hamburger button on mobile
   - Style dropdown menu
   - Stack header actions if needed

**Mobile menu styles:**
```css
@media (max-width: 640px) {
  .app-nav { display: none; }
  .hamburger { display: block; }
  .mobile-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e0e0e0;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  }
}
```

## Acceptance
- [ ] Desktop: nav links visible, hamburger hidden
- [ ] Mobile (< 640px): nav hidden, hamburger visible
- [ ] Click hamburger → dropdown shows Calendar/Settings
- [ ] Click outside or link → dropdown closes
- [ ] Menu has proper z-index above calendar

## Done summary
Add responsive header with dropdown mobile menu

Changes:
- Added hamburger button with 44x44px touch target
- Mobile dropdown menu with Calendar/Settings links
- Click outside functionality to close menu
- Media queries for screens < 640px
- Responsive spacing and typography
## Evidence
- Commits: bedbfcc
- Tests: Manual test on mobile viewport
- PRs:
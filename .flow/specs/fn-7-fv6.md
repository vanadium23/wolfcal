# fn-7-fv6 Make WolfCal mobile-friendly interface

## Overview
Make WolfCal fully responsive and mobile-friendly. Current implementation has no media queries and is desktop-first. Need to add responsive breakpoints, mobile navigation, touch-friendly targets, and optimized layouts for screens under 768px.

## Scope
- Responsive header with hamburger menu for mobile
- FullCalendar mobile optimization
- Responsive event modal and forms
- Touch-friendly button sizes (44px min)
- Mobile-optimized spacing and typography
- Hide/filter panel behavior on mobile

## Approach

### Breakpoint Strategy
- **Mobile:** < 640px (phones)
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px (current)

### Task 1: Responsive Header
- Add hamburger menu for mobile
- Collapse navigation on small screens
- Stack header actions vertically
- Add slide-out or dropdown menu

### Task 2: Calendar Responsive
- Use FullCalendar's responsive mode
- Adjust toolbar for mobile (stack buttons)
- Hide less important UI on small screens
- Touch-optimized event display

### Task 3: Modal Responsive
- Full-screen modals on mobile
- Add bottom sheet style for event popovers
- Touch-friendly form inputs (16px min font)
- Stack form buttons vertically

### Task 4: Touch Optimizations
- Minimum 44x44px touch targets
- Add padding to clickable elements
- Prevent zoom on form focus (viewport meta)
- Add tap highlight color

## Quick commands
```bash
npm run dev     # Test responsive changes
npm run build   # Verify build
```

## Acceptance
- [ ] Site works on 320px - 768px screens
- [ ] Header collapses to hamburger on mobile
- [ ] Calendar is usable on touch devices
- [ ] Modals are full-screen on mobile
- [ ] Buttons meet 44px minimum touch target
- [ ] No horizontal scroll on mobile
- [ ] Text is readable without zoom

## References
- Current CSS files: App.css, Calendar.css, EventForm.css, Settings.css
- FullCalendar mobile docs: https://fullcalendar.io/docs/mobile
- Touch target guidelines: 44x44px minimum (WCAG 2.5.5)

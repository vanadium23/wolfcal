# fn-7-fv6.2 Make FullCalendar responsive for mobile screens

## Description
Optimize FullCalendar for mobile viewing with proper breakpoints, toolbar adjustments, and touch-optimized event display.

**User decisions:**
- Full functionality on mobile - users create/edit events
- Filter panel: Keep as sidebar (collapsible) - just needs responsive styling
- Event popover: Regular popup (viewport positioning already implemented in fn-6-dp3.2)

**Files to modify:**
- `src/components/Calendar.css` - Add mobile media queries
- Check if Calendar.tsx needs toolbar adjustments

**Implementation:**
1. Customize headerToolbar for mobile (stack prev/next/title buttons)
2. Add `@media (max-width: 640px)` to Calendar.css:
   - Reduce font sizes for day headers
   - Increase event height for touch
   - Hide less important UI elements
3. Set slotLabelFormat for mobile (hide minutes, show hours only)
4. Consider hiding weekends button on very small screens

**Mobile toolbar:**
```tsx
headerToolbar={{
  left: 'prev,next',
  center: 'title',
  right: 'dayGridMonth,timeGridWeek,timeGridDay'
}}
// On mobile: stack vertically, use icons instead of text
```

**Mobile CSS:**
```css
@media (max-width: 640px) {
  .fc .fc-toolbar { flex-direction: column; gap: 0.5rem; }
  .fc .fc-button { padding: 0.5em; font-size: 0.9em; }
  .fc-timegrid-slot { height: 40px; } /* Taller slots for touch */
}
```

## Acceptance
- [ ] Calendar fills screen width on mobile (no horizontal scroll)
- [ ] Toolbar buttons are large enough to tap (≥44px)
- [ ] Filter panel toggle is accessible and tappable on mobile
- [ ] Week/day view is usable on mobile
- [ ] Events are tappable with adequate spacing
- [ ] View switching works smoothly

## Done summary
Optimize FullCalendar for mobile with responsive toolbar and touch-optimized display

## Evidence
- Commits:
- Tests: Manual test on mobile viewport
- PRs:

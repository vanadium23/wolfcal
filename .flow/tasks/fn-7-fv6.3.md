# fn-7-fv6.3 Make event modal responsive for mobile

## Description
Make event modal and forms responsive - full-screen on mobile, proper padding, touch-friendly inputs.

**User decisions:**
- Full functionality on mobile - users create/edit events on mobile
- Event popover: Regular popup (viewport positioning already done in fn-6-dp3.2)

**Files to modify:**
- `src/components/EventForm.css` - Add mobile media queries
- `src/components/EventModal.tsx` - Check if responsive classes needed
- EventPopover.tsx - Already has viewport positioning, may need minor touch adjustments

**Implementation:**
1. Add `@media (max-width: 640px)` to EventForm.css:
   - Full-screen modal (100vw, 100vh, no border-radius)
   - Remove max-width constraint
   - Make form actions stack vertically with full-width buttons
   - Increase input font size to 16px (prevent iOS zoom)
2. EventPopover already has viewport-aware positioning from fn-6-dp3.2
3. Ensure close buttons are tappable (44x44px min)

**Mobile modal styles:**
```css
@media (max-width: 640px) {
  .modal-overlay { padding: 0; }
  .modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  .modal-header { padding: 1rem; }
  .modal-body { padding: 1rem; }
  .event-form .form-input { font-size: 16px; } /* Prevent iOS zoom */
  .form-actions { flex-direction: column; }
}
```

## Acceptance
- [ ] Modal is full-screen on mobile
- [ ] Form inputs don't trigger zoom on iOS
- [ ] Save/Cancel buttons are full-width and stack vertically
- [ ] All form fields are accessible with proper spacing
- [ ] Close button is easily tappable

## Done summary
Make event modal and forms responsive for mobile with full-screen layout

Changes:
- Full-screen modals on mobile
- 16px font size on inputs (prevents iOS zoom)
- Stacked form buttons with 48px touch targets
- Compact spacing for mobile layout
## Evidence
- Commits: 7dc8c27
- Tests: Manual test on mobile viewport
- PRs:
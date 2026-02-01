# fn-6-dp3.2 Fix event popup positioning to stay within viewport

## Description
Event popup (EventPopover) can appear below the visible screen area when clicking events near the bottom of the viewport.

**Root cause:** `EventPopover.tsx` lines 216-218 use fixed positioning without checking if popup will overflow viewport.

**Files to modify:** `src/components/EventPopover.tsx`

**Implementation:**
```typescript
// Add ref to popover element
const popoverRef = useRef<HTMLDivElement>(null);

// Calculate safe position
useEffect(() => {
  if (popoverRef.current) {
    const rect = popoverRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let adjustedY = position.y;
    let adjustedX = position.x;

    // Flip to above if would go below viewport
    if (position.y + rect.height > viewportHeight - 20) {
      adjustedY = position.y - rect.height - 10;
    }

    // Shift left if would go beyond right edge
    if (position.x + rect.width > viewportWidth - 20) {
      adjustedX = viewportWidth - rect.width - 20;
    }

    // Keep within left edge
    if (adjustedX < 10) adjustedX = 10;

    // Update position state
    setSafePosition({ x: adjustedX, y: adjustedY });
  }
}, [position]);

// Use safePosition in style
```

## Acceptance
- [ ] Click event at bottom of screen → popup appears above event
- [ ] Click event at right edge → popup shifted left
- [ ] Popup always fully visible within viewport

## Done summary
Fix event popup positioning to account for viewport boundaries

## Evidence
- Commits:
- Tests: Manual test - click events at various positions
- PRs:

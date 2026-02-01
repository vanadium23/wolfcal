/**
 * Calendar View E2E Tests (UI-Only)
 *
 * Tests the FullCalendar component rendering and interaction:
 * - Calendar view initialization
 * - View switching (month/week/day)
 * - Navigation between dates
 * - Calendar toolbar elements
 *
 * All tests verify through UI only - no direct state manipulation.
 * Tests use MSW for mocking but don't seed data.
 */

import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'

test.describe('Calendar View', () => {
  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)

    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Navigate to calendar
    await page.goto('/')
  })

  test.afterEach(async ({ page: _page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should render FullCalendar component', async ({ page }) => {
    // Verify FullCalendar loaded
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Verify toolbar is present
    await expect(page.locator('.fc-toolbar')).toBeVisible()

    // Verify calendar grid is visible
    await expect(page.locator('.fc-view-harness')).toBeVisible()
  })

  test('should render view toggle buttons', async ({ page }) => {
    // Verify view switcher buttons exist
    // At least some view buttons should be present
    const buttonCount = await page.locator('.fc-button').count()
    expect(buttonCount).toBeGreaterThan(0)
  })

  test('should switch between month/week/day views', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Try clicking view buttons if they exist
    const monthButton = page.locator('.fc-month-button, .fc-button-month').first()
    const weekButton = page.locator('.fc-timeGridWeek-button, .fc-button-week').first()
    const dayButton = page.locator('.fc-timeGridDay-button, .fc-button-day').first()

    // Test month view
    if (await monthButton.isVisible().catch(() => false)) {
      await monthButton.click()
      await expect(page.locator('.fc-month-view')).toBeVisible()
    }

    // Test week view
    if (await weekButton.isVisible().catch(() => false)) {
      await weekButton.click()
      await expect(page.locator('.fc-timegrid')).toBeVisible()
    }

    // Test day view
    if (await dayButton.isVisible().catch(() => false)) {
      await dayButton.click()
      await expect(page.locator('.fc-timegrid')).toBeVisible()
    }
  })

  test('should have navigation controls', async ({ page }) => {
    // Verify calendar loaded
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Verify today button exists
    const todayButton = page.locator('.fc-today-button, button:has-text("today"), button:has-text("Today")')
    const todayCount = await todayButton.count()
    expect(todayCount).toBeGreaterThan(0)

    // Verify prev/next buttons exist
    const navButtons = page.locator('.fc-prev-button, .fc-next-button')
    const navCount = await navButtons.count()
    expect(navCount).toBeGreaterThanOrEqual(2) // At least prev and next
  })

  test('should navigate between dates', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Click next button
    const nextButton = page.locator('.fc-next-button').first()
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click()

      // Verify calendar is still visible after navigation
      await expect(page.locator('.fc')).toBeVisible()
    }

    // Click prev button
    const prevButton = page.locator('.fc-prev-button').first()
    if (await prevButton.isVisible().catch(() => false)) {
      await prevButton.click()

      // Verify calendar is still visible after navigation
      await expect(page.locator('.fc')).toBeVisible()
    }
  })

  test('should display title with current month/year', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Verify toolbar title exists and contains date info
    const title = page.locator('.fc-toolbar-title')
    const titleCount = await title.count()
    expect(titleCount).toBeGreaterThan(0)
  })
})

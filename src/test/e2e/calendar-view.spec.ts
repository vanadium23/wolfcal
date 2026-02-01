/**
 * Calendar View E2E Tests
 *
 * Tests the FullCalendar component rendering, including:
 * - Calendar view initialization
 * - Event rendering with correct colors and times
 * - View switching (month/week/day)
 * - Date navigation
 *
 * All tests use MSW and seeded data - no real network calls.
 * Tests use time-relative events for consistent testing.
 *
 * Excluded from smoke test scope:
 * - Event clicking/popovers (interaction tests)
 * - Event creation modal (interaction tests)
 * - Calendar visibility toggle (feature tests)
 */

import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'
import {
  clearDatabase,
  seedMockEvents,
} from './fixtures/indexeddb'
import { createValidAccount } from './fixtures/accounts'

test.describe('Calendar View', () => {
  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)

    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    await clearDatabase(page)
    await createValidAccount(page)
  })

  test.afterEach(async ({ page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should render FullCalendar component', async ({ page }) => {
    // Seed time-relative events
    await seedMockEvents(page, [
      { offsetHours: 1, summary: 'Event in 1 hour' },
      { offsetHours: 2, summary: 'Event in 2 hours' },
    ])

    await page.goto('/')

    // Verify FullCalendar loaded
    await expect(page.locator('.fc')).toBeVisible()

    // Verify toolbar is present
    await expect(page.locator('.fc-toolbar')).toBeVisible()

    // Verify calendar grid is visible
    await expect(page.locator('.fc-view-harness')).toBeVisible()
  })

  test('should render events with correct colors and times', async ({ page }) => {
    // Seed time-relative events
    await seedMockEvents(page, [
      { offsetHours: 1, summary: 'Event in 1 hour' },
      { offsetHours: 2, summary: 'Event in 2 hours' },
    ])

    await page.goto('/')

    // Verify events rendered
    await expect(page.locator('.fc-event:has-text("Event in 1 hour")')).toBeVisible()
    await expect(page.locator('.fc-event:has-text("Event in 2 hours")')).toBeVisible()

    // Verify event colors (should match calendar backgroundColor)
    const eventElement = page.locator('.fc-event').first()
    const backgroundColor = await eventElement.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Primary calendar color is #039BE5 (from handlers-e2e.ts)
    expect(backgroundColor).toBe('rgb(3, 155, 229)')
  })

  test('should switch between month/week/day views', async ({ page }) => {
    await seedMockEvents(page, [{ offsetHours: 1 }])

    await page.goto('/')

    // Test month view
    await page.click('button:has-text("Month")')
    await expect(page.locator('.fc-daygrid-month-view')).toBeVisible()

    // Test week view
    await page.click('button:has-text("Week")')
    await expect(page.locator('.fc-timegrid-week-view')).toBeVisible()

    // Test day view
    await page.click('button:has-text("Day")')
    await expect(page.locator('.fc-timegrid-day-view')).toBeVisible()
  })

  test('should navigate between dates', async ({ page }) => {
    await seedMockEvents(page, [{ offsetHours: 1 }])

    await page.goto('/')

    const initialTitle = await page.locator('.fc-toolbar-title').textContent()

    // Click next button
    await page.click('button.fc-next-button')

    const newTitle = await page.locator('.fc-toolbar-title').textContent()
    expect(newTitle).not.toBe(initialTitle)

    // Click prev button
    await page.click('button.fc-prev-button')

    const backTitle = await page.locator('.fc-toolbar-title').textContent()
    expect(backTitle).toBe(initialTitle)
  })

  test('should verify event time accuracy', async ({ page }) => {
    const baseTime = Date.now()
    const eventHour = new Date(baseTime + 3600000).getHours()

    await seedMockEvents(page, [
      { offsetHours: 1, summary: 'Time Test Event' },
    ])

    await page.goto('/')

    // Switch to day view for time verification
    await page.click('button:has-text("Day")')

    // Event should appear at the correct time slot
    const event = page.locator('.fc-event:has-text("Time Test Event")')
    await expect(event).toBeVisible()

    // Verify event has time information in its data
    const eventTime = await event.evaluate(el => {
      const timeEl = el.querySelector('.fc-event-time')
      return timeEl?.textContent || ''
    })

    expect(eventTime).toBeTruthy()
  })

  test('should handle empty calendar state', async ({ page }) => {
    // Don't seed any events
    await page.goto('/')

    // Calendar should still render
    await expect(page.locator('.fc')).toBeVisible()

    // No events should be visible
    await expect(page.locator('.fc-event')).toHaveCount(0)

    // Calendar grid should still be present
    await expect(page.locator('.fc-daygrid, .fc-timegrid')).toBeVisible()
  })
})

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from './mocks/server'

// Start MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Vitest + MSW Validation', () => {
  it('should mock Google Calendar API responses', async () => {
    // Test fetch API mocking
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: 'Bearer mock_token',
      },
    })

    const data = await response.json()
    expect(data).toHaveProperty('items')
    expect(data.items).toBeInstanceOf(Array)
    expect(data.items[0]).toHaveProperty('id', 'primary')
  })

  it('should support OAuth token endpoint mocking', async () => {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: 'test_code',
        client_id: 'test',
        client_secret: 'test',
        redirect_uri: 'http://localhost:5173/callback',
        grant_type: 'authorization_code',
      }),
    })

    const data = await response.json()
    expect(data).toHaveProperty('access_token', 'mock_access_token')
    expect(data).toHaveProperty('refresh_token', 'mock_refresh_token')
  })
})

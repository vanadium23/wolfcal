import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ConfigBundle } from '../../lib/config/serializer'

// Mock modules BEFORE importing the component using vi.hoisted
const { mockExportConfig, mockSerializeBundle, mockEncrypt, mockQRCodeSVG } = vi.hoisted(() => ({
  mockExportConfig: vi.fn(),
  mockSerializeBundle: vi.fn(),
  mockEncrypt: vi.fn(),
  mockQRCodeSVG: vi.fn(({ size, level, includeMargin, value, bgColor, fgColor }: {
    size?: number
    level?: string
    includeMargin?: boolean
    value?: string
    bgColor?: string
    fgColor?: string
  }) => {
    return (
      <svg
        data-testid="qr-code"
        width={String(size)}
        height={String(size)}
        data-level={level}
        data-include-margin={String(includeMargin)}
        data-bgcolor={bgColor}
        data-fgcolor={fgColor}
      >
        <title>QR Code: {value}</title>
      </svg>
    )
  }),
}))

vi.mock('../../lib/config', () => ({
  exportConfig: mockExportConfig,
  serializeBundle: mockSerializeBundle,
  encrypt: mockEncrypt,
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: mockQRCodeSVG,
}))

import ExportConfiguration from '../../components/ExportConfiguration'

describe('BUG-4: QR code resolution', () => {
  const MAX_QR_DATA_SIZE = 2953

  // Mock configuration bundles
  const mockSmallConfig: ConfigBundle = {
    version: 2,
    accounts: [
      {
        email: 'user@example.com',
        needsReauth: true,
        createdAt: Date.now(),
      },
    ],
    calendars: [
      {
        id: 'cal-1',
        accountId: 'user@example.com',
        summary: 'Primary Calendar',
        primary: true,
        visible: true,
      },
      {
        id: 'cal-2',
        accountId: 'user@example.com',
        summary: 'Work Calendar',
        primary: false,
        visible: true,
      },
    ],
    oauthCredentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
    syncSettings: {
      autoSync: true,
      syncInterval: 30,
    },
    calendarFilters: {
      'cal-1': true,
      'cal-2': true,
    },
    exportedAt: Date.now(),
  }

  const mockMediumConfig: ConfigBundle = {
    version: 2,
    accounts: [
      {
        email: 'user1@example.com',
        needsReauth: true,
        createdAt: Date.now(),
      },
      {
        email: 'user2@example.com',
        needsReauth: true,
        createdAt: Date.now(),
      },
      {
        email: 'user3@example.com',
        needsReauth: true,
        createdAt: Date.now(),
      },
    ],
    calendars: Array.from({ length: 10 }, (_, i) => ({
      id: `cal-${i}`,
      accountId: `user${(i % 3) + 1}@example.com`,
      summary: `Calendar ${i}`,
      primary: i === 0,
      visible: true,
    })),
    oauthCredentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
    syncSettings: {
      autoSync: true,
      syncInterval: 30,
    },
    calendarFilters: {},
    exportedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockExportConfig.mockResolvedValue(mockSmallConfig)
    mockSerializeBundle.mockReturnValue(JSON.stringify(mockSmallConfig))
    mockEncrypt.mockResolvedValue('encrypted-data-123')

    // Mock window.location
    delete (window as Partial<Window>).location
    window.location = {
      origin: 'https://example.com',
      pathname: '/app',
      hash: '',
      assign: vi.fn(),
      reload: vi.fn(),
      replace: vi.fn(),
    } as unknown as Location

    // Mock navigator.clipboard - use spyOn with getter
    vi.stubGlobal('clipboard', {
      writeText: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('QR code dimensions', () => {
    it('should render QR code with minimum 300x300 pixel size', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Check QR code was called
      expect(mockQRCodeSVG).toHaveBeenCalled()

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // CRITICAL BUG CHECK: Size should be >= 300 (currently fails at 200)
      expect(props.size).toBeGreaterThanOrEqual(300)
    })

    it('should maintain aspect ratio for QR code', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      const qrCode = screen.getByTestId('qr-code')
      const width = qrCode.getAttribute('width')
      const height = qrCode.getAttribute('height')

      // Width and height should be equal (square QR code)
      expect(width).toBe(height)
    })
  })

  describe('QR code error correction', () => {
    it('should use error correction level M or higher', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // CRITICAL BUG CHECK: Level should be M, Q, or H (currently fails at "L")
      expect(['M', 'Q', 'H']).toContain(props.level)
    })

    it('should not use error correction level L', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // CRITICAL BUG CHECK: Level should NOT be "L"
      expect(props.level).not.toBe('L')
    })
  })

  describe('QR code visibility based on data size', () => {
    it('should show QR code for small configurations', async () => {
      const user = userEvent.setup()
      mockExportConfig.mockResolvedValue(mockSmallConfig)

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // QR code should be visible
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()

      // No warning about size
      expect(screen.queryByText(/configuration too large/i)).not.toBeInTheDocument()
    })

    it('should show QR code for medium configurations', async () => {
      const user = userEvent.setup()
      mockExportConfig.mockResolvedValue(mockMediumConfig)
      mockSerializeBundle.mockReturnValue(JSON.stringify(mockMediumConfig))

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // QR code should be visible
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // Should have minimum size
      expect(props.size).toBeGreaterThanOrEqual(300)

      // Should have proper error correction
      expect(['M', 'Q', 'H']).toContain(props.level)
    })

    it('should hide QR code when data exceeds MAX_QR_DATA_SIZE', async () => {
      const user = userEvent.setup()

      // Create a config that will exceed MAX_QR_DATA_SIZE
      const largeConfig: ConfigBundle = {
        ...mockSmallConfig,
        calendars: Array.from({ length: 100 }, (_, i) => ({
          id: `cal-${i}`,
          accountId: 'user@example.com',
          summary: `Calendar ${i} - ${'A'.repeat(50)}`, // Long summary to increase size
          primary: i === 0,
          visible: true,
        })),
      }

      mockExportConfig.mockResolvedValue(largeConfig)
      mockSerializeBundle.mockReturnValue(JSON.stringify(largeConfig))

      // Create a long encrypted string that exceeds MAX_QR_DATA_SIZE
      const longEncrypted = 'x'.repeat(MAX_QR_DATA_SIZE + 100)
      mockEncrypt.mockResolvedValue(longEncrypted)

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for result modal
      await waitFor(() => {
        expect(screen.getByText(/Configuration Exported/i)).toBeInTheDocument()
      })

      // QR code should NOT be visible
      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()

      // Warning message should be displayed
      expect(screen.getByText(/configuration too large for qr code/i)).toBeInTheDocument()

      // Copy URL input should still be shown
      expect(screen.getByLabelText(/Export URL/i)).toBeInTheDocument()
    })

    it('should handle boundary case at exactly MAX_QR_DATA_SIZE', async () => {
      const user = userEvent.setup()

      mockExportConfig.mockResolvedValue(mockSmallConfig)

      // Create an encrypted string exactly at MAX_QR_DATA_SIZE
      const baseUrl = 'https://example.com/app#config='
      const encryptedSize = MAX_QR_DATA_SIZE - baseUrl.length
      const exactEncrypted = 'x'.repeat(encryptedSize)
      mockEncrypt.mockResolvedValue(exactEncrypted)

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for result modal
      await waitFor(() => {
        expect(screen.getByText(/Configuration Exported/i)).toBeInTheDocument()
      })

      // QR code SHOULD be visible (boundary case - data fits exactly)
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()

      // No warning message
      expect(screen.queryByText(/configuration too large/i)).not.toBeInTheDocument()
    })
  })

  describe('QR code rendering quality', () => {
    it('should include margin for better scanning', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // Should include margin for quiet zone
      expect(props.includeMargin).toBe(true)
    })

    it('should use high contrast colors (black on white)', async () => {
      const user = userEvent.setup()

      render(<ExportConfiguration />)

      // Start export flow
      const exportButton = screen.getByText('Export Configuration')
      await user.click(exportButton)

      // Fill passphrase
      const passphraseInput = screen.getByLabelText('Passphrase')
      const confirmInput = screen.getByLabelText('Confirm Passphrase')
      await user.type(passphraseInput, 'testpassword123')
      await user.type(confirmInput, 'testpassword123')

      // Submit
      const exportSubmitButton = screen.getByRole('button', { name: 'Export' })
      await user.click(exportSubmitButton)

      // Wait for QR code to render
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      })

      // Get the props passed to QRCodeSVG
      const calls = mockQRCodeSVG.mock.calls
      const lastCall = calls[calls.length - 1]
      const props = lastCall[0]

      // Should use high contrast colors
      expect(props.bgColor).toBe('#ffffff')
      expect(props.fgColor).toBe('#000000')
    })
  })
})

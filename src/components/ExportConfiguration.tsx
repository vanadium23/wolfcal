import { useState } from 'react';
import { exportConfig, serializeBundle, encrypt } from '../lib/config';
import type { ConfigBundle } from '../lib/config/serializer';
import { QRCodeSVG } from 'qrcode.react';

interface ExportConfigurationProps {
  className?: string;
}

// QR Code capacity for version 40-L (most common scan target)
const MAX_QR_DATA_SIZE = 2953;

export default function ExportConfiguration({ className = '' }: ExportConfigurationProps) {
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrCodeTooLarge, setQrCodeTooLarge] = useState(false);

  const handleStartExport = () => {
    setShowPassphraseModal(true);
    setError('');
    setPassphrase('');
    setConfirmPassphrase('');
  };

  const handleExport = async () => {
    setError('');
    
    // Validate passphrase
    if (!passphrase) {
      setError('Please enter a passphrase');
      return;
    }
    
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters long');
      return;
    }

    setIsExporting(true);

    try {
      // Export configuration
      const bundle: ConfigBundle = await exportConfig();

      // Debug: log bundle structure and sizes
      console.log('=== Export Debug ===');
      console.log('Accounts:', bundle.accounts.length, 'items');
      console.log('Calendars:', bundle.calendars.length, 'items');
      console.log('Account data:', bundle.accounts.map(a => ({
        email: a.email,
        tokenLen: a.accessToken.length,
        refreshLen: a.refreshToken.length,
      })));
      console.log('Calendar data:', bundle.calendars.map(c => ({
        id: c.id,
        summary: c.summary,
        summaryLen: c.summary.length,
      })));

      // Serialize to JSON
      const serialized = serializeBundle(bundle);

      console.log('Config JSON size:', serialized.length, 'bytes');

      // Encrypt with passphrase
      const encrypted = await encrypt(serialized, passphrase);

      console.log('Encrypted size:', encrypted.length, 'bytes');

      // Generate URL
      const baseUrl = window.location.origin + window.location.pathname;
      const url = `${baseUrl}#config=${encrypted}`;

      console.log('Final URL size:', url.length, 'bytes');
      console.log('==================');

      setExportUrl(url);
      setShowPassphraseModal(false);
      setShowResultModal(true);
      setCopySuccess(false);

      // Check if QR code can handle this data
      setQrCodeTooLarge(url.length > MAX_QR_DATA_SIZE);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const handleClosePassphraseModal = () => {
    setShowPassphraseModal(false);
    setPassphrase('');
    setConfirmPassphrase('');
    setError('');
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setExportUrl('');
    setCopySuccess(false);
  };

  return (
    <>
      <button
        className={className}
        onClick={handleStartExport}
      >
        Export Configuration
      </button>

      {/* Passphrase Input Modal */}
      {showPassphraseModal && (
        <div className="modal-overlay" onClick={handleClosePassphraseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Export Configuration</h2>
            <p className="modal-description">
              Create a secure passphrase to encrypt your configuration. You'll need this passphrase 
              to import your configuration on another device.
            </p>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="export-passphrase">Passphrase</label>
              <input
                id="export-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter a secure passphrase"
                disabled={isExporting}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="export-confirm-passphrase">Confirm Passphrase</label>
              <input
                id="export-confirm-passphrase"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Confirm your passphrase"
                disabled={isExporting}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleExport();
                  }
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="button-secondary"
                onClick={handleClosePassphraseModal}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="modal-overlay" onClick={handleCloseResultModal}>
          <div className="modal-content export-result-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Configuration Exported!</h2>
            <p className="modal-description">
              {!qrCodeTooLarge 
                ? 'Scan the QR code or copy the URL below to transfer your configuration to another device.'
                : 'Your configuration is too large for a QR code. Please use the "Copy" button to transfer the URL below.'}
            </p>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            {/* QR Code - only show if data fits */}
            {!qrCodeTooLarge && (
              <div className="qr-code-container">
                <QRCodeSVG
                  value={exportUrl}
                  size={200}
                  level="L"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={true}
                />
              </div>
            )}

            {qrCodeTooLarge && (
              <div className="qr-code-warning">
                <p>
                  <strong>Configuration too large for QR code</strong>
                </p>
                <p>
                  Your configuration is {exportUrl.length} bytes, but QR codes can only handle 
                  up to {MAX_QR_DATA_SIZE} bytes reliably.
                </p>
                <p>
                  This usually happens when you have many accounts or calendars.
                  Please use the "Copy" button below to transfer your configuration.
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="export-url">
                Export URL ({exportUrl.length} bytes)
                {qrCodeTooLarge && ' - Too large for QR code'}
              </label>
              <div className="url-input-group">
                <input
                  id="export-url"
                  type="text"
                  value={exportUrl}
                  readOnly
                  className="url-input"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="button-copy"
                  onClick={handleCopy}
                  type="button"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {!qrCodeTooLarge && (
                <p className="form-help">
                  <strong>How to transfer:</strong>
                  <br />
                  • Scan the QR code with your phone's camera
                  <br />
                  • Or copy the URL and send it to yourself
                  <br />
                  • Open the URL on another device and enter your passphrase
                </p>
              )}
              {qrCodeTooLarge && (
                <p className="form-help">
                  <strong>How to transfer:</strong>
                  <br />
                  • Click "Copy" button above
                  <br />
                  • Send the URL to yourself (email, messaging app, etc.)
                  <br />
                  • Open the URL on another device and enter your passphrase
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="button-primary"
                onClick={handleCloseResultModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

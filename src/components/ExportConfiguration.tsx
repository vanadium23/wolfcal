import { useState } from 'react';
import { exportConfig, serializeBundle, encrypt } from '../lib/config';
import type { ConfigBundle } from '../lib/config/serializer';

interface ExportConfigurationProps {
  className?: string;
}

export default function ExportConfiguration({ className = '' }: ExportConfigurationProps) {
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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
      
      // Serialize to JSON
      const serialized = serializeBundle(bundle);
      
      // Encrypt with passphrase
      const encrypted = await encrypt(serialized, passphrase);
      
      // Generate URL
      const baseUrl = window.location.origin + window.location.pathname;
      const url = `${baseUrl}#config=${encrypted}`;
      
      setExportUrl(url);
      setShowPassphraseModal(false);
      setShowResultModal(true);
      setCopySuccess(false);
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Configuration Exported!</h2>
            <p className="modal-description">
              Your configuration has been encrypted and exported. Copy the URL below and share it 
              with your other device, or save it for later.
            </p>

            <div className="form-group">
              <label htmlFor="export-url">Export URL</label>
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
              <p className="form-help">
                Open this URL on another device and enter your passphrase to import your configuration.
              </p>
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

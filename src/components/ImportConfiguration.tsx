import { useState, useEffect } from 'react';
import { decrypt, importConfig, deserializeBundle, type ConfigBundle } from '../lib/config';

interface ImportConfigurationProps {
  encryptedData: string;
  onComplete: () => void;
  onCancel: () => void;
}

type ImportStep = 'passphrase' | 'merge-choice' | 'importing' | 'success';

export function ImportConfigurationModal({ encryptedData, onComplete, onCancel }: ImportConfigurationProps) {
  const [step, setStep] = useState<ImportStep>('passphrase');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [decryptedBundle, setDecryptedBundle] = useState<ConfigBundle | null>(null);
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Parent component handles checking for #config hash and passing encrypted data
    // This useEffect ensures the component processes the data when it changes
  }, [encryptedData]);

  const handleDecrypt = async () => {
    setError('');
    setIsProcessing(true);

    try {
      // Decrypt the data
      const decryptedJson = await decrypt(encryptedData, passphrase);
      
      // Deserialize to ConfigBundle
      const bundle = deserializeBundle(decryptedJson);
      
      setDecryptedBundle(bundle);
      setStep('merge-choice');
    } catch (err) {
      console.error('Decryption failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to decrypt. Please check your passphrase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!decryptedBundle) {
      setError('No configuration to import');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      // Import the configuration
      await importConfig(decryptedBundle, mergeMode);
      
      // Clear the hash from URL
      window.history.replaceState({}, '', window.location.pathname);
      
      setStep('success');
      const reauthMessage = decryptedBundle.accounts.length > 0
        ? `\n\n⚠️ ${decryptedBundle.accounts.length} account${decryptedBundle.accounts.length > 1 ? 's' : ''} need re-authentication. Go to Settings to complete the setup.`
        : '';
      setSuccessMessage(
        mergeMode === 'replace'
          ? `Configuration imported successfully! All settings have been replaced.${reauthMessage}`
          : `Configuration imported successfully! Settings have been merged with your existing configuration.${reauthMessage}`
      );

      // Auto-close after 2 seconds and reload
      setTimeout(() => {
        onComplete();
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to import configuration.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Clear the hash from URL
    window.history.replaceState({}, '', window.location.pathname);
    onCancel();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'passphrase' && (
          <>
            <h2>Import Configuration</h2>
            <p className="modal-description">
              This URL contains encrypted configuration data. Enter the passphrase to decrypt and import it.
            </p>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="import-passphrase">Passphrase</label>
              <input
                id="import-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter the passphrase used for export"
                disabled={isProcessing}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && passphrase) {
                    handleDecrypt();
                  }
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="button-secondary"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={handleDecrypt}
                disabled={isProcessing || !passphrase}
              >
                {isProcessing ? 'Decrypting...' : 'Decrypt'}
              </button>
            </div>
          </>
        )}

        {step === 'merge-choice' && decryptedBundle && (
          <>
            <h2>Choose Import Mode</h2>
            <p className="modal-description">
              Configuration decrypted successfully! Choose how to import the data.
            </p>

            <div className="config-summary">
              <p><strong>Accounts:</strong> {decryptedBundle.accounts.length}</p>
              <p><strong>Sync Settings:</strong> Auto-sync: {decryptedBundle.syncSettings.autoSync ? 'On' : 'Off'}, Interval: {decryptedBundle.syncSettings.syncInterval} min</p>
              <p><strong>Calendars:</strong> {Object.keys(decryptedBundle.calendarFilters).length}</p>
            </div>

            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              padding: '12px',
              marginTop: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#856404', fontWeight: 500 }}>
                Re-authentication Required
              </p>
              <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                For security reasons, authentication tokens are not transferred. You will need to re-authenticate each account after import. Go to Settings after import to complete the setup.
              </p>
            </div>

            <div className="merge-choice-options">
              <label className={`radio-option ${mergeMode === 'merge' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="merge-mode"
                  value="merge"
                  checked={mergeMode === 'merge'}
                  onChange={(e) => setMergeMode(e.target.value as 'merge' | 'replace')}
                />
                <div className="radio-content">
                  <strong>Merge with existing</strong>
                  <p className="radio-description">
                    Combine imported settings with your current configuration. Existing data is preserved, 
                    and imported data is added or updated.
                  </p>
                </div>
              </label>

              <label className={`radio-option ${mergeMode === 'replace' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="merge-mode"
                  value="replace"
                  checked={mergeMode === 'replace'}
                  onChange={(e) => setMergeMode(e.target.value as 'merge' | 'replace')}
                />
                <div className="radio-content">
                  <strong>Replace all settings</strong>
                  <p className="radio-description">
                    Clear all existing configuration and use only the imported data. This will remove 
                    your current accounts and settings.
                  </p>
                </div>
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="button-secondary"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={handleImport}
                disabled={isProcessing}
              >
                {isProcessing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <>
            <h2>Importing Configuration...</h2>
            <p className="modal-description">
              Please wait while your configuration is being imported.
            </p>
            <div className="loading-spinner"></div>
          </>
        )}

        {step === 'success' && (
          <>
            <h2>Import Successful!</h2>
            <p className="modal-description">
              {successMessage}
            </p>
            <p className="modal-description">
              Reloading application...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleDriveCallbackContent() {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get('refresh_token');
  const error = searchParams.get('error');
  const autoUpdated = searchParams.get('auto_updated');

  const status: 'success' | 'error' = error ? 'error' : refreshToken ? 'success' : 'error';

  const autoUpdateStatus =
    autoUpdated === 'true'
      ? { tone: 'success', text: 'Token auto-updated in Vercel and a redeploy was triggered. The app will pick it up automatically.' }
      : autoUpdated === 'partial'
      ? { tone: 'warn', text: 'Token was saved to Vercel env var, but the redeploy did not trigger. Redeploy manually.' }
      : autoUpdated?.startsWith('error')
      ? { tone: 'error', text: `Auto-update failed: ${autoUpdated.slice(6)}` }
      : null;

  const message = error
    ? `Authorization failed: ${error}`
    : refreshToken
    ? `Authorization successful! Your new refresh token is:\n\n${refreshToken}`
    : 'No refresh token received. Please try again.';

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Google Drive Authorization</h1>
      
      {status === 'success' && (
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '4px' }}>
          <h2 style={{ color: '#2e7d32' }}>✅ Success!</h2>
          {autoUpdateStatus && (
            <p
              style={{
                margin: '0 0 0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                backgroundColor: autoUpdateStatus.tone === 'success' ? '#d0f0d0' : autoUpdateStatus.tone === 'warn' ? '#fff3cd' : '#ffebee',
                color: autoUpdateStatus.tone === 'success' ? '#2e7d32' : autoUpdateStatus.tone === 'warn' ? '#856404' : '#c62828',
              }}
            >
              {autoUpdateStatus.text}
            </p>
          )}
          {autoUpdated === 'true' && (
            <p style={{ margin: '0 0 0.75rem', color: '#2e7d32', fontWeight: 'bold' }}>
              ✅ Everything is done — no manual steps needed.
            </p>
          )}
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message}
          </pre>
        </div>
      )}

      {status === 'error' && (
        <div style={{ backgroundColor: '#ffebee', padding: '1rem', borderRadius: '4px' }}>
          <h2 style={{ color: '#c62828' }}>❌ Error</h2>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default function GoogleDriveCallback() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading...</div>}>
      <GoogleDriveCallbackContent />
    </Suspense>
  );
}

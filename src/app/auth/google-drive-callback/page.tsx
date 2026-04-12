'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleDriveCallbackContent() {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get('refresh_token');
  const error = searchParams.get('error');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (error) {
      setStatus('error');
      setMessage(`Authorization failed: ${error}`);
      return;
    }

    if (refreshToken) {
      setStatus('success');
      setMessage(`Authorization successful! Your refresh token is:\n\n${refreshToken}\n\nAdd this to your .env.local as:\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`);
    } else {
      setStatus('error');
      setMessage('No refresh token received. Please try again.');
    }
  }, [refreshToken, error]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Google Drive Authorization</h1>
      
      {status === 'loading' && (
        <div>
          <p>Processing authorization...</p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '4px' }}>
          <h2 style={{ color: '#2e7d32' }}>✅ Success!</h2>
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

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GoogleDriveCallbackContent() {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get('refresh_token');
  const error = searchParams.get('error');

  const status: 'success' | 'error' = error ? 'error' : refreshToken ? 'success' : 'error';
  const message = error
    ? `Authorization failed: ${error}`
    : refreshToken
    ? `Authorization successful! Your refresh token is:\n\n${refreshToken}\n\nAdd this to your deployed environment (Vercel env vars in production, .env.local locally) as:\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
    : 'No refresh token received. Please try again.';

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Google Drive Authorization</h1>
      
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

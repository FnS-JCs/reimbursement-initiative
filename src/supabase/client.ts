import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // /auth/callback exchanges the OAuth code explicitly. Leaving this on
        // would make the client exchange it once during initialization and a
        // second time in that page, after the PKCE verifier was consumed.
        detectSessionInUrl: false,
      },
    }
  );
}

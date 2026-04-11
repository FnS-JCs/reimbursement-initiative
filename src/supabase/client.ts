import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          if (typeof document === 'undefined') return undefined;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            return parts.pop()?.split(';').shift() ?? undefined;
          }
          return undefined;
        },
        set(name, value, options) {
          if (typeof document === 'undefined') return;
          let cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 7}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.secure) cookie += '; Secure';
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          document.cookie = cookie;
        },
        remove(name) {
          if (typeof document === 'undefined') return;
          document.cookie = `${name}=; path=/; max-age=0`;
        },
      },
    }
  );
}

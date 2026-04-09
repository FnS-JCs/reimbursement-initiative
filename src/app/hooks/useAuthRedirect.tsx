'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { normalizeRole } from '@/lib/normalize-role';

export function useAuthRedirect() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: appUser } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('email', user.email?.toLowerCase() || '')
          .maybeSingle();
        if (!appUser || !appUser.is_active) {
          await supabase.auth.signOut();
          if (mounted) router.replace('/auth/login?error=access_denied');
          return;
        }
        const normalized = normalizeRole(appUser.role as string);
        if (normalized === 'fns') {
          if (mounted) router.replace('/fns');
        } else {
          if (mounted) router.replace('/dashboard');
        }
      } catch {
        // swallow; UI will show login or error accordingly
      }
    };
    check();
    return () => { mounted = false; };
  }, [router, supabase]);
}

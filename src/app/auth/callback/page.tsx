'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { normalizeRole } from '@/lib/normalize-role';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      const { data: appUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!appUser) {
        await supabase.auth.signOut();
        if (mounted) router.replace('/auth/login?error=access_denied');
        return;
      }
      if (normalizeRole(appUser.role) === 'fns') router.replace('/fns');
      else router.replace('/dashboard');
    })();
    return () => { mounted = false; };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Signing you in...</span>
      </div>
    </div>
  );
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRole } from '@/lib/normalize-role';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isPublicPage = request.nextUrl.pathname === '/';
  const isFnSRoute = request.nextUrl.pathname.startsWith('/fns');

  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const { data: appUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    if (normalizeRole(appUser?.role) === 'fns') {
      url.pathname = '/fns';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

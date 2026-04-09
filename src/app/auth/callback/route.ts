import { NextRequest, NextResponse } from "next/server";
import { normalizeRole } from "@/lib/normalize-role";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorCode = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (errorCode) {
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", errorCode);
    loginUrl.searchParams.set("message", errorDescription || "OAuth login failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "missing_code");
    loginUrl.searchParams.set("message", "Missing OAuth code in callback");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "oauth_exchange_failed");
    loginUrl.searchParams.set("message", exchangeError.message);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "no_session");
    loginUrl.searchParams.set("message", "No authenticated session was created");
    return NextResponse.redirect(loginUrl);
  }

  const admin = createAdminClient();
  const email = user.email.toLowerCase();
  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .select("id, auth_user_id, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (appUserError || !appUser || !appUser.is_active) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "access_denied");
    loginUrl.searchParams.set(
      "message",
      appUserError?.message || "This Google account email is not whitelisted or is inactive."
    );
    return NextResponse.redirect(loginUrl);
  }

  if (appUser.auth_user_id && appUser.auth_user_id !== user.id) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set("error", "account_link_conflict");
    loginUrl.searchParams.set("message", "This email is already linked to a different auth account.");
    return NextResponse.redirect(loginUrl);
  }

  if (!appUser.auth_user_id) {
    const { error: updateError } = await admin
      .from("users")
      .update({
        auth_user_id: user.id,
      })
      .eq("id", appUser.id)
      .is("auth_user_id", null);

    if (updateError) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "link_failed");
      loginUrl.searchParams.set("message", updateError.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const destination = normalizeRole(appUser.role) === "fns" ? "/fns" : "/dashboard";
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}

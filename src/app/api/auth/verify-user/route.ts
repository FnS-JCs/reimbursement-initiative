import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { createClient } = await import("@/supabase/server");
  const { createAdminClient } = await import("@/supabase/admin");
  const { normalizeRole } = await import("@/lib/normalize-role");

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "No email" }, { status: 400 });
  }

  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .select("id, auth_user_id, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (appUserError || !appUser || !appUser.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: appUserError?.message || "Access denied" },
      { status: 403 }
    );
  }

  if (appUser.auth_user_id && appUser.auth_user_id !== user.id) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This email is already linked to a different account" },
      { status: 409 }
    );
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const destination = normalizeRole(appUser.role) === "fns" ? "/fns" : "/dashboard";
  return NextResponse.json({ destination, role: normalizeRole(appUser.role) });
}

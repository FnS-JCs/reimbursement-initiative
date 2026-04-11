import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/normalize-role";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const email = user.email.toLowerCase();

  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .select("id, auth_user_id, role, is_active")
    .eq("email", email)
    .maybeSingle();

  if (appUserError) {
    return NextResponse.json({ error: appUserError.message }, { status: 400 });
  }

  if (!appUser || !appUser.is_active) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (appUser.auth_user_id && appUser.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Account is already linked" }, { status: 409 });
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
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    user: {
      id: appUser.id,
      role: normalizeRole(appUser.role),
      is_active: appUser.is_active,
    },
  });
}

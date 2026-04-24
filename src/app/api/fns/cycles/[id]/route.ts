import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";
import { normalizeRole } from "@/lib/normalize-role";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .select("role, is_active")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (appUserError) {
    return NextResponse.json({ error: appUserError.message }, { status: 400 });
  }

  if (!appUser?.is_active || normalizeRole(appUser.role) !== "fns") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count, error: countError } = await admin
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  if ((count || 0) > 0) {
    return NextResponse.json(
      { error: "This cycle cannot be deleted because bills are still assigned to it." },
      { status: 409 }
    );
  }

  const { error: deleteError } = await admin
    .from("reimbursement_cycles")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

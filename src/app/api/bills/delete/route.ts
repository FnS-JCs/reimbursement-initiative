import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/supabase/admin";
import { normalizeRole } from "@/lib/normalize-role";

export async function POST(request: NextRequest) {
  try {
    const { billId } = await request.json();

    if (!billId || typeof billId !== "string") {
      return NextResponse.json({ error: "billId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: appUser, error: appUserError } = await admin
      .from("users")
      .select("id, role, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (appUserError || !appUser || !appUser.is_active) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: bill, error: billError } = await admin
      .from("bills")
      .select("id, user_id")
      .eq("id", billId)
      .maybeSingle();

    if (billError) {
      return NextResponse.json({ error: billError.message }, { status: 500 });
    }

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const isFns = normalizeRole(appUser.role) === "fns";
    const isOwner = bill.user_id === appUser.id;

    if (!isFns && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from("bills")
      .delete()
      .eq("id", billId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete bill" },
      { status: 500 }
    );
  }
}

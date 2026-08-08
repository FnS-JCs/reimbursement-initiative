import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/supabase/admin";
import { normalizeRole } from "@/lib/normalize-role";

const EDITABLE_FIELDS = [
  "amount",
  "vendor_id",
  "category_id",
  "subcategory_id",
  "bill_number",
  "date",
  "company_id",
  "process_type",
] as const;

export async function POST(request: NextRequest) {
  try {
    const { billId, fields } = await request.json();

    if (!billId || typeof billId !== "string") {
      return NextResponse.json({ error: "billId is required" }, { status: 400 });
    }

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return NextResponse.json({ error: "fields object is required" }, { status: 400 });
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
      .select("id, user_id, sc_id")
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

    let isAssignedSC = false;
    if (!isFns && !isOwner) {
      const { data: scLink } = await admin
        .from("sc_cabinets")
        .select("id")
        .eq("id", bill.sc_id)
        .eq("user_id", appUser.id)
        .maybeSingle();
      isAssignedSC = !!scLink;
    }

    if (!isFns && !isOwner && !isAssignedSC) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in fields) {
        updateData[key] = fields[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    if ("amount" in updateData) {
      const parsed = Number(updateData.amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      updateData.amount = parsed;
    }

    const { error: updateError } = await admin
      .from("bills")
      .update(updateData)
      .eq("id", billId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      { error: err.message || "Failed to update bill" },
      { status: 500 }
    );
  }
}

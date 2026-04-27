import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/supabase/admin";
import { normalizeRole } from "@/lib/normalize-role";

export const dynamic = "force-dynamic";

const USER_SELECT =
  "id, auth_user_id, email, name, roll_no, role, is_active, upi_id, created_at";

async function requireFnsAccess() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: appUser, error: appUserError } = await admin
    .from("users")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (appUserError || !appUser || !appUser.is_active || normalizeRole(appUser.role) !== "fns") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { admin };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUserPayload(body: Record<string, unknown>) {
  const name = normalizeRequiredString(body.name);
  const emailValue = normalizeRequiredString(body.email);
  const role = normalizeRole(String(body.role ?? ""));

  if (!name) {
    return { error: "Name is required" };
  }

  if (!emailValue) {
    return { error: "Email is required" };
  }

  if (!role) {
    return { error: "A valid role is required" };
  }

  return {
    data: {
      name,
      email: emailValue.toLowerCase(),
      role,
      roll_no: normalizeOptionalString(body.roll_no),
      upi_id: normalizeOptionalString(body.upi_id),
      auth_user_id: normalizeOptionalString(body.auth_user_id),
      is_active: body.is_active !== false,
    },
  };
}

function mapRoleForDatabase(role: string) {
  if (role === "jc") return "JC";
  if (role === "sc") return "SC";
  if (role === "fns") return "F_S";
  return role;
}

function hasPayloadError(
  value: { error: string } | { data: Record<string, string | boolean | null> }
): value is { error: string } {
  return "error" in value;
}

function databaseErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function insertUserWithCompatibleRole(
  admin: ReturnType<typeof createAdminClient>,
  data: Record<string, string | boolean | null>
) {
  const { data: insertedUser, error } = await admin
    .from("users")
    .insert({
      ...data,
      role: mapRoleForDatabase(String(data.role)),
    })
    .select(USER_SELECT)
    .single();

  if (!error) {
    return { data: insertedUser, error: null };
  }

  return { data: null, error: { message: error.message, code: error.code } };
}

async function updateUserWithCompatibleRole(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  data: Record<string, string | boolean | null>
) {
  const { data: updatedUser, error } = await admin
    .from("users")
    .update({
      ...data,
      role: mapRoleForDatabase(String(data.role)),
    })
    .eq("id", id)
    .select(USER_SELECT)
    .single();

  if (!error) {
    return { data: updatedUser, error: null };
  }

  return { data: null, error: { message: error.message, code: error.code } };
}

export async function GET() {
  const access = await requireFnsAccess();
  if (access.error) return access.error;

  const { admin } = access;
  const { data, error } = await admin.from("users").select(USER_SELECT).order("name");

  if (error) {
    return databaseErrorResponse(error.message, 500);
  }

  return NextResponse.json({ users: data || [] });
}

export async function POST(request: NextRequest) {
  const access = await requireFnsAccess();
  if (access.error) return access.error;

  const body = await request.json();
  const normalized = normalizeUserPayload(body);
  if (hasPayloadError(normalized)) {
    return databaseErrorResponse(normalized.error, 400);
  }

  const { admin } = access;
  const { data, error } = await insertUserWithCompatibleRole(admin, normalized.data);

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return databaseErrorResponse(error.message, status);
  }

  return NextResponse.json({ user: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await requireFnsAccess();
  if (access.error) return access.error;

  const body = await request.json();
  const id = normalizeRequiredString(body.id);

  if (!id) {
    return databaseErrorResponse("User id is required", 400);
  }

  const normalized = normalizeUserPayload(body);
  if (hasPayloadError(normalized)) {
    return databaseErrorResponse(normalized.error, 400);
  }

  const { admin } = access;
  const { data, error } = await updateUserWithCompatibleRole(admin, id, normalized.data);

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return databaseErrorResponse(error.message, status);
  }

  return NextResponse.json({ user: data });
}

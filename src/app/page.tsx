import { redirect } from "next/navigation";
import { createClient } from "@/supabase/server";
import { normalizeRole } from "@/lib/normalize-role";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("email", user.email?.toLowerCase() || "")
    .single();

  if (!appUser?.is_active) {
    redirect("/auth/login?error=access_denied");
  }

  if (normalizeRole(appUser.role) === "fns") {
    redirect("/fns");
  }

  redirect("/dashboard");
}

import { redirect } from "next/navigation";
import { createClient } from "@/supabase/server";
import { FnSDropdowns } from "@/app/components/fns-dropdowns";
import { normalizeRole } from "@/lib/normalize-role";

export default async function DropdownsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!appUser || normalizeRole(appUser.role) !== "fns") {
    redirect("/dashboard");
  }

  return <FnSDropdowns />;
}

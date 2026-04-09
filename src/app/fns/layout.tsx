import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";
import { FnSDashboard } from "@/app/components/fns-dashboard";
import { normalizeRole } from "@/lib/normalize-role";

export default async function FnSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", user.email?.toLowerCase() || "")
    .single();

  if (!appUser?.is_active || normalizeRole(appUser.role) !== "fns") {
    redirect("/dashboard");
  }

  return <FnSDashboard user={appUser}>{children}</FnSDashboard>;
}

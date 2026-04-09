import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { DashboardHeader } from "@/app/components/dashboard-header";
import { normalizeRole } from "@/lib/normalize-role";

export default async function DashboardLayout({
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

  if (!appUser?.is_active) {
    redirect("/auth/login?error=access_denied");
  }

  if (normalizeRole(appUser.role) === "fns") {
    redirect("/fns");
  }

  return (
    <DashboardShell>
      <DashboardHeader user={appUser} />
      {children}
    </DashboardShell>
  );
}

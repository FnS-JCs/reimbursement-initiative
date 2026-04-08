import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";
import { BillDashboard } from "@/app/components/bill-dashboard";

export default async function DashboardPage() {
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

  if (!appUser) {
    redirect("/auth/login");
  }

  return <BillDashboard userId={user.id} userRole={appUser.role} />;
}

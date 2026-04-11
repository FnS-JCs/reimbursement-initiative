"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { User } from "@/types";
import { LogOut, Menu, User as UserIcon, FileSpreadsheet, Users, RefreshCw, List, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

interface FnSDashboardProps {
  children: React.ReactNode;
  user: User;
}

export function FnSDashboard({ children, user }: FnSDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const getActiveTab = () => {
    if (pathname.includes("/submit")) return "submit";
    if (pathname.includes("/export")) return "export";
    if (pathname.includes("/users")) return "users";
    if (pathname.includes("/cycles")) return "cycles";
    if (pathname.includes("/dropdowns")) return "dropdowns";
    return "bills";
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-900/95 dark:border-gray-800">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                FnS
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">FnS Admin Portal</span>
                <span className="text-xs text-muted-foreground">Finance & Strategy</span>
              </div>
            </div>

            <Tabs value={getActiveTab()} className="hidden md:block">
              <TabsList>
                <Link href="/fns">
                  <TabsTrigger value="bills">All Bills</TabsTrigger>
                </Link>
                <Link href="/fns/submit">
                  <TabsTrigger value="submit">Add Bill</TabsTrigger>
                </Link>
                <Link href="/fns/export">
                  <TabsTrigger value="export">Export</TabsTrigger>
                </Link>
                <Link href="/fns/users">
                  <TabsTrigger value="users">Users</TabsTrigger>
                </Link>
                <Link href="/fns/cycles">
                  <TabsTrigger value="cycles">Cycles</TabsTrigger>
                </Link>
                <Link href="/fns/dropdowns">
                  <TabsTrigger value="dropdowns">Dropdowns</TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <Link href="/fns">
                  <DropdownMenuItem>All Bills</DropdownMenuItem>
                </Link>
                <Link href="/fns/submit">
                  <DropdownMenuItem>Add Bill</DropdownMenuItem>
                </Link>
                <Link href="/fns/export">
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </Link>
                <Link href="/fns/users">
                  <DropdownMenuItem>Users</DropdownMenuItem>
                </Link>
                <Link href="/fns/cycles">
                  <DropdownMenuItem>Cycles</DropdownMenuItem>
                </Link>
                <Link href="/fns/dropdowns">
                  <DropdownMenuItem>Dropdowns</DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserIcon className="h-4 w-4" />
                <span className="hidden md:inline">FnS Account</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">FnS Admin</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}

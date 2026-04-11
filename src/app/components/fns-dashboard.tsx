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
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

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
    window.location.href = "/auth/login";
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
      <header className="sticky top-0 z-40 w-full border-b bg-primary dark:bg-gray-900/95 dark:border-gray-800">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-Photoroom.png" 
                alt="SRCC Logo" 
                width={40} 
                height={40} 
                className="h-10 w-10 object-contain"
                priority
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Reimbursement Portal</span>
                <span className="text-xs text-blue-100">Finance & Strategy</span>
              </div>
            </div>

            <Tabs value={getActiveTab()} className="hidden md:block">
              <TabsList className="bg-white/10 text-white">
                <Link href="/fns">
                  <TabsTrigger value="bills" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">All Bills</TabsTrigger>
                </Link>
                <Link href="/fns/submit">
                  <TabsTrigger value="submit" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">Add Bill</TabsTrigger>
                </Link>
                <Link href="/fns/export">
                  <TabsTrigger value="export" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">Export</TabsTrigger>
                </Link>
                <Link href="/fns/users">
                  <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">Users</TabsTrigger>
                </Link>
                <Link href="/fns/cycles">
                  <TabsTrigger value="cycles" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">Cycles</TabsTrigger>
                </Link>
                <Link href="/fns/dropdowns">
                  <TabsTrigger value="dropdowns" className="data-[state=active]:bg-white data-[state=active]:text-primary text-white hover:text-white/80 transition-colors">Dropdowns</TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
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

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/20">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Account</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer dark:text-white">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}

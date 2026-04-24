"use client";

import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { User } from "@/types";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";

interface FnSDashboardProps {
  children: React.ReactNode;
  user: User;
}

export function FnSDashboard({ children, user }: FnSDashboardProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 mb-6 w-full rounded-xl border border-border bg-muted/70 shadow-sm backdrop-blur-sm dark:bg-muted/60">
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
                <span className="text-sm font-semibold text-foreground">Reimbursement Portal</span>
                <span className="text-xs text-muted-foreground">Finance & Strategy</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:bg-muted hover:text-foreground">
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

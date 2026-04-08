import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <main className={cn("container mx-auto py-6 px-4", className)}>
        {children}
      </main>
    </div>
  );
}

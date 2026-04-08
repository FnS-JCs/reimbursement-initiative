"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Role } from "@/types";
import { BillForm } from "./bill-form";
import { BillList } from "./bill-list";
import { useToast } from "@/lib/use-toast";

interface BillDashboardProps {
  userId: string;
  userRole: Role;
}

export function BillDashboard({ userId, userRole }: BillDashboardProps) {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const isSC = userRole === "SC" || userRole === "FnS";

  const handleBillSubmitted = () => {
    setRefreshKey((k) => k + 1);
    toast({
      title: "Bill submitted",
      description: "Your bill has been successfully submitted.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {userRole === "SC"
            ? "Manage your bills and reimburse JCs"
            : "Submit and track your reimbursement bills"}
        </p>
      </div>

      <Tabs defaultValue="submit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">Submit Bill</TabsTrigger>
          <TabsTrigger value="my-bills">My Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <BillForm
            userId={userId}
            userRole={userRole}
            onSuccess={handleBillSubmitted}
          />
        </TabsContent>

        <TabsContent value="my-bills" className="mt-6">
          <BillList
            userId={userId}
            userRole={userRole}
            refreshKey={refreshKey}
            isSC={isSC}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

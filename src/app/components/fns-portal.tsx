"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { FnSAllBills } from "./fns-all-bills";
import { BillDashboard } from "./bill-dashboard";
import { FnSExport } from "./fns-export";
import { FnSUsers } from "./fns-users";
import { FnSCycles } from "./fns-cycles";
import { FnSDropdowns } from "./fns-dropdowns";
import { Role } from "@/types";

interface FnSPortalProps {
  userId: string;
  userRole: Role;
}

export function FnSPortal({ userId, userRole }: FnSPortalProps) {
  const [activeTab, setActiveTab] = useState("bills");

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="bills">All Bills</TabsTrigger>
          <TabsTrigger value="submit">Add Bill</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="dropdowns">Dropdowns</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-6">
          <FnSAllBills />
        </TabsContent>

        <TabsContent value="submit" className="mt-6">
          <BillDashboard userId={userId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <FnSExport />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <FnSUsers />
        </TabsContent>

        <TabsContent value="cycles" className="mt-6">
          <FnSCycles />
        </TabsContent>

        <TabsContent value="dropdowns" className="mt-6">
          <FnSDropdowns />
        </TabsContent>
      </Tabs>
    </div>
  );
}

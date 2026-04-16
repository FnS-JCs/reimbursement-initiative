"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Bill, Role, BillFilters } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface BillListProps {
  userId: string;
  userRole: Role;
  refreshKey: number;
  isSC: boolean;
}

interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_cabinets?: { name: string; user_id: string | null };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

export function BillList({ userId, userRole, refreshKey, isSC }: BillListProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<BillFilters>({
    submitted_by_filter: "all",
    status: "all",
  });

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    billId: string | null;
    reason: string;
  }>({ open: false, billId: null, reason: "" });

  const [dropdownData, setDropdownData] = useState<{
    companies: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    scUsers: { id: string; name: string }[];
    cycles: { id: string; name: string; start_date: string; end_date: string }[];
  }>({
    companies: [],
    categories: [],
    scUsers: [],
    cycles: [],
  });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bills")
        .select(`
          *,
          users:user_id(name, email, role),
          sc_cabinets:sc_id(name, user_id),
          vendors:vendor_id(name),
          companies:company_id(name),
          categories:category_id(name),
          subcategories:subcategory_id(name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (isSC) {
        if (filters.submitted_by_filter === "myself") {
          query = query.eq("user_id", userId);
        } else if (filters.submitted_by_filter === "jcs") {
          query = query.neq("user_id", userId);
        }
      } else {
        query = query.eq("user_id", userId);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      if (filters.sc_id) {
        query = query.eq("sc_id", filters.sc_id);
      }

      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.cycle_id && filters.cycle_id !== "all") {
        const selectedCycle = dropdownData.cycles.find(c => c.id === filters.cycle_id);
        if (selectedCycle) {
          query = query.gte("date", selectedCycle.start_date);
          if (selectedCycle.end_date) {
            query = query.lte("date", selectedCycle.end_date);
          }
        }
      } else {
        if (filters.date_from) {
          query = query.gte("date", filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte("date", filters.date_to);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, isSC, filters, toast]);

  const fetchDropdownData = useCallback(async () => {
    const [companiesRes, categoriesRes, scUsersRes, cyclesRes] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("sc_cabinets").select("id, name").eq("is_active", true).order("name"),
      supabase.from("reimbursement_cycles").select("id, name, start_date, end_date").order("created_at", { ascending: false }),
    ]);

    setDropdownData({
      companies: companiesRes.data || [],
      categories: categoriesRes.data || [],
      scUsers: scUsersRes.data || [],
      cycles: cyclesRes.data || [],
    });
  }, [supabase]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    if (isSC) {
      fetchDropdownData();
    }
  }, [isSC, fetchDropdownData]);

  const handleUpdateStatus = async (billId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("bills")
        .update({ status })
        .eq("id", billId);

      if (error) throw error;

      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: status as Bill["status"] } : b))
      );

      toast({
        title: "Status updated",
        description: `Bill marked as ${status.replace('_', ' ')}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  const pendingAmount = bills
    .filter((b) => b.status === "pending" || b.status === "physical_received")
    .reduce((sum, b) => sum + b.amount, 0);

  const reimbursedAmount = bills
    .filter((b) => b.status === "reimbursed")
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
            <p className="text-sm text-muted-foreground">Pending Reimbursement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursedAmount)}</div>
            <p className="text-sm text-muted-foreground">Reimbursed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-sm text-muted-foreground">Grand Total</p>
          </CardContent>
        </Card>
      </div>

      {isSC && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Filter bills by various criteria</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({ submitted_by_filter: "all", status: "all" })}
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Submitted By</Label>
                <Select
                  value={filters.submitted_by_filter}
                  onValueChange={(v) =>
                    setFilters({ ...filters, submitted_by_filter: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bills</SelectItem>
                    <SelectItem value="myself">My Bills</SelectItem>
                    <SelectItem value="jcs">JC Bills</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cycle</Label>
                <Select
                  value={filters.cycle_id || "all"}
                  onValueChange={(v) =>
                    setFilters({ 
                      ...filters, 
                      cycle_id: v === "all" ? undefined : v,
                      date_from: undefined,
                      date_to: undefined
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Cycles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cycles</SelectItem>
                    {dropdownData.cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => 
                    setFilters({ 
                      ...filters, 
                      date_from: e.target.value || undefined,
                      cycle_id: undefined
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => 
                    setFilters({ 
                      ...filters, 
                      date_to: e.target.value || undefined,
                      cycle_id: undefined
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, status: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="physical_received">Received</SelectItem>
                    <SelectItem value="reimbursed">Reimbursed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No bills found</h3>
              <p className="text-muted-foreground">
                {isSC ? "No bills match your filters" : "You haven't submitted any bills yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              userId={userId}
              isSC={isSC}
              onUpdateStatus={handleUpdateStatus}
              onReject={(id) =>
                setRejectDialog({ open: true, billId: id, reason: "" })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

interface BillCardProps {
  bill: BillWithRelations;
  userId: string;
  isSC: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onReject: (id: string) => void;
}

function BillCard({ bill, userId, isSC, onUpdateStatus, onReject }: BillCardProps) {
  const isSubmitter = bill.user_id === userId;
  const isAssignedSC = bill.sc_cabinets?.user_id === userId;
  const canTakeAction = isSC && !isSubmitter && isAssignedSC;
  const isRejected = bill.status === "rejected";

  const statusConfig = {
    pending: { label: "Pending", color: "text-yellow-600", icon: Clock },
    physical_received: { label: "Received", color: "text-blue-600", icon: CheckCircle2 },
    reimbursed: { label: "Reimbursed", color: "text-green-600", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "text-red-600", icon: XCircle },
  };

  const status = statusConfig[bill.status];

  return (
    <Card className={cn(isRejected && "border-destructive/50")}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{bill.vendors?.name || "Unknown Vendor"}</h3>
              <Badge variant="secondary">{bill.companies?.name || "General"}</Badge>
              {isRejected && (
                <Badge variant="destructive">Rejected</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>Date: {formatDate(bill.date)}</span>
              <span>Bill #: {bill.bill_number}</span>
              <span>
                {bill.categories?.name} / {bill.subcategories?.name}
              </span>
              {bill.process_type && (
                <span>Process: {bill.process_type}</span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Submitted by: {bill.submitted_by_role === "fns" ? "FnS" : (bill.users?.name || "Unknown")}
            </p>
            {bill.sc_cabinets?.name && (
              <p className="text-sm text-muted-foreground">
                SC/Cabinet: {bill.sc_cabinets.name}
              </p>
            )}

            {bill.file_url && (
              <a
                href={bill.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View Bill
              </a>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xl font-bold">{formatCurrency(bill.amount)}</div>

            <div className="flex items-center gap-1">
              {React.createElement(status.icon, { className: cn("h-4 w-4", status.color) })}
              <span className={cn("text-sm", status.color)}>{status.label}</span>
            </div>

            {canTakeAction && !isRejected && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {bill.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(bill.id, "physical_received")}
                  >
                    Mark Received
                  </Button>
                )}
                {bill.status === "physical_received" && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(bill.id, "reimbursed")}
                  >
                    Mark Reimbursed
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(bill.id)}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from "react";

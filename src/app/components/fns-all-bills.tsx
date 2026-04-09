"use client";

import { useState, useEffect, useCallback } from "react";
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
  FileText,
  Edit,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_cabinets?: { name: string };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

export function FnSAllBills() {
  const supabase = createClient();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<BillFilters>({});

  const [dropdownData, setDropdownData] = useState<{
    companies: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    scUsers: { id: string; name: string }[];
    cycles: { id: string; name: string }[];
  }>({
    companies: [],
    categories: [],
    scUsers: [],
    cycles: [],
  });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    bill: BillWithRelations | null;
  }>({ open: false, bill: null });

  const [editForm, setEditForm] = useState({
    status: "pending" as Bill["status"],
    amount: "",
  });

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bills")
        .select(`
          *,
          users:user_id(name, email, role),
          sc_cabinets:sc_id(name),
          vendors:vendor_id(name),
          companies:company_id(name),
          categories:category_id(name),
          subcategories:subcategory_id(name)
        `)
        .order("created_at", { ascending: false });

      if (filters.sc_id) {
        query = query.eq("sc_id", filters.sc_id);
      }

      if (filters.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
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
  }, [supabase, filters, toast]);

  const fetchDropdownData = useCallback(async () => {
    const [companiesRes, categoriesRes, scUsersRes, cyclesRes] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("users").select("id, name").eq("role", "sc").order("name"),
      supabase.from("reimbursement_cycles").select("id, name").order("created_at", { ascending: false }),
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
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleEdit = (bill: BillWithRelations) => {
    setEditForm({
      status: bill.status,
      amount: bill.amount.toString(),
    });
    setEditDialog({ open: true, bill });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.bill) return;

    try {
      const { error } = await supabase
        .from("bills")
        .update({
          status: editForm.status,
          amount: parseFloat(editForm.amount),
        })
        .eq("id", editDialog.bill.id);

      if (error) throw error;

      toast({
        title: "Bill updated",
        description: "The bill has been updated successfully",
      });

      setEditDialog({ open: false, bill: null });
      fetchBills();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (billId: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;

    try {
      const { error } = await supabase.from("bills").delete().eq("id", billId);

      if (error) throw error;

      toast({
        title: "Bill deleted",
        description: "The bill has been deleted successfully",
      });

      fetchBills();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  const statusConfig = {
    pending: { label: "Pending", color: "text-yellow-600", icon: XCircle },
    physical_received: { label: "Received", color: "text-blue-600", icon: CheckCircle2 },
    reimbursed: { label: "Reimbursed", color: "text-green-600", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "text-red-600", icon: XCircle },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Bills</h1>
        <p className="text-muted-foreground">
          View and manage all bills across all SCs and JCs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{bills.length}</div>
            <p className="text-sm text-muted-foreground">Total Bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {bills.filter((b) => b.status === "reimbursed").length}
            </div>
            <p className="text-sm text-muted-foreground">Reimbursed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter bills by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>SC</Label>
              <Select
                value={filters.sc_id || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, sc_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SCs</SelectItem>
                  {dropdownData.scUsers.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={filters.company_id || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, company_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {dropdownData.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, status: v === "all" ? undefined : v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="physical_received">Physical Received</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category_id || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, category_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {dropdownData.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-muted-foreground">No bills match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Submitted By</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">SC</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const status = statusConfig[bill.status];
                  return (
                    <tr key={bill.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{formatDate(bill.date)}</td>
                      <td className="px-4 py-3">{bill.users?.name}</td>
                      <td className="px-4 py-3">
                        <div>{bill.vendors?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          #{bill.bill_number}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {bill.companies?.name || <Badge variant="secondary">General</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{bill.categories?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill.subcategories?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{bill.sc_cabinets?.name || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(bill.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            bill.status === "reimbursed"
                              ? "success"
                              : bill.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(bill)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(bill.id)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                          {bill.file_url && (
                            <a href={bill.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, bill: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>
              Make changes to the bill status or amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v as Bill["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="physical_received">Physical Received</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (INR)</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, bill: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

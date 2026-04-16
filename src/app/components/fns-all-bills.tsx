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
  FileText,
  Edit,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";

interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_cabinets?: { name: string };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

interface FnSAllBillsProps {
  refreshKey?: number;
}

export function FnSAllBills({ refreshKey = 0 }: FnSAllBillsProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<BillFilters>({});

  const [dropdownData, setDropdownData] = useState<{
    companies: { id: string; name: string }[];
    vendors: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    subCategories: { id: string; name: string }[];
    categorySubCategories: { category_id: string; subcategory_id: string }[];
    scUsers: { id: string; name: string }[];
    cycles: { id: string; name: string; start_date: string; end_date: string }[];
  }>({
    companies: [],
    vendors: [],
    categories: [],
    subCategories: [],
    categorySubCategories: [],
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
    vendor_id: "",
    category_id: "",
    subcategory_id: "",
    bill_number: "",
    date: "",
    company_id: "" as string | null,
  });

  const [filteredSubCategories, setFilteredSubCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
     if (editForm.category_id) {
       const subCatIds = dropdownData.categorySubCategories
         .filter((cs) => cs.category_id === editForm.category_id)
         .map((cs) => cs.subcategory_id);
       const filtered = dropdownData.subCategories.filter((sc) => subCatIds.includes(sc.id));
       setFilteredSubCategories(filtered);
     } else {
       setFilteredSubCategories([]);
     }
   }, [editForm.category_id, dropdownData.categorySubCategories, dropdownData.subCategories]);

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
        .or(`rejected_by_role.is.null,rejected_by_role.eq.fns`)
        .order("date", { ascending: false })
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
  }, [supabase, filters, toast]);

  const fetchDropdownData = useCallback(async () => {
    const [
      companiesRes, 
      vendorsRes, 
      categoriesRes, 
      subCategoriesRes,
      categorySubCategoriesRes,
      scUsersRes, 
      cyclesRes
    ] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("vendors").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("subcategories").select("id, name").order("name"),
      supabase.from("category_subcategories").select("category_id, subcategory_id"),
      supabase.from("sc_cabinets").select("id, name").eq("is_active", true).order("name"),
      supabase.from("reimbursement_cycles").select("id, name, start_date, end_date").order("created_at", { ascending: false }),
    ]);

    setDropdownData({
      companies: companiesRes.data || [],
      vendors: vendorsRes.data || [],
      categories: categoriesRes.data || [],
      subCategories: subCategoriesRes.data || [],
      categorySubCategories: categorySubCategoriesRes.data || [],
      scUsers: scUsersRes.data || [],
      cycles: cyclesRes.data || [],
    });
  }, [supabase]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills, refreshKey]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleEdit = (bill: BillWithRelations) => {
    setEditForm({
      status: bill.status,
      amount: bill.amount.toString(),
      vendor_id: bill.vendor_id,
      category_id: bill.category_id,
      subcategory_id: bill.subcategory_id,
      bill_number: bill.bill_number,
      date: bill.date,
      company_id: bill.company_id,
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
          vendor_id: editForm.vendor_id,
          category_id: editForm.category_id,
          subcategory_id: editForm.subcategory_id,
          bill_number: editForm.bill_number,
          date: editForm.date,
          company_id: editForm.company_id || null,
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

  const handleReject = async (bill: BillWithRelations) => {
    if (!confirm("Are you sure you want to reject this bill?")) return;

    try {
      const { error } = await supabase
        .from("bills")
        .update({ 
          status: "rejected",
          rejected_by_role: "fns"
        })
        .eq("id", bill.id);

      if (error) throw error;

      toast({
        title: "Bill rejected",
        description: "The bill has been rejected successfully",
      });

      fetchBills();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reject bill",
        variant: "destructive",
      });
    }
  };

  const handleUndoReject = async (bill: BillWithRelations) => {
    try {
      const { error } = await supabase
        .from("bills")
        .update({ 
          status: "pending",
          rejected_by_role: null
        })
        .eq("id", bill.id);

      if (error) throw error;

      toast({
        title: "Rejection undone",
        description: "The bill status has been reset to pending",
      });

      fetchBills();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to undo rejection",
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
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 bg-muted/50 p-4 rounded-lg">
            <div className="space-y-2">
              <Label>SC Cabinet</Label>
              <Select
                value={filters.sc_id || "all"}
                onValueChange={(v) => setFilters({ ...filters, sc_id: v === "all" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cabinets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cabinets</SelectItem>
                  {dropdownData.scUsers.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
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
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-foreground">
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
              <tbody className="text-foreground">
                {bills.map((bill) => {
                  const status = statusConfig[bill.status];
                  return (
                    <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">{formatDate(bill.date)}</td>
                      <td className="px-4 py-3">
                        {bill.submitted_by_role === "fns" ? "FnS" : bill.users?.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-primary">{bill.vendors?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          #{bill.bill_number}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {bill.companies?.name || <Badge variant="secondary">General</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-primary">{bill.categories?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bill.subcategories?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{bill.sc_cabinets?.name || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-primary">
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
                        <TooltipProvider>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEdit(bill)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit bill details</p>
                              </TooltipContent>
                            </Tooltip>

                            {bill.status === "rejected" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleUndoReject(bill)}
                                  >
                                    <RotateCcw className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Undo rejection</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleReject(bill)}
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reject bill</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {bill.file_url && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={bill.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View drive link</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Bill Details</DialogTitle>
            <DialogDescription>
              Modify the bill information as required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select
                  value={editForm.vendor_id}
                  onValueChange={(v) => setEditForm({ ...editForm, vendor_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bill Number</Label>
                <Input
                  value={editForm.bill_number}
                  onChange={(e) => setEditForm({ ...editForm, bill_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.category_id}
                  onValueChange={(v) => setEditForm({ ...editForm, category_id: v, subcategory_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub-Category</Label>
                <Select
                  value={editForm.subcategory_id}
                  onValueChange={(v) => setEditForm({ ...editForm, subcategory_id: v })}
                  disabled={!editForm.category_id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubCategories.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company (Optional)</Label>
                <Select
                  value={editForm.company_id || "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, company_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General (No Company)</SelectItem>
                    {dropdownData.companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
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
import { Textarea } from "@/ui/textarea";
import { Bill, Role, BillFilters, BillComment } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import {
  FileText,
  Edit,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  ChevronDown,
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
  fns_comment?: BillComment | null;
  sc_rejection_comment?: BillComment | null;
}

interface FnSAllBillsProps {
  refreshKey?: number;
}

interface MultiSelectFilterProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

function MultiSelectFilter({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: MultiSelectFilterProps) {
  const summary = useMemo(() => {
    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (selectedValues.length === 1) {
      return options.find((option) => option.value === selectedValues[0])?.label ?? placeholder;
    }

    return `${selectedValues.length} selected`;
  }, [options, placeholder, selectedValues]);

  const toggleValue = (value: string) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value]
    );
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{summary}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span>{label}</span>
            {selectedValues.length > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => toggleValue(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FnSAllBills({ refreshKey = 0 }: FnSAllBillsProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");

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

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    bill: BillWithRelations | null;
    comment: string;
  }>({ open: false, bill: null, comment: "" });

  const [editForm, setEditForm] = useState({
    status: "pending" as Bill["status"],
    amount: "",
    vendor_id: "",
    category_id: "",
    subcategory_id: "",
    bill_number: "",
    date: "",
    company_id: "" as string | null,
    fns_comment: "",
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
        .order("date", { ascending: dateSort === "asc" })
        .order("created_at", { ascending: dateSort === "asc" });

      if (filters.sc_ids && filters.sc_ids.length > 0) {
        query = query.in("sc_id", filters.sc_ids);
      } else if (filters.sc_id) {
        query = query.eq("sc_id", filters.sc_id);
      }

      if (filters.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in("status", filters.statuses);
      } else if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.cycle_ids && filters.cycle_ids.length > 0) {
        // Cycle ranges may overlap, so we apply them client-side after fetching.
      } else if (filters.cycle_id && filters.cycle_id !== "all") {
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

      let fetchedBills = data || [];

      if (filters.cycle_ids && filters.cycle_ids.length > 0) {
        const selectedCycles = dropdownData.cycles.filter((cycle) => filters.cycle_ids?.includes(cycle.id));
        fetchedBills = fetchedBills.filter((bill) =>
          selectedCycles.some((cycle) => {
            const startsInRange = bill.date >= cycle.start_date;
            const endsInRange = cycle.end_date ? bill.date <= cycle.end_date : true;
            return startsInRange && endsInRange;
          })
        );
      }

      const billIds = fetchedBills.map((bill) => bill.id);
      let commentsByBill = new Map<string, { fns?: BillComment; sc?: BillComment }>();

      if (billIds.length > 0) {
        const { data: comments, error: commentsError } = await supabase
          .from("bill_comments")
          .select("id, bill_id, author_role, body, created_at, updated_at")
          .in("bill_id", billIds)
          .order("created_at", { ascending: false });

        if (commentsError) throw commentsError;

        commentsByBill = (comments || []).reduce((map, comment) => {
          const typedComment = comment as BillComment;
          const current = map.get(typedComment.bill_id) || {};
          if (typedComment.author_role === "fns" && !current.fns) {
            current.fns = typedComment;
          }
          if (typedComment.author_role === "sc" && !current.sc) {
            current.sc = typedComment;
          }
          map.set(typedComment.bill_id, current);
          return map;
        }, new Map<string, { fns?: BillComment; sc?: BillComment }>());
      }

      setBills(
        fetchedBills.map((bill) => {
          const comments = commentsByBill.get(bill.id);
          return {
            ...bill,
            fns_comment: comments?.fns || null,
            sc_rejection_comment: comments?.sc || null,
          };
        })
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, filters, dateSort, toast, dropdownData.cycles]);

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
      fns_comment: bill.fns_comment?.body || "",
    });
    setEditDialog({ open: true, bill });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.bill) return;

    try {
      const nextStatus = editForm.status;
      const nextRejectedByRole =
        nextStatus === "rejected"
          ? editDialog.bill.status === "rejected"
            ? editDialog.bill.rejected_by_role || "fns"
            : "fns"
          : null;
      const { error } = await supabase
        .from("bills")
        .update({
          status: nextStatus,
          rejected_by_role: nextRejectedByRole,
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

      const trimmedComment = editForm.fns_comment.trim();
      if (trimmedComment) {
        const { error: commentError } = await supabase
          .from("bill_comments")
          .upsert(
            {
              bill_id: editDialog.bill.id,
              author_role: "fns",
              body: trimmedComment,
            },
            { onConflict: "bill_id,author_role" }
          );

        if (commentError) throw commentError;
      }

      toast({
        title: "Bill updated",
        description: "The bill has been updated successfully",
      });

      setEditDialog({ open: false, bill: null });
      fetchBills();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update bill",
        variant: "destructive",
      });
    }
  };

  const openRejectDialog = (bill: BillWithRelations) => {
    setRejectDialog({
      open: true,
      bill,
      comment: bill.fns_comment?.body || "",
    });
  };

  const handleReject = async () => {
    if (!rejectDialog.bill) return;

    const trimmedComment = rejectDialog.comment.trim();
    if (!trimmedComment) {
      toast({
        title: "Comment required",
        description: "Add a comment before rejecting this bill.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("bills")
        .update({ 
          status: "rejected",
          rejected_by_role: "fns"
        })
        .eq("id", rejectDialog.bill.id);

      if (error) throw error;

      const { error: commentError } = await supabase
        .from("bill_comments")
        .upsert(
          {
            bill_id: rejectDialog.bill.id,
            author_role: "fns",
            body: trimmedComment,
          },
          { onConflict: "bill_id,author_role" }
        );

      if (commentError) throw commentError;

      toast({
        title: "Bill rejected",
        description: "The bill has been rejected successfully",
      });

      setRejectDialog({ open: false, bill: null, comment: "" });
      fetchBills();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject bill";
      toast({
        title: "Error",
        description: message,
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to undo rejection";
      toast({
        title: "Error",
        description: message,
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

  const getStatusLabel = (bill: BillWithRelations) => {
    if (bill.status !== "rejected") {
      return statusConfig[bill.status].label;
    }

    if (bill.rejected_by_role === "fns") {
      return "Rejected by FnS";
    }

    if (bill.rejected_by_role === "sc") {
      return "Rejected by SC";
    }

    return "Rejected";
  };

  const scFilterOptions = useMemo(
    () => dropdownData.scUsers.map((sc) => ({ value: sc.id, label: sc.name })),
    [dropdownData.scUsers]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "pending", label: "Pending" },
      { value: "physical_received", label: "Received" },
      { value: "reimbursed", label: "Reimbursed" },
      { value: "rejected", label: "Rejected" },
    ],
    []
  );

  const cycleFilterOptions = useMemo(
    () => dropdownData.cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
    [dropdownData.cycles]
  );

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
            <MultiSelectFilter
              label="SC Cabinet"
              placeholder="All Cabinets"
              options={scFilterOptions}
              selectedValues={filters.sc_ids || []}
              onChange={(values) =>
                setFilters({
                  ...filters,
                  sc_ids: values.length > 0 ? values : undefined,
                  sc_id: undefined,
                })
              }
            />

            <MultiSelectFilter
              label="Status"
              placeholder="All Status"
              options={statusFilterOptions}
              selectedValues={filters.statuses || []}
              onChange={(values) =>
                setFilters({
                  ...filters,
                  statuses: values.length > 0 ? (values as Bill["status"][]) : undefined,
                  status: undefined,
                })
              }
            />

            <MultiSelectFilter
              label="Cycle"
              placeholder="All Cycles"
              options={cycleFilterOptions}
              selectedValues={filters.cycle_ids || []}
              onChange={(values) =>
                setFilters({
                  ...filters,
                  cycle_ids: values.length > 0 ? values : undefined,
                  cycle_id: undefined,
                  date_from: undefined,
                  date_to: undefined,
                })
              }
            />

            <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={filters.date_from || ""}
            onChange={(e) => 
              setFilters({ 
                ...filters, 
                date_from: e.target.value || undefined,
                cycle_id: undefined,
                cycle_ids: undefined
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
                cycle_id: undefined,
                cycle_ids: undefined
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
                  <th className="px-4 py-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => setDateSort((current) => (current === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-2 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`Sort by date ${dateSort === "desc" ? "oldest first" : "newest first"}`}
                    >
                      Date
                      {dateSort === "desc" ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUp className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </th>
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
                          {getStatusLabel(bill)}
                        </Badge>
                        {bill.rejected_by_role === "fns" && bill.fns_comment && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            FnS: {bill.fns_comment.body}
                          </p>
                        )}
                        {bill.rejected_by_role === "sc" && bill.sc_rejection_comment && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            SC: {bill.sc_rejection_comment.body}
                          </p>
                        )}
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
                                    onClick={() => openRejectDialog(bill)}
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

            <div className="space-y-2">
              <Label>FnS Comment</Label>
              <Textarea
                value={editForm.fns_comment}
                onChange={(e) => setEditForm({ ...editForm, fns_comment: e.target.value })}
                placeholder="Add a note visible to the relevant SC when this bill is rejected by FnS"
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

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog({ open, bill: open ? rejectDialog.bill : null, comment: open ? rejectDialog.comment : "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bill</DialogTitle>
            <DialogDescription>
              Add a comment for the relevant SC before rejecting this bill.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>FnS Comment</Label>
            <Textarea
              value={rejectDialog.comment}
              onChange={(e) => setRejectDialog({ ...rejectDialog, comment: e.target.value })}
              placeholder="Explain why this bill is being rejected"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, bill: null, comment: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

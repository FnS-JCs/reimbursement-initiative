"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
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
import { Bill, Role, BillFilters, BillComment, BillViewStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { DriveLinkPreview } from "./drive-link-preview";
import { MultiSelectFilter } from "./multi-select-filter";
import { getVisibleBillStatus } from "@/lib/bill-workflow";
import {
  FileText,
  Edit,
  Loader2,
  XCircle,
  RotateCcw,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
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

export function FnSAllBills({ refreshKey = 0 }: FnSAllBillsProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const dateFromInputRef = useRef<HTMLInputElement | null>(null);
  const dateToInputRef = useRef<HTMLInputElement | null>(null);

  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" }>({
    column: "date",
    direction: "desc",
  });

  const [filters, setFilters] = useState<BillFilters>({});

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current as HTMLInputElement & { showPicker?: () => void } | null;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  const updateFilters = useCallback(
    (updater: (prev: BillFilters) => BillFilters) => {
      startTransition(() => {
        setFilters(updater);
      });
    },
    [startTransition]
  );

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

  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [bulkRejectDialog, setBulkRejectDialog] = useState<{ open: boolean; comment: string }>({
    open: false,
    comment: "",
  });

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

  useEffect(() => {
    if (!editDialog.open || !editDialog.bill) return;

    const bill = editDialog.bill;
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
  }, [editDialog.open, editDialog.bill]);

  // Ref so fetchBills can read the latest cycles without re-running on every dropdown load
  const cyclesRef = useRef(dropdownData.cycles);
  useEffect(() => { cyclesRef.current = dropdownData.cycles; }, [dropdownData.cycles]);

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
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.sc_ids && filters.sc_ids.length > 0) {
        query = query.in("sc_id", filters.sc_ids);
      } else if (filters.sc_id) {
        query = query.eq("sc_id", filters.sc_id);
      }

      if (filters.vendor_ids && filters.vendor_ids.length > 0) {
        query = query.in("vendor_id", filters.vendor_ids);
      }

      if (filters.company_ids && filters.company_ids.length > 0) {
        query = query.in("company_id", filters.company_ids);
      } else if (filters.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      if (filters.category_ids && filters.category_ids.length > 0) {
        query = query.in("category_id", filters.category_ids);
      } else if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.subcategory_ids && filters.subcategory_ids.length > 0) {
        query = query.in("subcategory_id", filters.subcategory_ids);
      }

      if (filters.cycle_ids && filters.cycle_ids.length > 0) {
        // Cycle ranges may overlap — applied client-side after fetching.
      } else if (filters.cycle_id && filters.cycle_id !== "all") {
        const selectedCycle = cyclesRef.current.find((c) => c.id === filters.cycle_id);
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
        const selectedCycles = cyclesRef.current.filter((cycle) =>
          filters.cycle_ids?.includes(cycle.id)
        );
        fetchedBills = fetchedBills.filter((bill) =>
          selectedCycles.some((cycle) => {
            const startsInRange = bill.date >= cycle.start_date;
            const endsInRange = cycle.end_date ? bill.date <= cycle.end_date : true;
            return startsInRange && endsInRange;
          })
        );
      }

      const selectedStatuses = filters.statuses && filters.statuses.length > 0
        ? filters.statuses
        : filters.status && filters.status !== "all"
          ? [filters.status]
          : [];

      if (selectedStatuses.length > 0) {
        fetchedBills = fetchedBills.filter((bill) =>
          selectedStatuses.includes(getVisibleBillStatus(bill, "fns"))
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
  }, [supabase, filters, toast]);

  const fetchDropdownData = useCallback(async () => {
    const [
      companiesRes,
      vendorsRes,
      categoriesRes,
      subCategoriesRes,
      categorySubCategoriesRes,
      scUsersRes,
      cyclesRes,
    ] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("vendors").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("subcategories").select("id, name").order("name"),
      supabase.from("category_subcategories").select("category_id, subcategory_id"),
      supabase.from("sc_cabinets").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("reimbursement_cycles")
        .select("id, name, start_date, end_date")
        .order("created_at", { ascending: false }),
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
    setSelectedBillIds([]);
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleEdit = (bill: BillWithRelations) => {
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
          rejected_by_role: "fns",
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
          rejected_by_role: null,
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

  const handleMarkReimbursed = async (bill: BillWithRelations) => {
    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: "reimbursed", rejected_by_role: null })
        .eq("id", bill.id);

      if (error) throw error;

      toast({
        title: "Bill reimbursed",
        description: "Marked as reimbursed",
      });

      fetchBills();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark bill as reimbursed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const canMarkReimbursed = (bill: BillWithRelations) =>
    bill.status === "pending";

  const handleBulkMarkReimbursed = async () => {
    const targetBills = bills.filter(
      (bill) => selectedBillIds.includes(bill.id) && canMarkReimbursed(bill)
    );

    if (targetBills.length === 0) return;

    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: "reimbursed", rejected_by_role: null })
        .in("id", targetBills.map((bill) => bill.id));

      if (error) throw error;

      setBills((prev) =>
        prev.map((bill) =>
          targetBills.some((target) => target.id === bill.id)
            ? { ...bill, status: "reimbursed", rejected_by_role: null }
            : bill
        )
      );
      setSelectedBillIds([]);

      toast({
        title: "Bills reimbursed",
        description: `${targetBills.length} bill${targetBills.length === 1 ? "" : "s"} marked as reimbursed`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark bills as reimbursed";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleBulkReject = async () => {
    const comment = bulkRejectDialog.comment.trim();
    if (!comment) {
      toast({
        title: "Comment required",
        description: "Add a reason before rejecting the selected bills.",
        variant: "destructive",
      });
      return;
    }

    const targetBills = bills.filter((bill) => selectedBillIds.includes(bill.id) && bill.status !== "rejected");
    if (targetBills.length === 0) return;

    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: "rejected", rejected_by_role: "fns" })
        .in("id", targetBills.map((bill) => bill.id));

      if (error) throw error;

      await Promise.all(
        targetBills.map((bill) =>
          supabase.from("bill_comments").upsert(
            { bill_id: bill.id, author_role: "fns", body: comment },
            { onConflict: "bill_id,author_role" }
          )
        )
      );

      setBills((prev) =>
        prev.map((bill) =>
          targetBills.some((target) => target.id === bill.id)
            ? { ...bill, status: "rejected", rejected_by_role: "fns" }
            : bill
        )
      );
      setSelectedBillIds([]);
      setBulkRejectDialog({ open: false, comment: "" });

      toast({
        title: "Bills rejected",
        description: `${targetBills.length} bill${targetBills.length === 1 ? "" : "s"} rejected successfully`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject selected bills";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  // ── Derived totals ──────────────────────────────────────────────────────────

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills
    .filter((b) => getVisibleBillStatus(b, "fns") === "pending")
    .reduce((sum, b) => sum + b.amount, 0);
  const reimbursedAmount = bills
    .filter((b) => getVisibleBillStatus(b, "fns") === "reimbursed")
    .reduce((sum, b) => sum + b.amount, 0);

  // ── Status helpers ──────────────────────────────────────────────────────────

  const statusConfig = {
    pending: { label: "Pending", className: "text-muted-foreground" },
    reimbursed: { label: "Reimbursed", className: "text-green-600" },
    rejected: { label: "Rejected", className: "text-destructive" },
  } satisfies Record<Exclude<BillViewStatus, "paid">, { label: string; className: string }>;

  const getStatusLabel = (bill: BillWithRelations) => {
    const visibleStatus = getVisibleBillStatus(bill, "fns");
    const displayStatus = visibleStatus === "paid" ? "pending" : visibleStatus;
    if (displayStatus !== "rejected") return statusConfig[displayStatus].label;
    if (bill.rejected_by_role === "fns") return "Rejected by FnS";
    if (bill.rejected_by_role === "sc") return "Rejected by SC";
    return "Rejected";
  };

  const getStatusClassName = (bill: BillWithRelations) => {
    const visibleStatus = getVisibleBillStatus(bill, "fns");
    const displayStatus = visibleStatus === "paid" ? "pending" : visibleStatus;
    return displayStatus !== "rejected"
      ? statusConfig[displayStatus].className
      : "text-destructive";
  };

  const statusFilterOptions = useMemo(
    () => [
      { value: "pending", label: "Pending" },
      { value: "reimbursed", label: "Reimbursed" },
      { value: "rejected", label: "Rejected" },
    ],
    []
  );

  // ── Client-side sorting ─────────────────────────────────────────────────────

  const sortedBills = useMemo(() => {
    const sorted = [...bills];
    sorted.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      switch (sort.column) {
        case "date":
          return dir * a.date.localeCompare(b.date);
        case "submitted_by":
          return dir * (a.users?.name ?? "").localeCompare(b.users?.name ?? "");
        case "vendor":
          return dir * (a.vendors?.name ?? "").localeCompare(b.vendors?.name ?? "");
        case "company":
          return dir * (a.companies?.name ?? "").localeCompare(b.companies?.name ?? "");
        case "category":
          return dir * (a.categories?.name ?? "").localeCompare(b.categories?.name ?? "");
        case "sc":
          return dir * (a.sc_cabinets?.name ?? "").localeCompare(b.sc_cabinets?.name ?? "");
        case "amount":
          return dir * (a.amount - b.amount);
        case "status":
          return dir * getVisibleBillStatus(a, "fns").localeCompare(getVisibleBillStatus(b, "fns"));
        default:
          return 0;
      }
    });
    return sorted;
  }, [bills, sort]);

  const toggleSort = (column: string) =>
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );

  const renderSortHeader = (column: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="inline-flex items-center gap-1.5 rounded-sm text-left font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {label}
      {sort.column === column ? (
        sort.direction === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUp className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );

  // ── Filter option memos ─────────────────────────────────────────────────────

  const scFilterOptions = useMemo(
    () => dropdownData.scUsers.map((sc) => ({ value: sc.id, label: sc.name })),
    [dropdownData.scUsers]
  );

  const cycleFilterOptions = useMemo(
    () => dropdownData.cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
    [dropdownData.cycles]
  );

  const vendorFilterOptions = useMemo(
    () => dropdownData.vendors.map((v) => ({ value: v.id, label: v.name })),
    [dropdownData.vendors]
  );

  const companyFilterOptions = useMemo(
    () => dropdownData.companies.map((c) => ({ value: c.id, label: c.name })),
    [dropdownData.companies]
  );

  const categoryFilterOptions = useMemo(
    () => dropdownData.categories.map((c) => ({ value: c.id, label: c.name })),
    [dropdownData.categories]
  );

  const subcategoryFilterOptions = useMemo(() => {
    const selectedCategoryIds = filters.category_ids;
    if (!selectedCategoryIds || selectedCategoryIds.length === 0) {
      return dropdownData.subCategories.map((sc) => ({ value: sc.id, label: sc.name }));
    }
    const validIds = dropdownData.categorySubCategories
      .filter((cs) => selectedCategoryIds.includes(cs.category_id))
      .map((cs) => cs.subcategory_id);
    return dropdownData.subCategories
      .filter((sc) => validIds.includes(sc.id))
      .map((sc) => ({ value: sc.id, label: sc.name }));
  }, [dropdownData.subCategories, dropdownData.categorySubCategories, filters.category_ids]);

  // ── Render ──────────────────────────────────────────────────────────────────

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
            <p className="text-sm text-muted-foreground">Pending</p>
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
            <Button variant="outline" size="sm" onClick={() => updateFilters(() => ({}))}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-muted/50 p-4 rounded-lg">
            <MultiSelectFilter
              label="SC Cabinet"
              placeholder="All Cabinets"
              options={scFilterOptions}
              selectedValues={filters.sc_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  sc_ids: values.length > 0 ? values : undefined,
                  sc_id: undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Status"
              placeholder="All Statuses"
              options={statusFilterOptions}
              selectedValues={filters.statuses || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  statuses: values.length > 0 ? (values as BillViewStatus[]) : undefined,
                  status: undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Cycle"
              placeholder="All Cycles"
              options={cycleFilterOptions}
              selectedValues={filters.cycle_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  cycle_ids: values.length > 0 ? values : undefined,
                  cycle_id: undefined,
                  date_from: undefined,
                  date_to: undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Vendors"
              placeholder="All Vendors"
              options={vendorFilterOptions}
              selectedValues={filters.vendor_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  vendor_ids: values.length > 0 ? values : undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Companies"
              placeholder="All Companies"
              options={companyFilterOptions}
              selectedValues={filters.company_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  company_ids: values.length > 0 ? values : undefined,
                  company_id: undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Categories"
              placeholder="All Categories"
              options={categoryFilterOptions}
              selectedValues={filters.category_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  category_ids: values.length > 0 ? values : undefined,
                  category_id: undefined,
                  subcategory_ids: undefined,
                }))
              }
            />
            <MultiSelectFilter
              label="Subcategories"
              placeholder="All Subcategories"
              options={subcategoryFilterOptions}
              selectedValues={filters.subcategory_ids || []}
              onChange={(values) =>
                updateFilters((prev) => ({
                  ...prev,
                  subcategory_ids: values.length > 0 ? values : undefined,
                }))
              }
            />
            <div className="space-y-2">
              <Label>From Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={dateFromInputRef}
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) =>
                    updateFilters((prev) => ({
                      ...prev,
                      date_from: e.target.value || undefined,
                      cycle_id: undefined,
                      cycle_ids: undefined,
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => openDatePicker(dateFromInputRef)}
                  aria-label="Open from-date calendar"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={dateToInputRef}
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) =>
                    updateFilters((prev) => ({
                      ...prev,
                      date_to: e.target.value || undefined,
                      cycle_id: undefined,
                      cycle_ids: undefined,
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => openDatePicker(dateToInputRef)}
                  aria-label="Open to-date calendar"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedBills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No bills found</h3>
              <p className="text-muted-foreground">No bills match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedBillIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/60 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {selectedBillIds.length} bill{selectedBillIds.length === 1 ? "" : "s"} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleBulkMarkReimbursed}>
                    Reimburse
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => setBulkRejectDialog({ open: true, comment: "" })}>
                    Reject Selected
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSelectedBillIds([])}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left w-12"><span className="sr-only">Select</span></th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("date", "Date")}</th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("submitted_by", "Submitted By")}</th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("vendor", "Vendor")}</th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("company", "Company")}</th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("category", "Category")}</th>
                  <th className="px-4 py-3 text-left">{renderSortHeader("sc", "SC")}</th>
                  <th className="px-4 py-3 text-right">{renderSortHeader("amount", "Amount")}</th>
                  <th className="px-4 py-3 text-center">{renderSortHeader("status", "Status")}</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {sortedBills.map((bill) => (
                  <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <Checkbox
                        className="transition-all duration-200 hover:scale-110 active:scale-95 data-[state=checked]:scale-110"
                        checked={selectedBillIds.includes(bill.id)}
                        onCheckedChange={(checked) =>
                          setSelectedBillIds((prev) =>
                            checked ? [...prev, bill.id] : prev.filter((id) => id !== bill.id)
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-3">{formatDate(bill.date)}</td>
                    <td className="px-4 py-3">
                      {bill.submitted_by_role === "fns" ? "FnS" : bill.users?.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-primary">{bill.vendors?.name}</div>
                      <div className="text-xs text-muted-foreground">#{bill.bill_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      {bill.companies?.name || (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-primary">{bill.categories?.name}</div>
                      <div className="text-xs text-muted-foreground">{bill.subcategories?.name}</div>
                    </td>
                    <td className="px-4 py-3">{bill.sc_cabinets?.name || "-"}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${getStatusClassName(bill)}`}>
                        {getStatusLabel(bill)}
                      </span>
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

                          {canMarkReimbursed(bill) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleMarkReimbursed(bill)}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reimburse</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {bill.file_url && <DriveLinkPreview fileUrl={bill.file_url} />}
                        </div>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      <Dialog open={bulkRejectDialog.open} onOpenChange={(open) => setBulkRejectDialog({ open, comment: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Selected Bills</DialogTitle>
            <DialogDescription>
              Add one rejection note that will be applied to every selected bill.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="bulk-reject-comment">Rejection comment</Label>
            <Textarea
              id="bulk-reject-comment"
              value={bulkRejectDialog.comment}
              onChange={(e) => setBulkRejectDialog((prev) => ({ ...prev, comment: e.target.value }))}
              rows={4}
              placeholder="Add the reason for rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectDialog({ open: false, comment: "" })}>
              Cancel
            </Button>
            <Button onClick={handleBulkReject}>Reject Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, bill: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Bill Details</DialogTitle>
            <DialogDescription>Modify the bill information as required.</DialogDescription>
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
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
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
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, category_id: v, subcategory_id: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
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
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name}
                      </SelectItem>
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
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, company_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General (No Company)</SelectItem>
                    {dropdownData.companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
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

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          setRejectDialog({
            open,
            bill: open ? rejectDialog.bill : null,
            comment: open ? rejectDialog.comment : "",
          })
        }
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
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, bill: null, comment: "" })}
            >
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

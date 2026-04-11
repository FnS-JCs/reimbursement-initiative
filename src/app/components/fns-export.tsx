"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Bill, Role, BillFilters } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { Download, Loader2, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_cabinets?: { name: string };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

const EXPORT_COLUMNS = [
  { id: "serial", label: "Serial No.", default: true },
  { id: "date", label: "Date", default: true },
  { id: "bill_number", label: "Bill Number", default: true },
  { id: "category", label: "Category", default: true },
  { id: "subcategory", label: "Sub-Category", default: true },
  { id: "sc_name", label: "SC Name", default: true },
  { id: "company", label: "Company Name", default: true },
  { id: "vendor", label: "Vendor", default: true },
  { id: "amount", label: "Amount (INR)", default: true },
  { id: "submitted_by", label: "Submitted By", default: false },
  { id: "process_type", label: "Process Type", default: false },
];

export function FnSExport() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bills, setBills] = useState<BillWithRelations[]>([]);

  const [filters, setFilters] = useState<BillFilters>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.id)
  );

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

  const fetchDropdownData = useCallback(async () => {
    const [companiesRes, categoriesRes, scUsersRes, cyclesRes] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("sc_cabinets").select("id, name").eq("is_active", true).order("name"),
      supabase.from("reimbursement_cycles").select("id, name").order("created_at", { ascending: false }),
    ]);

    setDropdownData({
      companies: companiesRes.data || [],
      categories: categoriesRes.data || [],
      scUsers: scUsersRes.data || [],
      cycles: cyclesRes.data || [],
    });
  }, [supabase]);

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
        .eq("status", "reimbursed")
        .order("date", { ascending: true });

      if (filters.sc_id) {
        query = query.eq("sc_id", filters.sc_id);
      }

      if (filters.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      if (filters.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters.cycle_id) {
        query = query.eq("cycle_id", filters.cycle_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch bills for export",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, filters, toast]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  };

  const handleExport = () => {
    setExporting(true);

    try {
      const exportData = bills.map((bill, index) => {
        const row: Record<string, any> = {};

        if (selectedColumns.includes("serial")) {
          row["Serial No."] = index + 1;
        }
        if (selectedColumns.includes("date")) {
          row["Date"] = new Date(bill.date).toLocaleDateString("en-IN");
        }
        if (selectedColumns.includes("bill_number")) {
          row["Bill Number"] = bill.bill_number;
        }
        if (selectedColumns.includes("category")) {
          row["Category"] = bill.categories?.name || "";
        }
        if (selectedColumns.includes("subcategory")) {
          row["Sub-Category"] = bill.subcategories?.name || "";
        }
        if (selectedColumns.includes("sc_name")) {
          row["SC Name"] = bill.sc_cabinets?.name || "";
        }
        if (selectedColumns.includes("company")) {
          row["Company Name"] = bill.companies?.name || "";
        }
        if (selectedColumns.includes("vendor")) {
          row["Vendor"] = bill.vendors?.name || "";
        }
        if (selectedColumns.includes("amount")) {
          row["Amount (INR)"] = bill.amount;
        }
        if (selectedColumns.includes("submitted_by")) {
          row["Submitted By"] = bill.submitted_by_role === "fns" ? "FnS" : (bill.users?.name || "");
        }
        if (selectedColumns.includes("process_type")) {
          row["Process Type"] = bill.process_type || "";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bills");

      const fileName = `reimbursement-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export successful",
        description: `Exported ${bills.length} bills to ${fileName}`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export bills to Excel",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Bills</h1>
        <p className="text-muted-foreground">
          Export reimbursed bills to Excel format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Select criteria for export</CardDescription>
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

            <div className="space-y-2">
              <Label>Cycle</Label>
              <Select
                value={filters.cycle_id || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, cycle_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {dropdownData.cycles.map((c) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Columns</CardTitle>
          <CardDescription>Select columns to include in export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {EXPORT_COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={selectedColumns.includes(col.id)}
                  onCheckedChange={() => handleColumnToggle(col.id)}
                />
                <Label htmlFor={`col-${col.id}`} className="cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{bills.length} bills</p>
                  <p className="text-muted-foreground">Total: {formatCurrency(totalAmount)}</p>
                </div>
                <Button onClick={handleExport} disabled={exporting || bills.length === 0}>
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export to Excel
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

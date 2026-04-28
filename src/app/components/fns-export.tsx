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
import { Bill, Role, BillFilters, BillViewStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { getVisibleBillStatus } from "@/lib/bill-workflow";
import { Download, Loader2 } from "lucide-react";
import XLSX from "xlsx-js-style";

interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_cabinets?: { name: string };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

type ExportCell = {
  v: string | number;
  s: unknown;
  l?: { Target: string; Tooltip: string };
};

const EXPORT_COLUMNS = [
  { id: "serial", label: "Serial No.", default: true },
  { id: "date", label: "Date", default: true },
  { id: "bill_number", label: "Bill Number", default: true },
  { id: "category", label: "Category", default: true },
  { id: "subcategory", label: "Sub-Category", default: true },
  { id: "sc_name", label: "SC Name", default: true },
  { id: "company", label: "Company Name", default: true },
  { id: "process_type", label: "Process Type", default: true },
  { id: "vendor", label: "Vendor", default: true },
  { id: "amount", label: "Amount (INR)", default: true },
  { id: "file_url", label: "Drive Link", default: true },
  { id: "submitted_by", label: "Submitted By", default: false },
  { id: "status", label: "Status", default: false },
];

export function FnSExport() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bills, setBills] = useState<BillWithRelations[]>([]);

  const [filters, setFilters] = useState<BillFilters>({
    status: "reimbursed",
  });
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [splitBySC, setSplitBySC] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.id)
  );

  const [dropdownData, setDropdownData] = useState<{
    companies: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    scUsers: { id: string; name: string }[];
    cycles: { id: string; name: string; start_date: string; end_date: string | null }[];
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
      supabase
        .from("reimbursement_cycles")
        .select("id, name, start_date, end_date")
        .order("created_at", { ascending: false }),
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
        const selectedCycle = dropdownData.cycles.find((cycle) => cycle.id === filters.cycle_id);
        if (selectedCycle) {
          query = query.gte("date", selectedCycle.start_date);
          if (selectedCycle.end_date) {
            query = query.lte("date", selectedCycle.end_date);
          }
        }
      }

      if (selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;
        query = query.gte("date", startDate).lte("date", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      let fetchedBills = data || [];

      if (filters.status && filters.status !== "all") {
        fetchedBills = fetchedBills.filter(
          (bill) => getVisibleBillStatus(bill, "fns") === filters.status
        );
      }

      setBills(fetchedBills);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch bills for export",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, filters, selectedMonth, toast, dropdownData.cycles]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleColumnToggle = (columnId: string) => {
    if (columnId === "amount") return;

    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  };

  const getActiveColumns = () => {
    const selected = selectedColumns.includes("amount")
      ? selectedColumns
      : [...selectedColumns, "amount"];

    return EXPORT_COLUMNS.filter((column) => selected.includes(column.id));
  };

  const sanitizeSheetName = (name: string) => {
    const sanitized = name.replace(/[\\/?*[\]:]/g, " ").trim() || "Unnamed SC";
    return sanitized.slice(0, 31);
  };

  const getUniqueSheetName = (baseName: string, existingNames: Set<string>) => {
    const sanitizedBase = sanitizeSheetName(baseName);
    let sheetName = sanitizedBase;
    let counter = 2;

    while (existingNames.has(sheetName)) {
      const suffix = ` ${counter}`;
      sheetName = `${sanitizedBase.slice(0, 31 - suffix.length)}${suffix}`;
      counter += 1;
    }

    existingNames.add(sheetName);
    return sheetName;
  };

  const formatExportDate = (date: string) => {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleExport = () => {
    setExporting(true);

    try {
      const activeColumns = getActiveColumns();
      const amountColumnIndex = activeColumns.findIndex((column) => column.id === "amount");
      const headerOrder = [
        "Serial No.", "Date", "SC Name", "Category", "Sub-Category",
        "Bill Number", "Drive Link", "Company Name", "Process Type",
        "Vendor", "Amount (INR)", "Submitted By", "Status"
      ];

      const headerStyle = {
        font: { name: "Trebuchet MS", sz: 10, color: { rgb: "FFFFFF" }, bold: true },
        fill: { fgColor: { rgb: "1B3055" } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const dataStyle = {
        font: { name: "Trebuchet MS", sz: 9, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFFFFF" } },
        alignment: { vertical: "middle", horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      const totalStyle = {
        ...dataStyle,
        font: { ...dataStyle.font, bold: true },
        fill: { fgColor: { rgb: "EAF0F8" } },
      };

      const currencyStyle = { ...dataStyle, z: '"INR "#,##0.00' };
      const totalCurrencyStyle = { ...totalStyle, z: '"INR "#,##0.00' };

      const getCellForColumn = (bill: BillWithRelations, index: number, columnId: string) => {
        switch (columnId) {
          case "serial":
            return { v: index + 1, s: dataStyle };
          case "date":
            return { v: formatExportDate(bill.date), s: dataStyle };
          case "bill_number":
            return { v: bill.bill_number, s: dataStyle };
          case "category":
            return { v: bill.categories?.name || "", s: dataStyle };
          case "subcategory":
            return { v: bill.subcategories?.name || "", s: dataStyle };
          case "sc_name":
            return { v: bill.sc_cabinets?.name || "-", s: dataStyle };
          case "company":
            return { v: bill.companies?.name || "General", s: dataStyle };
          case "process_type":
            return { v: bill.process_type || "-", s: dataStyle };
          case "vendor":
            return { v: bill.vendors?.name || "", s: dataStyle };
          case "amount":
            return { v: bill.amount, s: currencyStyle };
          case "file_url":
            return {
              v: bill.file_url ? "Link" : "No link",
              s: bill.file_url
                ? { ...dataStyle, font: { ...dataStyle.font, color: { rgb: "0563C1" }, underline: true } }
                : dataStyle,
              l: bill.file_url ? { Target: bill.file_url, Tooltip: "Open link" } : undefined,
            };
          case "submitted_by":
            return { v: bill.submitted_by_role === "fns" ? "FnS" : (bill.users?.name || ""), s: dataStyle };
          case "status":
            return { v: getVisibleBillStatus(bill, "fns"), s: dataStyle };
          default:
            return { v: "", s: dataStyle };
        }
      };

      // Prepare data for aoa_to_sheet
      const rows: ExportCell[][] = [headerOrder.map((h) => ({ v: h, s: headerStyle }))];

      bills.forEach((bill, index) => {
        const row = [
          { v: index + 1, s: dataStyle },
          { v: formatExportDate(bill.date), s: dataStyle },
          { v: bill.sc_cabinets?.name || "-", s: dataStyle },
          { v: bill.categories?.name || "", s: dataStyle },
          { v: bill.subcategories?.name || "", s: dataStyle },
          { v: bill.bill_number, s: dataStyle },
          { 
            v: bill.file_url ? "Link" : "No link", 
            s: bill.file_url ? { ...dataStyle, font: { ...dataStyle.font, color: { rgb: "0563C1" }, underline: true } } : dataStyle,
            l: bill.file_url ? { Target: bill.file_url, Tooltip: "Open link" } : undefined
          },
          { v: bill.companies?.name || "General", s: dataStyle },
          { v: bill.process_type || "-", s: dataStyle },
          { v: bill.vendors?.name || "", s: dataStyle },
          { v: bill.amount, s: { ...dataStyle, z: '"₹"#,##0.00' } },
          { v: bill.submitted_by_role === "fns" ? "FnS" : (bill.users?.name || ""), s: dataStyle },
          { v: getVisibleBillStatus(bill, "fns"), s: dataStyle }
        ];
        rows.push(row);
      });

      rows.push([
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
        { v: "Total", s: totalStyle },
        { v: bills.reduce((sum, bill) => sum + bill.amount, 0), s: totalCurrencyStyle },
        { v: "", s: totalStyle },
        { v: "", s: totalStyle },
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Set column widths
      ws["!cols"] = [
        { wch: 10 }, // Serial
        { wch: 12 }, // Date
        { wch: 20 }, // SC Name
        { wch: 20 }, // Category
        { wch: 20 }, // Sub-Category
        { wch: 15 }, // Bill Number
        { wch: 10 }, // Drive Link
        { wch: 20 }, // Company Name
        { wch: 20 }, // Process Type
        { wch: 20 }, // Vendor
        { wch: 15 }, // Amount
        { wch: 20 }, // Submitted By
        { wch: 12 }  // Status
      ];

      // Hide gridlines
      ws["!views"] = [{ showGridLines: false }];

      const buildWorksheet = (sheetBills: BillWithRelations[]) => {
        const sheetRows: ExportCell[][] = [
          activeColumns.map((column) => ({ v: column.label, s: headerStyle })),
        ];

        sheetBills.forEach((bill, index) => {
          sheetRows.push(activeColumns.map((column) => getCellForColumn(bill, index, column.id)));
        });

        sheetRows.push(activeColumns.map((column, index) => {
          if (index === Math.max(0, amountColumnIndex - 1)) {
            return { v: "Total", s: totalStyle };
          }

          if (column.id === "amount") {
            return {
              v: sheetBills.reduce((sum, bill) => sum + bill.amount, 0),
              s: totalCurrencyStyle,
            };
          }

          return { v: "", s: totalStyle };
        }));

        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
        worksheet["!cols"] = activeColumns.map((column) => {
          if (column.id === "serial") return { wch: 10 };
          if (column.id === "date") return { wch: 12 };
          if (column.id === "amount") return { wch: 15 };
          if (column.id === "file_url") return { wch: 10 };
          if (column.id === "status") return { wch: 14 };
          return { wch: 20 };
        });
        worksheet["!views"] = [{ showGridLines: false }];

        return worksheet;
      };

      const wb = XLSX.utils.book_new();
      const sheetNames = new Set<string>();

      XLSX.utils.book_append_sheet(wb, ws, getUniqueSheetName("Bills", sheetNames));

      if (splitBySC) {
        const billsBySC = bills.reduce((groups, bill) => {
          const scName = bill.sc_cabinets?.name || "Unassigned SC";
          const current = groups.get(scName) || [];
          current.push(bill);
          groups.set(scName, current);
          return groups;
        }, new Map<string, BillWithRelations[]>());

        Array.from(billsBySC.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([scName, scBills]) => {
            XLSX.utils.book_append_sheet(
              wb,
              buildWorksheet(scBills),
              getUniqueSheetName(scName, sheetNames)
            );
          });
      }

      const fileName = `reimbursement-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export successful",
        description: `Exported ${bills.length} bills${splitBySC ? " with SC-wise sheets" : ""} to ${fileName}`,
      });
    } catch (err) {
      console.error("Export error:", err);
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

  // Generate last 12 months for the month filter
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return { label, value };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Bills</h1>
        <p className="text-muted-foreground">
          Export bills to Excel format with custom filters
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Select criteria for export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>SC</Label>
              <Select
                value={filters.sc_id || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, sc_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All SCs" />
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
                  <SelectValue placeholder="All Companies" />
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
                  <SelectValue placeholder="All Categories" />
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
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
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
                  setFilters({ ...filters, status: v === "all" ? undefined : v as BillViewStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
                  setFilters({ ...filters, cycle_id: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cycles" />
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
          <CardDescription>Select columns and worksheet options for export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="split-by-sc"
                checked={splitBySC}
                onCheckedChange={(checked) => setSplitBySC(checked === true)}
              />
              <Label htmlFor="split-by-sc" className="cursor-pointer">
                Add separate sheets for each SC
              </Label>
            </div>

            <div className="flex flex-wrap gap-4">
              {EXPORT_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={selectedColumns.includes(col.id)}
                    disabled={col.id === "amount"}
                    onCheckedChange={() => handleColumnToggle(col.id)}
                  />
                  <Label htmlFor={`col-${col.id}`} className="cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount is always included so every exported sheet can show a total.
            </p>
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

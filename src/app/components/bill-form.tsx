"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Alert, AlertDescription } from "@/ui/alert";
import { AlertCircle, Upload, Loader2, X } from "lucide-react";
import { Role } from "@/types";
import { cn } from "@/lib/utils";
import { normalizeRole } from "@/lib/normalize-role";

const COMPANY_CATEGORY_NAMES = ["Company Related Expenses", "Corporate Engagement"];

function isCompanyCategoryById(categories: { id: string; name: string }[], categoryId: string) {
  const name = categories.find(c => c.id === categoryId)?.name || "";
  return COMPANY_CATEGORY_NAMES.includes(name);
}

interface BillFormProps {
  userId: string;
  userRole: Role;
  onSuccess: () => void;
}

interface DropdownData {
  companies: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string }[];
  categorySubCategories: { category_id: string; subcategory_id: string }[];
  scCabinets: { id: string; name: string }[];
  processTypes: { id: string; name: string }[];
  activeCycle: { id: string; name: string } | null;
}

export function BillForm({ userId, userRole, onSuccess }: BillFormProps) {
  const supabase = createClient();
  const normalizedRole = normalizeRole(userRole);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownData, setDropdownData] = useState<DropdownData>({
    companies: [],
    vendors: [],
    categories: [],
    subCategories: [],
    categorySubCategories: [],
    scCabinets: [],
    processTypes: [],
    activeCycle: null,
  });

  const [billDate, setBillDate] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [scCabinetId, setScCabinetId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [processTypeId, setProcessTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [filteredSubCategories, setFilteredSubCategories] = useState<{ id: string; name: string }[]>([]);

  const isCompanyCategory = isCompanyCategoryById(dropdownData.categories, categoryId);
  const showCompanyFields = isCompanyCategory;

  const fetchDropdownData = useCallback(async () => {
    const [
      companiesRes,
      vendorsRes,
      categoriesRes,
      subCategoriesRes,
      categorySubCategoriesRes,
      scCabinetsRes,
      processTypesRes,
      cyclesRes,
    ] = await Promise.all([
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
      supabase.from("vendors").select("id, name").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("subcategories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("category_subcategories").select("category_id, subcategory_id"),
      supabase.from("sc_cabinets").select("id, name").eq("is_active", true).order("name"),
      supabase.from("process_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("reimbursement_cycles").select("id, name").eq("is_active", true).single(),
    ]);

    setDropdownData({
      companies: companiesRes.data || [],
      vendors: vendorsRes.data || [],
      categories: categoriesRes.data || [],
      subCategories: subCategoriesRes.data || [],
      categorySubCategories: categorySubCategoriesRes.data || [],
      scCabinets: scCabinetsRes.data || [],
      processTypes: processTypesRes.data || [],
      activeCycle: cyclesRes.data || null,
    });
  }, [supabase]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    if (categoryId) {
      const subCatIds = dropdownData.categorySubCategories
        .filter((cs) => cs.category_id === categoryId)
        .map((cs) => cs.subcategory_id);
      const filtered = dropdownData.subCategories.filter((sc) => subCatIds.includes(sc.id));
      setFilteredSubCategories(filtered);
      setSubCategoryId("");
    } else {
      setFilteredSubCategories([]);
    }
    setCompanyId("");
    setProcessTypeId("");
  }, [categoryId, dropdownData]);

  useEffect(() => {
    if (!showCompanyFields) {
      setCompanyId("");
      setProcessTypeId("");
    }
  }, [showCompanyFields]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Only JPG, PNG, and PDF files are allowed");
        return;
      }
      setFile(selectedFile);
      setError(null);
      if (selectedFile.type !== "application/pdf") {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(false);
    setError(null);

    if (!billDate || !vendorId || !billNumber || !categoryId || !subCategoryId || !scCabinetId || !amount) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (showCompanyFields && !companyId) {
      setError("Please select a company");
      setLoading(false);
      return;
    }

    if (showCompanyFields && !processTypeId) {
      setError("Please select a process type");
      setLoading(false);
      return;
    }

    try {
      let fileUrl: string | null = null;
      if (file) {
        setUploading(true);
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${new Date().getFullYear()}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("bills")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from("bills").getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      }

      const selectedProcessType = dropdownData.processTypes.find(p => p.id === processTypeId);
      const billData = {
        user_id: userId,
        submitted_by_role: normalizedRole,
        vendor_id: vendorId,
        bill_number: billNumber,
        company_id: showCompanyFields ? companyId : null,
        sc_id: scCabinetId,
        category_id: categoryId,
        subcategory_id: subCategoryId,
        date: billDate,
        amount: parseFloat(amount),
        process_type: showCompanyFields && selectedProcessType ? selectedProcessType.name : null,
        file_url: fileUrl,
        status: "pending",
      };

      const { error: insertError } = await supabase.from("bills").insert(billData);
      if (insertError) throw new Error(`Failed to submit bill: ${insertError.message}`);

      setBillDate("");
      setVendorId("");
      setBillNumber("");
      setCategoryId("");
      setSubCategoryId("");
      setCompanyId("");
      setScCabinetId("");
      setProcessTypeId("");
      setAmount("");
      setFile(null);
      setFilePreview(null);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit bill");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Bill</CardTitle>
        <CardDescription>Upload your expense bill for reimbursement</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bill-date">Date of Bill *</Label>
              <Input
                id="bill-date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
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
              <Label htmlFor="bill-number">Bill Number *</Label>
              <Input
                id="bill-number"
                type="text"
                placeholder="Enter bill number"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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
              <Label htmlFor="sub-category">Sub-Category *</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId} disabled={!categoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category" />
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

            <div className="space-y-2">
              <Label htmlFor="sc">SC/Cabinet Name *</Label>
              <Select value={scCabinetId} onValueChange={setScCabinetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SC/Cabinet" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.scCabinets.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showCompanyFields && (
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showCompanyFields && (
              <div className="space-y-2">
                <Label htmlFor="process-type">Process Type *</Label>
                <Select value={processTypeId} onValueChange={setProcessTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select process type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdownData.processTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bill Upload</Label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-input"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                  file && "border-primary bg-primary/5"
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or PDF (max. 10MB)</p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="relative flex-shrink-0">
                  {filePreview ? (
                    <img src={filePreview} alt="Bill preview" className="w-24 h-24 object-cover rounded-lg border" />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center rounded-lg border bg-gray-100 dark:bg-gray-800">
                      <span className="text-xs text-muted-foreground">PDF</span>
                    </div>
                  )}
                  <button type="button" onClick={handleRemoveFile} className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                  <p className="mt-1 text-xs text-center truncate max-w-24">{file.name}</p>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading || uploading} className="w-full">
            {loading || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Submitting..."}
              </>
            ) : (
              "Submit Bill"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

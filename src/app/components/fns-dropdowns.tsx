"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/accordion";
import { useToast } from "@/lib/use-toast";
import { Plus, Edit, Loader2, Building2, Store, Tags, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface SubCategory {
  id: string;
  name: string;
  created_at: string;
}

interface CategorySubCategory {
  category_id: string;
  subcategory_id: string;
}

type DropdownType = "companies" | "vendors" | "categories" | "subcategories";

export function FnSDropdowns() {
  const supabase = createClient();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categorySubCategories, setCategorySubCategories] = useState<CategorySubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    type: DropdownType;
    parentId?: string;
  }>({ open: false, type: "companies" });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: DropdownType;
    item: any;
    parentId?: string;
  }>({ open: false, type: "companies", item: null });

  const [addForm, setAddForm] = useState({ name: "" });
  const [editForm, setEditForm] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, vendorsRes, categoriesRes, subCategoriesRes, categorySubCategoriesRes] =
        await Promise.all([
          supabase.from("companies").select("*").order("name"),
          supabase.from("vendors").select("*").order("name"),
          supabase.from("categories").select("*").order("name"),
          supabase.from("subcategories").select("*").order("name"),
          supabase.from("category_subcategories").select("*"),
        ]);

      setCompanies(companiesRes.data || []);
      setVendors(vendorsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSubCategories(subCategoriesRes.data || []);
      setCategorySubCategories(categorySubCategoriesRes.data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTableName = (type: DropdownType): string => {
    switch (type) {
      case "companies":
        return "companies";
      case "vendors":
        return "vendors";
      case "categories":
        return "categories";
      case "subcategories":
        return "subcategories";
      default:
        return "";
    }
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      if (addDialog.type === "subcategories" && addDialog.parentId) {
        const { error } = await supabase.from("category_subcategories").insert({
          category_id: addDialog.parentId,
          subcategory_id: addForm.name,
        });

        if (error?.code === "23505") {
          toast({
            title: "Error",
            description: "This subcategory is already linked to this category",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase.from(getTableName(addDialog.type)).insert({
          name: addForm.name,
        });

        if (error?.code === "23505") {
          toast({
            title: "Error",
            description: "This item already exists",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      toast({
        title: "Added",
        description: "Item has been added successfully",
      });

      setAddDialog({ open: false, type: "companies" });
      setAddForm({ name: "" });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDialog.item) return;

    setSubmitting(true);
    try {
      if (editDialog.type === "subcategories") {
        const { error } = await supabase
          .from("category_subcategories")
          .update({ subcategory_id: editForm.name })
          .eq("category_id", editDialog.parentId)
          .eq("subcategory_id", editDialog.item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(getTableName(editDialog.type))
          .update({ name: editForm.name })
          .eq("id", editDialog.item.id);

        if (error) throw error;
      }

      toast({
        title: "Updated",
        description: "Item has been updated successfully",
      });

      setEditDialog({ open: false, type: "companies", item: null });
      setEditForm({ name: "" });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: DropdownType, item: any, parentId?: string) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    setSubmitting(true);
    try {
      if (type === "subcategories" && parentId) {
        const { error } = await supabase
          .from("category_subcategories")
          .delete()
          .eq("category_id", parentId)
          .eq("subcategory_id", item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(getTableName(type))
          .delete()
          .eq("id", item.id);

        if (error) throw error;
      }

      toast({
        title: "Deleted",
        description: "Item has been deleted successfully",
      });

      fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = (type: DropdownType, parentId?: string) => {
    setAddForm({ name: "" });
    setAddDialog({ open: true, type, parentId });
  };

  const openEditDialog = (type: DropdownType, item: any, parentId?: string) => {
    setEditForm({ name: item.name });
    setEditDialog({ open: true, type, item, parentId });
  };

  const getSubCategoriesForCategory = (categoryId: string) => {
    const subCatIds = categorySubCategories
      .filter((cs) => cs.category_id === categoryId)
      .map((cs) => cs.subcategory_id);
    return subCategories.filter((sc) => subCatIds.includes(sc.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dropdown Management</h1>
        <p className="text-muted-foreground">
          Manage all dropdown options for the bill submission form
        </p>
      </div>

      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="companies">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies ({companies.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddDialog("companies")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
              <div className="flex flex-wrap gap-2">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border"
                  >
                    <span className="text-sm">{company.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog("companies", company)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete("companies", company)}
                    >
                      <span className="text-destructive text-xs">×</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vendors">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Vendors ({vendors.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddDialog("vendors")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
              <div className="flex flex-wrap gap-2">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border"
                  >
                    <span className="text-sm">{vendor.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog("vendors", vendor)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete("vendors", vendor)}
                    >
                      <span className="text-destructive text-xs">×</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Categories & Sub-Categories ({categories.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddDialog("categories")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
              {categories.map((category) => (
                <div key={category.id} className="ml-4 border-l-2 pl-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog("categories", category)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete("categories", category)}
                    >
                      <span className="text-destructive text-xs">×</span>
                    </Button>
                  </div>
                  <div className="ml-4 mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAddDialog("subcategories", category.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Sub-Category
                    </Button>
                    {getSubCategoriesForCategory(category.id).map((sc) => (
                      <div
                        key={sc.id}
                        className="flex items-center gap-2 px-3 py-1 rounded-full border"
                      >
                        <span className="text-sm">{sc.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog("subcategories", sc, category.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete("subcategories", sc, category.id)}
                        >
                          <span className="text-destructive text-xs">×</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog
        open={addDialog.open}
        onOpenChange={(open) => setAddDialog({ open, type: "companies" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {addDialog.type === "companies" && "Company"}
              {addDialog.type === "vendors" && "Vendor"}
              {addDialog.type === "categories" && "Category"}
              {addDialog.type === "subcategories" && "Sub-Category"}
            </DialogTitle>
            <DialogDescription>
              Enter the name for the new item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialog({ open: false, type: "companies" })}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, type: "companies", item: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editDialog.type === "companies" && "Company"}
              {editDialog.type === "vendors" && "Vendor"}
              {editDialog.type === "categories" && "Category"}
              {editDialog.type === "subcategories" && "Sub-Category"}
            </DialogTitle>
            <DialogDescription>
              Make changes to the item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, type: "companies", item: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

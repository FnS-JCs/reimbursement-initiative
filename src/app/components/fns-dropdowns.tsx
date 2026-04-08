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
import { Plus, Edit, Loader2, Building2, Store, Tags, Layers, Power, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface SubCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface CategorySubCategory {
  category_id: string;
  subcategory_id: string;
}

interface ProcessType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface ScCabinet {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

type DropdownType = "companies" | "vendors" | "categories" | "subcategories" | "process_types" | "sc_cabinets";

export function FnSDropdowns() {
  const supabase = createClient();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categorySubCategories, setCategorySubCategories] = useState<CategorySubCategory[]>([]);
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [scCabinets, setScCabinets] = useState<ScCabinet[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    type: DropdownType;
    parentId?: string;
  }>({ open: false, type: "companies" });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: DropdownType;
    item: { id: string; name: string; is_active?: boolean };
    parentId?: string;
  }>({ open: false, type: "companies", item: { id: "", name: "" } });

  const [addForm, setAddForm] = useState({ name: "" });
  const [editForm, setEditForm] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, vendorsRes, categoriesRes, subCategoriesRes, categorySubCategoriesRes, processTypesRes, scCabinetsRes] =
        await Promise.all([
          supabase.from("companies").select("*").order("name"),
          supabase.from("vendors").select("*").order("name"),
          supabase.from("categories").select("*").order("name"),
          supabase.from("subcategories").select("*").order("name"),
          supabase.from("category_subcategories").select("*"),
          supabase.from("process_types").select("*").order("name"),
          supabase.from("sc_cabinets").select("*").order("name"),
        ]);

      setCompanies(companiesRes.data || []);
      setVendors(vendorsRes.data || []);
      setCategories(categoriesRes.data || []);
      setSubCategories(subCategoriesRes.data || []);
      setCategorySubCategories(categorySubCategoriesRes.data || []);
      setProcessTypes(processTypesRes.data || []);
      setScCabinets(scCabinetsRes.data || []);
    } catch {
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
      case "companies": return "companies";
      case "vendors": return "vendors";
      case "categories": return "categories";
      case "process_types": return "process_types";
      case "sc_cabinets": return "sc_cabinets";
      default: return "";
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSubmitting(true);
    try {
      if (addDialog.type === "subcategories" && addDialog.parentId) {
        const { data: newSub, error: subError } = await supabase
          .from("subcategories")
          .insert({ name: addForm.name.trim(), is_active: true })
          .select("id")
          .single();

        if (subError) {
          if (subError.code === "23505") {
            toast({ title: "Error", description: "This subcategory already exists", variant: "destructive" });
          } else {
            throw subError;
          }
          setSubmitting(false);
          return;
        }

        const { error: linkError } = await supabase.from("category_subcategories").insert({
          category_id: addDialog.parentId,
          subcategory_id: newSub.id,
        });

        if (linkError?.code === "23505") {
          toast({ title: "Error", description: "This subcategory is already linked to this category", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        if (linkError) throw linkError;
      } else {
        const { error } = await supabase.from(getTableName(addDialog.type)).insert({
          name: addForm.name.trim(),
          is_active: true,
        });

        if (error?.code === "23505") {
          toast({ title: "Error", description: "This item already exists", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        if (error) throw error;
      }

      toast({ title: "Added", description: "Item has been added successfully" });
      setAddDialog({ open: false, type: "companies" });
      setAddForm({ name: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add item", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDialog.item || !editForm.name.trim()) return;
    setSubmitting(true);
    try {
      if (editDialog.type === "subcategories" && editDialog.parentId) {
        const { error } = await supabase
          .from("subcategories")
          .update({ name: editForm.name.trim() })
          .eq("id", editDialog.item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(getTableName(editDialog.type))
          .update({ name: editForm.name.trim() })
          .eq("id", editDialog.item.id);
        if (error) throw error;
      }

      toast({ title: "Updated", description: "Item has been updated successfully" });
      setEditDialog({ open: false, type: "companies", item: { id: "", name: "" } });
      setEditForm({ name: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update item", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (type: DropdownType, item: { id: string; name: string; is_active: boolean }, parentId?: string) => {
    const newActive = !item.is_active;
    try {
      if (type === "subcategories" && parentId) {
        const { error } = await supabase
          .from("subcategories")
          .update({ is_active: newActive })
          .eq("id", item.id);
        if (error) throw error;
      } else if (type === "process_types") {
        const { error } = await supabase
          .from("process_types")
          .update({ is_active: newActive })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(getTableName(type))
          .update({ is_active: newActive })
          .eq("id", item.id);
        if (error) throw error;
      }

      toast({
        title: newActive ? "Activated" : "Deactivated",
        description: `"${item.name}" is now ${newActive ? "active" : "inactive"}`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (type: DropdownType, item: { id: string; name: string }, parentId?: string) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    setSubmitting(true);
    try {
      if (type === "subcategories" && parentId) {
        await supabase.from("category_subcategories").delete()
          .eq("category_id", parentId).eq("subcategory_id", item.id);
        await supabase.from("subcategories").delete().eq("id", item.id);
      } else {
        const { error } = await supabase.from(getTableName(type)).delete().eq("id", item.id);
        if (error) throw error;
      }

      toast({ title: "Deleted", description: "Item has been permanently deleted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openAddDialog = (type: DropdownType, parentId?: string) => {
    setAddForm({ name: "" });
    setAddDialog({ open: true, type, parentId });
  };

  const openEditDialog = (type: DropdownType, item: { id: string; name: string; is_active?: boolean }, parentId?: string) => {
    setEditForm({ name: item.name });
    setEditDialog({ open: true, type, item, parentId });
  };

  const getSubCategoriesForCategory = (categoryId: string) => {
    const subCatIds = categorySubCategories
      .filter((cs) => cs.category_id === categoryId)
      .map((cs) => cs.subcategory_id);
    return subCategories.filter((sc) => subCatIds.includes(sc.id));
  };

  const ItemRow = ({
    item,
    onEdit,
    onToggle,
    onDelete,
    type,
  }: {
    item: { id: string; name: string; is_active?: boolean };
    onEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    type: DropdownType;
  }) => (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border", !item.is_active && "opacity-50 bg-muted/30")}>
      <span className={cn("text-sm flex-1", !item.is_active && "line-through")}>{item.name}</span>
      <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 px-2">
        <Edit className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onToggle} className={cn("h-6 px-2", item.is_active ? "text-amber-500" : "text-green-500")} title={item.is_active ? "Deactivate" : "Activate"}>
        <Power className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 px-2 text-destructive">
        <span className="text-xs">×</span>
      </Button>
    </div>
  );

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
              Companies ({companies.filter(c => c.is_active).length}/{companies.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => openAddDialog("companies")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
              <div className="flex flex-wrap gap-2">
                {companies.map((company) => (
                  <ItemRow
                    key={company.id}
                    item={company}
                    type="companies"
                    onEdit={() => openEditDialog("companies", company)}
                    onToggle={() => handleToggleActive("companies", company)}
                    onDelete={() => handleDelete("companies", company)}
                  />
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vendors">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Vendors ({vendors.filter(v => v.is_active).length}/{vendors.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => openAddDialog("vendors")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
              <div className="flex flex-wrap gap-2">
                {vendors.map((vendor) => (
                  <ItemRow
                    key={vendor.id}
                    item={vendor}
                    type="vendors"
                    onEdit={() => openEditDialog("vendors", vendor)}
                    onToggle={() => handleToggleActive("vendors", vendor)}
                    onDelete={() => handleDelete("vendors", vendor)}
                  />
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Categories & Sub-Categories ({categories.filter(c => c.is_active).length}/{categories.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={() => openAddDialog("categories")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
              {categories.map((category) => (
                <div key={category.id} className={cn("ml-4 border-l-2 pl-4 py-2", !category.is_active && "opacity-50")}>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", !category.is_active && "line-through")}>{category.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog("categories", category)} className="h-6 px-2">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive("categories", category)} className={cn("h-6 px-2", category.is_active ? "text-amber-500" : "text-green-500")}>
                      <Power className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete("categories", category)} className="h-6 px-2 text-destructive">
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                  <div className="ml-4 mt-2 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openAddDialog("subcategories", category.id)} className="h-6 px-2 text-xs">
                      <Plus className="mr-1 h-3 w-3" />
                      Add Sub-Category
                    </Button>
                    {getSubCategoriesForCategory(category.id).map((sc) => (
                      <ItemRow
                        key={sc.id}
                        item={sc}
                        type="subcategories"
                        onEdit={() => openEditDialog("subcategories", sc, category.id)}
                        onToggle={() => handleToggleActive("subcategories", sc, category.id)}
                        onDelete={() => handleDelete("subcategories", sc, category.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="process_types">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Process Types ({processTypes.filter(p => p.is_active).length}/{processTypes.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => openAddDialog("process_types")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Process Type
              </Button>
              <div className="flex flex-wrap gap-2">
                {processTypes.map((pt) => (
                  <ItemRow
                    key={pt.id}
                    item={pt}
                    type="process_types"
                    onEdit={() => openEditDialog("process_types", pt)}
                    onToggle={() => handleToggleActive("process_types", pt)}
                    onDelete={() => handleDelete("process_types", pt)}
                  />
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sc_cabinets">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              SC/Cabinet Names ({scCabinets.filter(s => s.is_active).length}/{scCabinets.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => openAddDialog("sc_cabinets")}>
                <Plus className="mr-2 h-4 w-4" />
                Add SC/Cabinet
              </Button>
              <div className="flex flex-wrap gap-2">
                {scCabinets.map((sc) => (
                  <ItemRow
                    key={sc.id}
                    item={sc}
                    type="sc_cabinets"
                    onEdit={() => openEditDialog("sc_cabinets", sc)}
                    onToggle={() => handleToggleActive("sc_cabinets", sc)}
                    onDelete={() => handleDelete("sc_cabinets", sc)}
                  />
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog({ open, type: "companies" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addDialog.type === "companies" && "Add Company"}
              {addDialog.type === "vendors" && "Add Vendor"}
              {addDialog.type === "categories" && "Add Category"}
              {addDialog.type === "subcategories" && "Add Sub-Category"}
              {addDialog.type === "process_types" && "Add Process Type"}
              {addDialog.type === "sc_cabinets" && "Add SC/Cabinet"}
            </DialogTitle>
            <DialogDescription>
              {addDialog.type === "subcategories" ? "Enter the sub-category name" : "Enter the name for the new item"}
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
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog({ open: false, type: "companies" })}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting || !addForm.name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, type: "companies", item: { id: "", name: "" } })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editDialog.type === "companies" && "Company"}
              {editDialog.type === "vendors" && "Vendor"}
              {editDialog.type === "categories" && "Category"}
              {editDialog.type === "subcategories" && "Sub-Category"}
              {editDialog.type === "process_types" && "Process Type"}
              {editDialog.type === "sc_cabinets" && "SC/Cabinet"}
            </DialogTitle>
            <DialogDescription>Make changes to the item</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: "companies", item: { id: "", name: "" } })}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting || !editForm.name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

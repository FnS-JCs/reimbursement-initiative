"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { ReimbursementCycle } from "@/types";
import { useToast } from "@/lib/use-toast";
import { Plus, Edit, Loader2, Calendar, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function FnSCycles() {
  const supabase = createClient();
  const { toast } = useToast();

  const [cycles, setCycles] = useState<ReimbursementCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; cycle: ReimbursementCycle | null }>({
    open: false,
    cycle: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; cycle: ReimbursementCycle | null }>({
    open: false,
    cycle: null,
  });

  const [addForm, setAddForm] = useState({
    name: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Helper function to determine if a cycle is currently active based on dates
  const isCycleActive = (cycle: ReimbursementCycle): boolean => {
    return !cycle.is_closed;
  };

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reimbursement_cycles")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch cycles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.start_date) {
      toast({
        title: "Validation Error",
        description: "Name and start date are required. End date is optional.",
        variant: "destructive",
      });
      return;
    }

    // Validate that end_date (if provided) is after start_date
    if (addForm.end_date && addForm.end_date < addForm.start_date) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to create another ongoing cycle (one with no end date)
    if (!addForm.end_date) {
      const ongoingCycle = cycles.find(c => !c.end_date);
      if (ongoingCycle) {
        toast({
          title: "Error",
          description: "Only one ongoing cycle (without end date) is allowed at a time",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reimbursement_cycles").insert({
        name: addForm.name,
        start_date: addForm.start_date,
        end_date: addForm.end_date || null,
      });

      if (error) throw error;

      toast({
        title: "Cycle created",
        description: "The cycle has been created successfully",
      });

      setAddDialog(false);
      setAddForm({ name: "", start_date: new Date().toISOString().split('T')[0], end_date: "" });
      fetchCycles();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create cycle",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDialog.cycle) return;

    if (!editForm.name || !editForm.start_date) {
      toast({
        title: "Validation Error",
        description: "Name and start date are required",
        variant: "destructive",
      });
      return;
    }

    // Validate that end_date (if provided) is after start_date
    if (editForm.end_date && editForm.end_date < editForm.start_date) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // If changing to ongoing (no end date), check that no other ongoing cycle exists
    if (!editForm.end_date && editDialog.cycle.end_date) {
      const ongoingCycle = cycles.find(c => !c.end_date && c.id !== editDialog.cycle?.id);
      if (ongoingCycle) {
        toast({
          title: "Error",
          description: "Only one ongoing cycle (without end date) is allowed at a time",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("reimbursement_cycles")
        .update({
          name: editForm.name,
          start_date: editForm.start_date,
          end_date: editForm.end_date || null,
        })
        .eq("id", editDialog.cycle.id);

      if (error) throw error;

      toast({
        title: "Cycle updated",
        description: "The cycle has been updated successfully",
      });

      setEditDialog({ open: false, cycle: null });
      fetchCycles();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update cycle",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (cycle: ReimbursementCycle) => {
    setEditForm({
      name: cycle.name,
      start_date: cycle.start_date,
      end_date: cycle.end_date || "",
    });
    setEditDialog({ open: true, cycle });
  };

  const handleDelete = async () => {
    if (!deleteDialog.cycle) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("reimbursement_cycles")
        .delete()
        .eq("id", deleteDialog.cycle.id);

      if (error) throw error;

      toast({
        title: "Cycle deleted",
        description: "The cycle has been deleted successfully",
      });

      setDeleteDialog({ open: false, cycle: null });
      fetchCycles();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete cycle",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cycles</h1>
          <p className="text-muted-foreground">
            Manage reimbursement cycles. Cycles are automatically active when the current date falls between the start and end dates.
          </p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cycles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No cycles yet</h3>
              <p className="text-muted-foreground">Create your first reimbursement cycle</p>
            </CardContent>
          </Card>
        ) : (
          cycles.map((cycle) => {
            const isActive = isCycleActive(cycle);

            return (
              <Card key={cycle.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{cycle.name}</h3>
                          {isActive && (
                            <Badge variant="success">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(cycle.start_date)}
                          {cycle.end_date && ` - ${formatDate(cycle.end_date)}`}
                          {!cycle.end_date && " - Ongoing"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(cycle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, cycle })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cycle</DialogTitle>
            <DialogDescription>
              Create a new reimbursement cycle. Cycles are automatically active when today's date falls between the start and end dates. Leave the end date empty to create an ongoing cycle (only one ongoing cycle allowed).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Cycle Name *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., April 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-start">Start Date *</Label>
                <Input
                  id="add-start"
                  type="date"
                  value={addForm.start_date}
                  onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-end">End Date (Optional)</Label>
                <Input
                  id="add-end"
                  type="date"
                  value={addForm.end_date}
                  onChange={(e) => setAddForm({ ...addForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, cycle: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cycle</DialogTitle>
            <DialogDescription>
              Make changes to the cycle details. Leave the end date empty to make it ongoing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Cycle Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date (Optional)</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, cycle: null })}
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

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, cycle: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.cycle?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, cycle: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

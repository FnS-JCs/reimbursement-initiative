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
import { Plus, Edit, Loader2, Calendar } from "lucide-react";
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
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; cycleId: string | null }>({
    open: false,
    cycleId: null,
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
    if (!addForm.name || !addForm.start_date || !addForm.end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reimbursement_cycles").insert({
        name: addForm.name,
        start_date: addForm.start_date,
        end_date: addForm.end_date,
        is_active: false,
        is_closed: false,
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

  const handleSetActive = async (cycleId: string) => {
    setSubmitting(true);
    try {
      await supabase
        .from("reimbursement_cycles")
        .update({ is_active: false })
        .eq("is_active", true);

      await supabase
        .from("reimbursement_cycles")
        .update({ is_active: true })
        .eq("id", cycleId);

      toast({
        title: "Cycle activated",
        description: "This cycle is now active",
      });

      fetchCycles();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to activate cycle",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!closeDialog.cycleId) return;

    setSubmitting(true);
    try {
      await supabase
        .from("reimbursement_cycles")
        .update({ is_closed: true, is_active: false })
        .eq("id", closeDialog.cycleId);

      toast({
        title: "Cycle closed",
        description: "The cycle has been closed",
      });

      setCloseDialog({ open: false, cycleId: null });
      fetchCycles();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to close cycle",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cycles</h1>
          <p className="text-muted-foreground">
            Manage reimbursement cycles
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
          cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{cycle.name}</h3>
                        {cycle.is_active && (
                          <Badge variant="success">Active</Badge>
                        )}
                        {cycle.is_closed && (
                          <Badge variant="secondary">Closed</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(cycle.start_date)}
                        {cycle.end_date && ` - ${formatDate(cycle.end_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!cycle.is_active && !cycle.is_closed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(cycle.id)}
                        disabled={submitting}
                      >
                        Set Active
                      </Button>
                    )}
                    {cycle.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCloseDialog({ open: true, cycleId: cycle.id })}
                        disabled={submitting}
                      >
                        Close Cycle
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(cycle)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cycle</DialogTitle>
            <DialogDescription>
              Create a new reimbursement cycle. Only one cycle can be active at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Cycle Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., April 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-start">Start Date</Label>
                <Input
                  id="add-start"
                  type="date"
                  value={addForm.start_date}
                  onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-end">End Date</Label>
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
              Make changes to the cycle details
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
                <Label htmlFor="edit-end">End Date</Label>
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
        open={closeDialog.open}
        onOpenChange={(open) => setCloseDialog({ open, cycleId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this cycle? This will mark it as inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialog({ open: false, cycleId: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { User, Role } from "@/types";
import { useToast } from "@/lib/use-toast";
import { formatRoleLabel, normalizeRole } from "@/lib/normalize-role";
import { Edit, Power, Loader2, Shield, UserCircle } from "lucide-react";

export function FnSUsers() {
  const supabase = createClient();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [editDialog, setEditDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    role: "jc" as Role,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("*").order("name");
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = async () => {
    if (!editDialog.user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editForm.name.trim(),
          role: editForm.role,
        })
        .eq("id", editDialog.user.id);

      if (error) throw error;

      toast({
        title: "User updated",
        description: "User details have been updated successfully.",
      });

      setEditDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!statusDialog.user) return;

    const nextActive = !statusDialog.user.is_active;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: nextActive })
        .eq("id", statusDialog.user.id);

      if (error) throw error;

      toast({
        title: nextActive ? "User activated" : "User deactivated",
        description: nextActive
          ? "The user can log in again."
          : "The user can no longer log in.",
      });

      setStatusDialog({ open: false, user: null });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditForm({
      name: user.name,
      role: normalizeRole(user.role) || "jc",
    });
    setEditDialog({ open: true, user });
  };

  const roleBadgeVariant = (role: Role) => {
    switch (normalizeRole(role)) {
      case "fns":
        return "default";
      case "sc":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage the whitelisted Google-account emails, roles, and access status.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto bg-card rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-foreground">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Roll No</th>
                    <th className="px-4 py-3 text-center font-medium">Role</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {normalizeRole(user.role) === "fns" ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.roll_no || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {formatRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.is_active ? "secondary" : "outline"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setStatusDialog({ open: true, user })}
                          >
                            <Power
                              className={`h-4 w-4 ${
                                user.is_active ? "text-amber-500" : "text-green-600"
                              }`}
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the assigned name and role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jc">Junior Coordinator (JC)</SelectItem>
                  <SelectItem value="sc">Senior Coordinator (SC)</SelectItem>
                  <SelectItem value="fns">Finance & Strategy (FnS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting || !editForm.name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ open, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialog.user?.is_active ? "Deactivate User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {statusDialog.user?.is_active
                ? "This will block the user from logging in until reactivated."
                : "This will allow the user to log in again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button onClick={handleToggleActive} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {statusDialog.user?.is_active ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Edit, Power, Loader2, Shield, UserCircle, Plus } from "lucide-react";

type UserFormState = {
  name: string;
  email: string;
  roll_no: string;
  upi_id: string;
  role: Role;
  auth_user_id: string;
  is_active: boolean;
};

const emptyUserForm = (): UserFormState => ({
  name: "",
  email: "",
  roll_no: "",
  upi_id: "",
  role: "jc",
  auth_user_id: "",
  is_active: true,
});

export function FnSUsers() {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);

  const [editDialog, setEditDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const [editForm, setEditForm] = useState<UserFormState>(emptyUserForm);
  const [addForm, setAddForm] = useState<UserFormState>(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fns/users", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      setUsers(result.users || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const userToForm = (user: User): UserFormState => ({
    name: user.name,
    email: user.email,
    roll_no: user.roll_no || "",
    upi_id: user.upi_id || "",
    role: normalizeRole(user.role) || "jc",
    auth_user_id: user.auth_user_id || "",
    is_active: user.is_active !== false,
  });

  const handleEdit = async () => {
    if (!editDialog.user) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/fns/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editDialog.user.id,
          ...editForm,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

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

  const handleAddUser = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/fns/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addForm),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to add user");
      }

      toast({
        title: "User added",
        description: "The user has been created successfully.",
      });

      setAddDialog(false);
      setAddForm(emptyUserForm());
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add user",
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
      const response = await fetch("/api/fns/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: statusDialog.user.id,
          ...userToForm(statusDialog.user),
          is_active: nextActive,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update user status");
      }

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
    setEditForm(userToForm(user));
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
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user records, auth linking, roles, and access status.
        </p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
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
                    <th className="px-4 py-3 text-left font-medium">UPI ID</th>
                    <th className="px-4 py-3 text-center font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Auth Link</th>
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
                      <td className="px-4 py-3">{user.upi_id || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {formatRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.auth_user_id ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs text-foreground">{user.auth_user_id}</div>
                            <div className="text-xs text-green-600">Linked</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not linked yet</span>
                        )}
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

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a user record and optionally link it directly to an existing Supabase auth user ID.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-roll">Roll No</Label>
              <Input
                id="add-roll"
                value={addForm.roll_no}
                onChange={(e) => setAddForm({ ...addForm, roll_no: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-upi">UPI ID</Label>
              <Input
                id="add-upi"
                value={addForm.upi_id}
                onChange={(e) => setAddForm({ ...addForm, upi_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => setAddForm({ ...addForm, role: v as Role })}
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jc">Junior Coordinator (JC)</SelectItem>
                  <SelectItem value="sc">Senior Coordinator (SC)</SelectItem>
                  <SelectItem value="fns">Finance & Strategy (FnS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-active">Status</Label>
              <Select
                value={addForm.is_active ? "active" : "inactive"}
                onValueChange={(v) => setAddForm({ ...addForm, is_active: v === "active" })}
              >
                <SelectTrigger id="add-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="add-auth-id">Auth User ID (Optional)</Label>
              <Input
                id="add-auth-id"
                value={addForm.auth_user_id}
                onChange={(e) => setAddForm({ ...addForm, auth_user_id: e.target.value })}
                placeholder="Leave blank to auto-link by email later"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={submitting || !addForm.name.trim() || !addForm.email.trim()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, user: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update any stored user detail, including direct auth linking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-roll">Roll No</Label>
              <Input
                id="edit-roll"
                value={editForm.roll_no}
                onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-upi">UPI ID</Label>
              <Input
                id="edit-upi"
                value={editForm.upi_id}
                onChange={(e) => setEditForm({ ...editForm, upi_id: e.target.value })}
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
            <div className="space-y-2">
              <Label htmlFor="edit-active">Status</Label>
              <Select
                value={editForm.is_active ? "active" : "inactive"}
                onValueChange={(v) => setEditForm({ ...editForm, is_active: v === "active" })}
              >
                <SelectTrigger id="edit-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-auth-id">Auth User ID (Optional)</Label>
              <Input
                id="edit-auth-id"
                value={editForm.auth_user_id}
                onChange={(e) => setEditForm({ ...editForm, auth_user_id: e.target.value })}
                placeholder="Leave blank to allow linking by email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting || !editForm.name.trim() || !editForm.email.trim()}
            >
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

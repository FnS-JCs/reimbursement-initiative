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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { User, Role } from "@/types";
import { useToast } from "@/lib/use-toast";
import { UserPlus, Edit, Trash2, Loader2, Shield, UserCircle } from "lucide-react";

export function FnSUsers() {
  const supabase = createClient();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });

  const [addForm, setAddForm] = useState({
    email: "",
    name: "",
    role: "JC" as Role,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    role: "JC" as Role,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
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
          name: editForm.name,
          role: editForm.role,
        })
        .eq("id", editDialog.user.id);

      if (error) throw error;

      toast({
        title: "User updated",
        description: "User has been updated successfully",
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

  const handleDelete = async () => {
    if (!deleteDialog.userId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", deleteDialog.userId);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "User has been deleted",
      });

      setDeleteDialog({ open: false, userId: null });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditForm({
      name: user.name,
      role: user.role,
    });
    setEditDialog({ open: true, user });
  };

  const roleBadgeVariant = (role: Role) => {
    switch (role) {
      case "FnS":
        return "default";
      case "SC":
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
          Manage all users in the system
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Roll No</th>
                    <th className="px-4 py-3 text-center font-medium">Role</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.role === "FnS" ? (
                            <Shield className="h-4 w-4 text-primary" />
                          ) : (
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          {user.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.roll_no || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={roleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({ open: true, userId: user.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogDescription>
              Make changes to the user account
            </DialogDescription>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JC">Junior Coordinator (JC)</SelectItem>
                  <SelectItem value="SC">Senior Coordinator (SC)</SelectItem>
                  <SelectItem value="FnS">Finance & Strategy (FnS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, user: null })}
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
        onOpenChange={(open) => setDeleteDialog({ open, userId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, userId: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

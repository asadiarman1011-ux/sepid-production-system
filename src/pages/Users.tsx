import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell, useMyAccess } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { SECTIONS } from "@/lib/sections";
import type { Section } from "@/convex/access";
import { Loader2, Pencil, Plus, Shield, Trash2, UserMinus } from "lucide-react";

type RoleDoc = {
  _id: string;
  name: string;
  permissions: string[];
};

export default function Users() {
  const { isOwner } = useAccessGuard();
  const users = useQuery(api.access.listUsers, isOwner ? {} : "skip");
  const roles = useQuery(api.access.listRoles, {});
  const upsertRole = useMutation(api.access.upsertRole);
  const deleteRole = useMutation(api.access.deleteRole);
  const setUserRole = useMutation(api.access.setUserRole);
  const removeEmployee = useMutation(api.access.removeEmployee);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDoc | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);

  function openEdit(role: RoleDoc | null) {
    setEditing(role);
    setRoleName(role?.name ?? "");
    setPermissions((role?.permissions ?? []) as Section[]);
    setDialogOpen(true);
  }

  async function handleSaveRole() {
    if (!roleName.trim()) {
      toast.error("نام نقش را وارد کنید");
      return;
    }
    if (permissions.length === 0) {
      toast.error("حداقل یک دسترسی انتخاب کنید");
      return;
    }
    setSaving(true);
    try {
      await upsertRole({
        id: editing?._id as never,
        name: roleName.trim(),
        permissions,
      });
      toast.success(editing ? "نقش ویرایش شد" : "نقش جدید ساخته شد");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner) {
    return (
      <AppShell title="کاربران و دسترسی‌ها">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            فقط رییس کارخانه به این بخش دسترسی دارد.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="کاربران و دسترسی‌ها"
      subtitle="مدیریت نقش‌ها و سطوح دسترسی کارمندان"
      actions={
        <Button onClick={() => openEdit(null)} className="gap-2">
          <Plus className="size-4" />
          نقش جدید
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employees */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4 text-blue-600" />
              کارمندان
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!users || !roles ? (
              <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />
            ) : users.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                کاربری جز رییس ثبت نشده است
              </p>
            ) : (
              users.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">
                      {u.name || u.email || "کاربر"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground" dir="ltr">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.isOwner ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-800">
                        رییس کارخانه
                      </span>
                    ) : (
                      <>
                        <select
                          className="h-9 rounded-lg border-2 bg-background px-2 text-xs font-medium"
                          value={u.roleId ?? ""}
                          onChange={async (e) => {
                            const roleId = e.target.value || undefined;
                            await setUserRole({
                              userId: u._id as never,
                              roleId: roleId as never,
                            });
                            toast.success("نقش کاربر به‌روزرسانی شد");
                          }}
                        >
                          <option value="">بدون نقش</option>
                          {roles.map((r: RoleDoc) => (
                            <option key={r._id} value={r._id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={async () => {
                            if (!confirm(`حذف دسترسی کارمند «${u.name || u.email}»؟`)) return;
                            await removeEmployee({ userId: u._id as never });
                            toast.success("کارمند حذف شد");
                          }}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">نقش‌ها و دسترسی‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!roles ? (
              <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />
            ) : (
              roles.map((r: RoleDoc) => (
                <div
                  key={r._id}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{r.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.permissions.map((p) => (
                        <span
                          key={p}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          {SECTIONS.find((s) => s.id === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {r.name !== "رییس کارخانه" && (
                      <>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={async () => {
                            if (!confirm(`حذف نقش «${r.name}»؟`)) return;
                            await deleteRole({ id: r._id as never });
                            toast.success("نقش حذف شد");
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش نقش" : "نقش جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 text-sm font-semibold">نام نقش</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="مثلا: مدیر فروش، انباردار، ویزیتور"
                className="h-11 border-2"
              />
            </div>
            <div>
              <Label className="mb-2 text-sm font-semibold">دسترسی بخش‌ها</Label>
              <div className="grid gap-2">
                {SECTIONS.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Checkbox
                      checked={permissions.includes(s.id)}
                      onCheckedChange={(checked) =>
                        setPermissions((prev) =>
                          checked
                            ? ([...prev, s.id] as Section[])
                            : prev.filter((p) => p !== s.id),
                        )
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleSaveRole} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره نقش
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function useAccessGuard() {
  return useMyAccess();
}

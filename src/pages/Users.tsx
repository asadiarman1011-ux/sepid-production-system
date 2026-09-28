import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Section } from "@/convex/access";
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
import { toast } from "sonner";
import { SECTIONS } from "@/lib/sections";
import { Loader2, Pencil, Plus, Shield, Trash2, UserRound } from "lucide-react";

type PermLevel = "none" | "view" | "full";
type Levels = Partial<Record<Section, PermLevel>>;

type RoleDoc = {
  _id: string;
  name: string;
  levels?: Partial<Record<string, PermLevel>>;
  permissions?: string[];
};

const LEVEL_LABEL: Record<PermLevel, string> = {
  none: "هیچ",
  view: "فقط مشاهده",
  full: "دسترسی کامل",
};

const LEVEL_STYLE: Record<PermLevel, string> = {
  none: "bg-muted text-muted-foreground",
  view: "bg-amber-100 text-amber-800",
  full: "bg-emerald-100 text-emerald-800",
};

function levelsOf(r: RoleDoc): Levels {
  if (r.levels) return r.levels as Levels;
  // سازگاری با نقش‌های قدیمی
  return Object.fromEntries((r.permissions ?? []).map((s) => [s, "full"])) as Levels;
}

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
  const [levels, setLevels] = useState<Levels>({});
  const [saving, setSaving] = useState(false);

  function openEdit(role: RoleDoc | null) {
    setEditing(role);
    setRoleName(role?.name ?? "");
    setLevels(role ? levelsOf(role) : {});
    setDialogOpen(true);
  }

  async function handleSaveRole() {
    if (!roleName.trim()) {
      toast.error("نام نقش را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await upsertRole({
        id: editing?._id as never,
        name: roleName.trim(),
        levels: levels as Record<string, PermLevel>,
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
      subtitle="برای هر بخش تعیین کن: هیچ / فقط مشاهده / دسترسی کامل"
      actions={
        <Button onClick={() => openEdit(null)} className="gap-2 shadow-md shadow-blue-600/20">
          <Plus className="size-4" />
          نقش جدید
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* کارکنان */}
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <UserRound className="size-4" />
              </span>
              کارکنان
              {users && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">
                  {users.length}
                </span>
              )}
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
              users.map((u) => {
                const role = roles.find((r) => r._id === u.roleId);
                const lv = role ? levelsOf(role as RoleDoc) : {};
                return (
                  <div
                    key={u._id}
                    className="rounded-xl border p-3 transition-colors hover:border-blue-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">
                          {u.name || u.email || "کاربر"}
                          {u.isOwner && (
                            <span className="mr-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                              رییس کارخانه
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {u.jobTitle && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-800">
                              {u.jobTitle}
                            </span>
                          )}
                          <span className="truncate" dir="ltr">{u.email}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!u.isOwner && (
                          <>
                            <select
                              className="h-9 max-w-36 rounded-lg border-2 bg-background px-2 text-xs font-medium"
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
                              <option value="">— بدون نقش —</option>
                              {roles.map((r: RoleDoc) => (
                                <option key={r._id} value={r._id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm(`حذف دسترسی کارمند «${u.name || u.email}»؟`)) return;
                                await removeEmployee({ userId: u._id as never });
                                toast.success("کارمند حذف شد");
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* سطوح دسترسی خوانا */}
                    {!u.isOwner && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t pt-2.5">
                        {SECTIONS.map((s) => {
                          const l = (lv[s.id] ?? "none") as PermLevel;
                          return (
                            <span
                              key={s.id}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[l]}`}
                            >
                              {s.label}: {LEVEL_LABEL[l]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* نقش‌ها */}
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Shield className="size-4" />
              </span>
              نقش‌ها و دسترسی‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!roles ? (
              <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />
            ) : (
              roles.map((r: RoleDoc) => {
                const lv = levelsOf(r);
                return (
                  <div
                    key={r._id}
                    className="rounded-xl border p-3 transition-colors hover:border-blue-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{r.name}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {SECTIONS.map((s) => {
                            const l = (lv[s.id] ?? "none") as PermLevel;
                            return (
                              <span
                                key={s.id}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[l]}`}
                              >
                                {s.label}: {LEVEL_LABEL[l]}
                              </span>
                            );
                          })}
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
                              className="size-8 text-destructive hover:bg-destructive/10"
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
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
              <Label className="mb-2 text-sm font-semibold">
                سطح دسترسی هر بخش
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}— هیچ / فقط مشاهده / دسترسی کامل
                </span>
              </Label>
              <div className="grid gap-2">
                {SECTIONS.map((s) => {
                  const cur = (levels[s.id] ?? "none") as PermLevel;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <span className="text-sm font-bold">{s.label}</span>
                      <div className="flex gap-1">
                        {(["none", "view", "full"] as PermLevel[]).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() =>
                              setLevels((prev) => ({ ...prev, [s.id]: l }))
                            }
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                              cur === l
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {LEVEL_LABEL[l]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
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

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserRound } from "lucide-react";

/** بعد از ورود، اگر کاربر هنوز نام ندارد یک‌بار این دیالوگ باز می‌شود */
export function ProfileDialog() {
  const { user, isAuthenticated } = useAuth();
  const updateProfile = useMutation(api.access.updateProfile);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const userId = user?._id ?? null;
  const key = userId ? `profile:done:${userId}` : null;
  const needsProfile =
    isAuthenticated && user != null && !user.name && key != null && localStorage.getItem(key) !== "1";

  useEffect(() => {
    if (needsProfile) setOpen(true);
  }, [needsProfile]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("نام خود را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), jobTitle: jobTitle.trim() || undefined });
      if (key) localStorage.setItem(key, "1");
      toast.success("پروفایل ذخیره شد");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره پروفایل");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    if (key) localStorage.setItem(key, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleSkip())}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-blue-700" />
            خوش آمدی! خودت را معرفی کن
          </DialogTitle>
          <DialogDescription>
            نام و نوع شغل تو در برنامه نمایش داده می‌شود (به‌جای آدرس ایمیل)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 text-sm font-semibold">نام و نام خانوادگی *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلا: رضا محمدی"
              className="h-11 border-2 font-medium"
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5 text-sm font-semibold">
              نوع شغل
              <span className="text-xs font-normal text-muted-foreground"> (مثلا ویزیتور، حسابدار، انباردار)</span>
            </Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="مثلا: ویزیتور فروش"
              className="h-11 border-2"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره و ادامه
            </Button>
            <Button variant="ghost" onClick={handleSkip} disabled={saving}>
              بعدا
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

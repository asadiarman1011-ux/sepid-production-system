import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { formatNumber } from "@/lib/jalali";
import { toast } from "sonner";
import { Factory, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";

/**
 * کارت «ریست کارخانه» — فقط مدیر می‌بیند.
 * همه اطلاعات برنامه پاک می‌شود: سفارش‌ها، مشتریان، انبار، اعلان‌ها،
 * یادگرفته‌های فرم‌ها، تنظیمات کارخانه، نقش‌ها و حتی حساب کاربران.
 * برنامه دقیقا مثل روز اول می‌شود؛ رمز ریست همان رمز پشتیبان‌گیری است.
 */
export function FactoryResetCard() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const { signOut } = useAuth();
  const factoryReset = useMutation(api.resetData.factoryReset);

  async function handleReset() {
    if (!pw) {
      toast.error("رمز ریست کارخانه را وارد کنید");
      return;
    }
    if (
      !confirm(
        "ریست کارخانه: همه اطلاعات برنامه برای همیشه پاک می‌شود!\n\n" +
          "سفارش‌ها، مشتریان، انبار و رویدادهایش، اعلان‌ها، یادگرفته‌های فرم‌ها، " +
          "تنظیمات کارخانه، نقش‌ها و حساب همه کاربران — حتی این که کی مدیر است و " +
          "کی چه شغلی دارد — همه از بین می‌رود.\n\n" +
          "بعد از ریست، اولین نفری که وارد سامانه شود رییس کارخانه می‌شود.\n" +
          "مطمئنید؟",
      )
    )
      return;

    setBusy(true);
    let total = 0;
    try {
      // هر فراخوانی یک دسته را پاک می‌کند؛ تا تمام‌شدن ادامه می‌دهیم
      let done = false;
      for (let i = 0; i < 300 && !done; i++) {
        const r = await factoryReset({ password: pw });
        const deleted = (r?.deleted ?? {}) as Record<string, number>;
        total += Object.values(deleted).reduce((s, n) => s + n, 0);
        done = r?.done ?? true;
      }
      toast.success(
        `ریست کارخانه انجام شد — ${formatNumber(total)} رکورد پاک شد`,
        { duration: 8000 },
      );
      toast.info("همه‌چیز به حالت اول برگشت. حالا از صفحه اول دوباره وارد شوید.", {
        duration: 8000,
      });
      // حساب‌ها هم پاک شده‌اند؛ خروج و بازگشت به صفحه اول
      try {
        await signOut();
      } catch {
        /* نشست از قبل پاک شده */
      }
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ریست کارخانه انجام نشد");
      setBusy(false);
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Factory className="size-4 text-red-700" />
          ریست کارخانه (بازگشت به تنظیمات کارخانه)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-6 text-red-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>
            همه اطلاعات برنامه کلا از بین می‌رود: سفارش‌ها، مشتریان، انبار و رویدادهایش،
            اعلان‌ها، یادگرفته‌های فرم‌ها، تنظیمات کارخانه، <b>نقش‌ها و حساب همه کاربران</b> —
            حتی این که کی مدیر است و کی شغل دیگری دارد. بعد از ریست، اولین نفری که وارد شود
            رییس کارخانه می‌شود.
          </span>
        </div>

        <p className="mb-2 text-xs leading-6 text-muted-foreground">
          این گزینه فقط برای مدیر است. برای اجرا، رمز ریست کارخانه را وارد کنید
          (همان رمز پشتیبان‌گیری).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            dir="ltr"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleReset();
              }
            }}
            placeholder="رمز ریست کارخانه"
            className="h-11 flex-1 border-2 text-right"
            autoComplete="off"
            disabled={busy}
          />
          <Button variant="destructive" className="gap-2" disabled={busy} onClick={handleReset}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
            {busy ? "در حال پاک‌سازی…" : "ریست کامل کارخانه"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          این عمل بازگشت‌پذیر نیست؛ اگر لازم است اول از بخش «پشتیبان‌گیری اطلاعات» خروجی بگیرید.
        </p>
      </CardContent>
    </Card>
  );
}

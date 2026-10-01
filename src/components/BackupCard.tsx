import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Database,
  Download,
  FileDown,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  BACKUP_PASSWORD,
  downloadExcelBackup,
  openBackupReportPdf,
  type BackupData,
} from "@/lib/backup";
import { toFaDigits } from "@/lib/jalali";

/** کارت پشتیبان‌گیری: رمز → اکسل بخش‌بندی‌شده / گزارش PDF */
export function BackupCard({ factoryName }: { factoryName: string }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const data = useQuery(api.backup.exportAll, unlocked ? {} : "skip");

  function tryUnlock() {
    if (pw === BACKUP_PASSWORD) {
      setUnlocked(true);
      toast.success("دسترسی پشتیبان‌گیری باز شد");
    } else {
      toast.error("رمز اشتباه است");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-blue-700" />
          پشتیبان‌گیری اطلاعات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs leading-6 text-muted-foreground">
          کل اطلاعات واردشده — مشتریان، سفارش‌ها و اقلام، انبار، رویدادهای انبار، کاربران،
          نقش‌ها و تنظیمات — به‌صورت <b>بخش‌بندی‌شده</b> خروجی گرفته می‌شود: فایل اکسل با یک
          شیت جداگانه برای هر بخش، یا گزارش PDF آماده چاپ و بایگانی.
        </p>

        {!unlocked ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              dir="ltr"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tryUnlock();
                }
              }}
              placeholder="رمز پشتیبان‌گیری"
              className="h-11 flex-1 border-2 text-right"
              autoComplete="off"
            />
            <Button onClick={tryUnlock} className="gap-2">
              <Lock className="size-4" />
              بازکردن دسترسی
            </Button>
          </div>
        ) : !data ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال آماده‌سازی داده‌ها…
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="rounded-full bg-muted px-2 py-0.5">
                مشتریان: {toFaDigits(data.customers.length)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                سفارش‌ها: {toFaDigits(data.orders.length)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                اقلام انبار: {toFaDigits(data.warehouseItems.length)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                کاربران: {toFaDigits(data.users.length)}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="gap-2"
                onClick={() => downloadExcelBackup(data as unknown as BackupData)}
              >
                <Download className="size-4" />
                دریافت اکسل (بخش‌بندی‌شده)
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => openBackupReportPdf(data as unknown as BackupData, factoryName)}
              >
                <FileDown className="size-4" />
                دریافت گزارش PDF
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              در پنجره گزارش PDF می‌توانید «Save as PDF» را انتخاب کنید تا فایل ذخیره شود.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

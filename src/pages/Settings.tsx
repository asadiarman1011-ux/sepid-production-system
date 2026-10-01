import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell, useMyAccess } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2,
  Check,
  History,
  Loader2,
  MapPin,
  Moon,
  Package,
  Palette,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";
import { BackupCard } from "@/components/BackupCard";

const THEMES: { id: string; label: string; swatch: string }[] = [
  { id: "navy", label: "سورمه‌ای (پیش‌فرض)", swatch: "bg-[#1e3a6e]" },
  { id: "indigo", label: "بنفش سیر", swatch: "bg-[#4338ca]" },
  { id: "teal", label: "آبی‌نفتی", swatch: "bg-[#0f766e]" },
  { id: "graphite", label: "گرافیتی", swatch: "bg-[#3f3f46]" },
];

type AppSettings = {
  factoryName?: string;
  defaultCity?: string;
  deliveryMethods?: string[];
  lowStockThreshold?: number;
  currency?: string;
  phone?: string;
  address?: string;
  darkMode?: boolean;
};

export default function Settings() {
  const { isOwner, isLoading, levelOf, access } = useMyAccess();
  const lvl = levelOf("settings") as "none" | "view" | "full";
  const canEditSettings = isOwner || lvl === "full";
  const canViewSettings = canEditSettings || lvl === "view";
  const settings = useQuery(api.appSettings.get, {});
  const update = useMutation(api.appSettings.update);
  const setMyTheme = useMutation(api.appSettings.setMyTheme);

  const [factoryName, setFactoryName] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [currency, setCurrency] = useState("تومان");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [colorTheme, setColorTheme] = useState("navy");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setFactoryName(settings.factoryName ?? "تولیدی پوشاک سپید");
      setDefaultCity(settings.defaultCity ?? "");
      setCurrency(settings.currency ?? "تومان");
      setPhone(settings.phone ?? "");
      setAddress(settings.address ?? "");
      setLowStockThreshold(settings.lowStockThreshold ?? 5);
      setMethods(settings.deliveryMethods ?? ["حضوری", "اسنپ", "باربری", "پست"]);
      // دارک مود و تم از انتخاب شخصی کاربر (سرور) یا localStorage
      const stored = (() => {
        try {
          return localStorage.getItem("dark-mode");
        } catch {
          return null;
        }
      })();
      if (stored === null) {
        const sd = settings.darkMode ?? false;
        setDarkMode(sd);
        document.documentElement.classList.toggle("dark", sd);
      } else {
        setDarkMode(stored === "1");
      }
      try {
        const lt = localStorage.getItem("color-theme");
        setColorTheme(lt ?? "navy");
        document.documentElement.setAttribute("data-theme", lt ?? "navy");
      } catch {
        /* noop */
      }
      setLoaded(true);
    }
  }, [settings, loaded]);

  // تم و حالت شب شخصیِ ذخیره‌شده روی حساب کاربر (از سرور) اولویت دارد
  const myTheme = access?.themeColor as string | null | undefined;
  const myDark = access?.themeDark as boolean | null | undefined;
  useEffect(() => {
    if (myTheme) setColorTheme(myTheme);
    if (typeof myDark === "boolean") setDarkMode(myDark);
  }, [myTheme, myDark]);

  function pickTheme(id: string) {
    setColorTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("color-theme", id);
    } catch {
      /* noop */
    }
    setMyTheme({ colorTheme: id }).catch(() => {});
  }

  function toggleDark(on: boolean) {
    setDarkMode(on);
    document.documentElement.classList.toggle("dark", on);
    try {
      localStorage.setItem("dark-mode", on ? "1" : "0");
    } catch {
      /* noop */
    }
    setMyTheme({ darkMode: on }).catch(() => {});
  }

  async function handleSave() {
    if (!canEditSettings) {
      toast.error("شما اجازه تغییر تنظیمات کلی را ندارید");
      return;
    }
    setSaving(true);
    try {
      await update({
        factoryName: factoryName.trim() || undefined,
        defaultCity: defaultCity.trim() || undefined,
        currency: currency.trim() || "تومان", // ذخیره خالی → دیفالت تومان
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        lowStockThreshold,
        deliveryMethods: methods.length ? methods : ["حضوری", "اسنپ", "باربری", "پست"],
      });
      toast.success("تنظیمات ذخیره شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell title="تنظیمات">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // بدون دسترسی به تنظیمات: فقط تنظیمات شخصی (تم و حالت شب خودت)
  if (!canViewSettings) {
    return (
      <AppShell title="تنظیمات" subtitle="تنظیمات شخصی حساب شما">
        <div className="mx-auto grid max-w-3xl gap-5">
          <ThemeCard colorTheme={colorTheme} onPick={pickTheme} />
          <DarkModeCard darkMode={darkMode} onToggle={toggleDark} />
          <p className="text-center text-xs leading-6 text-muted-foreground">
            برای دیدن و تغییر تنظیمات کلی سامانه (اطلاعات کارخانه، روش‌های تحویل، انبار و
            پشتیبان‌گیری) باید دسترسی بخش «تنظیمات» را داشته باشید.
          </p>
        </div>
      </AppShell>
    );
  }

  if (!settings) {
    return (
      <AppShell title="تنظیمات">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="تنظیمات"
      subtitle="پیکربندی کلی سامانه، اطلاعات کارخانه و روش‌های تحویل"
      actions={
        canEditSettings ? (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیره تنظیمات
          </Button>
        ) : undefined
      }
    >
      {!canEditSettings && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          دسترسی شما به تنظیمات «فقط مشاهده» است؛ تم و حالت شب شخصی خودت را می‌توانی عوض کنی.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* اطلاعات کارخانه */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-blue-700" />
              اطلاعات کارخانه
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label className="mb-1.5 text-sm font-semibold">نام مجموعه</Label>
              <Input
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                placeholder="تولیدی پوشاک سپید"
                className="h-11 border-2 font-medium"
                disabled={!canEditSettings}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                این نام در سایدبار و صفحات سامانه نمایش داده می‌شود
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 text-sm font-semibold">شهر پیش‌فرض</Label>
                <Input
                  value={defaultCity}
                  onChange={(e) => setDefaultCity(e.target.value)}
                  placeholder="مثلا تهران"
                  className="h-11 border-2"
                  disabled={!canEditSettings}
                />
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">واحد پول</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="تومان / ریال"
                  className="h-11 border-2"
                  list="currency-suggestions"
                  disabled={!canEditSettings}
                />
                <datalist id="currency-suggestions">
                  <option value="تومان" />
                  <option value="ریال" />
                  <option value="ت" />
                  <option value="ریال ایران" />
                </datalist>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  این واحد بلافاصله در همه بخش‌ها (سفارش، تحویل، مشتریان، انبار و نمودار فروش)
                  اعمال می‌شود
                </p>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
                <MapPin className="size-3.5 text-blue-700" />
                نشانی کارخانه
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 border-2"
                disabled={!canEditSettings}
              />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">تلفن کارخانه</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                style={{ textAlign: "right" }}
                className="h-11 border-2"
                disabled={!canEditSettings}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {/* تحویل */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-blue-700" />
                روش‌های تحویل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs leading-6 text-muted-foreground">
                این گزینه‌ها هنگام ثبت تحویل سفارش پیشنهاد می‌شوند (مثل اسنپ یا باربری)
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                {methods.map((m, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800"
                  >
                    {m}
                    {canEditSettings && (
                      <button
                        type="button"
                        onClick={() => setMethods((prev) => prev.filter((_, j) => j !== i))}
                        className="text-blue-400 hover:text-blue-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {methods.length === 0 && (
                  <span className="text-xs text-muted-foreground">روشی ثبت نشده</span>
                )}
              </div>
              {canEditSettings && (
              <div className="flex gap-2">
                <Input
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  placeholder="روش جدید (مثلا تیپاکس)"
                  className="h-10 border-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMethod.trim()) {
                      e.preventDefault();
                      setMethods((prev) => [...prev, newMethod.trim()]);
                      setNewMethod("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    if (!newMethod.trim()) return;
                    if (methods.includes(newMethod.trim())) {
                      toast.error("این روش قبلا اضافه شده");
                      return;
                    }
                    setMethods((prev) => [...prev, newMethod.trim()]);
                    setNewMethod("");
                  }}
                >
                  <Plus className="size-4" />
                  افزودن
                </Button>
              </div>
              )}
            </CardContent>
          </Card>

        {/* تم رنگی شخصی */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4 text-blue-700" />
              تم رنگی سامانه
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs leading-6 text-muted-foreground">
              رنگ اصلی و سایدبار فورا عوض می‌شود؛ این انتخاب شخصیِ حساب توست و روی دیگران اثری ندارد
            </p>
            <ThemePicker colorTheme={colorTheme} onPick={pickTheme} />
          </CardContent>
        </Card>

        {/* دارک مود شخصی */}
        <DarkModeCard darkMode={darkMode} onToggle={toggleDark} />

        {/* انبار */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-blue-700" />
              انبار
            </CardTitle>
          </CardHeader>
            <CardContent>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">
                  حداقل موجودی هشدار (پیش‌فرض)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="h-11 border-2"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                  disabled={!canEditSettings}
                />
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  اقلامی که موجودی‌شان به این عدد برسد با رنگ قرمز هشدار داده می‌شوند
                  (برای هر قلم می‌توانید مقدار جداگانه هم تعیین کنید)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* پشتیبان‌گیری */}
          {canEditSettings && <BackupCard factoryName={factoryName || "تولیدی پوشاک سپید"} />}

          {/* درباره */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-blue-700" />
                درباره سامانه
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              <div className="flex items-center justify-between py-1">
                <span>نسخه</span>
                <span className="font-bold text-foreground">۱.۲</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between py-1">
                <span>مجموعه</span>
                <span className="font-bold text-foreground">{factoryName || "—"}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between py-1">
                <span>وضعیت</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <Check className="size-4" />
                  فعال
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------- کارت‌های مشترک تنظیمات شخصی ------------------------ */

function ThemePicker({
  colorTheme,
  onPick,
}: {
  colorTheme: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onPick(t.id)}
                  className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-right text-sm font-bold transition-all ${
                    colorTheme === t.id
                      ? "border-blue-600 bg-blue-50 shadow-sm"
                      : "border-border hover:border-blue-300"
                  }`}
                >
          <span className={`size-6 shrink-0 rounded-lg shadow-inner ${t.swatch}`} />
          {t.label}
          {colorTheme === t.id && <Check className="mr-auto size-4 text-blue-700" />}
        </button>
      ))}
    </div>
  );
}

function ThemeCard({
  colorTheme,
  onPick,
}: {
  colorTheme: string;
  onPick: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="size-4 text-blue-700" />
          تم رنگی من
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs leading-6 text-muted-foreground">
          رنگ اصلی و سایدبار فورا عوض می‌شود؛ این انتخاب شخصیِ حساب توست و با هر دستگاهی که وارد
          شوی همراهت می‌ماند
        </p>
        <ThemePicker colorTheme={colorTheme} onPick={onPick} />
      </CardContent>
    </Card>
  );
}

function DarkModeCard({
  darkMode,
  onToggle,
}: {
  darkMode: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="size-4 text-blue-700" />
          حالت شب (Dark Mode)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-bold">فعال‌سازی حالت شب</div>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              کل سامانه با تم تیره نمایش داده می‌شود — برای کار در محیط کم‌نور
            </p>
          </div>
          <Switch checked={darkMode} onCheckedChange={onToggle} />
        </div>
      </CardContent>
    </Card>
  );
}

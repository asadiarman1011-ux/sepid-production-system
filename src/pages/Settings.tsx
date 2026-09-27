import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell, useMyAccess } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Check,
  History,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";

type AppSettings = {
  factoryName?: string;
  defaultCity?: string;
  deliveryMethods?: string[];
  lowStockThreshold?: number;
  currency?: string;
  phone?: string;
  address?: string;
};

export default function Settings() {
  const { isOwner } = useMyAccess();
  const settings = useQuery(api.appSettings.get, {});
  const update = useMutation(api.appSettings.update);

  const [factoryName, setFactoryName] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [currency, setCurrency] = useState("تومان");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
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
      setLoaded(true);
    }
  }, [settings, loaded]);

  async function handleSave() {
    setSaving(true);
    try {
      await update({
        factoryName: factoryName.trim() || undefined,
        defaultCity: defaultCity.trim() || undefined,
        currency: currency.trim() || "تومان",
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

  if (!isOwner) {
    return (
      <AppShell title="تنظیمات">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            فقط رییس کارخانه به تنظیمات دسترسی دارد.
          </CardContent>
        </Card>
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
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره تنظیمات
        </Button>
      }
    >
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
                />
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">واحد پول</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-11 border-2"
                />
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
                    <button
                      type="button"
                      onClick={() => setMethods((prev) => prev.filter((_, j) => j !== i))}
                      className="text-blue-400 hover:text-blue-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                ))}
                {methods.length === 0 && (
                  <span className="text-xs text-muted-foreground">روشی ثبت نشده</span>
                )}
              </div>
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
            </CardContent>
          </Card>

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
                />
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  اقلامی که موجودی‌شان به این عدد برسد با رنگ قرمز هشدار داده می‌شوند
                  (برای هر قلم می‌توانید مقدار جداگانه هم تعیین کنید)
                </p>
              </div>
            </CardContent>
          </Card>

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
                <span className="font-bold text-foreground">۱.۱</span>
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

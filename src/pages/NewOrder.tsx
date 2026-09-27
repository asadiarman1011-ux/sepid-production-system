import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { JalaliDateField } from "@/components/JalaliDateField";
import { MapPicker } from "@/components/MapPicker";
import { PresetInput, PriceInput } from "@/components/PresetInput";
import { useMyAccess } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatMoney, toFaDigits, todayJalaliLabel, jalaliLabelToTs } from "@/lib/jalali";
import { BadgePlus, CheckCircle2, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "convex/react";

type ItemState = {
  productType: string;
  productTypePrice: number | undefined;
  material: string;
  materialPrice: number | undefined;
  color: string;
  printFront: string;
  printFrontPrice: number | undefined;
  printBack: string;
  printBackPrice: number | undefined;
  buttonType: string;
  buttonPrice: number | undefined;
  zipperType: string;
  zipperPrice: number | undefined;
  pocketType: string;
  pocketPrice: number | undefined;
  size: string;
  qty: number;
  unitPrice: number;
  notes: string;
};

const emptyItem = (): ItemState => ({
  productType: "",
  productTypePrice: undefined,
  material: "",
  materialPrice: undefined,
  color: "",
  printFront: "",
  printFrontPrice: undefined,
  printBack: "",
  printBackPrice: undefined,
  buttonType: "",
  buttonPrice: undefined,
  zipperType: "",
  zipperPrice: undefined,
  pocketType: "",
  pocketPrice: undefined,
  size: "",
  qty: 1,
  unitPrice: 0,
  notes: "",
});

function lineTotal(it: ItemState) {
  return (
    (it.productTypePrice ?? 0) +
    (it.materialPrice ?? 0) +
    (it.printFrontPrice ?? 0) +
    (it.printBackPrice ?? 0) +
    (it.buttonPrice ?? 0) +
    (it.zipperPrice ?? 0) +
    (it.pocketPrice ?? 0)
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { isOwner, perms } = useMyAccess();
  const [params] = useSearchParams();
  const preselectedId = params.get("customerId");
  const preselected = useQuery(
    api.customers.get,
    preselectedId ? { id: preselectedId as never } : "skip",
  );
  const appSettings = useQuery(api.appSettings.get, {});
  const [header, setHeader] = useState({
    customerName: "",
    phone: "",
    city: "",
    address: "",
    dateLabel: todayJalaliLabel(),
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemState[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const createOrder = useMutation(api.orders.create);
  const upsertPreset = useMutation(api.presets.upsert);

  // prefill city from settings (فقط وقتی مشتری انتخاب نشده)
  useEffect(() => {
    if (!preselectedId && appSettings?.defaultCity) {
      setHeader((h) => ({ ...h, city: h.city || appSettings.defaultCity! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings, preselectedId]);

  // prefill from selected customer
  useEffect(() => {
    if (preselected?.customer && preselectedId) {
      const c = preselected.customer;
      setCustomerId(preselectedId);
      setHeader((h) => ({
        ...h,
        customerName: c.name,
        phone: c.phone,
        city: c.city ?? "",
        address: c.address ?? "",
      }));
      if (c.location) setLocation(c.location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (it.unitPrice > 0 ? it.unitPrice : lineTotal(it)) * (it.qty || 0),
        0,
      ),
    [items],
  );

  function updateItem(idx: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function learnPresets(it: ItemState) {
    if (it.productType) upsertPreset({ category: "productType", value: it.productType, price: it.productTypePrice });
    if (it.material) upsertPreset({ category: "material", value: it.material, price: it.materialPrice });
    if (it.color) upsertPreset({ category: "color", value: it.color });
    if (it.printFront) upsertPreset({ category: "print", value: it.printFront, price: it.printFrontPrice });
    if (it.printBack) upsertPreset({ category: "print", value: it.printBack, price: it.printBackPrice });
    if (it.buttonType) upsertPreset({ category: "buttonType", value: it.buttonType, price: it.buttonPrice });
    if (it.zipperType) upsertPreset({ category: "zipperType", value: it.zipperType, price: it.zipperPrice });
    if (it.pocketType) upsertPreset({ category: "pocketType", value: it.pocketType, price: it.pocketPrice });
    if (it.size) upsertPreset({ category: "size", value: it.size });
    if (header.city) upsertPreset({ category: "city", value: header.city });
  }

  async function handleSubmit() {
    if (!header.customerName.trim()) {
      toast.error("نام مشتری را وارد کنید");
      return;
    }
    if (!header.phone.trim()) {
      toast.error("شماره تماس را وارد کنید");
      return;
    }
    const validItems = items.filter((it) => it.productType.trim() && it.qty > 0);
    if (validItems.length === 0) {
      toast.error("حداقل یک محصول با «نوع محصول» و «تعداد» وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await createOrder({
        customerId: (customerId ?? undefined) as never,
        customerName: header.customerName.trim(),
        phone: header.phone.trim(),
        city: header.city.trim() || undefined,
        address: header.address.trim() || undefined,
        location: location ?? undefined,
        dateLabel: header.dateLabel,
        dateTs: jalaliLabelToTs(header.dateLabel) ?? Date.now(),
        items: validItems.map((it) => ({
          productType: it.productType.trim(),
          productTypePrice: it.productTypePrice,
          material: it.material.trim() || undefined,
          materialPrice: it.materialPrice,
          color: it.color.trim() || undefined,
          printFront: it.printFront.trim() || undefined,
          printFrontPrice: it.printFrontPrice,
          printBack: it.printBack.trim() || undefined,
          printBackPrice: it.printBackPrice,
          buttonType: it.buttonType.trim() || undefined,
          buttonPrice: it.buttonPrice,
          zipperType: it.zipperType.trim() || undefined,
          zipperPrice: it.zipperPrice,
          pocketType: it.pocketType.trim() || undefined,
          pocketPrice: it.pocketPrice,
          size: it.size.trim() || undefined,
          qty: it.qty,
          unitPrice: it.unitPrice > 0 ? it.unitPrice : lineTotal(it),
          notes: it.notes.trim() || undefined,
        })),
        total,
        notes: notes.trim() || undefined,
      });
      validItems.forEach(learnPresets);
      toast.success(`سفارش برای «${header.customerName}» ثبت شد و به مشتریان اضافه شد`);
      navigate("/dashboard/customers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت سفارش");
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner && !perms.includes("orders")) {
    return (
      <AppShell title="ثبت سفارش">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            شما به بخش ثبت سفارش دسترسی ندارید.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="ثبت سفارش جدید"
      subtitle="فرم کامل سفارش — محصولات، قیمت‌ها، مشتری و لوکیشن"
      actions={
        <Button onClick={handleSubmit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          ثبت سفارش
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* اطلاعات مشتری */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-blue-600" />
                اطلاعات مشتری و سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-sm font-semibold">نام فرد یا شرکت</Label>
                <Input
                  value={header.customerName}
                  onChange={(e) => setHeader((h) => ({ ...h, customerName: e.target.value }))}
                  placeholder="مثلا: پوشاک البرز"
                  className="h-11 border-2 font-medium"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">شماره تماس</Label>
                <Input
                  value={header.phone}
                  onChange={(e) => setHeader((h) => ({ ...h, phone: e.target.value }))}
                  placeholder="09121234567"
                  className="h-11 border-2 text-right font-medium"
                  dir="ltr"
                />
              </div>
              <PresetInput
                category="city"
                label="نام شهر"
                value={header.city}
                onChange={(v) => setHeader((h) => ({ ...h, city: v }))}
                optional
              />
              <JalaliDateField
                label="تاریخ ثبت سفارش"
                value={header.dateLabel}
                onChange={(v) => setHeader((h) => ({ ...h, dateLabel: v }))}
              />
              <div className="sm:col-span-2">
                <Label className="mb-1.5 text-sm font-semibold">آدرس کتبی</Label>
                <Input
                  value={header.address}
                  onChange={(e) => setHeader((h) => ({ ...h, address: e.target.value }))}
                  placeholder="آدرس کامل مشتری"
                  className="h-11 border-2"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1.5 text-sm font-semibold">
                  لوکیشن (روی نقشه نقطه را انتخاب کنید)
                </Label>
                <MapPicker
                  lat={location?.lat ?? null}
                  lng={location?.lng ?? null}
                  onChange={(lat, lng) => setLocation({ lat, lng })}
                />
              </div>
            </CardContent>
          </Card>

          {/* اقلام سفارش */}
          <div className="space-y-4">
            {items.map((it, idx) => (
              <Card key={idx} className="border-2">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BadgePlus className="size-4 text-blue-600" />
                    محصول {toFaDigits(idx + 1)}
                  </CardTitle>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <PresetInput
                    category="productType"
                    label="نوع محصول"
                    value={it.productType}
                    onChange={(v) => updateItem(idx, { productType: v })}
                    placeholder="کاپشن، مانتو، شلوار…"
                  />
                  <PriceInput
                    label="قیمت محصول (تومان)"
                    value={it.productTypePrice}
                    onChange={(n) => updateItem(idx, { productTypePrice: n })}
                  />
                  <PresetInput
                    category="material"
                    label="جنس"
                    value={it.material}
                    onChange={(v) => updateItem(idx, { material: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت جنس"
                    value={it.materialPrice}
                    onChange={(n) => updateItem(idx, { materialPrice: n })}
                    optional
                  />
                  <PresetInput
                    category="color"
                    label="رنگ"
                    value={it.color}
                    onChange={(v) => updateItem(idx, { color: v })}
                    optional
                  />
                  <PresetInput
                    category="size"
                    label="سایز"
                    value={it.size}
                    onChange={(v) => updateItem(idx, { size: v })}
                    optional
                  />
                  <PresetInput
                    category="print"
                    label="چاپ جلو (متن یا نقش چاپ)"
                    value={it.printFront}
                    onChange={(v) => updateItem(idx, { printFront: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت چاپ جلو"
                    value={it.printFrontPrice}
                    onChange={(n) => updateItem(idx, { printFrontPrice: n })}
                    optional
                  />
                  <PresetInput
                    category="print"
                    label="چاپ پشت (متن یا نقش چاپ)"
                    value={it.printBack}
                    onChange={(v) => updateItem(idx, { printBack: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت چاپ پشت"
                    value={it.printBackPrice}
                    onChange={(n) => updateItem(idx, { printBackPrice: n })}
                    optional
                  />
                  <PresetInput
                    category="buttonType"
                    label="نوع دکمه"
                    value={it.buttonType}
                    onChange={(v) => updateItem(idx, { buttonType: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت دکمه"
                    value={it.buttonPrice}
                    onChange={(n) => updateItem(idx, { buttonPrice: n })}
                    optional
                  />
                  <PresetInput
                    category="zipperType"
                    label="نوع زیپ"
                    value={it.zipperType}
                    onChange={(v) => updateItem(idx, { zipperType: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت زیپ"
                    value={it.zipperPrice}
                    onChange={(n) => updateItem(idx, { zipperPrice: n })}
                    optional
                  />
                  <PresetInput
                    category="pocketType"
                    label="نوع جیب"
                    value={it.pocketType}
                    onChange={(v) => updateItem(idx, { pocketType: v })}
                    optional
                  />
                  <PriceInput
                    label="قیمت جیب"
                    value={it.pocketPrice}
                    onChange={(n) => updateItem(idx, { pocketPrice: n })}
                    optional
                  />
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">تعداد</Label>
                    <Input
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                      className="h-11 border-2 font-bold"
                    />
                  </div>
                  <PriceInput
                    label="قیمت واحد نهایی (خودکار یا دستی)"
                    value={it.unitPrice > 0 ? it.unitPrice : undefined}
                    onChange={(n) => updateItem(idx, { unitPrice: n ?? 0 })}
                  />
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 text-sm font-semibold">سایر توضیحات</Label>
                    <Textarea
                      value={it.notes}
                      onChange={(e) => updateItem(idx, { notes: e.target.value })}
                      placeholder="توضیحات این محصول"
                      className="min-h-16 border-2"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 sm:col-span-2">
                    <span className="text-sm font-medium">جمع این محصول</span>
                    <span className="font-black text-blue-700">
                      {formatMoney((it.unitPrice > 0 ? it.unitPrice : lineTotal(it)) * (it.qty || 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              <Plus className="size-4" />
              افزودن محصول دیگر به سفارش
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Label className="mb-1.5 text-sm font-semibold">سایر توضیحات سفارش</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات کلی سفارش…"
                className="min-h-20 border-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* خلاصه */}
        <div>
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">خلاصه سفارش</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((it, idx) => {
                const unit = it.unitPrice > 0 ? it.unitPrice : lineTotal(it);
                if (!it.productType && unit === 0) return null;
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      {it.productType || "محصول"} × {toFaDigits(it.qty)}
                    </span>
                    <span className="shrink-0 font-bold">{formatMoney(unit * it.qty)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-bold">مبلغ نهایی سفارش</span>
                <span className="text-lg font-black text-blue-700">{formatMoney(total)}</span>
              </div>
              <div className="rounded-xl bg-muted p-3 text-xs leading-6 text-muted-foreground">
                هر مقداری که در فرم تایپ کنید، دفعه بعد به عنوان پیش‌فرض پیشنهاد می‌شود
                (رنگ، جنس، چاپ، قیمت و…). سفارش ثبت‌شده به بخش مشتریان و تحویل نیز اضافه می‌شود.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

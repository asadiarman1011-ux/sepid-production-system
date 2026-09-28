import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { JalaliDateField } from "@/components/JalaliDateField";
import { MapPicker } from "@/components/MapPicker";
import { PresetInput, PriceInput, MoneyInput, thousandFa } from "@/components/PresetInput";
import { useMyAccess } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { toFaDigits, todayJalaliLabel, jalaliLabelToTs } from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import {
  BadgePlus,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useDraft } from "@/lib/useDraft";

type SizeRow = { size: string; qty: number };

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
  useSizes: boolean;
  sizes: SizeRow[];
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
  useSizes: false,
  sizes: [],
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

function itemQty(it: ItemState) {
  if (it.useSizes && it.sizes.length > 0) {
    return it.sizes.reduce((sum, s) => sum + (s.qty || 0), 0);
  }
  return it.qty || 0;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { isOwner, perms } = useMyAccess();
  const { currency, money } = useCurrency();
  const [params, setParams] = useSearchParams();
  const preselectedId = params.get("customerId");
  const editId = params.get("edit");
  const isEditMode = Boolean(editId);
  const existingOrder = useQuery(
    api.orders.get,
    editId ? { id: editId as never } : "skip",
  );
  const preselected = useQuery(
    api.customers.get,
    preselectedId ? { id: preselectedId as never } : "skip",
  );
  const appSettings = useQuery(api.appSettings.get, {});
  // پیش‌نویس: با هر رفرشِ پیش‌نمایش، همه چیز تایپ‌شده برمی‌گردد
  const [header, setHeader, clearHeader] = useDraft("new-order:header", {
    customerName: "",
    companyName: "",
    phone: "",
    city: "",
    address: "",
    dateLabel: todayJalaliLabel(),
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes, clearNotes] = useDraft("new-order:notes", "");
  const [items, setItems, clearItems] = useDraft<ItemState[]>("new-order:items", [emptyItem()]);
  const [saving, setSaving] = useState(false);
  const loadedEdit = useRef(false);

  const createOrder = useMutation(api.orders.create);
  const updateOrder = useMutation(api.orders.update);
  const upsertPreset = useMutation(api.presets.upsert);

  // prefill city from settings (فقط وقتی مشتری انتخاب نشده)
  useEffect(() => {
    if (!preselectedId && appSettings?.defaultCity) {
      setHeader((h) => ({ ...h, city: h.city || appSettings.defaultCity! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings, preselectedId]);

  // بارگذاری سفارش موجود برای ویرایش
  useEffect(() => {
    if (existingOrder && editId && !loadedEdit.current) {
      loadedEdit.current = true;
      const o = existingOrder as unknown as {
        customerName: string;
        companyName?: string;
        phone: string;
        city?: string;
        address?: string;
        location?: { lat: number; lng: number };
        dateLabel: string;
        items: {
          productType: string;
          productTypePrice?: number;
          material?: string;
          materialPrice?: number;
          color?: string;
          printFront?: string;
          printFrontPrice?: number;
          printBack?: string;
          printBackPrice?: number;
          buttonType?: string;
          buttonPrice?: number;
          zipperType?: string;
          zipperPrice?: number;
          pocketType?: string;
          pocketPrice?: number;
          sizes?: { size: string; qty: number }[];
          qty: number;
          unitPrice: number;
          notes?: string;
        }[];
        notes?: string;
      };
      setHeader((h) => ({
        ...h,
        customerName: o.customerName?.includes(" — ")
          ? o.customerName.split(" — ")[0]
          : (o.customerName ?? ""),
        companyName: o.customerName?.includes(" — ")
          ? o.customerName.split(" — ").slice(1).join(" — ")
          : "",
        phone: o.phone ?? "",
        city: o.city ?? "",
        address: o.address ?? "",
        dateLabel: o.dateLabel,
      }));
      setLocation(o.location ?? null);
      setNotes(o.notes ?? "");
      setItems(
        o.items.map((it) => ({
          productType: it.productType ?? "",
          productTypePrice: it.productTypePrice,
          material: it.material ?? "",
          materialPrice: it.materialPrice,
          color: it.color ?? "",
          printFront: it.printFront ?? "",
          printFrontPrice: it.printFrontPrice,
          printBack: it.printBack ?? "",
          printBackPrice: it.printBackPrice,
          buttonType: it.buttonType ?? "",
          buttonPrice: it.buttonPrice,
          zipperType: it.zipperType ?? "",
          zipperPrice: it.zipperPrice,
          pocketType: it.pocketType ?? "",
          pocketPrice: it.pocketPrice,
          useSizes: (it.sizes?.length ?? 0) > 0,
          sizes: (it.sizes ?? []).map((s) => ({ size: s.size, qty: s.qty })),
          qty: it.qty,
          unitPrice: it.unitPrice,
          notes: it.notes ?? "",
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder, editId]);

  // prefill from selected customer
  useEffect(() => {
    if (preselected?.customer && preselectedId) {
      const c = preselected.customer;
      setCustomerId(preselectedId);
      setHeader((h) => ({
        ...h,
        customerName: c.name.includes(" — ") ? c.name.split(" — ")[0] : c.name,
        companyName: c.name.includes(" — ") ? c.name.split(" — ").slice(1).join(" — ") : "",
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
      items.reduce((sum, it) => sum + (it.unitPrice > 0 ? it.unitPrice : lineTotal(it)) * itemQty(it), 0),
    [items],
  );

  function updateItem(idx: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function updateSize(idx: number, si: number, patch: Partial<SizeRow>) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, sizes: it.sizes.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : it,
      ),
    );
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
    for (const s of it.sizes) {
      if (s.size.trim()) upsertPreset({ category: "size", value: s.size.trim() });
    }
    if (header.city) upsertPreset({ category: "city", value: header.city });
  }

  async function handleSubmit() {
    if (!header.customerName.trim() && !header.companyName.trim()) {
      toast.error("نام فرد یا نام شرکت را وارد کنید (حداقل یکی)");
      return;
    }
    if (!header.phone.trim()) {
      toast.error("شماره تماس را وارد کنید");
      return;
    }
    const validItems = items.filter(
      (it) =>
        it.productType.trim() &&
        itemQty(it) > 0 &&
        (!it.useSizes || it.sizes.every((s) => s.size.trim() && s.qty > 0)),
    );
    if (validItems.length === 0) {
      toast.error("حداقل یک محصول با «نوع محصول» و «تعداد» وارد کنید");
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && editId) {
        await updateOrder({
          id: editId as never,
          customerName: header.customerName.trim() || header.companyName.trim(),
          companyName: header.companyName.trim() || undefined,
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
            size: undefined,
            sizes:
              it.useSizes && it.sizes.length > 0
                ? it.sizes.map((s) => ({ size: s.size.trim(), qty: s.qty }))
                : undefined,
            qty: itemQty(it),
            unitPrice: it.unitPrice > 0 ? it.unitPrice : lineTotal(it),
            notes: it.notes.trim() || undefined,
          })),
          notes: notes.trim() || undefined,
        });
        toast.success("سفارش با موفقیت ویرایش شد");
        navigate(-1);
        return;
      }
      await createOrder({
        customerId: (customerId ?? undefined) as never,
        customerName: header.customerName.trim() || header.companyName.trim(),
        companyName: header.companyName.trim() || undefined,
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
          size: undefined,
          sizes:
            it.useSizes && it.sizes.length > 0
              ? it.sizes.map((s) => ({ size: s.size.trim(), qty: s.qty }))
              : undefined,
          qty: itemQty(it),
          unitPrice: it.unitPrice > 0 ? it.unitPrice : lineTotal(it),
          notes: it.notes.trim() || undefined,
        })),
        total,
        notes: notes.trim() || undefined,
      });
      validItems.forEach(learnPresets);
      // پاک‌کردن پیش‌نویس بعد از ثبت موفق
      clearHeader();
      clearNotes();
      clearItems();
      setItems([emptyItem()]);
      setHeader({
        customerName: "",
        companyName: "",
        phone: "",
        city: "",
        address: "",
        dateLabel: todayJalaliLabel(),
      });
      setNotes("");
      const shownName = header.companyName.trim()
        ? `${header.customerName.trim()} — ${header.companyName.trim()}`
        : header.customerName.trim() || header.companyName.trim();
      toast.success(`سفارش برای «${shownName}» ثبت شد و به مشتریان اضافه شد`);
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
      title={isEditMode ? "ویرایش سفارش" : "ثبت سفارش جدید"}
      subtitle={
        isEditMode
          ? "هر تغییری ذخیره شود، سفارش اصلی و رسید آن به‌روزرسانی می‌شود"
          : "فرم کامل سفارش — محصولات، سایزها، قیمت‌ها، مشتری و لوکیشن"
      }
      actions={
        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="outline"
              onClick={() => {
                setParams({});
                loadedEdit.current = false;
              }}
            >
              انصراف از ویرایش
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving} className="gap-2 shadow-md shadow-blue-600/20">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {isEditMode ? "ذخیره تغییرات" : "ثبت سفارش"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* اطلاعات مشتری */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Package className="size-4" />
                </span>
                اطلاعات مشتری و سفارش
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 text-sm font-semibold">نام فرد</Label>
                <Input
                  value={header.customerName}
                  onChange={(e) => setHeader((h) => ({ ...h, customerName: e.target.value }))}
                  placeholder="مثلا: رضا محمدی"
                  className="h-11 border-2 font-medium"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">
                  نام شرکت
                  <span className="text-xs font-normal text-muted-foreground">(اختیاری)</span>
                </Label>
                <Input
                  value={header.companyName}
                  onChange={(e) => setHeader((h) => ({ ...h, companyName: e.target.value }))}
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
                className="sm:col-span-1"
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
              <Card key={idx} className="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-black text-white shadow-sm">
                      {toFaDigits(idx + 1)}
                    </span>
                    محصول {toFaDigits(idx + 1)}
                  </CardTitle>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
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
                    label={`قیمت محصول (${currency})`}
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

                  {/* تفکیک سایز */}
                  <div className="sm:col-span-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Switch
                          checked={it.useSizes}
                          onCheckedChange={(on) =>
                            updateItem(idx, {
                              useSizes: on,
                              sizes: on && it.sizes.length === 0 ? [{ size: "", qty: 1 }] : it.sizes,
                            })
                          }
                        />
                        ثبت با تفکیک سایز
                        <span className="text-xs font-normal text-muted-foreground">
                          مثلا یک تی‌شرت با چند سایز مختلف
                        </span>
                      </Label>
                      {it.useSizes && (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                          جمع تعداد: {toFaDigits(itemQty(it))}
                        </span>
                      )}
                    </div>

                    {it.useSizes ? (
                      <div className="mt-3 space-y-2">
                        {it.sizes.map((s, si) => (
                          <div key={si} className="flex items-center gap-2">
                            <PresetInput
                              category="size"
                              label=""
                              hideLabel
                              value={s.size}
                              onChange={(v) => updateSize(idx, si, { size: v })}
                              placeholder="سایز (مثلا L)"
                              className="flex-1"
                            />
                            <div className="w-36">
                              <MoneyInput
                                value={s.qty || undefined}
                                onChange={(n) => updateSize(idx, si, { qty: n ?? 0 })}
                                placeholder="تعداد"
                                className="h-11 border-2 text-left font-bold"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                updateItem(idx, { sizes: it.sizes.filter((_, j) => j !== si) })
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => updateItem(idx, { sizes: [...it.sizes, { size: "", qty: 1 }] })}
                        >
                          <Plus className="size-3.5" />
                          افزودن سایز
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
                      </div>
                    )}
                    {it.useSizes && (
                      <div className="mt-3">
                        <PriceInput
                          label="قیمت واحد نهایی هر عدد (خودکار یا دستی)"
                          value={it.unitPrice > 0 ? it.unitPrice : undefined}
                          onChange={(n) => updateItem(idx, { unitPrice: n ?? 0 })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 text-sm font-semibold">سایر توضیحات</Label>
                    <Textarea
                      value={it.notes}
                      onChange={(e) => updateItem(idx, { notes: e.target.value })}
                      placeholder="توضیحات این محصول"
                      className="min-h-16 border-2"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gradient-to-l from-blue-50 to-blue-100/60 px-4 py-3 sm:col-span-2">
                    <span className="text-sm font-medium">
                      جمع این محصول
                      {it.useSizes && it.sizes.length > 0 && (
                        <span className="mr-2 text-xs text-muted-foreground">
                          ({it.sizes.filter((s) => s.size.trim()).map((s) => `${s.size}: ${thousandFa(s.qty)}`).join(" · ")})
                        </span>
                      )}
                    </span>
                    <span className="font-black text-blue-700">
                      {money((it.unitPrice > 0 ? it.unitPrice : lineTotal(it)) * itemQty(it))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
            >
              <Plus className="size-4" />
              افزودن محصول دیگر به سفارش
            </Button>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-sm">
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
          <Card className="sticky top-24 rounded-2xl border-border/70 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">خلاصه سفارش</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((it, idx) => {
                const unit = it.unitPrice > 0 ? it.unitPrice : lineTotal(it);
                const q = itemQty(it);
                if (!it.productType && unit === 0 && q === 0) return null;
                return (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {it.productType || "محصول"} × {toFaDigits(q)}
                      </span>
                      <span className="shrink-0 font-bold">{money(unit * q)}</span>
                    </div>
                    {it.useSizes && it.sizes.some((s) => s.size.trim()) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {it.sizes
                          .filter((s) => s.size.trim())
                          .map((s, si) => (
                            <span
                              key={si}
                              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800"
                            >
                              {s.size}: {thousandFa(s.qty)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-l from-blue-700 to-blue-600 px-4 py-3 text-white shadow-md shadow-blue-600/25">
                <span className="font-bold">مبلغ نهایی سفارش</span>
                <span className="text-lg font-black">{money(total)}</span>
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

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { MoneyInput } from "@/components/PresetInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatJalaliTime,
  formatNumber,
  toFaDigits,
} from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  Boxes,
  History,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Shirt,
  Trash2,
} from "lucide-react";

type WhDoc = {
  _id: string;
  kind: "apparel" | "material";
  name: string;
  productType?: string;
  material?: string;
  color?: string;
  fabricWeight?: string;
  buttonType?: string;
  zipperType?: string;
  pocketType?: string;
  sizes?: { size: string; qty: number }[];
  category?: string;
  attrs?: { key: string; value: string }[];
  attrQty?: { key: string; value: string; qty: number }[];
  unit?: string;
  qty: number;
  minQty?: number;
  price?: number;
  notes?: string;
};

type LogDoc = {
  _id: string;
  action: "create" | "update" | "delete" | "stock";
  changes: { field: string; old?: string; new?: string }[];
  byName?: string;
  atTs: number;
};

type Attr = { key: string; value: string };
type AttrQty = { key: string; value: string; qty: number };

const MATERIAL_CATEGORIES = [
  "پارچه",
  "نخ",
  "دکمه",
  "سوزن",
  "زیپ",
  "قزن قفلی",
  "آستر",
  "_etiquette: برچسب",
  "بسته‌بندی",
];

function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export default function Warehouse() {
  const { money: whMoney } = useCurrency();
  const [tab, setTab] = useState<"apparel" | "material">("apparel");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhDoc | null>(null);
  const [logsFor, setLogsFor] = useState<WhDoc | null>(null);
  const [saving, setSaving] = useState(false);
  // دیالوگ ورود/خروج کالا با سایز
  const [stockFor, setStockFor] = useState<WhDoc | null>(null);
  const [stockDelta, setStockDelta] = useState(1);
  const [stockQty, setStockQty] = useState(1);
  const [stockSize, setStockSize] = useState("");
  const [stockAttr, setStockAttr] = useState<Attr | null>(null);

  // form state
  const [kind, setKind] = useState<"apparel" | "material">("apparel");
  const [name, setName] = useState("");
  const [productType, setProductType] = useState("");
  const [material, setMaterial] = useState("");
  const [color, setColor] = useState("");
  const [fabricWeight, setFabricWeight] = useState("");
  const [buttonType, setButtonType] = useState("");
  const [zipperType, setZipperType] = useState("");
  const [pocketType, setPocketType] = useState("");
  const [sizes, setSizes] = useState<Attr2[]>([]);
  const [category, setCategory] = useState("");
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState(0);
  const [minQty, setMinQty] = useState<number | undefined>();
  const [price, setPrice] = useState<number | undefined>();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const rows = useQuery(api.warehouse.list, {
    q: search.trim() || undefined,
    kind: tab,
  });
  const createItem = useMutation(api.warehouse.create);
  const updateItem = useMutation(api.warehouse.update);
  const removeItem = useMutation(api.warehouse.remove);
  const adjustStock = useMutation(api.warehouse.adjustStock);
  const appSettings = useQuery(api.appSettings.get, {});

  const materialCats = useMemo(
    () =>
      MATERIAL_CATEGORIES.filter((c) => !c.startsWith("_")),
    [],
  );

  function resetForm() {
    setEditing(null);
    setName("");
    setMinQty(appSettings?.lowStockThreshold ?? 5);
    setProductType("");
    setMaterial("");
    setColor("");
    setFabricWeight("");
    setButtonType("");
    setZipperType("");
    setPocketType("");
    setSizes([]);
    setCategory("");
    setAttrs([]);
    setUnit("");
    setQty(0);
    setPrice(undefined);
    setNotes("");
  }

  function openEdit(item: WhDoc) {
    setEditing(item);
    setKind(item.kind);
    setName(item.name);
    setProductType(item.productType ?? "");
    setMaterial(item.material ?? "");
    setColor(item.color ?? "");
    setFabricWeight(item.fabricWeight ?? "");
    setButtonType(item.buttonType ?? "");
    setZipperType(item.zipperType ?? "");
    setPocketType(item.pocketType ?? "");
    setSizes((item.sizes ?? []).map((s) => ({ key: s.size, valueNum: s.qty })));
    setCategory(item.category ?? "");
    setAttrs(item.attrs ?? []);
    setUnit(item.unit ?? "");
    setQty(item.qty);
    setMinQty(item.minQty ?? appSettings?.lowStockThreshold ?? 5);
    setPrice(item.price);
    setNotes(item.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("نام قلم انبار را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      if (kind === "apparel") {
        const payload = {
          name: name.trim(),
          productType: productType.trim() || undefined,
          material: material.trim() || undefined,
          color: color.trim() || undefined,
          fabricWeight: fabricWeight.trim() || undefined,
          buttonType: buttonType.trim() || undefined,
          zipperType: zipperType.trim() || undefined,
          pocketType: pocketType.trim() || undefined,
          sizes: sizes.map((s) => ({ size: s.key, qty: s.valueNum ?? 0 })),
          qty: sizes.reduce((sum, s) => sum + (s.valueNum ?? 0), 0),
          unit: unit.trim() || "دست",
          price,
          minQty,
          notes: notes.trim() || undefined,
        };
        if (editing) {
          await updateItem({ id: editing._id as never, ...payload });
        } else {
          await createItem({ kind, ...payload });
        }
      } else {
        const payload = {
          name: name.trim(),
          category: category.trim() || undefined,
          attrs: attrs.filter((a) => a.key.trim()),
          unit: unit.trim() || "عدد",
          qty,
          price,
          minQty,
          notes: notes.trim() || undefined,
        };
        if (editing) {
          await updateItem({ id: editing._id as never, ...payload });
        } else {
          await createItem({ kind, ...payload });
        }
      }
      toast.success(editing ? "ویرایش شد" : "به انبار اضافه شد");
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="انبار"
      subtitle="پوشاک آماده و مواد اولیه — موجودی، ویرایش و تاریخچه تغییرات"
      actions={
        <Button
          onClick={() => {
            resetForm();
            setKind(tab);
            setDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" />
          افزودن {tab === "apparel" ? "پوشاک" : "ماده اولیه"}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "apparel", label: "پوشاک", icon: Shirt },
          { id: "material", label: "مواد اولیه", icon: Boxes },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "apparel" | "material")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.id
                ? "bg-blue-700 text-white shadow-sm shadow-blue-900/30"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجو در انبار…"
            className="h-11 border-2 pr-9"
          />
        </div>
      </div>

      {!rows ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-10 text-muted-foreground/50" />
            <p className="font-semibold">قلمی در این بخش نیست</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => (
            <Card key={w._id} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold group-hover:text-blue-700">{w.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      {w.kind === "apparel" ? (
                        <>
                          {w.material && <span>جنس: {w.material}</span>}
                          {w.color && <span>رنگ: {w.color}</span>}
                        </>
                      ) : (
                        <span>{w.category ?? "—"}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setLogsFor(w)}
                      title="تاریخچه تغییرات"
                    >
                      <History className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(w)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={async () => {
                        if (!confirm(`حذف «${w.name}» از انبار؟`)) return;
                        await removeItem({ id: w._id as never });
                        toast.success("حذف شد");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* sizes / attrs */}
                {w.kind === "apparel" && (w.sizes?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {w.sizes!.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-full border bg-muted px-2.5 py-0.5 text-[11px] font-bold"
                      >
                        {s.size}: {formatNumber(s.qty)}
                      </span>
                    ))}
                  </div>
                )}
                {w.kind === "material" && (w.attrs?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {w.attrs!.map((a, i) => {
                      const perQty = w.attrQty?.find(
                        (q) => q.key === a.key && q.value === a.value,
                      )?.qty;
                      return (
                        <span
                          key={i}
                          className="rounded-full border bg-muted px-2.5 py-0.5 text-[11px] font-bold"
                        >
                          {a.key === a.value ? a.value : `${a.key}: ${a.value}`}
                          {perQty != null ? ` — ${formatNumber(perQty)}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {w.fabricWeight && (
                  <div className="text-xs text-muted-foreground">
                    گرماژ پارچه: <span className="font-bold">{w.fabricWeight}</span>
                  </div>
                )}

                <div className="mt-auto space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">موجودی کل</span>
                    <span
                      className={`text-lg font-black ${
                        w.minQty != null && w.qty <= w.minQty
                          ? "text-destructive"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatNumber(w.qty)} {w.unit ?? ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 gap-1"
                      onClick={() => {
                        setStockFor(w);
                        setStockDelta(1);
                        setStockQty(1);
                        setStockSize("");
                        setStockAttr(null);
                      }}
                    >
                      <Plus className="size-3.5" />
                      ورود
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 gap-1"
                      onClick={() => {
                        setStockFor(w);
                        setStockDelta(-1);
                        setStockQty(1);
                        setStockSize("");
                        setStockAttr(null);
                      }}
                    >
                      <Minus className="size-3.5" />
                      خروج
                    </Button>
                  </div>
                  {w.price != null && (
                    <div className="text-xs text-muted-foreground">
                      ارزش تقریبی: {whMoney(w.price * w.qty)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "ویرایش قلم انبار" : kind === "apparel" ? "افزودن پوشاک" : "افزودن ماده اولیه"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {!editing && (
              <div>
                <Label className="mb-1.5 text-sm font-semibold">نوع</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as "apparel" | "material")}>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apparel">پوشاک</SelectItem>
                    <SelectItem value="material">مواد اولیه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="mb-1.5 text-sm font-semibold">نام *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 border-2" />
            </div>

            {kind === "apparel" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">جنس</Label>
                    <Input value={material} onChange={(e) => setMaterial(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">رنگ</Label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">گرماژ پارچه</Label>
                    <Input value={fabricWeight} onChange={(e) => setFabricWeight(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">نوع دکمه</Label>
                    <Input value={buttonType} onChange={(e) => setButtonType(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">نوع زیپ</Label>
                    <Input value={zipperType} onChange={(e) => setZipperType(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">نوع جیب</Label>
                    <Input value={pocketType} onChange={(e) => setPocketType(e.target.value)} className="h-11 border-2" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">واحد</Label>
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="دست / عدد" className="h-11 border-2" />
                  </div>
                </div>
                {/* sizes editor */}
                <div>
                  <Label className="mb-1.5 text-sm font-semibold">سایزها و موجودی هر سایز</Label>
                  <div className="space-y-2">
                    {sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={s.key}
                          onChange={(e) => setSizes((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                          placeholder="سایز (مثلا L)"
                          className="h-10 border-2"
                        />
                        <Input
                          type="number"
                          value={s.valueNum ?? ""}
                          onChange={(e) =>
                            setSizes((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, valueNum: e.target.value === "" ? undefined : Number(e.target.value) } : x)),
                            )
                          }
                          placeholder="تعداد"
                          className="h-10 border-2"
                          dir="ltr"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 text-destructive"
                          onClick={() => setSizes((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setSizes((prev) => [...prev, { key: "", valueNum: undefined }])}
                    >
                      <Plus className="size-3.5" />
                      افزودن سایز
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">دسته اصلی</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="پارچه، نخ، دکمه، سوزن…"
                      className="h-11 border-2"
                      list="material-cats"
                    />
                    <datalist id="material-cats">
                      {materialCats.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">واحد</Label>
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="متر / کیلو / عدد" className="h-11 border-2" />
                  </div>
                </div>
                {/* attrs editor */}
                <div>
                  <Label className="mb-1.5 text-sm font-semibold">
                    زیرشاخه‌ها (جنس، رنگ، گرماژ، اندازه و… — آزاد)
                  </Label>
                  <div className="space-y-2">
                    {attrs.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={a.key}
                          onChange={(e) => setAttrs((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                          placeholder="عنوان زیرشاخه"
                          className="h-10 flex-1 border-2"
                        />
                        <Input
                          value={a.value}
                          onChange={(e) => setAttrs((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                          placeholder="مقدار"
                          className="h-10 flex-1 border-2"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 text-destructive"
                          onClick={() => setAttrs((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setAttrs((prev) => [...prev, { key: "", value: "" }])}
                    >
                      <Plus className="size-3.5" />
                      افزودن زیرشاخه
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">موجودی</Label>
                    <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-11 border-2" dir="ltr" />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">حداقل هشدار</Label>
                    <Input
                      type="number"
                      value={minQty ?? ""}
                      onChange={(e) => setMinQty(e.target.value === "" ? undefined : Number(e.target.value))}
                      className="h-11 border-2"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-sm font-semibold">قیمت واحد</Label>
                    <MoneyInput
                      value={price}
                      onChange={setPrice}
                      className="h-11 border-2"
                    />
                  </div>
                </div>
              </>
            )}

            {kind === "apparel" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-sm font-semibold">حداقل هشدار</Label>
                  <Input
                    type="number"
                    value={minQty ?? ""}
                    onChange={(e) => setMinQty(e.target.value === "" ? undefined : Number(e.target.value))}
                    className="h-11 border-2"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-sm font-semibold">قیمت واحد</Label>
                  <MoneyInput
                    value={price}
                    onChange={setPrice}
                    className="h-11 border-2"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1.5 text-sm font-semibold">توضیحات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16 border-2" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "ذخیره تغییرات" : "افزودن به انبار"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ورود/خروج کالا با انتخاب سایز */}
      <Dialog open={stockFor != null} onOpenChange={(o) => !o && setStockFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockDelta > 0 ? "ورود کالا" : "خروج کالا"} — {stockFor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {stockFor?.kind === "apparel" && (stockFor.sizes?.length ?? 0) > 0 && (
              <div>
                <Label className="mb-1.5 text-sm font-semibold">
                  کدام سایز؟
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}(اگر انتخاب نکنی، جمع کل تغییر می‌کند)
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {stockFor.sizes!.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStockSize(stockSize === s.size ? "" : s.size)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                        stockSize === s.size
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      {s.size}: {formatNumber(s.qty)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {stockFor?.kind === "material" && (stockFor.attrs?.length ?? 0) > 0 && (
              <div>
                <Label className="mb-1.5 text-sm font-semibold">
                  کدام زیرشاخه؟
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}(اگر انتخاب نکنی، جمع کل تغییر می‌کند)
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {stockFor.attrs!.map((a, i) => {
                    const perQty = (stockFor.attrQty as AttrQty[] | undefined)?.find(
                      (q) => q.key === a.key && q.value === a.value,
                    )?.qty;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setStockAttr(
                            stockAttr?.key === a.key && stockAttr?.value === a.value ? null : a,
                          )
                        }
                        className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                          stockAttr?.key === a.key && stockAttr?.value === a.value
                            ? "border-blue-700 bg-blue-700 text-white"
                            : "border-border hover:border-blue-300"
                        }`}
                      >
                        {a.key === a.value ? a.value : `${a.key}: ${a.value}`}
                        {perQty != null ? `: ${formatNumber(perQty)}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <Label className="mb-1.5 text-sm font-semibold">
                تعداد {stockDelta > 0 ? "واردشده" : "خارج‌شده"}
                {stockFor?.unit ? ` (${stockFor.unit})` : ""}
              </Label>
              <Input
                type="number"
                min={1}
                value={stockQty}
                onChange={(e) => setStockQty(Math.max(1, Number(e.target.value) || 1))}
                placeholder={stockFor?.unit ? `مثلا ۲ ${stockFor.unit}` : "مثلا ۲"}
                className="h-11 border-2 font-bold"
                dir="ltr"
              />
              {stockFor?.kind === "material" && (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  موجودی فعلی: {formatNumber(
                    stockAttr
                      ? ((stockFor.attrQty as AttrQty[] | undefined)?.find(
                          (q) => q.key === stockAttr.key && q.value === stockAttr.value,
                        )?.qty ?? 0)
                      : stockFor.qty,
                  )} {stockFor.unit ?? ""}
                  {stockFor.minQty != null && stockFor.qty - (stockDelta < 0 ? stockQty : 0) <= stockFor.minQty && (
                    <span className="mr-2 font-bold text-destructive">⚠ بعد از این خروج به حد هشدار می‌رسد</span>
                  )}
                </p>
              )}
            </div>
            <Button
              onClick={async () => {
                if (!stockFor) return;
                try {
                  await adjustStock({
                    id: stockFor._id as never,
                    delta: stockDelta * stockQty,
                    size: stockSize.trim() || undefined,
                    attrKey: stockAttr?.key,
                    attrValue: stockAttr?.value,
                  });
                  const attrLabel =
                    stockAttr && (stockAttr.key !== stockAttr.value
                      ? `${stockAttr.key}: ${stockAttr.value}`
                      : stockAttr.value);
                  toast.success(
                    `${stockDelta > 0 ? "ورود" : "خروج"} ${formatNumber(stockQty)} ${stockFor.unit ?? ""}${stockSize ? ` برای سایز ${stockSize}` : ""}${attrLabel ? ` برای ${attrLabel}` : ""} ثبت شد`,
                  );
                  setStockFor(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "خطا");
                }
              }}
              className="gap-2"
            >
              {stockDelta > 0 ? <Plus className="size-4" /> : <Minus className="size-4" />}
              ثبت {stockDelta > 0 ? "ورود" : "خروج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs dialog */}
      <Dialog open={logsFor != null} onOpenChange={(o) => !o && setLogsFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-4 text-blue-600" />
              تاریخچه تغییرات — {logsFor?.name}
            </DialogTitle>
          </DialogHeader>
          {logsFor && <WarehouseLogs itemId={logsFor._id} />}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

type Attr2 = { key: string; valueNum?: number };

function WarehouseLogs({ itemId }: { itemId: string }) {
  const logs = useQuery(api.warehouse.itemLogs, { itemId: itemId as never });
  if (!logs) return <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />;
  if (logs.length === 0)
    return (
      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
        تغییری ثبت نشده است
      </p>
    );
  const ACTION_LABEL: Record<string, string> = {
    create: "ایجاد",
    update: "ویرایش",
    delete: "حذف",
    stock: "ورود/خروج کالا",
  };
  return (
    <div className="space-y-3">
      {logs.map((log: LogDoc) => (
        <div key={log._id} className="rounded-xl border p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-black">{ACTION_LABEL[log.action]}</span>
            <span className="text-muted-foreground">{formatJalaliTime(log.atTs)}</span>
          </div>
          {log.changes.length > 0 && (
            <div className="space-y-1">
              {log.changes.map((ch, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold">{ch.field}:</span>
                  {ch.old && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 line-through text-destructive">
                      {ch.old}
                    </span>
                  )}
                  {ch.new && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                      {ch.new}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">توسط {log.byName ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

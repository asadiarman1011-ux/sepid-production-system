import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { OrderStatusBadge } from "@/components/status-badges";
import { MoneyInput, thousandFa } from "@/components/PresetInput";
import { InvoiceDialog } from "@/components/InvoiceDialog";
import { useNavigate } from "react-router";
import { MapView } from "@/components/MapPicker";
import { JalaliDateField } from "@/components/JalaliDateField";
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
import { toast } from "sonner";
import { useSearchParams } from "react-router";
import { toFaDigits } from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import { Loader2, PackageCheck, Pencil, Printer, Search, Truck } from "lucide-react";

type OrderDoc = {
  _id: string;
  orderNo: number;
  customerId: string;
  customerName: string;
  phone: string;
  city?: string;
  address?: string;
  location?: { lat: number; lng: number };
  dateLabel: string;
  dateTs: number;
  items: {
    productType: string;
    material?: string;
    color?: string;
    size?: string;
    sizes?: { size: string; qty: number }[];
    qty: number;
    unitPrice: number;
  }[];
  total: number;
  notes?: string;
  status: "pending" | "delivered";
  delivery?: {
    amount: number;
    deliveryFee?: number;
    method: string;
    notes?: string;
    dateLabel: string;
    timeLabel?: string;
    dateTs: number;
    byName?: string;
  };
};

export default function Delivery() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "pending"; // pending | delivered
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [delivering, setDelivering] = useState<OrderDoc | null>(null);
  const [amount, setAmount] = useState<number | undefined>();
  const [fee, setFee] = useState<number | undefined>();
  const [method, setMethod] = useState("حضوری");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<OrderDoc | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<OrderDoc | null>(null);
  const [editAmount, setEditAmount] = useState<number | undefined>();
  const [editFee, setEditFee] = useState<number | undefined>();
  const [editMethod, setEditMethod] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const { currency, money } = useCurrency();
  const updateDelivery = useMutation(api.orders.updateDelivery);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const rows = useQuery(api.orders.list, {
    q: search.trim() || undefined,
    status: tab === "pending" ? "pending" : "delivered",
  });
  const markDelivered = useMutation(api.orders.markDelivered);
  const appSettings = useQuery(api.appSettings.get, {});
  const deliveryMethods = appSettings?.deliveryMethods ?? ["حضوری", "اسنپ", "باربری", "پست"];

  function openReceiptEdit(o: OrderDoc) {
    if (!o.delivery) return;
    setEditingReceipt(o);
    setEditAmount(o.delivery.amount);
    setEditFee(o.delivery.deliveryFee);
    setEditMethod(o.delivery.method);
    setEditNotes(o.delivery.notes ?? "");
  }

  async function handleReceiptSave() {
    if (!editingReceipt) return;
    setSaving(true);
    try {
      await updateDelivery({
        id: editingReceipt._id as never,
        amount: editAmount ?? 0,
        deliveryFee: editFee,
        method: editMethod,
        notes: editNotes.trim() || undefined,
      });
      toast.success("رسید تحویل ویرایش شد");
      setEditingReceipt(null);
      setDetail(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ویرایش رسید");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelivered() {
    if (!delivering) return;
    setSaving(true);
    try {
      await markDelivered({
        id: delivering._id as never,
        amount: amount ?? 0,
        deliveryFee: fee,
        method,
        notes: notes.trim() || undefined,
      });
      toast.success("سفارش به بخش تحویل داده شده منتقل شد");
      setDelivering(null);
      setAmount(undefined);
      setFee(undefined);
      setNotes("");
      setMethod("حضوری");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت تحویل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="تحویل محصول"
      subtitle={tab === "pending" ? "سفارش‌های در انتظار تحویل" : "سفارش‌های تحویل داده شده"}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "pending", label: "در انتظار تحویل" },
          { id: "delivered", label: "تحویل داده شده" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.id
                ? "bg-blue-700 text-white shadow-sm shadow-blue-900/30"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
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
            placeholder="جستجو: نام مشتری، شهر، محصول…"
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
            <Truck className="size-10 text-muted-foreground/50" />
            <p className="font-semibold">
              {tab === "pending" ? "سفارشی در انتظار تحویل نیست" : "تحویلی ثبت نشده است"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((o) => (
            <Card key={o._id} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button className="min-w-0 flex-1 text-right" onClick={() => setDetail(o)}>
                    <div className="truncate font-bold group-hover:text-blue-700">
                      {o.customerName}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      خرید شماره {toFaDigits(o.orderNo)} · {toFaDigits(o.dateLabel)}
                    </div>
                  </button>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5">{toFaDigits(o.phone)}</span>
                  {o.city && <span className="rounded bg-muted px-1.5 py-0.5">{o.city}</span>}
                  <span className="rounded bg-muted px-1.5 py-0.5">
                    {o.items.map((i) => i.productType).join("، ")}
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-black text-blue-700">{money(o.total)}</span>
                  {o.status === "pending" ? (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setDelivering(o);
                        setAmount(o.total);
                      }}
                    >
                      <PackageCheck className="size-4" />
                      تحویل داده شد
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {toFaDigits(o.delivery?.dateLabel ?? "")}
                        {o.delivery?.timeLabel ? ` · ${toFaDigits(o.delivery.timeLabel)}` : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="ویرایش رسید"
                        onClick={() => openReceiptEdit(o)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deliver dialog */}
      <Dialog open={delivering != null} onOpenChange={(o) => !o && setDelivering(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ثبت تحویل — {delivering?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 text-sm font-semibold">مبلغ دریافتی ({currency})</Label>
              <MoneyInput
                value={amount}
                onChange={setAmount}
                className="h-11 border-2 text-right"
              />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
                هزینه تحویل
                <span className="text-xs font-normal text-muted-foreground">(کرایه پیک/باربری — اختیاری)</span>
              </Label>
              <MoneyInput
                value={fee}
                onChange={setFee}
                className="h-11 border-2 text-right"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">روش تحویل / دریافت</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-11 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deliveryMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">توضیحات</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-16 border-2"
              />
            </div>
            <Button onClick={handleDelivered} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              تایید و انتقال به تحویل داده شده
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt edit dialog */}
      <Dialog open={editingReceipt != null} onOpenChange={(o) => !o && setEditingReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش رسید تحویل — {editingReceipt?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 text-sm font-semibold">مبلغ دریافتی ({currency})</Label>
              <MoneyInput value={editAmount} onChange={setEditAmount} className="h-11 border-2 text-right" />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">هزینه تحویل</Label>
              <MoneyInput value={editFee} onChange={setEditFee} className="h-11 border-2 text-right" />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">روش تحویل</Label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger className="h-11 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deliveryMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">توضیحات</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="min-h-16 border-2" />
            </div>
            <Button onClick={handleReceiptSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              ذخیره تغییرات رسید
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order detail */}
      <Dialog open={detail != null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {!detail ? null : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.customerName}
                  <OrderStatusBadge status={detail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">تلفن: </span>
                    <span className="font-bold" dir="ltr">{toFaDigits(detail.phone)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">شهر: </span>
                    <span className="font-bold">{detail.city ?? "—"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">آدرس: </span>
                    <span>{detail.address ?? "—"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">تاریخ سفارش: </span>
                    <span className="font-bold">{toFaDigits(detail.dateLabel)}</span>
                  </div>
                </div>
                {detail.location && (
                  <MapView
                    lat={detail.location.lat}
                    lng={detail.location.lng}
                    label="لوکیشن مشتری"
                  />
                )}
                <div>
                  <h4 className="mb-2 font-black">اقلام سفارش</h4>
                  <div className="space-y-1.5">
                    {detail.items.map((item, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                        <span className="font-bold">{item.productType}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.material && `${item.material} · `}
                          {item.color && `${item.color} · `}
                          {item.sizes && item.sizes.length > 0
                            ? item.sizes.map((s) => `${s.size}: ${thousandFa(s.qty)}`).join(" · ")
                            : item.size && `سایز ${item.size} · `}
                          {toFaDigits(item.qty)} عدد
                        </span>
                        <span className="font-bold">{money(item.unitPrice * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                  <span className="font-bold">مبلغ کل سفارش</span>
                  <span className="font-black text-blue-700">{money(detail.total)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setInvoiceId(detail._id)}
                  >
                    <Printer className="size-4" />
                    پیش‌فاکتور / چاپ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => navigate(`/dashboard/new-order?edit=${detail._id}`)}
                  >
                    <Pencil className="size-4" />
                    ویرایش سفارش
                  </Button>
                </div>
                {detail.delivery && (
                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-black">رسید تحویل</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => openReceiptEdit(detail)}
                      >
                        <Pencil className="size-3.5" />
                        ویرایش رسید
                      </Button>
                    </div>
                    <div className="grid gap-1.5 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">مبلغ دریافتی: </span>
                        <span className="font-bold">{money(detail.delivery.amount)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">هزینه تحویل: </span>
                        <span className="font-bold">
                          {detail.delivery.deliveryFee != null ? money(detail.delivery.deliveryFee) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">روش: </span>
                        <span className="font-bold">{detail.delivery.method}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">زمان تحویل: </span>
                        <span className="font-bold">
                          {toFaDigits(detail.delivery.dateLabel)}
                          {detail.delivery.timeLabel
                            ? ` — ساعت ${toFaDigits(detail.delivery.timeLabel)}`
                            : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ثبت‌کننده: </span>
                        <span className="font-bold">{detail.delivery.byName ?? "—"}</span>
                      </div>
                      {detail.delivery.notes && (
                        <div className="sm:col-span-2 text-muted-foreground">
                          {detail.delivery.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* پیش‌فاکتور */}
      <InvoiceDialog orderId={invoiceId} onClose={() => setInvoiceId(null)} />
    </AppShell>
  );
}

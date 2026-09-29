import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { CustomerStatusBadge, FollowupBadge } from "@/components/status-badges";
import { MapView } from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JalaliDateField } from "@/components/JalaliDateField";
import { InvoiceDialog } from "@/components/InvoiceDialog";
import { Pencil, Printer } from "lucide-react";
import { MapPicker } from "@/components/MapPicker";
import { toFaDigits } from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  ArrowUpCircle,
  EllipsisVertical,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

type CustomerDoc = {
  _id: string;
  name: string;
  phone: string;
  city?: string;
  craft?: string;
  address?: string;
  location?: { lat: number; lng: number };
  status: "permanent" | "nonpermanent" | "none";
  followup: "none" | "needs" | "following";
  notes?: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  city: string;
  craft: string;
  address: string;
  status: "permanent" | "nonpermanent" | "none";
  followup: "none" | "needs" | "following";
  notes: string;
};

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  city: "",
  craft: "",
  address: "",
  status: "nonpermanent",
  followup: "none",
  notes: "",
};

export default function Customers() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "all"; // all | permanent | nonpermanent
  const [search, setSearch] = useState("");
  const [followupFilter, setFollowupFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerDoc | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const statusArg =
    tab === "permanent" ? "permanent" : tab === "nonpermanent" ? "nonpermanent" : undefined;
  const rows = useQuery(api.customers.list, {
    q: search.trim() || undefined,
    status: statusArg,
    followup:
      followupFilter === "all"
        ? undefined
        : (followupFilter as "none" | "needs" | "following"),
  });
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const promote = useMutation(api.customers.promoteToPermanent);
  const setFollowup = useMutation(api.customers.setFollowup);
  const removeCustomer = useMutation(api.customers.remove);
  const upsertPreset = useMutation(api.presets.upsert);
  const navigate = useNavigate();

  // debounce search input
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows;
  }, [rows]);

  function openEdit(c: CustomerDoc) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      city: c.city ?? "",
      craft: c.craft ?? "",
      address: c.address ?? "",
      status: c.status,
      followup: c.followup,
      notes: c.notes ?? "",
    });
    setLocation(c.location ?? null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("نام و شماره تماس الزامی است");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomer({
          id: editing._id as never,
          name: form.name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim() || undefined,
          craft: form.craft.trim() || undefined,
          address: form.address.trim() || undefined,
          location: location ?? undefined,
          status: form.status,
          followup: form.followup,
          notes: form.notes.trim() || undefined,
        });
        toast.success("مشتری ویرایش شد");
      } else {
        await createCustomer({
          name: form.name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim() || undefined,
          craft: form.craft.trim() || undefined,
          address: form.address.trim() || undefined,
          location: location ?? undefined,
          status: form.status,
          followup: form.followup,
          notes: form.notes.trim() || undefined,
        });
        if (form.city.trim()) upsertPreset({ category: "city", value: form.city.trim() });
        if (form.craft.trim()) upsertPreset({ category: "craft", value: form.craft.trim() });
        toast.success("مشتری جدید ثبت شد");
      }
      setAddOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setLocation(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره مشتری");
    } finally {
      setSaving(false);
    }
  }

  const statusTitle =
    tab === "permanent"
      ? "مشتریان ثابت"
      : tab === "nonpermanent"
        ? "مشتریان غیرثابت"
        : "همه مشتریان";

  return (
    <AppShell
      title="مشتریان"
      subtitle={statusTitle}
      actions={
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setLocation(null); setAddOpen(true); }} className="gap-2">
          <Plus className="size-4" />
          افزودن مشتری
        </Button>
      }
    >
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "همه مشتریان" },
          { id: "permanent", label: "مشتریان ثابت" },
          { id: "nonpermanent", label: "غیرثابت / در انتظار" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setParams(t.id === "all" ? {} : { tab: t.id })}
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

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجو بر اساس نام، شهر، صنف، تلفن…"
            className="h-11 border-2 pr-9"
          />
        </div>
        <Select value={followupFilter} onValueChange={setFollowupFilter}>
          <SelectTrigger className="h-11 w-full border-2 sm:w-44">
            <SelectValue placeholder="وضعیت پیگیری" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="needs">نیاز به پیگیری</SelectItem>
            <SelectItem value="following">در حال پیگیری</SelectItem>
            <SelectItem value="none">بدون پیگیری</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {!rows ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="size-10 text-muted-foreground/50" />
            <p className="font-semibold">مشتری‌ای یافت نشد</p>
            <p className="text-sm text-muted-foreground">
              با دکمه «افزودن مشتری» اولین مشتری را ثبت کنید
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c._id} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="min-w-0 flex-1 text-right"
                    onClick={() => setDetailId(c._id)}
                  >
                    <div className="truncate font-bold group-hover:text-blue-700">
                      {c.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {toFaDigits(c.phone)}
                      </span>
                      {c.city && <span>{c.city}</span>}
                      {c.craft && <span className="rounded bg-muted px-1.5 py-0.5">{c.craft}</span>}
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailId(c._id)}>
                        مشاهده پروفایل و تاریخچه
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        ویرایش مشتری
                      </DropdownMenuItem>
                      {c.status !== "permanent" && (
                        <DropdownMenuItem
                          onClick={async () => {
                            await promote({ id: c._id as never });
                            toast.success("به مشتری ثابت ارتقا یافت");
                          }}
                        >
                          <ArrowUpCircle className="size-4" />
                          افزودن به مشتریان ثابت
                        </DropdownMenuItem>
                      )}
                      {c.followup !== "needs" && (
                        <DropdownMenuItem
                          onClick={async () => {
                            await setFollowup({ id: c._id as never, followup: "needs" });
                            toast.success("به «نیاز به پیگیری» تغییر کرد");
                          }}
                        >
                          نیاز به پیگیری
                        </DropdownMenuItem>
                      )}
                      {c.followup !== "following" && (
                        <DropdownMenuItem
                          onClick={async () => {
                            await setFollowup({ id: c._id as never, followup: "following" });
                            toast.success("به «در حال پیگیری» تغییر کرد");
                          }}
                        >
                          در حال پیگیری
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          if (!confirm(`حذف مشتری «${c.name}»؟`)) return;
                          await removeCustomer({ id: c._id as never });
                          toast.success("مشتری حذف شد");
                        }}
                      >
                        <Trash2 className="size-4" />
                        حذف مشتری
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <CustomerStatusBadge status={c.status} />
                  <FollowupBadge followup={c.followup} />
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>ثبت: {toFaDigits(c.createdAtLabel)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-blue-700"
                    onClick={() =>
                      navigate(`/dashboard/new-order?customerId=${c._id}`)
                    }
                  >
                    سفارش جدید
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={addOpen || editing != null}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش مشتری" : "افزودن مشتری جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 text-sm font-semibold">نام فرد یا شرکت *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-11 border-2"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">شماره تماس *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-11 border-2 text-right"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 text-sm font-semibold">شهر</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="h-11 border-2"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-sm font-semibold">صنف</Label>
                <Input
                  value={form.craft}
                  onChange={(e) => setForm((f) => ({ ...f, craft: e.target.value }))}
                  className="h-11 border-2"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">وضعیت مشتری</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CustomerForm["status"] }))}
              >
                <SelectTrigger className="h-11 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">مشتری ثابت</SelectItem>
                  <SelectItem value="nonpermanent">مشتری غیرثابت</SelectItem>
                  <SelectItem value="none">بدون وضعیت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">وضعیت پیگیری</Label>
              <Select
                value={form.followup}
                onValueChange={(v) => setForm((f) => ({ ...f, followup: v as CustomerForm["followup"] }))}
              >
                <SelectTrigger className="h-11 border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون پیگیری</SelectItem>
                  <SelectItem value="needs">نیاز به پیگیری</SelectItem>
                  <SelectItem value="following">در حال پیگیری</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">آدرس کتبی</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="min-h-16 border-2"
              />
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
                <MapPin className="size-3.5 text-blue-600" />
                لوکیشن روی نقشه
              </Label>
              <MapPicker
                lat={location?.lat ?? null}
                lng={location?.lng ?? null}
                onChange={(lat, lng) => setLocation({ lat, lng })}
              />
            </div>
            <div>
              <Label className="mb-1.5 text-sm font-semibold">سایر توضیحات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-16 border-2"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "ذخیره تغییرات" : "ثبت مشتری"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {detailId && (
        <CustomerDetailDialog
          id={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </AppShell>
  );
}

function CustomerDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const data = useQuery(api.customers.get, { id: id as never });
  const navigate = useNavigate();
  const { money: customerMoney } = useCurrency();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {!data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {data.customer.name}
                <CustomerStatusBadge status={data.customer.status} />
                <FollowupBadge followup={data.customer.followup} />
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">تلفن: </span>
                  <span className="font-bold" dir="ltr">{toFaDigits(data.customer.phone)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">شهر: </span>
                  <span className="font-bold">{data.customer.city ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">صنف: </span>
                  <span className="font-bold">{data.customer.craft ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">تاریخ ثبت: </span>
                  <span className="font-bold">{toFaDigits(data.customer.createdAtLabel)}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">آدرس: </span>
                  <span className="font-medium">{data.customer.address ?? "—"}</span>
                </div>
                {data.customer.notes && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">توضیحات: </span>
                    <span className="font-medium">{data.customer.notes}</span>
                  </div>
                )}
              </div>

              {data.customer.location && (
                <MapView
                  lat={data.customer.location.lat}
                  lng={data.customer.location.lng}
                  label="لوکیشن مشتری"
                />
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-black">تاریخچه خرید و سفارش‌ها</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => navigate(`/dashboard/new-order?customerId=${data.customer._id}`)}
                  >
                    سفارش جدید
                  </Button>
                </div>
                {data.orders.length === 0 ? (
                  <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                    هنوز سفارشی ثبت نشده است
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.orders.map((o) => (
                      <div
                        key={o._id}
                        className="rounded-xl border p-3 transition-colors hover:border-blue-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-bold">
                            خرید شماره {toFaDigits(o.orderNo)}
                            <span className="text-xs font-normal text-muted-foreground">
                              {toFaDigits(o.dateLabel)}
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-blue-700">{customerMoney(o.total)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              title="پیش‌فاکتور / چاپ"
                              onClick={() => setInvoiceId(o._id)}
                            >
                              <Printer className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              title="ویرایش سفارش"
                              onClick={() => navigate(`/dashboard/new-order?edit=${o._id}`)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {o.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-1.5 text-xs"
                            >
                              <span className="font-bold">{item.productType}</span>
                              {item.material && <span>جنس: {item.material}</span>}
                              {item.color && <span>رنگ: {item.color}</span>}
                              {item.sizes && item.sizes.length > 0 ? (
                                <span className="flex flex-wrap items-center gap-1">
                                  سایزها:
                                  {item.sizes.map((s, si) => (
                                    <span
                                      key={si}
                                      className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800"
                                    >
                                      {s.size}: {toFaDigits(s.qty)}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                item.size && <span>سایز: {item.size}</span>
                              )}
                              {item.printFront && <span>چاپ جلو: {item.printFront}</span>}
                              {item.printBack && <span>چاپ پشت: {item.printBack}</span>}
                              <span className="font-bold text-blue-700">
                                {toFaDigits(item.qty)} عدد
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
      {/* پیش‌فاکتور سفارش‌های این مشتری */}
      <InvoiceDialog orderId={invoiceId} onClose={() => setInvoiceId(null)} />
    </Dialog>
  );
}

import { useQuery } from "convex/react";
import { useRef } from "react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/currency";
import { toFaDigits } from "@/lib/jalali";
import { numToFaWords } from "@/lib/num2words";
import { printElement } from "@/lib/print";
import { Printer, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Item = {
  productType: string;
  material?: string;
  color?: string;
  printType?: string;
  size?: string;
  sizes?: { size: string; qty: number }[];
  qty: number;
  unitPrice: number;
};

type OrderLike = {
  _id: string;
  orderNo: number;
  customerName: string;
  companyName?: string;
  phone: string;
  city?: string;
  address?: string;
  dateLabel: string;
  items: Item[];
  total: number;
  notes?: string;
  status: "pending" | "delivered";
  delivery?: {
    amount: number;
    deliveryFee?: number;
    method: string;
    dateLabel: string;
    timeLabel?: string;
    byName?: string;
  };
};

/**
 * فاکتور فروش A4: نمایش داخل دیالوگ + چاپ/PDF تمیز از همان برگه.
 * برگه سربرگ سرمه‌ای، جدول اقلام راه‌راه، باکس مبلغ و جای امضا دارد.
 */
export function InvoiceDialog({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const data = useQuery(
    api.orders.get,
    orderId ? { id: orderId as never } : "skip",
  );
  const settings = useQuery(api.appSettings.get, {});
  const { currency } = useCurrency();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const copiedRef = useRef(false);

  const order = data as OrderLike | null;
  const factoryName = settings?.factoryName || "تولیدی پوشاک سپید";

  const items = order?.items ?? [];
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
  const deliveryFee = order?.delivery?.deliveryFee ?? 0;
  const paid = order?.delivery?.amount ?? 0;
  const totalWithFee = subtotal + deliveryFee;
  const remaining = Math.max(0, totalWithFee - paid);

  function handlePrint() {
    if (pageRef.current) {
      printElement(pageRef.current, `فاکتور-${order?.orderNo ?? ""}`);
    } else {
      window.print();
    }
  }

  async function handleCopy() {
    if (!order || copiedRef.current) return;
    copiedRef.current = true;
    try {
      const lines: string[] = [];
      lines.push(`${factoryName} — فاکتور فروش شماره ${order.orderNo}`);
      lines.push(`تاریخ: ${order.dateLabel}`);
      lines.push(`خریدار: ${order.customerName}${order.companyName ? ` — ${order.companyName}` : ""}`);
      lines.push(`تلفن: ${order.phone}`);
      if (order.city || order.address) {
        lines.push(`نشانی: ${[order.city, order.address].filter(Boolean).join("، ")}`);
      }
      lines.push("—");
      lines.push("شرح کالا | مشخصات | تعداد | قیمت واحد | جمع");
      order.items.forEach((it, i) => {
        const spec = [
          it.material && `جنس: ${it.material}`,
          it.color && `رنگ: ${it.color}`,
          it.printType && `چاپ: ${it.printType}`,
          it.sizes?.length
            ? `سایز: ${it.sizes.map((s) => `${s.size}(${s.qty})`).join("، ")}`
            : it.size,
        ]
          .filter(Boolean)
          .join(" · ");
        lines.push(
          `${i + 1}. ${it.productType} | ${spec || "—"} | ${it.qty} | ${Math.round(it.unitPrice).toLocaleString("en-US")} | ${Math.round(it.unitPrice * it.qty).toLocaleString("en-US")}`,
        );
      });
      lines.push("—");
      lines.push(`مبلغ کل: ${Math.round(totalWithFee).toLocaleString("en-US")} ${currency}`);
      if (order.delivery) {
        lines.push(`دریافتی: ${Math.round(paid).toLocaleString("en-US")} ${currency}`);
        lines.push(`مانده: ${Math.round(remaining).toLocaleString("en-US")} ${currency}`);
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("متن فاکتور کپی شد");
    } catch {
      toast.error("کپی نشد");
    } finally {
      setTimeout(() => (copiedRef.current = false), 800);
    }
  }

  return (
    <Dialog open={orderId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="invoice-root max-h-[94vh] overflow-y-auto p-0 sm:max-w-3xl print:max-h-none">
        <DialogHeader className="sr-only">
          <DialogTitle>فاکتور فروش</DialogTitle>
        </DialogHeader>

        {/* نوار ابزار چاپ (چاپ نمی‌شود) */}
        <div className="invoice-actions sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 p-3 backdrop-blur print:hidden">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer className="size-4" />
            چاپ / ذخیره به PDF
          </Button>
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="size-4" />
            کپی متن
          </Button>
          <p className="mr-1 hidden text-[11px] leading-4 text-muted-foreground sm:block">
            در پنجره چاپ «Save as PDF» را
            <br />
            انتخاب کنید تا فایل ذخیره شود
          </p>
        </div>

        {!order ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            در حال بارگذاری…
          </div>
        ) : (
          <div className="p-3 sm:p-5">
            {/* ================= برگه فاکتور A4 ================= */}
            <div ref={pageRef} className="inv-page mx-auto w-full overflow-hidden rounded-xl shadow-lg">
              {/* سربرگ سرمه‌ای */}
              <div className="inv-head flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25">
                    <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9" aria-hidden>
                      <path
                        d="M17 9 L11 13 L6 20 L11 24 L13 21 L13 39 Q24 42 35 39 L35 21 L37 24 L42 20 L37 13 L31 9 Q28 13 24 13 Q20 13 17 9 Z"
                        fill="rgba(255,255,255,0.95)"
                        stroke="rgba(255,255,255,0.95)"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M17.5 9.5 Q24 16 30.5 9.5"
                        stroke="#1e40af"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <g strokeLinecap="round">
                        <path d="M14 36 L31 19" stroke="#1e3a8a" strokeWidth="2.4" />
                        <path d="M14 36 L12.4 37.6" stroke="#1e3a8a" strokeWidth="2.4" />
                        <circle cx="31.8" cy="18.2" r="1.4" fill="#1e3a8a" />
                        <path
                          d="M31 20 Q34 24 31.5 27 Q29 30 32 33 Q34.5 35.5 33 38"
                          stroke="#93c5fd"
                          strokeWidth="1.6"
                          fill="none"
                        />
                      </g>
                    </svg>
                  </span>
                  <div>
                    <div className="text-xl font-black tracking-tight">{factoryName}</div>
                    <div className="mt-1 text-[11px] text-blue-100/90">
                      تولید و عرضه انواع پوشاک — عمده و تکی
                    </div>
                    <div className="mt-1 text-[11px] text-blue-100/80">
                      {settings?.phone ? `تلفن: ${toFaDigits(settings.phone)}` : ""}
                      {settings?.address
                        ? (settings.phone ? " · " : "") + settings.address
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 text-left ring-1 ring-white/25">
                  <div className="text-base font-black">فاکتور فروش</div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-blue-100/90">
                    <div>
                      شماره: <b className="text-white">{toFaDigits(order.orderNo)}</b>
                    </div>
                    <div>
                      تاریخ: <b className="text-white">{toFaDigits(order.dateLabel)}</b>
                    </div>
                    <div>
                      وضعیت:{" "}
                      <b className="text-white">
                        {order.status === "delivered" ? "تحویل شده" : "در انتظار تحویل"}
                      </b>
                    </div>
                  </div>
                </div>
              </div>

              {/* اطلاعات خریدار */}
              <div className="inv-keep grid gap-2.5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span>
                    <span className="text-xs text-slate-500">خریدار: </span>
                    <span className="text-sm font-black">{order.customerName}</span>
                  </span>
                  {order.companyName && (
                    <span>
                      <span className="text-xs text-slate-500">شرکت: </span>
                      <span className="text-sm font-bold">{order.companyName}</span>
                    </span>
                  )}
                  <span dir="ltr" style={{ unicodeBidi: "plaintext" }}>
                    <span className="text-xs text-slate-500">تلفن: </span>
                    <span className="text-sm font-bold">{toFaDigits(order.phone)}</span>
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500">نشانی: </span>
                  <span className="text-sm">
                    {[order.city, order.address].filter(Boolean).join("، ") || "—"}
                  </span>
                </div>
              </div>

              {/* جدول اقلام */}
              <div className="px-5 sm:px-6">
                <table className="inv-table w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="inv-th rounded-r-lg text-right">#</th>
                      <th className="inv-th text-right">شرح کالا</th>
                      <th className="inv-th text-right">مشخصات</th>
                      <th className="inv-th text-center">تعداد</th>
                      <th className="inv-th text-left">
                        قیمت واحد ({currency})
                      </th>
                      <th className="inv-th rounded-l-lg text-left">جمع ({currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const spec = [
                        it.material && `جنس: ${it.material}`,
                        it.color && `رنگ: ${it.color}`,
                        it.printType && `نوع چاپ: ${it.printType}`,
                        it.sizes && it.sizes.length > 0
                          ? `سایزها: ${it.sizes.map((s) => `${s.size}(${toFaDigits(s.qty)})`).join("، ")}`
                          : it.size && `سایز: ${it.size}`,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr key={i} className="inv-row border-b border-slate-200/70 last:border-0">
                          <td className="py-2.5 pl-1 text-right text-slate-400 font-bold">
                            {toFaDigits(i + 1)}
                          </td>
                          <td className="py-2.5 font-black">{it.productType}</td>
                          <td className="py-2.5 text-[11px] leading-5 text-slate-600">
                            {spec || "—"}
                          </td>
                          <td className="py-2.5 text-center font-bold">
                            {toFaDigits(it.qty)}
                          </td>
                          <td className="py-2.5 text-left" dir="ltr">
                            {toFaDigits(
                              Math.round(it.unitPrice).toLocaleString("en-US"),
                            )}
                          </td>
                          <td className="py-2.5 text-left font-black" dir="ltr">
                            {toFaDigits(
                              Math.round(it.unitPrice * it.qty).toLocaleString("en-US"),
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                          قلمی ثبت نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* جمع‌ها + امضا */}
              <div className="inv-keep grid gap-4 p-5 sm:grid-cols-5 sm:p-6">
                <div className="space-y-2 text-sm sm:col-span-3">
                  <div className="inv-total-box flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-black">مبلغ کل سفارش</span>
                    <span className="text-xl font-black text-blue-800" dir="ltr">
                      {toFaDigits(Math.round(totalWithFee).toLocaleString("en-US"))}{" "}
                      <span className="text-xs font-bold">{currency}</span>
                    </span>
                  </div>
                  <div className="rounded-xl border bg-white px-4 py-2.5 text-[11px] leading-6 text-slate-600">
                    <b className="text-slate-800">مبلغ به حروف: </b>
                    {numToFaWords(totalWithFee, currency)}
                  </div>
                  {order.delivery && (
                    <div className="rounded-xl border bg-white px-4 py-2.5 text-xs leading-6">
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          تحویل: {toFaDigits(order.delivery.dateLabel)}
                          {order.delivery.timeLabel
                            ? ` — ${toFaDigits(order.delivery.timeLabel)}`
                            : ""}{" "}
                          · {order.delivery.method}
                        </span>
                        <span dir="ltr" className="font-bold">
                          {toFaDigits(Math.round(paid).toLocaleString("en-US"))}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-dashed pt-1">
                        <span className="font-black text-slate-800">مانده از مبلغ کل</span>
                        <span dir="ltr" className="font-black text-red-700">
                          {toFaDigits(Math.round(remaining).toLocaleString("en-US"))}
                        </span>
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div className="rounded-xl border bg-white px-4 py-2.5 text-[11px] leading-6 text-slate-600">
                      <b className="text-slate-800">توضیحات: </b>
                      {order.notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-4 sm:col-span-2">
                  <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
                    <Check className="size-3.5 text-emerald-600" />
                    سند سیستمی — بدون مهر و امضای دستی معتبر است
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center text-[11px] font-bold text-slate-500">
                    <div>
                      <div className="inv-sign-line mb-1.5 mt-10" />
                      مهر و امضای فروشنده
                    </div>
                    <div>
                      <div className="inv-sign-line mb-1.5 mt-10" />
                      مهر و امضای خریدار
                    </div>
                  </div>
                </div>
              </div>

              {/* پانوشت */}
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 text-[10px] text-slate-400 sm:px-6">
                <span>{factoryName} — سامانه مدیریت فروش</span>
                <span>این سند به‌صورت سیستمی صادر شده است</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

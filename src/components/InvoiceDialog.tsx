import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/lib/currency";
import { toFaDigits } from "@/lib/jalali";
import { Printer } from "lucide-react";

type Item = {
  productType: string;
  material?: string;
  color?: string;
  size?: string;
  sizes?: { size: string; qty: number }[];
  qty: number;
  unitPrice: number;
};

type OrderLike = {
  _id: string;
  orderNo: number;
  customerName: string;
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
  };
};

/**
 * پیش‌فاکتور/فاکتور سفارش: قابل چاپ و ذخیره به PDF (از همان منوی چاپ مرورگر).
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
  const { money, currency } = useCurrency();

  const order = data as OrderLike | null;
  const factoryName = settings?.factoryName || "تولیدی پوشاک سپید";

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={orderId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="invoice-root max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible sm:max-w-2xl">
        <DialogHeader className="print:hidden">
          <DialogTitle>پیش‌فاکتور — خرید شماره {order ? toFaDigits(order.orderNo) : "…"}</DialogTitle>
        </DialogHeader>

        <div className="print-actions print:hidden">
          <Button onClick={handlePrint} className="w-full gap-2">
            <Printer className="size-4" />
            چاپ / ذخیره به PDF
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            در پنجره چاپ می‌توانید «Save as PDF» را انتخاب کنید
          </p>
        </div>

        {!order ? (
          <div className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری…</div>
        ) : (
          <div className="invoice-sheet rounded-xl border p-6 print:border-0 print:p-0">
            {/* سربرگ */}
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-800 text-2xl font-black text-white shadow-sm">
                  س
                </span>
                <div>
                  <div className="text-lg font-black">{factoryName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {settings?.phone ? `تلفن: ${toFaDigits(settings.phone)}` : ""}
                    {settings?.address ? (settings.phone ? " · " : "") + settings.address : ""}
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-black">پیش‌فاکتور فروش</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  شماره: {toFaDigits(order.orderNo)}
                </div>
                <div className="text-xs text-muted-foreground">
                  تاریخ: {toFaDigits(order.dateLabel)}
                </div>
              </div>
            </div>

            {/* اطلاعات خریدار */}
            <div className="mt-4 grid gap-2 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">خریدار: </span>
                <span className="font-bold">{order.customerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">تلفن: </span>
                <span className="font-bold" dir="ltr">{toFaDigits(order.phone)}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">نشانی: </span>
                <span>
                  {[order.city, order.address].filter(Boolean).join("، ") || "—"}
                </span>
              </div>
            </div>

            {/* اقلام */}
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-right font-semibold">#</th>
                  <th className="py-2 text-right font-semibold">شرح کالا</th>
                  <th className="py-2 text-right font-semibold">مشخصات</th>
                  <th className="py-2 text-center font-semibold">تعداد</th>
                  <th className="py-2 text-left font-semibold">قیمت واحد ({currency})</th>
                  <th className="py-2 text-left font-semibold">جمع ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => {
                  const spec = [
                    it.material && `جنس: ${it.material}`,
                    it.color && `رنگ: ${it.color}`,
                    it.sizes && it.sizes.length > 0
                      ? `سایزها: ${it.sizes.map((s) => `${s.size}(${toFaDigits(s.qty)})`).join("، ")}`
                      : it.size && `سایز: ${it.size}`,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-right">{toFaDigits(i + 1)}</td>
                      <td className="py-2 font-bold">{it.productType}</td>
                      <td className="py-2 text-xs text-muted-foreground">{spec || "—"}</td>
                      <td className="py-2 text-center">{toFaDigits(it.qty)}</td>
                      <td className="py-2 text-left">{toFaDigits(Math.round(it.unitPrice).toLocaleString("en-US"))}</td>
                      <td className="py-2 text-left font-bold">
                        {toFaDigits(Math.round(it.unitPrice * it.qty).toLocaleString("en-US"))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* جمع‌ها */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
                <span className="font-bold">مبلغ کل سفارش</span>
                <span className="text-lg font-black text-blue-700">{money(order.total)}</span>
              </div>
              {order.delivery && (
                <>
                  <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
                    <span>
                      تحویل: {toFaDigits(order.delivery.dateLabel)}
                      {order.delivery.timeLabel ? ` — ساعت ${toFaDigits(order.delivery.timeLabel)}` : ""} ·{" "}
                      {order.delivery.method}
                    </span>
                    <span>دریافتی: {money(order.delivery.amount)}</span>
                  </div>
                  {order.delivery.deliveryFee != null && (
                    <div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
                      <span>هزینه تحویل</span>
                      <span>{money(order.delivery.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 text-sm">
                    <span className="font-bold">مانده از مبلغ کل</span>
                    <span className="font-black">
                      {money(
                        order.total -
                          order.delivery.amount +
                          (order.delivery.deliveryFee ?? 0),
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {order.notes && (
              <p className="mt-3 rounded-lg border p-3 text-xs leading-6 text-muted-foreground">
                توضیحات: {order.notes}
              </p>
            )}

            <Separator className="my-4" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{factoryName} — سامانه مدیریت فروش</span>
              <span>این سند به‌صورت سیستمی صادر شده است</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

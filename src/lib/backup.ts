import * as XLSX from "xlsx";
import { formatJalali, toFaDigits } from "@/lib/jalali";

/** رمز ورود به بخش پشتیبان‌گیری */
export { BACKUP_PASSWORD } from "@/lib/backupConst";

export type BackupData = {
  customers: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  warehouseItems: Record<string, unknown>[];
  warehouseLogs: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  users: Record<string, unknown>[];
  appSettings: Record<string, unknown> | null;
};

const STATUS_FA: Record<string, string> = {
  permanent: "دائمی",
  nonpermanent: "غیردائمی",
  none: "بدون وضعیت",
};
const FOLLOWUP_FA: Record<string, string> = {
  none: "بدون پیگیری",
  needs: "نیاز به پیگیری",
  following: "در حال پیگیری",
};
const ORDER_STATUS_FA: Record<string, string> = {
  pending: "در انتظار تحویل",
  delivered: "تحویل شده",
};
const LOG_ACTION_FA: Record<string, string> = {
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  stock: "ورود/خروج",
};
export const SECTION_LABELS: Record<string, string> = {
  orders: "ثبت سفارش",
  customers: "مشتریان",
  delivery: "تحویل محصول",
  warehouse: "انبار",
  users: "کاربران و دسترسی‌ها",
  settings: "تنظیمات",
};
const LEVEL_FA: Record<string, string> = {
  none: "هیچ",
  view: "فقط مشاهده",
  full: "کامل",
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
function faMoney(v: unknown): string {
  return toFaDigits(Math.round(num(v)).toLocaleString("en-US"));
}
function esc(v: unknown): string {
  return str(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** زیرشاخه‌های مواد اولیه: «سوزن ۱: ۲۰ | سوزن ۲: ۵» */
function attrQtySummary(item: Record<string, unknown>): string {
  const attrQty = (item.attrQty as { key: string; value: string; qty: number }[] | undefined) ?? [];
  const attrs = (item.attrs as { key: string; value: string }[] | undefined) ?? [];
  const parts = attrs.map((a) => {
    const q = attrQty.find((x) => x.key === a.key && x.value === a.value)?.qty ?? 0;
    return `${a.value}: ${toFaDigits(q)}`;
  });
  return parts.join(" | ");
}

function itemSizesSummary(item: Record<string, unknown>): string {
  const sizes = (item.sizes as { size: string; qty: number }[] | undefined) ?? [];
  if (sizes.length > 0) return sizes.map((s) => `${s.size}(${toFaDigits(s.qty)})`).join("، ");
  return str(item.size);
}

/* ---------------------------------- Excel --------------------------------- */

function sheetFromAoa(aoa: (string | number)[][], widths?: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = (widths ?? aoa[0]?.map(() => 18)).map((wch) => ({ wch }));
  return ws;
}

export function buildWorkbook(data: BackupData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  // ۱) مشتریان
  const customersAoa: (string | number)[][] = [
    ["نام", "تلفن", "شهر", "صنف", "نشانی", "وضعیت", "پیگیری", "توضیحات", "تاریخ ثبت"],
    ...data.customers.map((c) => [
      str(c.name),
      str(c.phone),
      str(c.city),
      str(c.craft),
      str(c.address),
      STATUS_FA[str(c.status)] ?? str(c.status),
      FOLLOWUP_FA[str(c.followup)] ?? str(c.followup),
      str(c.notes),
      str(c.createdAtLabel),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(customersAoa, [22, 15, 12, 14, 40, 12, 14, 30, 14]), "مشتریان");

  // ۲) سفارش‌ها
  const ordersAoa: (string | number)[][] = [
    ["شماره خرید", "نام فرد", "شرکت", "تلفن", "شهر", "نشانی", "تاریخ", "وضعیت", "مبلغ کل", "هزینه تحویل", "دریافتی", "مانده", "ثبت‌کننده", "توضیحات"],
    ...data.orders.map((o) => {
      const d = (o.delivery as Record<string, unknown> | undefined) ?? undefined;
      const fee = d ? num(d.deliveryFee) : 0;
      const paid = d ? num(d.amount) : 0;
      return [
        num(o.orderNo),
        str(o.customerName),
        str(o.companyName),
        str(o.phone),
        str(o.city),
        str(o.address),
        str(o.dateLabel),
        ORDER_STATUS_FA[str(o.status)] ?? str(o.status),
        num(o.total),
        fee,
        paid,
        num(o.total) - paid + fee,
        str(o.createdByName),
        str(o.notes),
      ];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(ordersAoa, [10, 20, 18, 14, 12, 36, 12, 14, 14, 12, 12, 12, 14, 28]), "سفارش‌ها");

  // ۳) اقلام سفارش‌ها
  const itemsAoa: (string | number)[][] = [
    ["شماره خرید", "مشتری", "محصول", "جنس", "رنگ", "نوع چاپ", "چاپ جلو", "چاپ پشت", "دکمه", "زیپ", "جیب", "سایزها", "تعداد", "قیمت واحد", "جمع"],
    ...data.orders.flatMap((o) =>
      ((o.items as Record<string, unknown>[] | undefined) ?? []).map((it) => [
        num(o.orderNo),
        str(o.customerName),
        str(it.productType),
        str(it.material),
        str(it.color),
        str(it.printType),
        str(it.printFront),
        str(it.printBack),
        str(it.buttonType),
        str(it.zipperType),
        str(it.pocketType),
        itemSizesSummary(it),
        num(it.qty),
        num(it.unitPrice),
        num(it.qty) * num(it.unitPrice),
      ]),
    ),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(itemsAoa, [10, 20, 18, 12, 12, 14, 16, 16, 12, 12, 12, 16, 8, 14, 14]), "اقلام سفارش‌ها");

  // ۴) انبار
  const whAoa: (string | number)[][] = [
    ["نوع", "نام", "دسته", "نوع لباس", "جنس", "رنگ", "گرماژ", "زیرشاخه‌ها (تعداد)", "موجودی کل", "واحد", "حداقل هشدار", "قیمت", "توضیحات"],
    ...data.warehouseItems.map((w) => [
      w.kind === "apparel" ? "پوشاک" : "مواد اولیه",
      str(w.name),
      str(w.category),
      str(w.productType),
      str(w.material),
      str(w.color),
      str(w.fabricWeight),
      w.kind === "material" ? attrQtySummary(w) : itemSizesSummary(w),
      num(w.qty),
      str(w.unit),
      num(w.minQty),
      num(w.price),
      str(w.notes),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(whAoa, [12, 22, 12, 14, 14, 12, 10, 30, 12, 10, 12, 14, 26]), "انبار");

  // ۵) رویدادهای انبار
  const logsAoa: (string | number)[][] = [
    ["قلم انبار", "عملیات", "تغییرات", "کاربر", "تاریخ"],
    ...data.warehouseLogs.map((l) => [
      str(l.itemName),
      LOG_ACTION_FA[str(l.action)] ?? str(l.action),
      ((l.changes as { field: string; old?: string; new?: string }[] | undefined) ?? [])
        .map((c) => `${c.field}: ${c.old ?? "—"} → ${c.new ?? "—"}`)
        .join(" · "),
      str(l.byName),
      formatJalali(num(l.atTs)),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(logsAoa, [20, 10, 60, 16, 16]), "رویدادهای انبار");

  // ۶) کاربران
  const usersAoa: (string | number)[][] = [
    ["نام", "ایمیل", "شغل", "نقش"],
    ...data.users.map((u) => [str(u.name), str(u.email), str(u.jobTitle), str(u.roleName)]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(usersAoa, [22, 28, 16, 18]), "کاربران");

  // ۷) نقش‌ها و دسترسی‌ها
  const rolesAoa: (string | number)[][] = [
    ["نقش", ...Object.values(SECTION_LABELS)],
    ...data.roles.map((r) => {
      const levels = (r.levels as Record<string, string> | undefined) ?? {};
      return [
        str(r.name),
        ...Object.keys(SECTION_LABELS).map((s) => LEVEL_FA[levels[s] ?? "none"] ?? "هیچ"),
      ];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(rolesAoa, [20, 14, 14, 14, 14, 18, 14]), "نقش‌ها");

  // ۸) تنظیمات
  const s = data.appSettings ?? {};
  const settingsAoa: (string | number)[][] = [
    ["کلید", "مقدار"],
    ["نام مجموعه", str(s.factoryName)],
    ["تلفن", str(s.phone)],
    ["نشانی", str(s.address)],
    ["شهر پیش‌فرض", str(s.defaultCity)],
    ["واحد پول", str(s.currency)],
    ["حداقل موجودی هشدار", num(s.lowStockThreshold)],
    ["روش‌های تحویل", ((s.deliveryMethods as string[] | undefined) ?? []).join("، ")],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(settingsAoa, [22, 40]), "تنظیمات");

  return wb;
}

/** دانلود فایل اکسل پشتیبان (هر بخش در شیت جدا) */
export function downloadExcelBackup(data: BackupData) {
  const wb = buildWorkbook(data);
  const fname = `پشتیبان-سپید-${todayLabel()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

function todayLabel() {
  return formatJalali(Date.now()).replace(/\//g, "-");
}

/* ----------------------------------- PDF ---------------------------------- */

function pdfSection(title: string, headers: string[], rows: (string | number)[][]): string {
  const body = rows.length
    ? rows
        .map(
          (r, i) =>
            `<tr class="${i % 2 ? "alt" : ""}">${r
              .map((c) => `<td>${esc(c)}</td>`)
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${headers.length}" class="empty">موردی ثبت نشده است</td></tr>`;
  return `
    <section>
      <h2>${esc(title)}</h2>
      <table>
        <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

/** گزارش PDF خفن: در پنجره جدید باز می‌شود و مستقیم دیالوگ چاپ/ذخیره PDF می‌آید */
export function openBackupReportPdf(data: BackupData, factoryName: string) {
  const totalSales = data.orders.reduce((s, o) => s + num(o.total), 0);
  const itemsCount = data.orders.reduce(
    (s, o) => s + (((o.items as unknown[]) ?? []) as unknown[]).length,
    0,
  );
  const now = new Date();
  const time = toFaDigits(
    `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
  );

  const s = data.appSettings ?? {};

  const html = `<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8" />
<title>پشتیبان کامل — ${esc(factoryName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Vazirmatn, Tahoma, "Segoe UI", sans-serif; background: #eef2f7; color: #1e293b; padding: 24px 12px; }
  .page { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 40px rgba(15,23,42,.12); }
  .head { background: linear-gradient(135deg, #1e3a8a, #1d4ed8 60%, #2563eb); color: #fff; padding: 26px 28px; }
  .head h1 { font-size: 22px; font-weight: 900; }
  .head .sub { margin-top: 6px; font-size: 12px; opacity: .85; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .chip { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 5px 12px; font-size: 11px; font-weight: 700; }
  main { padding: 20px 24px 8px; }
  section { margin-bottom: 22px; page-break-inside: avoid; }
  h2 { font-size: 14px; font-weight: 900; color: #1d4ed8; border-right: 4px solid #1d4ed8; padding-right: 8px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; }
  th { background: #1e3a8a; color: #fff; padding: 7px 8px; text-align: right; font-weight: 800; white-space: nowrap; }
  td { padding: 6px 8px; border-top: 1px solid #e8edf3; vertical-align: top; }
  tr.alt td { background: #f6f9fd; }
  td.empty { text-align: center; color: #94a3b8; padding: 14px; }
  .foot { border-top: 1px solid #e2e8f0; padding: 12px 24px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  .printbar { position: fixed; top: 12px; left: 12px; }
  .printbar button { font-family: inherit; background: #1d4ed8; color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 18px rgba(29,78,216,.35); }
  @media print { .printbar { display: none; } body { background: #fff; padding: 0; } .page { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
<div class="printbar"><button onclick="window.print()">چاپ / ذخیره به PDF</button></div>
<div class="page">
  <div class="head">
    <h1>${esc(factoryName)} — پشتیبان کامل اطلاعات</h1>
    <div class="sub">تاریخ گزارش: ${esc(formatJalali(now.getTime()))} — ساعت ${time}</div>
    <div class="chips">
      <span class="chip">مشتریان: ${toFaDigits(data.customers.length)}</span>
      <span class="chip">سفارش‌ها: ${toFaDigits(data.orders.length)}</span>
      <span class="chip">اقلام سفارش: ${toFaDigits(itemsCount)}</span>
      <span class="chip">اقلام انبار: ${toFaDigits(data.warehouseItems.length)}</span>
      <span class="chip">کاربران: ${toFaDigits(data.users.length)}</span>
      <span class="chip">مجموع فروش: ${faMoney(totalSales)}</span>
    </div>
  </div>
  <main>
    ${pdfSection("مشتریان", ["نام", "تلفن", "شهر", "صنف", "وضعیت", "پیگیری", "تاریخ ثبت"], data.customers.map((c) => [str(c.name), str(c.phone), str(c.city), str(c.craft), STATUS_FA[str(c.status)] ?? str(c.status), FOLLOWUP_FA[str(c.followup)] ?? str(c.followup), str(c.createdAtLabel)]))}
    ${pdfSection("سفارش‌ها", ["#", "مشتری", "تلفن", "تاریخ", "وضعیت", "مبلغ کل", "دریافتی", "مانده"], data.orders.map((o) => { const d = (o.delivery as Record<string, unknown> | undefined) ?? undefined; const paid = d ? num(d.amount) : 0; const fee = d ? num(d.deliveryFee) : 0; return [toFaDigits(num(o.orderNo)), str(o.customerName), toFaDigits(str(o.phone)), str(o.dateLabel), ORDER_STATUS_FA[str(o.status)] ?? str(o.status), faMoney(o.total), faMoney(paid), faMoney(num(o.total) - paid + fee)]; }))}
    ${pdfSection("اقلام سفارش‌ها", ["#", "مشتری", "محصول", "مشخصات", "تعداد", "قیمت واحد", "جمع"], data.orders.flatMap((o) => ((o.items as Record<string, unknown>[] | undefined) ?? []).map((it) => { const spec = [str(it.material) && `جنس: ${str(it.material)}`, str(it.color) && `رنگ: ${str(it.color)}`, str(it.printType) && `چاپ: ${str(it.printType)}`, itemSizesSummary(it) && `سایز: ${itemSizesSummary(it)}`].filter(Boolean).join(" · "); return [toFaDigits(num(o.orderNo)), str(o.customerName), str(it.productType), spec, toFaDigits(num(it.qty)), faMoney(it.unitPrice), faMoney(num(it.qty) * num(it.unitPrice))]; })))}
    ${pdfSection("انبار", ["نوع", "نام", "زیرشاخه‌ها / سایزها", "موجودی کل", "واحد", "حداقل هشدار"], data.warehouseItems.map((w) => [w.kind === "apparel" ? "پوشاک" : "مواد اولیه", str(w.name), w.kind === "material" ? attrQtySummary(w) : itemSizesSummary(w), toFaDigits(num(w.qty)), str(w.unit), toFaDigits(num(w.minQty))]))}
    ${pdfSection("رویدادهای انبار", ["قلم", "عملیات", "تغییرات", "کاربر", "تاریخ"], data.warehouseLogs.map((l) => [str(l.itemName), LOG_ACTION_FA[str(l.action)] ?? str(l.action), ((l.changes as { field: string; old?: string; new?: string }[] | undefined) ?? []).map((c) => `${c.field}: ${c.old ?? "—"} → ${c.new ?? "—"}`).join(" · "), str(l.byName), formatJalali(num(l.atTs))]))}
    ${pdfSection("کاربران و دسترسی‌ها", ["نام", "ایمیل", "شغل", "نقش"], data.users.map((u) => [str(u.name), str(u.email), str(u.jobTitle), str(u.roleName)]))}
    ${pdfSection("نقش‌ها", ["نقش", ...Object.values(SECTION_LABELS)], data.roles.map((r) => { const levels = (r.levels as Record<string, string> | undefined) ?? {}; return [str(r.name), ...Object.keys(SECTION_LABELS).map((sec) => LEVEL_FA[levels[sec] ?? "none"] ?? "هیچ")]; }))}
    ${pdfSection("تنظیمات", ["کلید", "مقدار"], [["نام مجموعه", str(s.factoryName)], ["تلفن", str(s.phone)], ["نشانی", str(s.address)], ["شهر پیش‌فرض", str(s.defaultCity)], ["واحد پول", str(s.currency)], ["حداقل موجودی هشدار", toFaDigits(num(s.lowStockThreshold))], ["روش‌های تحویل", ((s.deliveryMethods as string[] | undefined) ?? []).join("، ")]] as (string | number)[][])}
  </main>
  <div class="foot">
    <span>${esc(factoryName)} — سامانه مدیریت فروش</span>
    <span>این سند به‌صورت سیستمی تولید شده است</span>
  </div>
</div>
<script>window.setTimeout(function(){window.print()}, 500);</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("مرورگر اجازه بازکردن پنجره جدید را نداد — لطفا پاپ‌آپ را مجاز کنید");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

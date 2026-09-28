import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/convex/_generated/api";
import { AppShell, useMyAccess } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SECTIONS, canAccess } from "@/lib/sections";
import { JALALI_MONTHS, gregorianToJalali, toFaDigits, todayJalaliLabel } from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import {
  Boxes,
  ClipboardList,
  Plus,
  Shield,
  Truck,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

const ICONS: Record<string, typeof ClipboardList> = {
  clipboard: ClipboardList,
  users: Users,
  truck: Truck,
  boxes: Boxes,
  shield: Shield,
};

export default function Dashboard() {
  const { isOwner, perms, access } = useMyAccess();
  const { money, num } = useCurrency();
  const navigate = useNavigate();

  // خوش‌آمد زمان‌دار: صبح/ظهر/عصر/شب
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "صبح بخیر";
    if (h < 17) return "ظهر بخیر";
    if (h < 20) return "عصر بخیر";
    return "شب بخیر";
  }, []);

  const customers = useQuery(api.customers.list, {});
  const pending = useQuery(api.orders.list, { status: "pending" });
  const delivered = useQuery(api.orders.list, { status: "delivered" });
  const allOrders = useQuery(api.orders.list, {});

  // فروش ماهانه (۶ ماه اخیر شمسی)
  const salesData = useMemo(() => {
    if (!allOrders) return [];
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const jy = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, 15)[0];
      const jm = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, 15)[1];
      buckets[`${jy}/${String(jm).padStart(2, "0")}`] = 0;
    }
    for (const o of allOrders) {
      const key = o.dateLabel.slice(0, 7); // 1404/07
      if (key in buckets) buckets[key] += o.total;
    }
    return Object.entries(buckets).map(([key, total]) => ({
      month: JALALI_MONTHS[Number(key.slice(5, 7)) - 1],
      total,
    }));
  }, [allOrders]);

  const stats = useMemo(
    () => [
      {
        label: "مشتریان",
        value: customers ? toFaDigits(customers.length) : "…",
        icon: Users,
        path: "/dashboard/customers",
        tint: "bg-blue-50 text-blue-700",
      },
      {
        label: "در انتظار تحویل",
        value: pending ? toFaDigits(pending.length) : "…",
        icon: Truck,
        path: "/dashboard/delivery",
        tint: "bg-amber-50 text-amber-700",
      },
      {
        label: "تحویل داده شده",
        value: delivered ? toFaDigits(delivered.length) : "…",
        icon: ClipboardList,
        path: "/dashboard/delivery?tab=delivered",
        tint: "bg-emerald-50 text-emerald-700",
      },
    ],
    [customers, pending, delivered],
  );

  const sections = SECTIONS.filter((s) => isOwner || canAccess(perms, s.id));

  return (
    <AppShell
      title="پیشخوان"
      subtitle={`امروز ${toFaDigits(todayJalaliLabel())}`}
      actions={
        <Button onClick={() => navigate("/dashboard/new-order")} className="gap-2 shadow-md shadow-blue-600/20">
          <Plus className="size-4" />
          سفارش جدید
        </Button>
      }
    >
      {/* Hero CTA */}
      <Card className="mb-6 overflow-hidden rounded-2xl border-0 bg-gradient-to-l from-blue-950 via-blue-800 to-blue-600 text-white shadow-lg shadow-blue-900/20">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">
              {greeting}
              {access?.name ? `، ${access.name}` : ""} 👋
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              مهم‌ترین کار امروز: ثبت سفارش جدید — با تفکیک سایز و محاسبه خودکار قیمت
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 bg-white font-black text-blue-800 shadow-md hover:bg-blue-50"
            onClick={() => navigate("/dashboard/new-order")}
          >
            <ClipboardList className="size-5" />
            ثبت سفارش
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.path}>
            <Card className="group rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                  <s.icon className="size-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-black">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Sales total banner */}
      <Card className="mb-6 rounded-2xl border-border/70 bg-gradient-to-l from-blue-50 via-background to-background shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <div className="text-xs text-muted-foreground">مجموع فروش ثبت‌شده (همه سفارش‌ها)</div>
            <div className="mt-1 text-2xl font-black text-blue-800">
              {allOrders ? money(allOrders.reduce((s, o) => s + o.total, 0)) : "…"}
            </div>
          </div>
          <div className="text-left text-xs leading-6 text-muted-foreground">
            <div>واحد پول از تنظیمات خوانده می‌شود</div>
            <div>مبالغ با اعداد فارسی نمایش داده می‌شوند</div>
          </div>
        </CardContent>
      </Card>

      {/* Sections grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = ICONS[s.icon] ?? ClipboardList;
          return (
            <Link key={s.id} to={s.path}>
              <Card className="group h-full rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold group-hover:text-blue-700">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.id === "orders" && "فرم ثبت سفارش با تفکیک سایز و قیمت"}
                      {s.id === "customers" && "ثابت، غیرثابت، پیگیری، تاریخچه خرید"}
                      {s.id === "delivery" && "در انتظار تحویل و تحویل داده شده"}
                      {s.id === "warehouse" && "پوشاک و مواد اولیه با تاریخچه"}
                      {s.id === "users" && "نقش‌ها و دسترسی کارمندان"}
                      {s.id === "settings" && "واحد پول، روش‌های تحویل، اطلاعات کارخانه"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Sales chart (last 6 jalali months) */}
      <Card className="mt-6 rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">تحلیل فروش ۶ ماه اخیر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={0}
                  height={44}
                  angle={-35}
                  textAnchor="end"
                  tickMargin={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => num(v)}
                  width={64}
                />
                <Tooltip
                  formatter={(v: number | string) => [money(Number(v)), "فروش"]}
                  labelFormatter={(l: string) => l}
                  contentStyle={{
                    direction: "rtl",
                    fontFamily: "inherit",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                  }}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            مجموع سفارش‌های ثبت‌شده بر اساس ماه شمسی
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}

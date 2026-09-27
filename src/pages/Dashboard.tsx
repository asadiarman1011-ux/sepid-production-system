import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/convex/_generated/api";
import { AppShell, useMyAccess } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SECTIONS, canAccess } from "@/lib/sections";
import { JALALI_MONTHS, gregorianToJalali, toFaDigits, todayJalaliLabel } from "@/lib/jalali";
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
  const { isOwner, perms } = useMyAccess();
  const navigate = useNavigate();

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
      },
      {
        label: "در انتظار تحویل",
        value: pending ? toFaDigits(pending.length) : "…",
        icon: Truck,
        path: "/dashboard/delivery",
      },
      {
        label: "تحویل داده شده",
        value: delivered ? toFaDigits(delivered.length) : "…",
        icon: ClipboardList,
        path: "/dashboard/delivery?tab=delivered",
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
        <Button onClick={() => navigate("/dashboard/new-order")} className="gap-2">
          <Plus className="size-4" />
          سفارش جدید
        </Button>
      }
    >
      {/* Hero CTA */}
      <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-l from-rose-700 via-rose-600 to-rose-500 text-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">مهم‌ترین کار امروز: ثبت سفارش جدید</h2>
            <p className="mt-1 text-sm text-rose-100">
              فرم کامل سفارش با محاسبه خودکار قیمت و ثبت لوکیشن روی نقشه
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 bg-white font-black text-rose-700 hover:bg-rose-50"
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
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
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

      {/* Sections grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = ICONS[s.icon] ?? ClipboardList;
          return (
            <Link key={s.id} to={s.path}>
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-rose-50 group-hover:text-rose-700">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold group-hover:text-rose-700">{s.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.id === "orders" && "فرم ثبت سفارش کامل با قیمت و لوکیشن"}
                      {s.id === "customers" && "ثابت، غیرثابت، پیگیری، تاریخچه خرید"}
                      {s.id === "delivery" && "در انتظار تحویل و تحویل داده شده"}
                      {s.id === "warehouse" && "پوشاک و مواد اولیه با تاریخچه"}
                      {s.id === "users" && "نقش‌ها و دسترسی کارمندان"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Sales chart (last 6 jalali months) */}
      <Card className="mt-6">
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
                  tickFormatter={(v: number) => toFaDigits(v.toLocaleString("en-US"))}
                  width={64}
                />
                <Tooltip
                  formatter={(v: number | string) => [toFaDigits(Number(v).toLocaleString("en-US")) + " تومان", "فروش"]}
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

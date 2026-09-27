import { motion } from "framer-motion";
import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  MapPin,
  Shield,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "ثبت سفارش حرفه‌ای",
    desc: "فرم کامل سفارش با محصولات نامحدود، قیمت‌گذاری جزء‌به‌جزء و محاسبه خودکار مبلغ نهایی",
  },
  {
    icon: Users,
    title: "مدیریت مشتریان",
    desc: "مشتری ثابت و غیرثابت، وضعیت پیگیری، تاریخچه کامل خرید و جستجوی پیشرفته",
  },
  {
    icon: MapPin,
    title: "لوکیشن روی نقشه",
    desc: "ثبت نقطه دقیق روی نقشه با تصویر ماهواره و نمایش لحظه‌ای موقعیت هر مشتری و سفارش",
  },
  {
    icon: Truck,
    title: "تحویل محصول",
    desc: "پیگیری سفارش‌ها از ثبت تا تحویل، با رسید مبلغ دریافتی و روش تحویل",
  },
  {
    icon: Boxes,
    title: "انبار هوشمند",
    desc: "پوشاک و مواد اولیه با زیرشاخه‌های نامحدود، هشدار موجودی و تاریخچه کامل تغییرات",
  },
  {
    icon: Shield,
    title: "دسترسی‌های قابل تنظیم",
    desc: "رییس کارخانه همه‌چیز را می‌بیند؛ دسترسی هر کارمند را هر لحظه کم و زیاد کنید",
  },
];

const SECTIONS = [
  { num: "۱", title: "فروش و مشتریان", desc: "همه مشتری‌ها، ثابت‌ها، غیرثابت‌ها با تاریخچه" },
  { num: "۲", title: "ثبت سفارش", desc: "فرم ویزیتی با قیمت خودکار و لوکیشن" },
  { num: "۳", title: "تحویل محصول", desc: "از انتظار تا تحویل با رسید مالی" },
  { num: "۴", title: "انبار", desc: "پوشاک و مواد اولیه با شمارش دقیق" },
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-foreground"
      dir="rtl"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-lg font-black text-white shadow-md">
              س
            </div>
            <div>
              <div className="text-sm font-black">تولیدی پوشاک سپید</div>
              <div className="text-[11px] text-muted-foreground">سامانه جامع مدیریت تولید</div>
            </div>
          </div>
          <Link to="/auth">
            <Button className="gap-2">
              ورود به سامانه
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 85% 10%, rgba(225,29,72,0.10), transparent), radial-gradient(500px 260px at 10% 20%, rgba(225,29,72,0.06), transparent)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center lg:py-28">
          <Badge variant="outline" className="gap-1.5 border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            سامانه فروش کارخانه‌های بزرگ پوشاک
          </Badge>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.25] lg:text-5xl">
            مدیریت کامل فروش، سفارش، تحویل و انبار
            <span className="block text-blue-600">در یک سامانه واحد</span>
          </h1>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground">
            سامانه اختصاصی «تولیدی پوشاک سپید» برای مدیریت مشتریان، ثبت سفارش‌های ویزیتی،
            تحویل محصولات و کنترل دقیق انبار — با نقشه، تاریخ شمسی و دسترسی‌های قابل تنظیم.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 px-8 text-base">
                شروع کنید
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="px-8 text-base">
                ورود کارمندان
              </Button>
            </Link>
          </div>

          {/* Mock preview */}
          <div className="mt-10 w-full max-w-4xl rounded-2xl border bg-card p-2 shadow-xl">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-3 w-32 rounded-full bg-blue-200" />
                <div className="flex gap-2">
                  <div className="h-3 w-16 rounded-full bg-border" />
                  <div className="h-3 w-16 rounded-full bg-border" />
                  <div className="h-3 w-16 rounded-full bg-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {SECTIONS.map((s, i) => (
                  <motion.div
                    key={s.num}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 * i + 0.2 }}
                    className="rounded-xl border bg-card p-4 text-right"
                  >
                    <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
                      {s.num}
                    </div>
                    <div className="text-sm font-bold">{s.title}</div>
                    <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{s.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black lg:text-3xl">همه بخش‌های کارخانه، یک‌جا</h2>
            <p className="mt-2 text-muted-foreground">
              چهار بخش اصلی با دسترسی‌های جداگانه برای هر کارمند
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 * i }}
              >
                <div className="h-full rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-black">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Access note */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mb-3 flex size-12 mx-auto items-center justify-center rounded-xl bg-blue-600 text-white">
              <Shield className="size-6" />
            </div>
            <h2 className="text-xl font-black">اولین کاربر، رییس کارخانه است</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
              کسی که اول بار وارد سامانه شود، به همه‌چیز دسترسی دارد و می‌تواند برای هر کارمند
              تعیین کند به کدام بخش‌ها دسترسی داشته باشد — و هر لحظه آن را تغییر دهد.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button size="lg" className="gap-2 px-10">
                ورود به سامانه
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        تولیدی پوشاک سپید — سامانه جامع فروش و مدیریت تولید
      </footer>
    </motion.div>
  );
}

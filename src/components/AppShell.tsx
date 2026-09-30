import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileDialog } from "@/components/ProfileDialog";
import { BrandMark } from "@/components/BrandMark";
import { api } from "@/convex/_generated/api";
import type { Section } from "@/convex/access";
import { SECTIONS, canAccess, levelsOfRole } from "@/lib/sections";
import { formatJalaliTime, toFaDigits } from "@/lib/jalali";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";

const ICONS: Record<string, typeof ClipboardList> = {
  clipboard: ClipboardList,
  users: Users,
  truck: Truck,
  boxes: Boxes,
  shield: Shield,
  settings: Settings,
};

export function useMyAccess() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const access = useQuery(
    api.access.getMyAccess,
    isAuthenticated ? {} : "skip",
  );
  const ensure = useMutation(api.access.ensureUserAccess);
  useEffect(() => {
    if (isAuthenticated && access === undefined) {
      ensure({}).catch(() => {});
    }
  }, [isAuthenticated, access, ensure]);
  return {
    access,
    isLoading: authLoading || access === undefined,
    isOwner: access?.isOwner ?? false,
    perms: levelsOfRole(access?.role) as Record<string, string>,
    /** سطح دسترسی یک بخش: none | view | full */
    levelOf: (section: string) =>
      access?.isOwner
        ? "full"
        : ((levelsOfRole(access?.role) as Record<string, string>)[section] ?? "none"),
  };
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const { access, isOwner, perms } = useMyAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const visible = SECTIONS.filter((s) => isOwner || canAccess(perms, s.id));

  const navItems = [
    { id: "home", label: "خانه", icon: LayoutDashboard, path: "/dashboard" },
    ...visible.map((s) => ({
      id: s.id,
      label: s.label,
      icon: ICONS[s.icon] ?? ClipboardList,
      path: s.path,
    })),
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      {/* glass glow decor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(240px_120px_at_70%_0%,rgba(96,165,250,0.25),transparent)]"
      />
      <Link to="/dashboard" className="relative mb-6 flex items-center gap-3 px-2">
        <BrandMark boxClassName="size-11" />
        <div>
          <div className="text-sm font-black text-white">سامانه سپید</div>
          <div className="text-[11px] text-blue-200/70">
            تولیدی پوشاک سپید
          </div>
        </div>
      </Link>
      {navItems.map((item) => {
        const active =
          item.path === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-blue-700 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400/30"
                : "text-blue-100/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
            {active && (
              <span className="absolute inset-y-2 right-0 w-0.5 rounded-full bg-blue-300" aria-hidden />
            )}
          </Link>
        );
      })}
      <div className="relative mt-auto border-t border-white/10 pt-4">
        <div className="mb-3 px-2">
          <div className="truncate text-sm font-semibold text-white">
            {user?.name || user?.email || "کاربر"}
          </div>
          <div className="truncate text-xs text-blue-200/60">
            {user?.jobTitle
              ? user.jobTitle
              : isOwner
                ? "رییس کارخانه"
                : access?.role?.name ?? "بدون نقش"}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={async () => {
            if (!confirm("از حساب خارج می‌شوید؟")) return;
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="size-4" />
          خروج از حساب
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40" dir="rtl">
      {/* Desktop sidebar — رنگ از متغیر تم */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 bg-gradient-to-b from-[var(--sidebar)] via-[var(--sidebar)] to-black/40 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-72 bg-gradient-to-b from-[var(--sidebar)] via-[var(--sidebar)] to-black/40 shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-3"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:mr-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {/* زنگوله اعلان — قبل از اکشن‌های صفحه */}
          <NotificationBell />
          {actions}
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto max-w-7xl p-4 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
      {/* تکمیل پروفایل بعد از اولین ورود */}
      <ProfileDialog />
    </div>
  );
}

export function SectionBadge({
  section,
}: {
  section: Section;
}) {
  const s = SECTIONS.find((x) => x.id === section);
  return <Badge variant="secondary">{s?.label ?? section}</Badge>;
}

export { toFaDigits, formatJalaliTime };

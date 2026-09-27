import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import type { Section } from "@/convex/access";
import { SECTIONS, canAccess } from "@/lib/sections";
import { formatJalaliTime, toFaDigits } from "@/lib/jalali";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useLocation, useNavigate } from "react-router";

const ICONS: Record<string, typeof ClipboardList> = {
  clipboard: ClipboardList,
  users: Users,
  truck: Truck,
  boxes: Boxes,
  shield: Shield,
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
    perms: access?.role?.permissions ?? [],
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
      <Link to="/dashboard" className="mb-6 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 font-black text-white shadow-md">
          س
        </div>
        <div>
          <div className="text-sm font-black">سپید</div>
          <div className="text-[11px] text-muted-foreground">
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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-rose-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t pt-4">
        <div className="mb-3 px-2">
          <div className="truncate text-sm font-semibold">
            {user?.name || user?.email || "کاربر"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {isOwner
              ? "رییس کارخانه"
              : access?.role?.name ?? "بدون نقش"}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={async () => {
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
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l bg-background lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-72 border-l bg-background shadow-xl">
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
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
          {actions}
        </header>

        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
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

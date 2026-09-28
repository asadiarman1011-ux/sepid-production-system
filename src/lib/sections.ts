import type { Section } from "@/convex/access";
import { Settings as SettingsIcon } from "lucide-react";

export { SettingsIcon };

export type PermLevel = "none" | "view" | "full";

export const SECTIONS: { id: Section; label: string; icon: string; path: string }[] = [
  { id: "orders", label: "ثبت سفارش", icon: "clipboard", path: "/dashboard/new-order" },
  { id: "customers", label: "مشتریان", icon: "users", path: "/dashboard/customers" },
  { id: "delivery", label: "تحویل محصول", icon: "truck", path: "/dashboard/delivery" },
  { id: "warehouse", label: "انبار", icon: "boxes", path: "/dashboard/warehouse" },
  { id: "users", label: "کاربران و دسترسی‌ها", icon: "shield", path: "/dashboard/users" },
  { id: "settings", label: "تنظیمات", icon: "settings", path: "/dashboard/settings" },
];

/** نقش قدیمی (آرایه) یا جدید (levels) را به levels استاندارد تبدیل می‌کند */
export function levelsOfRole(role: { levels?: unknown; permissions?: string[] } | null | undefined) {
  if (role?.levels && typeof role.levels === "object") {
    return role.levels as Partial<Record<Section, PermLevel>>;
  }
  return Object.fromEntries((role?.permissions ?? []).map((s) => [s, "full" as const])) as Partial<
    Record<Section, PermLevel>
  >;
}

export function levelOf(
  perms: Partial<Record<Section, PermLevel>> | string[] | undefined,
  section: Section,
): PermLevel {
  if (!perms) return "none";
  if (Array.isArray(perms)) {
    return perms.includes(section) ? "full" : "none";
  }
  return perms[section] ?? "none";
}

/** آیا بخش را می‌بیند؟ (view یا full) */
export function canAccess(
  perms: Partial<Record<Section, PermLevel>> | string[] | undefined,
  section: Section,
) {
  return levelOf(perms, section) !== "none";
}

import type { Section } from "@/convex/access";
import { Settings as SettingsIcon } from "lucide-react";

export { SettingsIcon };

export const SECTIONS: { id: Section; label: string; icon: string; path: string }[] = [
  { id: "orders", label: "ثبت سفارش", icon: "clipboard", path: "/dashboard/new-order" },
  { id: "customers", label: "مشتریان", icon: "users", path: "/dashboard/customers" },
  { id: "delivery", label: "تحویل محصول", icon: "truck", path: "/dashboard/delivery" },
  { id: "warehouse", label: "انبار", icon: "boxes", path: "/dashboard/warehouse" },
  { id: "users", label: "کاربران و دسترسی‌ها", icon: "shield", path: "/dashboard/users" },
  { id: "settings", label: "تنظیمات", icon: "settings", path: "/dashboard/settings" },
];

export function sectionsFor(perms: string[] | undefined): typeof SECTIONS {
  if (!perms) return [];
  return SECTIONS.filter((s) => perms.includes(s.id));
}

export function canAccess(perms: string[] | undefined, section: Section) {
  if (!perms) return false;
  return perms.includes(section);
}

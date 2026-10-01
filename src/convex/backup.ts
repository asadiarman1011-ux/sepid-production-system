import { query } from "./_generated/server";
import { requireEdit } from "./perms";

/**
 * پشتیبان‌گیری کامل: همه داده‌های واردشده را برای ساخت فایل اکسل/PDF برمی‌گرداند.
 * فقط رییس کارخانه یا کسی که دسترسی کامل بخش «تنظیمات» دارد.
 */
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    await requireEdit(ctx, "settings");

    const [customers, orders, warehouseItems, warehouseLogs, roles, usersRaw, appSettings] =
      await Promise.all([
        ctx.db.query("customers").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("warehouseItems").collect(),
        ctx.db.query("warehouseLogs").collect(),
        ctx.db.query("roles").collect(),
        ctx.db.query("users").collect(),
        ctx.db.query("appSettings").collect(),
      ]);

    // کاربران را بدون فیلدهای حساس احراز هویت برمی‌گردانیم
    const users = usersRaw
      .filter((u) => !u.isAnonymous)
      .map((u) => {
        const role = u.roleId ? roles.find((r) => r._id === u.roleId) : null;
        return {
          _id: u._id,
          name: u.name ?? "",
          email: u.email ?? "",
          jobTitle: u.jobTitle ?? "",
          roleName: role?.name ?? "",
        };
      });

    return {
      customers,
      orders,
      warehouseItems,
      warehouseLogs,
      roles,
      users,
      appSettings: appSettings[0] ?? null,
    };
  },
});

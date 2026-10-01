import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** رمز پشتیبان‌گیری — باید با src/lib/backupConst.ts همسان بماند */
const BACKUP_PASSWORD = "AM$#h!i@48#A";

/**
 * پاک‌کردن کامل داده‌های آزمایشی: مشتریان، سفارش‌ها، انبار، رویدادهای انبار،
 * اعلان‌ها، مقادیر یادگرفته‌شده فرم‌ها و شمارنده شماره‌گذاری خرید.
 *
 * حفظ می‌شود: حساب کاربران، نقش‌ها و دسترسی‌ها، اطلاعات کارخانه (تنظیمات) —
 * یعنی همه‌چیز آماده یک تست تازه از صفر است.
 *
 * اجرا فقط توسط رییس کارخانه یا با رمز پشتیبان‌گیری (همان رمز بخش پشتیبان‌گیری).
 */
export const resetAllData = mutation({
  args: { password: v.optional(v.string()) },
  handler: async (ctx, { password }) => {
    // اجازه: رییس کارخانه یا رمز پشتیبان‌گیری
    const userId = await getAuthUserId(ctx);
    const settings = await ctx.db.query("settings").collect();
    const isOwner = userId !== null && settings[0]?.ownerId === userId;
    const hasPassword = password === BACKUP_PASSWORD;
    if (!isOwner && !hasPassword) {
      throw new Error("فقط رییس کارخانه یا دارنده رمز پشتیبان‌گیری می‌تواند داده‌ها را پاک کند");
    }

    const tables = [
      "orders",
      "customers",
      "warehouseItems",
      "warehouseLogs",
      "notifications",
      "presets",
      "counters",
    ] as const;

    const deleted: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      deleted[table] = rows.length;
    }

    return { ok: true, deleted };
  },
});

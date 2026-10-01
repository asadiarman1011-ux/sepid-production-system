import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** رمز پشتیبان‌گیری و ریست — باید با src/lib/backupConst.ts همسان بماند */
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

/**
 * ترتیب پاک‌سازی ریست کارخانه: اول داده‌های کاری، آخر حساب‌ها و نشست‌ها.
 * (چون حذف کاربر جاری، دسترسی ادمین را قطع می‌کند و از آن به بعد رمز لازم است)
 */
const ALL_TABLES = [
  "orders",
  "customers",
  "warehouseItems",
  "warehouseLogs",
  "notifications",
  "presets",
  "counters",
  "appSettings",
  "roles",
  "settings",
  "authRefreshTokens",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
  "authSessions",
  "authAccounts",
  "users",
] as const;

/** سقف حذف در هر فراخوانی — کلاینت تا تمام‌شدن، این mutation را تکرار می‌کند */
const BATCH = 250;

/**
 * ریست کارخانه (Factory Reset): همه اطلاعات برنامه پاک می‌شود — سفارش‌ها،
 * مشتریان، انبار، اعلان‌ها، یادگرفته‌های فرم، تنظیمات کارخانه، نقش‌ها و
 * حساب کاربران (حتی این‌که کی مدیر است و کی چه شغلی دارد). برنامه دقیقا به
 * حالت اول برمی‌گردد: اولین نفری که بعد از این وارد شود، رییس کارخانه می‌شود.
 *
 * اجرا فقط توسط مدیر (رییس کارخانه) یا با رمز ریست.
 * چون حجم داده ممکن است زیاد باشد، هر فراخوانی یک دسته را حذف می‌کند و
 * `done: false` برمی‌گرداند؛ کلاینت باید تا `done: true` تکرار کند.
 */
export const factoryReset = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const userId = await getAuthUserId(ctx);
    const settings = await ctx.db.query("settings").collect();
    const isOwner = userId !== null && settings[0]?.ownerId === userId;
    const hasPassword = password === BACKUP_PASSWORD;
    if (!isOwner && !hasPassword) {
      throw new Error("ریست کارخانه فقط توسط مدیر و با رمز صحیح ممکن است");
    }

    const deleted: Record<string, number> = {};
    let budget = BATCH;

    for (const table of ALL_TABLES) {
      if (budget <= 0) break;
      const rows = await ctx.db.query(table).take(budget);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      deleted[table] = rows.length;
      budget -= rows.length;
    }

    // آیا هنوز چیزی باقی مانده؟ (کلاینت تا تمام‌شدن ادامه می‌دهد)
    let done = true;
    for (const table of ALL_TABLES) {
      const rest = await ctx.db.query(table).take(1);
      if (rest.length > 0) {
        done = false;
        break;
      }
    }

    return { ok: true, done, deleted };
  },
});

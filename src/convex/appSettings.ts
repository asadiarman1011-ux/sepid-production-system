import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** خواندن تنظیمات (برای همه کاربران لاگین‌شده) */
export const get = query({
  args: {},
  handler: async (ctx) => {
    await getAuthUserId(ctx);
    const rows = await ctx.db.query("appSettings").collect();
    return (
      rows[0] ?? {
        factoryName: "تولیدی پوشاک سپید",
        defaultCity: "",
        deliveryMethods: ["حضوری", "اسنپ", "باربری", "پست"],
        lowStockThreshold: 5,
        currency: "تومان",
        phone: "",
        address: "",
        darkMode: false,
        colorTheme: "navy",
        updatedAtTs: 0,
      }
    );
  },
});

/** ذخیره تنظیمات — فقط رییس کارخانه */
export const update = mutation({
  args: {
    factoryName: v.optional(v.string()),
    defaultCity: v.optional(v.string()),
    deliveryMethods: v.optional(v.array(v.string())),
    lowStockThreshold: v.optional(v.number()),
    currency: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    darkMode: v.optional(v.boolean()),
    colorTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const settingsRows = await ctx.db.query("settings").collect();
    if (userId === null || settingsRows[0]?.ownerId !== userId) {
      throw new Error("فقط رییس کارخانه می‌تواند تنظیمات را تغییر دهد");
    }
    const rows = await ctx.db.query("appSettings").collect();
    const patch = { ...args, updatedAtTs: Date.now() };
    if (rows[0]) {
      await ctx.db.patch(rows[0]._id, patch);
    } else {
      await ctx.db.insert("appSettings", patch);
    }
    return { ok: true };
  },
});

/**
 * انتخاب تم/دارک شخصی هر کاربر — همه کاربران لاگین‌شده بدون خطای دسترسی.
 * تم روی خود کاربر ذخیره می‌شود تا هر کس هرجا که دسترسی دارد بتواند تم خودش را عوض کند.
 */
export const setMyTheme = mutation({
  args: {
    colorTheme: v.optional(v.string()),
    darkMode: v.optional(v.boolean()),
  },
  handler: async (ctx, { colorTheme, darkMode }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("اول وارد شوید");
    const patch: { themeColor?: string; themeDark?: boolean } = {};
    if (colorTheme !== undefined) patch.themeColor = colorTheme;
    if (darkMode !== undefined) patch.themeDark = darkMode;
    if (Object.keys(patch).length === 0) return { ok: true };
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

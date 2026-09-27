import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * پیش‌فرض‌های فرم سفارش: هر مقداری که کاربر تایپ می‌کند، در دسته مربوطه
 * ذخیره می‌شود تا دفعه بعد به صورت گزینه پیش‌فرض (با قیمت) پیشنهاد شود.
 */
export const byCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const rows = await ctx.db
      .query("presets")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    return rows
      .filter((r) => r.active)
      .sort((a, b) => a.value.localeCompare(b.value, "fa"))
      .map((r) => ({ _id: r._id, value: r.value, price: r.price ?? null }));
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("presets").collect(),
});

/** ثبت/به‌روزرسانی یک پیش‌فرض (قیمت هم قابل ثبت است) */
export const upsert = mutation({
  args: {
    category: v.string(),
    value: v.string(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, { category, value, price }) => {
    await getAuthUserId(ctx);
    const trimmed = value.trim();
    if (!trimmed) return;
    const rows = await ctx.db
      .query("presets")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    const found = rows.find((r) => r.value === trimmed);
    if (found) {
      const patch: { price?: number } = {};
      if (price !== undefined) patch.price = price;
      if (Object.keys(patch).length) await ctx.db.patch(found._id, patch);
      return;
    }
    await ctx.db.insert("presets", {
      category,
      value: trimmed,
      price,
      active: true,
      createdAtTs: Date.now(),
    });
  },
});

/** افزودن دستی پیش‌فرض از پنل مدیریت */
export const addManual = mutation({
  args: {
    category: v.string(),
    value: v.string(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, { category, value, price }) => {
    await getAuthUserId(ctx);
    const rows = await ctx.db
      .query("presets")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    if (rows.some((r) => r.value === value.trim())) return;
    await ctx.db.insert("presets", {
      category,
      value: value.trim(),
      price,
      active: true,
      createdAtTs: Date.now(),
    });
  },
});

export const setPrice = mutation({
  args: { id: v.id("presets"), price: v.optional(v.number()) },
  handler: async (ctx, { id, price }) => {
    await getAuthUserId(ctx);
    await ctx.db.patch(id, { price });
  },
});

export const remove = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, { id }) => {
    await getAuthUserId(ctx);
    await ctx.db.delete(id);
  },
});

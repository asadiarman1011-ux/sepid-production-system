import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { formatJalali } from "./lib";

/** ثبت اعلان سراسری (از mutationsهای دیگر صدا زده می‌شود) */
export const pushInternal = internalMutation({
  args: {
    type: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    byName: v.optional(v.string()),
  },
  handler: async (ctx, { type, title, body, link, byName }) => {
    const now = Date.now();
    await ctx.db.insert("notifications", {
      type,
      title,
      body,
      link,
      byName,
      createdAtTs: now,
      createdAtLabel: formatJalali(now),
    });
  },
});

/** آخرین اعلان‌ها (همه کاربران لاگین‌شده می‌بینند) — سقف ۱۰۰ برای سبک‌ماندن */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db.query("notifications").collect();
    return rows.sort((a, b) => b.createdAtTs - a.createdAtTs).slice(0, 100);
  },
});

/** تعداد خوانده‌نشده‌ها بر اساس notifSeenTs کاربر — شمارش کامل، بدون سقف */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;
    const user = await ctx.db.get(userId);
    if (!user) return 0;
    const seen = user.notifSeenTs ?? 0;
    const rows = await ctx.db.query("notifications").collect();
    return rows.filter((n) => n.createdAtTs > seen).length;
  },
});

/** علامت‌گذاری همه به عنوان دیده‌شده */
export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    await ctx.db.patch(userId, { notifSeenTs: Date.now() });
  },
});

/** حذف یک اعلان */
export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    await getAuthUserId(ctx);
    await ctx.db.delete(id);
  },
});

/** حذف همه اعلان‌ها */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthUserId(ctx);
    const rows = await ctx.db.query("notifications").collect();
    for (const n of rows) await ctx.db.delete(n._id);
  },
});

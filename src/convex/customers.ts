import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireEdit } from "./perms";

function makeSearchText(c: {
  name: string;
  phone: string;
  city?: string;
  craft?: string;
  address?: string;
  notes?: string;
}) {
  return [c.name, c.phone, c.city, c.craft, c.address, c.notes]
    .filter(Boolean)
    .join(" ");
}

/** همه مشتری‌ها؛ جستجو با search index، فیلتر وضعیت در همان کوئری */
export const list = query({
  args: {
    q: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("permanent"),
        v.literal("nonpermanent"),
        v.literal("none"),
      ),
    ),
    followup: v.optional(
      v.union(
        v.literal("none"),
        v.literal("needs"),
        v.literal("following"),
      ),
    ),
  },
  handler: async (ctx, { q, status, followup }) => {
    await getAuthUserId(ctx);
    const text = (q ?? "").trim();
    let rows;
    if (text) {
      rows = await ctx.db
        .query("customers")
        .withSearchIndex("search", (s) => {
          let q = s.search("searchText", text);
          if (status) q = q.eq("status", status);
          if (followup) q = q.eq("followup", followup);
          return q;
        })
        .collect();
    } else {
      rows = await ctx.db.query("customers").collect();
    }
    return rows
      .filter(
        (r) =>
          (!status || r.status === status) &&
          (!followup || r.followup === followup),
      )
      .sort((a, b) => b.createdAtTs - a.createdAtTs);
  },
});

/** یک مشتری + سفارش‌های او (تاریخچه خرید با شماره‌گذاری) */
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await getAuthUserId(ctx);
    const customer = await ctx.db.get(id);
    if (!customer) return null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .collect();
    orders.sort((a, b) => a.orderNo - b.orderNo);
    return { customer, orders };
  },
});

export type CustomerInput = {
  name: string;
  phone: string;
  city?: string;
  craft?: string;
  address?: string;
  location?: { lat: number; lng: number } | undefined;
  status: "permanent" | "nonpermanent" | "none";
  followup: "none" | "needs" | "following";
  notes?: string;
};

/** افزودن مشتری جدید */
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    city: v.optional(v.string()),
    craft: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    status: v.union(
      v.literal("permanent"),
      v.literal("nonpermanent"),
      v.literal("none"),
    ),
    followup: v.union(
      v.literal("none"),
      v.literal("needs"),
      v.literal("following"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEdit(ctx, "customers");
    const userId = await getAuthUserId(ctx);
    const id = await ctx.db.insert("customers", {
      ...args,
      searchText: makeSearchText(args),
      createdBy: userId ?? undefined,
      createdAtTs: Date.now(),
      createdAtLabel: toJalaliLabel(Date.now()),
    });
    const user = userId ? await ctx.db.get(userId) : null;
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "customer",
      title: `مشتری جدید ثبت شد — ${args.name}`,
      body: [args.city, args.craft].filter(Boolean).join(" · ") || undefined,
      link: "/dashboard/customers",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return id;
  },
});

/** ویرایش مشتری */
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.string(),
    phone: v.string(),
    city: v.optional(v.string()),
    craft: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    status: v.union(
      v.literal("permanent"),
      v.literal("nonpermanent"),
      v.literal("none"),
    ),
    followup: v.union(
      v.literal("none"),
      v.literal("needs"),
      v.literal("following"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    await requireEdit(ctx, "customers");
    const userId = await getAuthUserId(ctx);
    const cust = await ctx.db.get(id);
    await ctx.db.patch(id, {
      ...args,
      searchText: makeSearchText(args),
    });
    if (cust) {
      const user = userId ? await ctx.db.get(userId) : null;
      await ctx.runMutation(internal.notifications.pushInternal, {
        type: "customer",
        title: `مشتری ویرایش شد — ${args.name}`,
        link: "/dashboard/customers",
        byName: user?.name ?? user?.email ?? undefined,
      });
    }
  },
});

/** ارتقا: غیرثابت → ثابت */
export const promoteToPermanent = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await requireEdit(ctx, "customers");
    await ctx.db.patch(id, { status: "permanent" });
  },
});

/** تغییر وضعیت پیگیری */
export const setFollowup = mutation({
  args: {
    id: v.id("customers"),
    followup: v.union(
      v.literal("none"),
      v.literal("needs"),
      v.literal("following"),
    ),
  },
  handler: async (ctx, { id, followup }) => {
    await requireEdit(ctx, "customers");
    await ctx.db.patch(id, { followup });
  },
});

/** حذف مشتری */
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await requireEdit(ctx, "customers");
    await ctx.db.delete(id);
  },
});

function toJalaliLabel(ts: number) {
  const d = new Date(ts);
  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();
  const j = gregorianToJalali(gy, gm, gd);
  return `${j[0]}/${pad2(j[1])}/${pad2(j[2])}`;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

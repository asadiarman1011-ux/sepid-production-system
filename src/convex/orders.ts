import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { formatJalali } from "./lib";

/** فهرست سفارش‌ها؛ جستجو و فیلتر وضعیت */
export const list = query({
  args: {
    q: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("delivered")),
    ),
  },
  handler: async (ctx, { q, status }) => {
    await getAuthUserId(ctx);
    const text = (q ?? "").trim();
    let rows;
    if (text) {
      rows = await ctx.db
        .query("orders")
        .withSearchIndex("search", (s) => {
          let q = s.search("searchText", text);
          if (status) q = q.eq("status", status);
          return q;
        })
        .collect();
    } else {
      rows = await ctx.db.query("orders").collect();
    }
    return rows
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.dateTs - a.dateTs);
  },
});

/** یک سفارش کامل */
export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    await getAuthUserId(ctx);
    return await ctx.db.get(id);
  },
});

async function nextOrderNo(ctx: any, customerId: string) {
  const existing = await ctx.db
    .query("orders")
    .withIndex("by_customer", (q: any) => q.eq("customerId", customerId))
    .collect();
  return existing.length + 1;
}

/** ثبت سفارش: مشتری را می‌سازد/به‌روزرسانی می‌کند و سفارش را شماره می‌زند */
export const create = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    customerName: v.string(),
    phone: v.string(),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    dateLabel: v.string(),
    dateTs: v.number(),
    items: v.array(
      v.object({
        productType: v.string(),
        productTypePrice: v.optional(v.number()),
        material: v.optional(v.string()),
        materialPrice: v.optional(v.number()),
        color: v.optional(v.string()),
        printFront: v.optional(v.string()),
        printFrontPrice: v.optional(v.number()),
        printBack: v.optional(v.string()),
        printBackPrice: v.optional(v.number()),
        buttonType: v.optional(v.string()),
        buttonPrice: v.optional(v.number()),
        zipperType: v.optional(v.string()),
        zipperPrice: v.optional(v.number()),
        pocketType: v.optional(v.string()),
        pocketPrice: v.optional(v.number()),
        size: v.optional(v.string()),
        qty: v.number(),
        unitPrice: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    total: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;

    let customerId = args.customerId;
    let followup: "none" | "needs" | "following" = "needs";
    let cstatus: "permanent" | "nonpermanent" | "none" = "nonpermanent";

    if (customerId) {
      const cust = await ctx.db.get(customerId);
      if (cust) {
        cstatus = cust.status;
        followup = cust.followup;
        await ctx.db.patch(customerId, {
          name: args.customerName,
          phone: args.phone,
          city: args.city ?? cust.city,
          address: args.address ?? cust.address,
          location: args.location ?? cust.location,
        });
      }
    } else {
      customerId = await ctx.db.insert("customers", {
        name: args.customerName,
        phone: args.phone,
        city: args.city,
        craft: undefined,
        address: args.address,
        location: args.location,
        status: cstatus,
        followup,
        searchText: [
          args.customerName,
          args.phone,
          args.city,
          args.address,
        ]
          .filter(Boolean)
          .join(" "),
        createdBy: userId ?? undefined,
        createdAtTs: Date.now(),
        createdAtLabel: formatJalali(Date.now()),
      });
    }

    const orderNo = await nextOrderNo(ctx, customerId);
    const id = await ctx.db.insert("orders", {
      orderNo,
      customerId,
      customerName: args.customerName,
      phone: args.phone,
      city: args.city,
      address: args.address,
      location: args.location,
      dateLabel: args.dateLabel,
      dateTs: args.dateTs,
      items: args.items,
      total: args.total,
      notes: args.notes,
      status: "pending",
      createdBy: userId ?? undefined,
      createdByName: user?.name ?? user?.email ?? undefined,
      searchText: [
        args.customerName,
        args.phone,
        args.city,
        args.address,
        args.notes,
        ...args.items.map((i) => i.productType),
        ...args.items.map((i) => i.material ?? ""),
        ...args.items.map((i) => i.color ?? ""),
        ...args.items.map((i) => i.printFront ?? ""),
        ...args.items.map((i) => i.printBack ?? ""),
      ]
        .filter(Boolean)
        .join(" "),
    });
    return { id, orderNo };
  },
});

/** حذف سفارش */
export const remove = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    await getAuthUserId(ctx);
    await ctx.db.delete(id);
  },
});

/** تحویل: سفارش از «در انتظار تحویل» به «تحویل داده شده» می‌رود */
export const markDelivered = mutation({
  args: {
    id: v.id("orders"),
    amount: v.number(),
    method: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, amount, method, notes }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const order = await ctx.db.get(id);
    if (!order) throw new Error("سفارش یافت نشد");
    const now = Date.now();
    await ctx.db.patch(id, {
      status: "delivered",
      delivery: {
        amount,
        method,
        notes,
        dateLabel: formatJalali(now),
        dateTs: now,
        byName: user?.name ?? user?.email ?? undefined,
      },
    });
  },
});

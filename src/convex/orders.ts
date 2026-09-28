import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { formatJalali } from "./lib";
import type { OrderItem } from "./schema";

/** جمع تعداد یک قلم با تفکیک سایز */
function itemQty(i: { qty?: number; sizes?: { size: string; qty: number }[] }) {
  if (i.sizes && i.sizes.length > 0) {
    return i.sizes.reduce((sum, s) => sum + (s.qty || 0), 0);
  }
  return i.qty ?? 0;
}

/** ویدیتور یک قلم سفارش (مشترک بین create و update) */
const orderItemArgs = v.object({
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
  sizes: v.optional(
    v.array(v.object({ size: v.string(), qty: v.number() })),
  ),
  qty: v.number(),
  unitPrice: v.number(),
  notes: v.optional(v.string()),
});

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

/** تعداد و جمع نهایی سمت سرور از اقلام محاسبه می‌شود تا عدد قابل اعتماد باشد */
function computeTotals(items: OrderItem[]) {
  return items.reduce((sum, i) => sum + (i.unitPrice || 0) * itemQty(i), 0);
}

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
    companyName: v.optional(v.string()), // نام شرکت (جدا از نام فرد)
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
        sizes: v.optional(
          v.array(v.object({ size: v.string(), qty: v.number() })),
        ),
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
    const displayName = args.companyName
      ? `${args.customerName} — ${args.companyName}`
      : args.customerName;

    if (customerId) {
      const cust = await ctx.db.get(customerId);
      if (cust) {
        cstatus = cust.status;
        followup = cust.followup;
        await ctx.db.patch(customerId, {
          name: displayName,
          phone: args.phone,
          city: args.city ?? cust.city,
          address: args.address ?? cust.address,
          location: args.location ?? cust.location,
        });
      }
    } else {
      customerId = await ctx.db.insert("customers", {
        name: displayName,
        phone: args.phone,
        city: args.city,
        craft: undefined,
        address: args.address,
        location: args.location,
        status: cstatus,
        followup,
        searchText: [
          args.customerName,
          args.companyName,
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
    const total = computeTotals(args.items);
    const id = await ctx.db.insert("orders", {
      orderNo,
      customerId,
      customerName: displayName,
      companyName: args.companyName,
      phone: args.phone,
      city: args.city,
      address: args.address,
      location: args.location,
      dateLabel: args.dateLabel,
      dateTs: args.dateTs,
      items: args.items,
      total,
      notes: args.notes,
      status: "pending",
      createdBy: userId ?? undefined,
      createdByName: user?.name ?? user?.email ?? undefined,
      searchText: [
        args.customerName,
        args.companyName,
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
    // اعلان سراسری: سفارش جدید
    const itemNames = [...new Set(args.items.map((i) => i.productType))].slice(0, 3).join("، ");
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "order",
      title: `سفارش جدید برای ${displayName}`,
      body: `خرید شماره ${orderNo} — ${itemNames}${args.items.length > 3 ? " و …" : ""}`,
      link: "/dashboard/delivery",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return { id, orderNo };
  },
});

/** ویرایش کامل سفارش — گذشته و حال، شامل اقلام/سایزها/قیمت‌ها/مشتری/تاریخ */
export const update = mutation({
  args: {
    id: v.id("orders"),
    customerName: v.string(),
    companyName: v.optional(v.string()),
    phone: v.string(),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    dateLabel: v.string(),
    dateTs: v.number(),
    items: v.array(orderItemArgs),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...args }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const order = await ctx.db.get(id);
    if (!order) throw new Error("سفارش یافت نشد");

    const displayName = args.companyName
      ? `${args.customerName} — ${args.companyName}`
      : args.customerName;
    const total = computeTotals(args.items);

    await ctx.db.patch(id, {
      customerName: displayName,
      companyName: args.companyName,
      phone: args.phone,
      city: args.city,
      address: args.address,
      location: args.location ?? order.location,
      dateLabel: args.dateLabel,
      dateTs: args.dateTs,
      items: args.items,
      total,
      notes: args.notes,
      searchText: [
        args.customerName,
        args.companyName,
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

    // همگام‌سازی اسم/تلفن روی مشتری مربوطه
    await ctx.db.patch(order.customerId, {
      name: displayName,
      phone: args.phone,
    });

    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "order",
      title: `سفارش ویرایش شد — ${displayName}`,
      body: `خرید شماره ${order.orderNo} به‌روزرسانی شد`,
      link: "/dashboard/delivery",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return { ok: true };
  },
});

/** ویرایش رسید تحویلِ ثبت‌شده */
export const updateDelivery = mutation({
  args: {
    id: v.id("orders"),
    amount: v.number(),
    deliveryFee: v.optional(v.number()),
    method: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, amount, deliveryFee, method, notes }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const order = await ctx.db.get(id);
    if (!order || !order.delivery) throw new Error("رسید تحویل یافت نشد");
    await ctx.db.patch(id, {
      delivery: {
        ...order.delivery,
        amount,
        deliveryFee,
        method,
        notes,
      },
    });
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "delivery",
      title: `رسید تحویل ویرایش شد — ${order.customerName}`,
      body: `خرید شماره ${order.orderNo}`,
      link: "/dashboard/delivery?tab=delivered",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return { ok: true };
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
    deliveryFee: v.optional(v.number()), // هزینه تحویل
    method: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, amount, deliveryFee, method, notes }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const order = await ctx.db.get(id);
    if (!order) throw new Error("سفارش یافت نشد");
    const now = Date.now();
    const d = new Date(now);
    const timeLabel = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await ctx.db.patch(id, {
      status: "delivered",
      delivery: {
        amount,
        deliveryFee,
        method,
        notes,
        dateLabel: formatJalali(now),
        timeLabel, // ساعت ثبت تحویل
        dateTs: now,
        byName: user?.name ?? user?.email ?? undefined,
      },
    });
    // اعلان سراسری: تحویل ثبت شد
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "delivery",
      title: `تحویل ثبت شد — ${order.customerName}`,
      body: `خرید شماره ${order.orderNo} · روش: ${method}`,
      link: "/dashboard/delivery?tab=delivered",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return { ok: true };
  },
});

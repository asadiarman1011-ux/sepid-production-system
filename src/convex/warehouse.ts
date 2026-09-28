import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { formatJalaliTime } from "./lib";

const attrsValidator = v.array(
  v.object({ key: v.string(), value: v.string() }),
);
const sizesValidator = v.array(
  v.object({ size: v.string(), qty: v.number() }),
);

function makeSearchText(w: {
  name: string;
  productType?: string;
  material?: string;
  color?: string;
  category?: string;
  notes?: string;
}) {
  return [w.name, w.productType, w.material, w.color, w.category, w.notes]
    .filter(Boolean)
    .join(" ");
}

/** همه اقلام انبار؛ جستجو + فیلتر نوع (پوشاک/مواد اولیه) */
export const list = query({
  args: {
    q: v.optional(v.string()),
    kind: v.optional(
      v.union(v.literal("apparel"), v.literal("material")),
    ),
  },
  handler: async (ctx, { q, kind }) => {
    await getAuthUserId(ctx);
    const text = (q ?? "").trim();
    let rows;
    if (text) {
      rows = await ctx.db
        .query("warehouseItems")
        .withSearchIndex("search", (s) => {
          let q = s.search("searchText", text);
          if (kind) q = q.eq("kind", kind);
          return q;
        })
        .collect();
    } else {
      rows = await ctx.db.query("warehouseItems").collect();
    }
    return rows
      .filter((r) => !kind || r.kind === kind)
      .sort((a, b) => b.updatedAtTs - a.updatedAtTs);
  },
});

/** تاریخچه تغییرات یک قلم انبار */
export const itemLogs = query({
  args: { itemId: v.id("warehouseItems") },
  handler: async (ctx, { itemId }) => {
    await getAuthUserId(ctx);
    const rows = await ctx.db
      .query("warehouseLogs")
      .withIndex("by_item", (q) => q.eq("itemId", itemId))
      .collect();
    return rows.sort((a, b) => b.atTs - a.atTs);
  },
});

/** همه لاگ‌ها (برای صفحه تاریخچه کلی) */
export const allLogs = query({
  args: {},
  handler: async (ctx) => {
    await getAuthUserId(ctx);
    const rows = await ctx.db.query("warehouseLogs").collect();
    return rows.sort((a, b) => b.atTs - a.atTs);
  },
});

const baseFields = {
  name: v.string(),
  qty: v.number(),
  minQty: v.optional(v.number()),
  unit: v.optional(v.string()),
  price: v.optional(v.number()),
  notes: v.optional(v.string()),
};

/** افزودن قلم انبار (پوشاک یا مواد اولیه) */
export const create = mutation({
  args: {
    ...baseFields,
    kind: v.union(v.literal("apparel"), v.literal("material")),
    // apparel
    productType: v.optional(v.string()),
    material: v.optional(v.string()),
    color: v.optional(v.string()),
    fabricWeight: v.optional(v.string()),
    buttonType: v.optional(v.string()),
    zipperType: v.optional(v.string()),
    pocketType: v.optional(v.string()),
    sizes: v.optional(sizesValidator),
    // material
    category: v.optional(v.string()),
    attrs: v.optional(attrsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const now = Date.now();
    const totalQty =
      args.kind === "apparel"
        ? (args.sizes ?? []).reduce((s, x) => s + x.qty, 0)
        : args.qty;
    const id = await ctx.db.insert("warehouseItems", {
      ...args,
      qty: totalQty,
      searchText: makeSearchText(args),
      createdAtTs: now,
      updatedAtTs: now,
    });
    await ctx.db.insert("warehouseLogs", {
      itemId: id,
      itemName: args.name,
      action: "create",
      changes: [],
      byName: user?.name ?? user?.email ?? undefined,
      atTs: now,
    });
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "warehouse",
      title: `${args.kind === "apparel" ? "پوشاک" : "ماده اولیه"} جدید در انبار — ${args.name}`,
      body: `موجودی اولیه: ${totalQty} ${args.unit ?? ""}`.trim(),
      link: "/dashboard/warehouse",
      byName: user?.name ?? user?.email ?? undefined,
    });
    return id;
  },
});

/** ویرایش کامل قلم انبار */
export const update = mutation({
  args: {
    id: v.id("warehouseItems"),
    ...baseFields,
    productType: v.optional(v.string()),
    material: v.optional(v.string()),
    color: v.optional(v.string()),
    fabricWeight: v.optional(v.string()),
    buttonType: v.optional(v.string()),
    zipperType: v.optional(v.string()),
    pocketType: v.optional(v.string()),
    sizes: v.optional(sizesValidator),
    category: v.optional(v.string()),
    attrs: v.optional(attrsValidator),
  },
  handler: async (ctx, { id, ...args }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const item = await ctx.db.get(id);
    if (!item) throw new Error("قلم انبار یافت نشد");
    const now = Date.now();
    const totalQty =
      item.kind === "apparel"
        ? (args.sizes ?? []).reduce((s, x) => s + x.qty, 0)
        : args.qty;
    // گزارش تغییرات
    const changes: { field: string; old?: string; new?: string }[] = [];
    const fieldLabels: Record<string, string> = {
      name: "نام",
      qty: "موجودی",
      minQty: "حداقل هشدار",
      unit: "واحد",
      price: "قیمت",
      notes: "توضیحات",
      productType: "نوع لباس",
      material: "جنس",
      color: "رنگ",
      fabricWeight: "گرماژ پارچه",
      buttonType: "نوع دکمه",
      zipperType: "نوع زیپ",
      pocketType: "نوع جیب",
      category: "دسته",
      sizes: "سایزها",
      attrs: "زیرشاخه‌ها",
    };
    for (const [k, label] of Object.entries(fieldLabels)) {
      const oldVal = (item as any)[k];
      const newVal = (args as any)[k];
      if (JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null)) {
        changes.push({
          field: label,
          old:
            oldVal === undefined
              ? undefined
              : typeof oldVal === "object"
                ? JSON.stringify(oldVal)
                : String(oldVal),
          new:
            newVal === undefined
              ? undefined
              : typeof newVal === "object"
                ? JSON.stringify(newVal)
                : String(newVal),
        });
      }
    }
    await ctx.db.patch(id, {
      ...args,
      qty: totalQty,
      searchText: makeSearchText(args),
      updatedAtTs: now,
    });
    await ctx.db.insert("warehouseLogs", {
      itemId: id,
      itemName: args.name,
      action: "update",
      changes,
      byName: user?.name ?? user?.email ?? undefined,
      atTs: now,
    });
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "warehouse",
      title: `انبار ویرایش شد — ${args.name}`,
      body: changes.length > 0 ? changes.map((c) => c.field).join("، ") : undefined,
      link: "/dashboard/warehouse",
      byName: user?.name ?? user?.email ?? undefined,
    });
  },
});

/** حذف قلم انبار */
export const remove = mutation({
  args: { id: v.id("warehouseItems") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const item = await ctx.db.get(id);
    if (!item) throw new Error("قلم انبار یافت نشد");
    await ctx.db.delete(id);
    await ctx.db.insert("warehouseLogs", {
      itemId: id,
      itemName: item.name,
      action: "delete",
      changes: [],
      byName: user?.name ?? user?.email ?? undefined,
      atTs: Date.now(),
    });
  },
});

/** افزودن/کم کردن موجودی (ورود/خروج کالا) */
export const adjustStock = mutation({
  args: {
    id: v.id("warehouseItems"),
    delta: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, delta, note }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const item = await ctx.db.get(id);
    if (!item) throw new Error("قلم انبار یافت نشد");
    const newQty = Math.max(0, item.qty + delta);
    await ctx.db.patch(id, { qty: newQty, updatedAtTs: Date.now() });
    await ctx.db.insert("warehouseLogs", {
      itemId: id,
      itemName: item.name,
      action: "stock",
      changes: [
        {
          field: note ?? (delta > 0 ? "ورود کالا" : "خروج کالا"),
          old: String(item.qty),
          new: String(newQty),
        },
      ],
      byName: user?.name ?? user?.email ?? undefined,
      atTs: Date.now(),
    });
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "warehouse",
      title: `${delta > 0 ? "ورود" : "خروج"} کالا — ${item.name}`,
      body: `${item.qty} → ${newQty}`, // قبلی → جدید
      link: "/dashboard/warehouse",
      byName: user?.name ?? user?.email ?? undefined,
    });
  },
});

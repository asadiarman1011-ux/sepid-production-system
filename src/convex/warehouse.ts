import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { formatJalaliTime } from "./lib";
import { requireEdit } from "./perms";

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

/** قالب عدد برای لاگ‌ها */
function formatNum(n: number) {
  return String(Math.round(n * 100) / 100);
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
    await requireEdit(ctx, "warehouse");
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
      // شمارش اولیه هر زیرشاخه = کل موجودی (زیرشاخه‌های تازه‌ساخت)
      attrQty:
        args.kind === "material"
          ? (args.attrs ?? []).map((a) => ({ ...a, qty: 0 }))
          : undefined,
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
    await requireEdit(ctx, "warehouse");
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
    // زیرشاخه‌های حذف/اضافه‌شده در ویرایش؛ شمارش زیرشاخه‌های حفظ‌شده می‌ماند
    const keptAttrQty = (item.attrQty ?? []).filter((q) =>
      (args.attrs ?? []).some((a) => a.key === q.key && a.value === q.value),
    );
    const addedAttrQty = (args.attrs ?? [])
      .filter((a) => !(item.attrQty ?? []).some((q) => q.key === a.key && q.value === a.value))
      .map((a) => ({ ...a, qty: 0 }));
    const attrQty = [...keptAttrQty, ...addedAttrQty];
    await ctx.db.patch(id, {
      ...args,
      qty: totalQty,
      attrQty,
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
    await requireEdit(ctx, "warehouse");
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

/** افزودن/کم کردن موجودی (ورود/خروج کالا) — با پشتیبانی سایز و زیرشاخه مواد اولیه */
export const adjustStock = mutation({
  args: {
    id: v.id("warehouseItems"),
    delta: v.number(),
    note: v.optional(v.string()),
    size: v.optional(v.string()), // سایز خاص برای پوشاک
    attrKey: v.optional(v.string()), // زیرشاخه مواد اولیه (مثلا «نوع»)
    attrValue: v.optional(v.string()), // مقدار زیرشاخه (مثلا «سوزن گرد کد ۲»)
  },
  handler: async (ctx, { id, delta, note, size, attrKey, attrValue }) => {
    await requireEdit(ctx, "warehouse");
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const item = await ctx.db.get(id);
    if (!item) throw new Error("قلم انبار یافت نشد");

    const now = Date.now();
    const changes: { field: string; old?: string; new?: string }[] = [];

    const attrLabel =
      attrKey && attrValue
        ? item.attrs?.find((a) => a.key === attrKey && a.value === attrValue)
          ? `${attrKey}: ${attrValue}`
          : attrValue
        : undefined;

    if (size && item.kind === "apparel") {
      // تغییر موجودی یک سایز خاص + بازمحاسبه جمع کل
      const sizes = [...(item.sizes ?? [])];
      const idx = sizes.findIndex((s) => s.size === size);
      if (idx === -1) {
        if (delta > 0) {
          sizes.push({ size, qty: delta });
          changes.push({ field: `سایز ${size}`, new: String(delta) });
        } else {
          throw new Error(`سایز «${size}» در این قلم ثبت نشده است`);
        }
      } else {
        const oldQty = sizes[idx].qty;
        const newQty = Math.max(0, oldQty + delta);
        sizes[idx] = { size, qty: newQty };
        changes.push({ field: `سایز ${size}`, old: String(oldQty), new: String(newQty) });
      }
      const totalQty = sizes.reduce((s, x) => s + x.qty, 0);
      changes.push({
        field: "موجودی کل",
        old: String(item.qty),
        new: String(totalQty),
      });
      await ctx.db.patch(id, { sizes, qty: totalQty, updatedAtTs: now });
    } else if (attrLabel && item.kind === "material") {
      // تغییر موجودی یک زیرشاخه خاص مواد اولیه + بازمحاسبه جمع کل
      const attrQty = [...(item.attrQty ?? [])];
      const idx = attrQty.findIndex((a) => a.key === attrKey && a.value === attrValue);
      // موجودی ثبت‌نشده در زیرشاخه‌ها = موجودی کل منهای جمع شمارش زیرشاخه‌ها
      const tracked = attrQty.reduce((s, x) => s + x.qty, 0);
      const untracked = Math.max(0, item.qty - tracked);
      if (idx === -1) {
        if (delta > 0) {
          // زیرشاخه تازه: ثبت مستقیم ورود در شمارش همان زیرشاخه
          attrQty.push({ key: attrKey!, value: attrValue!, qty: delta });
          changes.push({ field: attrLabel, new: String(delta) });
        } else {
          // زیرشاخه بدون شمارش: ابتدا شمارش آن از باقیمانده موجودی کل مقداردهی می‌شود، سپس خروج اعمال می‌شود
          const newQty = Math.max(0, untracked + delta);
          attrQty.push({ key: attrKey!, value: attrValue!, qty: newQty });
          changes.push({ field: attrLabel, old: formatNum(untracked), new: formatNum(newQty) });
        }
      } else {
        let oldQty = attrQty[idx].qty;
        // قلم قدیمی که شمارش زیرشاخه‌اش هنوز از موجودی کل جدا نشده (صفر است):
        // اول شمارش از باقیمانده موجودی کل مقداردهی می‌شود تا خروج واقعا از همان زیرشاخه کم کند
        if (oldQty === 0 && untracked > 0) {
          oldQty = untracked;
          changes.push({
            field: `${attrLabel} — تخصیص از موجودی کل`,
            new: formatNum(untracked),
          });
        }
        const newQty = Math.max(0, oldQty + delta);
        attrQty[idx] = { key: attrKey!, value: attrValue!, qty: newQty };
        changes.push({ field: attrLabel, old: formatNum(oldQty), new: formatNum(newQty) });
      }
      const totalQty = attrQty.reduce((s, x) => s + x.qty, 0);
      changes.push({
        field: "موجودی کل",
        old: formatNum(item.qty),
        new: formatNum(totalQty),
      });
      await ctx.db.patch(id, { attrQty, qty: totalQty, updatedAtTs: now });
    } else {
      const newQty = Math.max(0, item.qty + delta);
      changes.push({
        field: note ?? (delta > 0 ? "ورود کالا" : "خروج کالا"),
        old: String(item.qty),
        new: String(newQty),
      });
      await ctx.db.patch(id, { qty: newQty, updatedAtTs: now });
    }

    await ctx.db.insert("warehouseLogs", {
      itemId: id,
      itemName: item.name,
      action: "stock",
      changes,
      byName: user?.name ?? user?.email ?? undefined,
      atTs: now,
    });
    await ctx.runMutation(internal.notifications.pushInternal, {
      type: "warehouse",
      title: `${delta > 0 ? "ورود" : "خروج"} کالا — ${item.name}${size ? ` (سایز ${size})` : ""}${attrLabel ? ` (${attrLabel})` : ""}`,
      body: `${changes.map((c) => `${c.field}: ${c.old ?? "0"} → ${c.new ?? ""}`).join(" · ")}${note ? ` — ${note}` : ""}`,
      link: "/dashboard/warehouse",
      byName: user?.name ?? user?.email ?? undefined,
    });
  },
});

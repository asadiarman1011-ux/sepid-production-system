import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** GPS point chosen on the map */
export const locationValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});
export type GeoLocation = Infer<typeof locationValidator>;

/** One product line inside an order */
export const orderItemValidator = v.object({
  productType: v.string(), // نوع محصول
  productTypePrice: v.optional(v.number()),
  material: v.optional(v.string()), // جنس
  materialPrice: v.optional(v.number()),
  color: v.optional(v.string()), // رنگ
  printFront: v.optional(v.string()), // متن/نقش چاپ جلو
  printFrontPrice: v.optional(v.number()),
  printBack: v.optional(v.string()), // متن/نقش چاپ پشت
  printBackPrice: v.optional(v.number()),
  buttonType: v.optional(v.string()), // نوع دکمه
  buttonPrice: v.optional(v.number()),
  zipperType: v.optional(v.string()), // نوع زیپ
  zipperPrice: v.optional(v.number()),
  pocketType: v.optional(v.string()), // نوع جیب
  pocketPrice: v.optional(v.number()),
  size: v.optional(v.string()), // سایز
  /** تفکیک سایز: مجموع تعداد هر سایز؛ در صورت وجود، جای qty می‌نشیند */
  sizes: v.optional(
    v.array(v.object({ size: v.string(), qty: v.number() })),
  ),
  qty: v.number(), // تعداد
  unitPrice: v.number(), // قیمت واحد نهایی (خودکار یا دستی)
  notes: v.optional(v.string()),
});
export type OrderItem = Infer<typeof orderItemValidator>;

/** Delivery receipt filled when the order is handed over */
export const deliveryValidator = v.object({
  amount: v.number(), // مبلغ دریافتی به ازای تحویل
  method: v.string(), // اسنپ / باربری / حضوری ...
  notes: v.optional(v.string()),
  dateLabel: v.string(), // شمسی
  dateTs: v.number(),
  byName: v.optional(v.string()),
});
export type Delivery = Infer<typeof deliveryValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      // app-specific
      roleId: v.optional(v.id("roles")),
      // آخرین زمانی که کاربر اعلان‌ها را دیده (برای badge خوانده‌نشده)
      notifSeenTs: v.optional(v.number()),
    }).index("email", ["email"]),

    /** singleton row: factory owner + bootstrap state */
    settings: defineTable({
      ownerId: v.id("users"),
      ownerEmail: v.optional(v.string()),
      bootstrappedTs: v.number(),
    }),

    /** تنظیمات کلی سامانه (یک ردیف) */
    appSettings: defineTable({
      factoryName: v.optional(v.string()),
      defaultCity: v.optional(v.string()),
      deliveryMethods: v.optional(v.array(v.string())),
      lowStockThreshold: v.optional(v.number()),
      currency: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      updatedAtTs: v.number(),
    }),

    /** permission roles; owner always has full access */
    roles: defineTable({
      name: v.string(),
      permissions: v.array(v.string()), // section ids: orders/customers/delivery/warehouse/users
      createdAtTs: v.number(),
    }),

    /** dropdown/default values for the order form (auto-learned) */
    presets: defineTable({
      category: v.string(), // productType | material | color | print | buttonType | zipperType | pocketType | size | city | craft | deliveryMethod
      value: v.string(),
      price: v.optional(v.number()),
      active: v.boolean(),
      createdAtTs: v.number(),
    }).index("by_category", ["category"]),

    customers: defineTable({
      name: v.string(), // اسم فرد یا شرکت
      phone: v.string(),
      city: v.optional(v.string()), // اسم شهر
      craft: v.optional(v.string()), // صنف
      address: v.optional(v.string()), // آدرس کتبی
      location: v.optional(locationValidator),
      // permanent | nonpermanent | none
      status: v.union(
        v.literal("permanent"),
        v.literal("nonpermanent"),
        v.literal("none"),
      ),
      // none | needs | following
      followup: v.union(
        v.literal("none"),
        v.literal("needs"),
        v.literal("following"),
      ),
      notes: v.optional(v.string()), // سایر توضیحات
      searchText: v.string(),
      createdBy: v.optional(v.id("users")),
      createdAtTs: v.number(),
      createdAtLabel: v.string(), // شمسی
    })
      .index("by_status", ["status"])
      .searchIndex("search", {
        searchField: "searchText",
        filterFields: ["status", "followup"],
      }),

    orders: defineTable({
      orderNo: v.number(), // شماره‌گذاری خریدها
      customerId: v.id("customers"),
      customerName: v.string(), // نام فرد
      companyName: v.optional(v.string()), // نام شرکت (جدا از فرد)
      phone: v.string(),
      city: v.optional(v.string()),
      address: v.optional(v.string()),
      location: v.optional(locationValidator),
      dateLabel: v.string(), // تاریخ شمسی ثبت سفارش
      dateTs: v.number(),
      items: v.array(orderItemValidator),
      total: v.number(), // قیمت نهایی سفارش
      notes: v.optional(v.string()),
      // pending | delivered
      status: v.union(v.literal("pending"), v.literal("delivered")),
      delivery: v.optional(deliveryValidator),
      createdBy: v.optional(v.id("users")),
      createdByName: v.optional(v.string()),
      searchText: v.string(),
    })
      .index("by_status", ["status"])
      .index("by_customer", ["customerId"])
      .searchIndex("search", {
        searchField: "searchText",
        filterFields: ["status"],
      }),

    /** انبار: پوشاک آماده + مواد اولیه */
    warehouseItems: defineTable({
      kind: v.union(v.literal("apparel"), v.literal("material")),
      name: v.string(),
      // apparel fields
      productType: v.optional(v.string()), // نوع لباس
      material: v.optional(v.string()), // جنس
      color: v.optional(v.string()),
      fabricWeight: v.optional(v.string()), // گرماژ پارچه
      buttonType: v.optional(v.string()),
      zipperType: v.optional(v.string()),
      pocketType: v.optional(v.string()),
      sizes: v.optional(
        v.array(v.object({ size: v.string(), qty: v.number() })),
      ),
      // material fields
      category: v.optional(v.string()), // پارچه / نخ / دکمه / سوزن / ...
      attrs: v.optional(
        v.array(v.object({ key: v.string(), value: v.string() })),
      ), // زیرشاخه‌های آزاد (جنس، رنگ، گرماژ، اندازه...)
      unit: v.optional(v.string()), // واحد شمارش
      qty: v.number(), // موجودی کل (پوشاک: جمع سایزها)
      minQty: v.optional(v.number()), // حداقل هشدار
      price: v.optional(v.number()),
      notes: v.optional(v.string()),
      searchText: v.string(),
      createdAtTs: v.number(),
      updatedAtTs: v.number(),
    })
      .index("by_kind", ["kind"])
      .searchIndex("search", {
        searchField: "searchText",
        filterFields: ["kind"],
      }),

    /** اعلان‌های سراسری: هر ثبت/تغییر برای همه کارکنان */
    notifications: defineTable({
      type: v.string(), // order | delivery | customer | warehouse | role
      title: v.string(),
      body: v.optional(v.string()),
      link: v.optional(v.string()),
      byName: v.optional(v.string()),
      createdAtTs: v.number(),
      createdAtLabel: v.string(), // شمسی
    }),

    /** تاریخچه تغییرات انبار */
    warehouseLogs: defineTable({
      itemId: v.id("warehouseItems"),
      itemName: v.string(),
      action: v.union(
        v.literal("create"),
        v.literal("update"),
        v.literal("delete"),
        v.literal("stock"),
      ),
      changes: v.array(
        v.object({
          field: v.string(),
          old: v.optional(v.string()),
          new: v.optional(v.string()),
        }),
      ),
      byName: v.optional(v.string()),
      atTs: v.number(),
    }).index("by_item", ["itemId"]),

    counters: defineTable({
      key: v.string(),
      value: v.number(),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;

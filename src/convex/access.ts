import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { canView, requireEdit } from "./perms";

export const SECTIONS = [
  "orders",
  "customers",
  "delivery",
  "warehouse",
  "users",
  "settings",
] as const;
export type Section = (typeof SECTIONS)[number];
export const sectionValidator = v.union(
  ...SECTIONS.map((s) => v.literal(s)),
);

/** سطح دسترسی هر بخش: none = هیچ، view = فقط مشاهده، full = کامل */
export type PermLevel = "none" | "view" | "full";
export const permLevelValidator = v.union(
  v.literal("none"),
  v.literal("view"),
  v.literal("full"),
);

/**
 * روح سیستم: اولین کاربری که وارد می‌شود رییس کارخانه است و به همه‌چیز دسترسی دارد.
 * بعد از آن، فقط رییس می‌تواند برای بقیه نقش و دسترسی تعیین کند.
 * `ensureUserAccess` در ورود هر کاربر اجرا می‌شود (از سمت کلاینت) و نقش می‌سازد.
 */
export const ensureUserAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const settingsRows = await ctx.db.query("settings").collect();

    if (settingsRows.length === 0) {
      // اولین کاربر = رییس کارخانه
      await ctx.db.insert("settings", {
        ownerId: userId,
        ownerEmail: user.email ?? undefined,
        bootstrappedTs: Date.now(),
      });
      await ctx.db.insert("roles", {
        name: "رییس کارخانه",
        levels: Object.fromEntries(SECTIONS.map((s) => [s, "full"])),
        createdAtTs: Date.now(),
      });
    }

    if (user.roleId === undefined) {
      const owner = await ctx.db
        .query("settings")
        .collect()
        .then((rows) => rows[0]);
      const isOwner = owner?.ownerId === userId;
      let roleId: Id<"roles"> | undefined = user.roleId;
      if (isOwner) {
        const ownerRole = await ctx.db
          .query("roles")
          .collect()
          .then(
            (rows) =>
              rows.find(
                (r) =>
                  (r.levels && Object.values(r.levels).every((l) => l === "full")) ||
                  (r.permissions?.length ?? 0) === SECTIONS.length,
              ) ?? null,
          );
        roleId =
          ownerRole?._id ??
          (await ctx.db.insert("roles", {
            name: "رییس کارخانه",
            levels: Object.fromEntries(SECTIONS.map((s) => [s, "full"])),
            createdAtTs: Date.now(),
          }));
      } else {
        // کاربر تازه: تا رییس نقش تعیین نکند، هیچ دسترسی‌ای ندارد
        const visitorRole = await ctx.db
          .query("roles")
          .collect()
          .then((rows) => rows.find((r) => r.name === "بدون دسترسی"));
        roleId =
          visitorRole?._id ??
          (await ctx.db.insert("roles", {
            name: "بدون دسترسی",
            permissions: [],
            createdAtTs: Date.now(),
          }));
      }
      await ctx.db.patch(userId, { roleId });
    }

    return { ok: true };
  },
});

/** نقش کاربر جاری + لیست کامل نقش‌ها (فقط وقتی لاگین است) */
export const getMyAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const settings = await ctx.db.query("settings").collect();
    const isOwner = settings[0]?.ownerId === userId;
    const role = user.roleId ? await ctx.db.get(user.roleId) : null;
    return {
      userId,
      isOwner,
      role,
      email: user.email ?? null,
      name: user.name ?? null,
      jobTitle: user.jobTitle ?? null,
      // تنظیمات شخصی هر کاربر (تم رنگی و دارک‌مود خودش)
      themeColor: user.themeColor ?? null,
      themeDark: user.themeDark ?? null,
      settings: settings[0] ?? null,
    };
  },
});

/** نقش «رییس کارخانه» با دسترسی full به همه بخش‌ها (تا رییس حذفش نکرده) */

/** لیست همه کاربران برای پنل رییس */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    // رییس یا هرکس که دسترسی «کاربران و دسترسی‌ها» را دارد (view یا full)
    if (!(await canView(ctx, "users"))) return [];
    const settings = await ctx.db.query("settings").collect();
    const users = await ctx.db.query("users").collect();
    const roles = await ctx.db.query("roles").collect();
    return users
      .filter((u) => !u.isAnonymous)
      .map((u) => ({
        _id: u._id,
        email: u.email ?? "",
        name: u.name ?? "",
        jobTitle: u.jobTitle ?? null,
        roleId: u.roleId ?? null,
        roleName: u.roleId ? roles.find((r) => r._id === u.roleId)?.name : null,
        isOwner: settings[0]?.ownerId === u._id,
      }));
  },
});

/** ثبت/ویرایش نام و نوع شغل کاربر فعلی (همه کاربران، بدون نیاز به نقش) */
export const updateProfile = mutation({
  args: {
    name: v.string(),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, { name, jobTitle }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("اول وارد شوید");
    await ctx.db.patch(userId, { name, jobTitle });
    return { ok: true };
  },
});

/** رییس می‌تواند نام و شغل هر کارمند را مستقیم اصلاح کند */
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, jobTitle }) => {
    // رییس یا کسی که دسترسی کامل بخش «کاربران» دارد
    await requireEdit(ctx, "users");
    const settings = await ctx.db.query("settings").collect();
    if (settings[0]?.ownerId === userId) {
      throw new Error("پروفایل رییس کارخانه فقط توسط خودش قابل ویرایش است");
    }
    await ctx.db.patch(userId, { name, jobTitle });
    return { ok: true };
  },
});

/** لیست نقش‌ها (برای همه کاربران لاگین‌شده تا منو ساخته شود) */
export const listRoles = query({
  args: {},
  handler: async (ctx) => {
    await getAuthUserId(ctx);
    return await ctx.db.query("roles").collect();
  },
});

/** ساخت یا ویرایش نقش با سطوح سه‌گانه — فقط رییس */
export const upsertRole = mutation({
  args: {
    id: v.optional(v.id("roles")),
    name: v.string(),
    levels: v.record(v.string(), permLevelValidator),
  },
  handler: async (ctx, { id, name, levels }) => {
    // رییس یا کسی که دسترسی کامل بخش «کاربران» دارد
    await requireEdit(ctx, "users");
    if (id) {
      const existing = await ctx.db.get(id);
      if (existing?.name === "رییس کارخانه") {
        throw new Error("دسترسی رییس کارخانه قابل تغییر نیست");
      }
      await ctx.db.patch(id, { name, levels });
      return id;
    }
    return await ctx.db.insert("roles", {
      name,
      levels,
      createdAtTs: Date.now(),
    });
  },
});

export const deleteRole = mutation({
  args: { id: v.id("roles") },
  handler: async (ctx, { id }) => {
    // رییس یا کسی که دسترسی کامل بخش «کاربران» دارد
    await requireEdit(ctx, "users");
    const role = await ctx.db.get(id);
    if (role?.name === "رییس کارخانه") {
      throw new Error("نقش رییس کارخانه قابل حذف نیست");
    }
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.roleId === id) await ctx.db.patch(u._id, { roleId: undefined });
    }
    await ctx.db.delete(id);
  },
});

/** تعیین/تغییر نقش یک کارمند — فقط رییس */
export const setUserRole = mutation({
  args: { userId: v.id("users"), roleId: v.optional(v.id("roles")) },
  handler: async (ctx, { userId, roleId }) => {
    const me = await getAuthUserId(ctx);
    // رییس یا کسی که دسترسی کامل بخش «کاربران» دارد
    await requireEdit(ctx, "users");
    const settings = await ctx.db.query("settings").collect();
    if (settings[0]?.ownerId === userId) {
      throw new Error("دسترسی رییس کارخانه قابل تغییر نیست");
    }
    if (roleId) {
      const targetRole = await ctx.db.get(roleId);
      // نقش رییس فقط توسط خود رییس قابل تخصیص است (جلوگیری از ارتقای خودخواهانه)
      if (targetRole?.name === "رییس کارخانه" && settings[0]?.ownerId !== me) {
        throw new Error("انتخاب نقش «رییس کارخانه» فقط توسط خود رییس ممکن است");
      }
    }
    await ctx.db.patch(userId, { roleId });
  },
});

/** حذف کارمند — فقط رییس */
export const removeEmployee = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // رییس یا کسی که دسترسی کامل بخش «کاربران» دارد
    await requireEdit(ctx, "users");
    const settings = await ctx.db.query("settings").collect();
    if (settings[0]?.ownerId === userId) {
      throw new Error("رییس کارخانه قابل حذف نیست");
    }
    await ctx.db.patch(userId, { roleId: undefined });
  },
});

/** فقط برای همگام‌سازی اولیه (internal) */
export const noop = internalMutation({ args: {}, handler: async () => {} });

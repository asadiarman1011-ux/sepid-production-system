import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { SECTIONS } from "./access";

export type Levels = Record<string, "none" | "view" | "full"> | null | undefined;

/** دسترسی کاربر جاری: رییس = full همه‌جا؛ بقیه بر اساس نقش */
export async function myPerms(
  ctx: QueryCtx | MutationCtx,
): Promise<{ isOwner: boolean; levels: Record<string, "none" | "view" | "full"> }> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return { isOwner: false, levels: {} };
  const user = await ctx.db.get(userId);
  if (!user) return { isOwner: false, levels: {} };
  const settings = await ctx.db.query("settings").collect();
  const isOwner = settings[0]?.ownerId === userId;
  if (isOwner) {
    return {
      isOwner: true,
      levels: Object.fromEntries(SECTIONS.map((s) => [s, "full" as const])),
    };
  }
  let levels: Levels = null;
  if (user.roleId) {
    const role = await ctx.db.get(user.roleId);
    levels = role?.levels as Levels;
    // سازگاری با نقش‌های قدیمی (permissions آرایه‌ای)
    if (!levels && role?.permissions) {
      levels = Object.fromEntries(
        (role.permissions as string[]).map((s) => [s, "full" as const]),
      );
    }
  }
  return { isOwner: false, levels: levels ?? {} };
}

/** آیا کاربر اصلا بخش را می‌بیند؟ (view یا full) */
export async function canView(ctx: QueryCtx | MutationCtx, section: string) {
  const { isOwner, levels } = await myPerms(ctx);
  return isOwner || levels[section] === "view" || levels[section] === "full";
}

/** آیا کاربر می‌تواند ثبت/ویرایش/حذف کند؟ (فقط full) */
export async function canEdit(ctx: QueryCtx | MutationCtx, section: string) {
  const { isOwner, levels } = await myPerms(ctx);
  return isOwner || levels[section] === "full";
}

/** اگر اجازه ویرایش نداشت خطای فارسی می‌دهد */
export async function requireEdit(ctx: QueryCtx | MutationCtx, section: string) {
  if (!(await canEdit(ctx, section))) {
    throw new Error("شما فقط اجازه مشاهده دارید؛ برای ثبت یا ویرایش با رییس کارخانه هماهنگ کنید");
  }
}

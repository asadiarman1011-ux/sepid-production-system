import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toFaDigits, formatJalaliTime } from "@/lib/jalali";
import { useNavigate } from "react-router";
import {
  Bell,
  Boxes,
  ClipboardList,
  PackageCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

const TYPE_META: Record<
  string,
  { icon: typeof Bell; tint: string; label: string }
> = {
  order: { icon: ClipboardList, tint: "bg-blue-50 text-blue-700", label: "سفارش" },
  delivery: { icon: PackageCheck, tint: "bg-emerald-50 text-emerald-700", label: "تحویل" },
  customer: { icon: Users, tint: "bg-sky-50 text-sky-700", label: "مشتری" },
  warehouse: { icon: Boxes, tint: "bg-amber-50 text-amber-700", label: "انبار" },
  role: { icon: UserRound, tint: "bg-violet-50 text-violet-700", label: "دسترسی" },
};

export function NotificationBell() {
  const notifications = useQuery(api.notifications.list, {});
  const unread = useQuery(api.notifications.unreadCount, {});
  const markSeen = useMutation(api.notifications.markSeen);
  const removeNotif = useMutation(api.notifications.remove);
  const clearAll = useMutation(api.notifications.clearAll);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);

  // هنگام باز شدن، همه به عنوان دیده‌شده علامت می‌خورند
  useEffect(() => {
    if (open && !wasOpen.current) {
      markSeen({}).catch(() => {});
    }
    wasOpen.current = open;
  }, [open, markSeen]);

  const count = unread ?? 0;
  const rows = notifications ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-xl hover:bg-muted"
          title="اعلان‌ها"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-black text-white shadow-md ring-2 ring-background">
              {count > 99 ? "+۹۹" : toFaDigits(count)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-black">
            <Bell className="size-4 text-blue-700" />
            اعلان‌ها
            {count > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                {toFaDigits(count)} جدید
              </span>
            )}
          </div>
          {rows.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm("همه اعلان‌های گذشته حذف شود؟")) return;
                await clearAll({});
              }}
            >
              <Trash2 className="size-3.5" />
              حذف همه
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-[380px] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                اعلانی وجود ندارد
              </p>
              <p className="text-xs text-muted-foreground/70">
                وقتی کسی سفارش، مشتری یا تغییر انباری ثبت کند، اینجا می‌آید
              </p>
            </div>
          ) : (
            rows.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.order;
              const Icon = meta.icon;
              return (
                <div
                  key={n._id}
                  className="group flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted/70"
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <button
                    className="min-w-0 flex-1 text-right"
                    onClick={() => {
                      setOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <div className="truncate text-sm font-bold">{n.title}</div>
                    {n.body && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.body}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                      <span>{meta.label}</span>
                      <span>·</span>
                      <span>{toFaDigits(formatJalaliTime(n.createdAtTs))}</span>
                      {n.byName && (
                        <>
                          <span>·</span>
                          <span className="truncate">توسط {n.byName}</span>
                        </>
                      )}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title="حذف این اعلان"
                    onClick={async () => {
                      await removeNotif({ id: n._id as never });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

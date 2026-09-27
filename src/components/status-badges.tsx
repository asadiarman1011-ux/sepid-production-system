import { Badge } from "@/components/ui/badge";

const STATUS_MAP = {
  permanent: { label: "مشتری ثابت", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  nonpermanent: { label: "مشتری غیرثابت", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  none: { label: "بدون وضعیت", cls: "bg-muted text-muted-foreground border-border" },
} as const;

const FOLLOWUP_MAP = {
  needs: { label: "نیاز به پیگیری", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  following: { label: "در حال پیگیری", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  none: null,
} as const;

const ORDER_STATUS_MAP = {
  pending: { label: "در انتظار تحویل", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  delivered: { label: "تحویل داده شده", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
} as const;

export function CustomerStatusBadge({ status }: { status: "permanent" | "nonpermanent" | "none" }) {
  const s = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function FollowupBadge({ followup }: { followup: "none" | "needs" | "following" }) {
  const s = FOLLOWUP_MAP[followup];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: "pending" | "delivered" }) {
  const s = ORDER_STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * رندر تدریجی لیست‌ها: اول فقط بخشی از آیتم‌ها در DOM می‌رود و وقتی کاربر به
 * انتهای لیست اسکرول کند، بخش بعدی خودکار اضافه می‌شود. این‌طوری با هزاران رکورد
 * هم صفحه روان می‌ماند، اسکرول بی‌وقفه کار می‌کند و هیچ سقفی روی دیتا نیست.
 */
export function useProgressiveList<T>(items: T[], step = 40) {
  const [count, setCount] = useState(step);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // اگر آیتم‌ها کمتر از شمار فعلی شدند، clamp می‌کنیم (شمار را ریست نمی‌کنیم تا جای اسکرول نپرد)
  const safeCount = Math.min(count, Math.max(items.length, step));
  const visible = items.length > safeCount ? items.slice(0, safeCount) : items;
  const hasMore = items.length > safeCount;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => c + step);
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, step, visible.length]);

  const showAll = useCallback(() => setCount(Number.MAX_SAFE_INTEGER), []);

  return { visible, sentinelRef, hasMore, remaining: items.length - visible.length, showAll };
}

/** div نامرئی انتهای لیست برای تشخیص رسیدن به پایین */
export function ListSentinel({
  hasMore,
  remaining,
  sentinelRef,
  onShowAll,
}: {
  hasMore: boolean;
  remaining: number;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onShowAll?: () => void;
}) {
  if (!hasMore) return null;
  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
      <span className="text-xs text-muted-foreground">
        در حال بارگذاری ادامه لیست… ({remaining.toLocaleString("fa-IR")} مورد باقی‌مانده)
      </span>
      {onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="text-xs font-bold text-blue-700 hover:underline"
        >
          نمایش همه
        </button>
      )}
    </div>
  );
}

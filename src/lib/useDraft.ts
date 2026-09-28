import { useCallback, useState } from "react";

/**
 * useState با ذخیره خودکار و همزمان در sessionStorage.
 * چون پیش‌نمایش بعد از هر به‌روزرسانی کامل رفرش می‌شود، هر چیزی که کاربر
 * وسط کار تایپ کرده با این هوک بعد از رفرش دقیقا برمی‌گردد.
 * ذخیره sync است (بدون تاخیر) تا حتی رفرش ناگهانی هم داده از دست ندهد.
 * با `clear()` بعد از ثبت موفق پاکش کنید.
 */
export function useDraft<T>(
  key: string,
  initial: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const storageKey = `draft:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* پیش‌نویس خراب → نادیده بگیر */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const update: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setValue((prev) => {
        const next =
          typeof action === "function"
            ? (action as (p: T) => T)(prev)
            : action;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* حافظه پر یا غیرقابل دسترس */
        }
        return next;
      });
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* noop */
    }
  }, [storageKey]);

  return [value, update, clear] as const;
}

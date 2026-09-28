import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMoney, toFaDigits } from "@/lib/jalali";

type CurrencyCtx = {
  currency: string;
  /** مبلغ + واحد پول تنظیمات */
  money: (n: number | undefined | null) => string;
  /** فقط عدد با جداکننده هزارگان و رقم فارسی */
  num: (n: number | undefined | null) => string;
};

const Ctx = createContext<CurrencyCtx>({
  currency: "تومان",
  money: (n) => formatMoney(n),
  num: (n) => formatMoney(n).replace(/ .*/, ""),
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const settings = useQuery(api.appSettings.get, {});
  const currency = settings?.currency || "تومان";
  const value: CurrencyCtx = {
    currency,
    money: (n) => formatMoney(n, currency),
    num: (n) => toFaDigits(Math.round(n ?? 0).toLocaleString("en-US")),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** در هر کامپوننتی که داخل CurrencyProvider است قیمت را با واحد درست نشان بده */
export function useCurrency() {
  return useContext(Ctx);
}

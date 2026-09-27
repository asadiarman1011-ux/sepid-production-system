import {
  JALALI_MONTHS,
  formatJalali,
  formatJalaliTime,
  gregorianToJalali,
  jalaliToGregorian,
  pad2,
} from "@/convex/lib";

export {
  JALALI_MONTHS,
  formatJalali,
  formatJalaliTime,
  gregorianToJalali,
  jalaliToGregorian,
  pad2,
};

/** اعداد فارسی */
export function toFaDigits(s: string | number) {
  return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** جداکننده هزارگان + رقم فارسی */
export function formatMoney(n: number | undefined | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return toFaDigits(Math.round(n).toLocaleString("en-US")) + " تومان";
}

export function formatNumber(n: number | undefined | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return toFaDigits(Math.round(n).toLocaleString("en-US"));
}

/** رشته شمسی امروز */
export function todayJalaliLabel() {
  return formatJalali(Date.now());
}

/** ورودی 1404/07/05 → timestamp شروع روز */
export function jalaliLabelToTs(label: string): number | null {
  const m = label.match(/(\d{3,4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd).getTime();
}

/** timestamp → ورودی شمسی قابل ویرایش */
export function tsToJalaliInput(ts: number): string {
  return formatJalali(ts);
}

export const WEEKDAYS_FA = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

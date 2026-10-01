/**
 * عدد به حروف فارسی — برای «مبلغ به حروف» روی فاکتور
 */
const YEKAN = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const DAHGAHI = [
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];
const DAHGAN = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const SADGAN = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", " هزار", " میلیون", " میلیارد", " تریلیون"];

function threeDigitToWords(n: number): string {
  const parts: string[] = [];
  const sad = Math.floor(n / 100);
  const remainder = n % 100;
  if (sad > 0) parts.push(SADGAN[sad]);
  if (remainder >= 10 && remainder < 20) {
    parts.push(DAHGAHI[remainder - 10]);
  } else {
    const dahgan = Math.floor(remainder / 10);
    const yekan = remainder % 10;
    if (dahgan > 0) parts.push(DAHGAN[dahgan]);
    if (yekan > 0) parts.push(YEKAN[yekan]);
  }
  return parts.join(" و ");
}

/** مثال: 2485000000 → «دو میلیارد و چهارصد و هشتاد و پنج میلیون تومان» */
export function numToFaWords(num: number, unit = "تومان"): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return `صفر ${unit}`;
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const scale = SCALES[i] ?? "";
    parts.push(`${threeDigitToWords(g)}${scale}`);
  }
  return `${parts.join(" و ")} ${unit}`.trim();
}

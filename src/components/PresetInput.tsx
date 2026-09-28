import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toFaDigits } from "@/lib/jalali";
import { useCurrency } from "@/lib/currency";
import { Check, ChevronDown, X } from "lucide-react";

export const PRESET_CATEGORIES = [
  "productType",
  "material",
  "color",
  "print",
  "buttonType",
  "zipperType",
  "pocketType",
  "size",
  "city",
  "craft",
  "deliveryMethod",
] as const;
export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

/**
 * ورودی ترکیبی: هم می‌شود آزاد تایپ کرد هم از پیش‌فرض‌ها انتخاب کرد.
 * هر مقدار جدیدی که تایپ شود، به عنوان پیش‌فرض ذخیره می‌شود تا دفعه بعد پیشنهاد شود.
 */
export function PresetInput({
  category,
  label,
  value,
  onChange,
  placeholder,
  className,
  optional,
  hideLabel,
}: {
  category: PresetCategory;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  optional?: boolean;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const presets = useQuery(api.presets.byCategory, { category }) ?? [];
  const upsert = useMutation(api.presets.upsert);
  const { money } = useCurrency();

  const filtered = value
    ? presets.filter((p) => p.value.includes(value) && p.value !== value)
    : presets;

  return (
    <div className={className}>
      {!hideLabel && (
        <Label className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
          {label}
          {optional && (
            <span className="text-xs font-normal text-muted-foreground">
              (اختیاری)
            </span>
          )}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder ?? "تایپ کنید یا از پیش‌فرض‌ها انتخاب کنید"}
              className="h-11 border-2 pr-3 pl-9 font-medium shadow-sm focus:border-blue-500"
            />
            <ChevronDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-1"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {value ? (
                  <>
                    «{value}» ذخیره خواهد شد
                  </>
                ) : (
                  "پیش‌فرضی موجود نیست — تایپ کنید"
                )}
              </div>
            )}
            {filtered.map((p) => (
              <button
                key={p._id}
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-right text-sm hover:bg-muted"
                onClick={() => {
                  onChange(p.value);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.value}</span>
                {p.price != null && (
                  <span className="text-xs text-muted-foreground">
                    {money(p.price)}
                  </span>
                )}
                {/* عرض ستون قیمت ثابت بماند */}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function normalizeDigits(s: string) {
  // ارقام فارسی/عربی → لاتین
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** نمایش سه‌رقمی سه‌رقمی با رقم فارسی: 1234560 → ۱٬۲۳۴٬۵۶۰ */
export function thousandFa(n: number) {
  return toFaDigits(Math.round(n).toLocaleString("en-US"));
}

/**
 * ورودی قیمت بدون لیبل با جداکننده سه‌رقمی زنده.
 * کاربر می‌تواند ارقام فارسی هم تایپ کند؛ مقدار ذخیره‌شده همیشه عدد خام است.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value != null ? thousandFa(value) : "");

  // اگر مقدار از بیرون عوض شد (پیش‌فرض قیمت و…)، نمایش را همگام کن
  useEffect(() => {
    const parsed = text ? Number(normalizeDigits(text).replace(/[^\d]/g, "")) : undefined;
    if ((value ?? undefined) !== parsed) {
      setText(value != null ? thousandFa(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const digits = normalizeDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 15);
        const n = digits === "" ? undefined : Number(digits);
        setText(digits === "" ? "" : thousandFa(n!));
        onChange(n);
      }}
      placeholder={placeholder ?? "قیمت"}
      className={className ?? "h-11 border-2 text-left font-medium shadow-sm focus:border-blue-500"}
      dir="ltr"
    />
  );
}

/** ورودی عددی قیمت با واحد پول تنظیمات + جداکننده سه‌رقمی */
export function PriceInput({
  label,
  value,
  onChange,
  optional,
  className,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  optional?: boolean;
  className?: string;
}) {
  const { currency } = useCurrency();
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1 text-sm font-semibold">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            (اختیاری)
          </span>
        )}
      </Label>
      <MoneyInput
        value={value}
        onChange={onChange}
        placeholder={`قیمت به ${currency}`}
      />
    </div>
  );
}

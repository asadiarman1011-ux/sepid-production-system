import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/jalali";
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
}: {
  category: PresetCategory;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const presets = useQuery(api.presets.byCategory, { category }) ?? [];
  const upsert = useMutation(api.presets.upsert);

  const filtered = value
    ? presets.filter((p) => p.value.includes(value) && p.value !== value)
    : presets;

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
                    {formatMoney(p.price)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** ورودی عددی قیمت با ثبت پیش‌فرض */
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
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        placeholder="قیمت به تومان"
        className="h-11 border-2 text-left font-medium shadow-sm focus:border-blue-500"
        dir="ltr"
      />
    </div>
  );
}

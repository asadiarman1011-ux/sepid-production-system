import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  JALALI_MONTHS,
  gregorianToJalali,
  jalaliToGregorian,
  jalaliLabelToTs,
  pad2,
  toFaDigits,
  formatJalali,
} from "@/lib/jalali";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";

function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // اسفند: کبیسه
  const [gy] = jalaliToGregorian(jy, 12, 30);
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  return isLeapG ? 30 : 29;
}

export function JalaliDateField({
  label,
  value,
  onChange,
  className,
}: {
  label?: string;
  value: string; // 1404/07/05
  onChange: (label: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => formatJalali(Date.now()), []);
  const parsed = useMemo(() => {
    const m = (value || "").match(/(\d{3,4})\/(\d{1,2})\/(\d{1,2})/);
    if (!m) {
      const t = today.match(/(\d{3,4})\/(\d{1,2})\/(\d{1,2})/)!;
      return { jy: Number(t[1]), jm: Number(t[2]), jd: Number(t[3]) };
    }
    return { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
  }, [value, today]);

  const [view, setView] = useState({ jy: parsed.jy, jm: parsed.jm });
  const [grid, setGrid] = useState(0); // force re-render on navigation

  const firstG = jalaliToGregorian(view.jy, view.jm, 1);
  const firstDate = new Date(firstG[0], firstG[1] - 1, firstG[2]);
  // شنبه = شروع هفته در ایران
  const offset = (firstDate.getDay() + 1) % 7;
  const len = jalaliMonthLength(view.jy, view.jm);

  const pick = (jd: number) => {
    onChange(`${view.jy}/${pad2(view.jm)}/${pad2(jd)}`);
    setOpen(false);
  };

  return (
    <div className={className}>
      {label && (
        <Label className="mb-1.5 block text-sm font-semibold">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-input bg-background px-3 text-sm shadow-sm transition-colors hover:border-blue-300 focus:border-blue-500 focus:outline-none"
          >
            <span className="flex items-center gap-2 font-medium">
              <CalendarDays className="size-4 text-blue-600" />
              {value ? toFaDigits(value) : "انتخاب تاریخ شمسی"}
            </span>
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="mb-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                let jm = view.jm - 1;
                let jy = view.jy;
                if (jm < 1) {
                  jm = 12;
                  jy -= 1;
                }
                setView({ jy, jm });
                setGrid((g) => g + 1);
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
            <div className="flex items-center gap-2 font-semibold">
              <span>{JALALI_MONTHS[view.jm - 1]}</span>
              <span>{toFaDigits(view.jy)}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                let jm = view.jm + 1;
                let jy = view.jy;
                if (jm > 12) {
                  jm = 1;
                  jy += 1;
                }
                setView({ jy, jm });
                setGrid((g) => g + 1);
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: len }).map((_, i) => {
              const jd = i + 1;
              const isSel =
                parsed.jy === view.jy &&
                parsed.jm === view.jm &&
                parsed.jd === jd;
              const isToday =
                today === `${view.jy}/${pad2(view.jm)}/${pad2(jd)}`;
              return (
                <button
                  key={`${grid}-${jd}`}
                  type="button"
                  onClick={() => pick(jd)}
                  className={`h-9 rounded-md text-sm font-medium transition-colors ${
                    isSel
                      ? "bg-blue-700 text-white"
                      : isToday
                        ? "border border-blue-300 text-blue-700"
                        : "hover:bg-muted"
                  }`}
                >
                  {toFaDigits(jd)}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              امروز
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

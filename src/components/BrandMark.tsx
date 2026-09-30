import { cn } from "@/lib/utils";

/**
 * مونوگرام برند سپید — تی‌شرت + سوزن و نخ (نماد تولید پوشاک).
 * SVG داخل‌سازی شده تا در هر سایزی شارپ بماند؛ رنگ‌ها با currentColor تا با تم هماهنگ باشد.
 */
export function BrandMark({
  className,
  boxClassName,
}: {
  className?: string;
  boxClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-950 shadow-md ring-1 ring-white/20",
        boxClassName,
      )}
    >
      {/* درخشش ملایم گوشه */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,rgba(255,255,255,0.25),transparent)]"
      />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={cn("relative h-[72%] w-[72%]", className)}
        aria-label="تولیدی پوشاک سپید"
      >
        {/* بدنه تی‌شرت */}
        <path
          d="M17 9 L11 13 L6 20 L11 24 L13 21 L13 39 Q24 42 35 39 L35 21 L37 24 L42 20 L37 13 L31 9 Q28 13 24 13 Q20 13 17 9 Z"
          fill="rgba(255,255,255,0.94)"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* یقه */}
        <path
          d="M17.5 9.5 Q24 16 30.5 9.5"
          stroke="#1e40af"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* سوزن مورب با نخ */}
        <g strokeLinecap="round">
          <path
            d="M14 36 L31 19"
            stroke="#1e3a8a"
            strokeWidth="2.4"
          />
          <path
            d="M14 36 L12.4 37.6"
            stroke="#1e3a8a"
            strokeWidth="2.4"
          />
          {/* سوراخ سوزن */}
          <circle cx="31.8" cy="18.2" r="1.4" fill="#1e3a8a" />
          {/* نخ: از سوزن به پایین تی‌شرت موج می‌خورد */}
          <path
            d="M31 20 Q34 24 31.5 27 Q29 30 32 33 Q34.5 35.5 33 38"
            stroke="#93c5fd"
            strokeWidth="1.6"
            fill="none"
          />
        </g>
      </svg>
    </span>
  );
}

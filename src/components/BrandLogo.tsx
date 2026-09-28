import { cn } from "@/lib/utils";
import logoUrl from "@/assets/signature-logo.svg";

/**
 * لوگوی امضایی برند — جایگزین حرف «س».
 * اگر فایل عکس اصلی در src/assets/logo.png قرار بگیرد، خودکار همان استفاده می‌شود.
 */
export function BrandLogo({
  className,
  boxClassName,
  alt = "لوگوی سپید",
}: {
  className?: string;
  boxClassName?: string;
  alt?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/10",
        boxClassName,
      )}
    >
      <img
        src={logoUrl}
        alt={alt}
        className={cn("h-full w-full object-contain p-1", className)}
        draggable={false}
      />
    </span>
  );
}

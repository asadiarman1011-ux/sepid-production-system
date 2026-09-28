import { cn } from "@/lib/utils";

/**
 * لوگوی امضایی برند — جایگزین حرف «س».
 * SVG داخل‌سازی شده تا هیچ‌جا خارج از کادر نرود و کیفیت در هر سایزی حفظ شود.
 */
export function BrandLogo({
  className,
  boxClassName,
}: {
  className?: string;
  boxClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-black/10",
        boxClassName,
      )}
      style={{ background: "#0a0a0a" }}
    >
      <svg
        viewBox="0 0 1536 1536"
        fill="none"
        className={cn("h-full w-full", className)}
        aria-label="لوگوی سپید"
      >
        {/* پس‌زمینه ثابت مشکی — رنگ امضا تحت تاثیر تم عوض نمی‌شود */}
        <rect width="1536" height="1536" fill="#0a0a0a" />
        <g
          fill="none"
          stroke="#d6992e"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* قلم اصلی */}
          <path d="M1206 522 C1184 622 1148 764 1098 904 C1068 992 1038 1076 1006 1150" />
          {/* کاسه بزرگ راست */}
          <path d="M1006 1150 C1032 1118 1096 1098 1190 1090 C1310 1080 1424 1084 1458 1112 C1480 1132 1466 1172 1412 1220 C1344 1280 1224 1336 1114 1380 C1070 1398 1038 1422 1026 1448" />
          {/* حلقه کوچک */}
          <path d="M1132 836 C1090 846 1058 898 1053 944 C1050 986 1074 1004 1098 992 C1122 978 1131 930 1125 884 C1122 860 1128 846 1136 838" />
          {/* خط کوتاه چپ */}
          <path d="M942 1098 C880 1122 790 1156 706 1188" />
          {/* موج پایین */}
          <path d="M738 1258 C670 1300 605 1360 582 1405 C568 1432 600 1448 668 1438 C780 1420 940 1366 1042 1316 C1082 1296 1098 1292 1110 1318 C1124 1352 1150 1402 1196 1427 C1232 1443 1276 1434 1294 1406" />
        </g>
        {/* سر نقطه قلم */}
        <circle cx="1207" cy="488" r="36" fill="#d6992e" />
      </svg>
    </span>
  );
}

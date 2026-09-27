import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, LocateFixed, MapPin, Navigation } from "lucide-react";

// leaflet default marker icons via CDN-safe data URLs
const icon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 30 16 30s16-18 16-30C32 7.2 24.8 0 16 0z" fill="#e11d48"/><circle cx="16" cy="16" r="6" fill="#fff"/></svg>`,
    ),
  iconSize: [32, 46],
  iconAnchor: [16, 44],
  popupAnchor: [0, -40],
});

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const SAT_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/** نقطه روی نقشه انتخاب کنید — OpenStreetMap (بدون نیاز به کلید) */
export function MapPicker({
  lat,
  lng,
  onChange,
  className,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"street" | "satellite">("street");
  const [locating, setLocating] = useState(false);
  const center: [number, number] = [lat ?? 35.6892, lng ?? 51.389]; // تهران پیش‌فرض

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border bg-muted">
        <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-rose-600" />
            <span>روی نقشه کلیک کنید</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={mode === "street" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setMode("street")}
            >
              خیابانی
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "satellite" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setMode("satellite")}
            >
              ماهواره
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LocateFixed className="size-3.5" />
              )}
              لوکیشن من
            </Button>
          </div>
        </div>
        <div className="h-64 w-full" dir="ltr">
          <MapContainer
            center={center}
            zoom={lat != null ? 16 : 11}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              key={mode}
              url={mode === "street" ? OSM_TILES : SAT_TILES}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ClickCapture onPick={onChange} />
            <ResizeFix />
            {lat != null && lng != null && (
              <>
                <Marker position={[lat, lng]} icon={icon} />
                <Circle center={[lat, lng]} radius={60} pathOptions={{ color: "#e11d48", fillOpacity: 0.12 }} />
              </>
            )}
          </MapContainer>
        </div>
        <div className="flex items-center gap-2 border-t bg-background px-3 py-2" dir="rtl">
          <Input
            value={lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : ""}
            readOnly
            placeholder="مختصات انتخاب‌شده"
            className="h-8 flex-1 bg-muted/50 font-mono text-xs"
            dir="ltr"
          />
          {lat != null && lng != null && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    "_blank",
                  )
                }
              >
                <Navigation className="size-3.5" />
                گوگل مپ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() =>
                  window.open(`https://neshan.org/maps/@${lat},${lng},17z`, "_blank")
                }
              >
                نشان
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() =>
                  window.open(`https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=17`, "_blank")
                }
              >
                بلد
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** نمایش لوکیشن ثبت‌شده روی نقشه (فقط خواندنی) */
export function MapView({
  lat,
  lng,
  label,
  className,
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<"street" | "satellite">("satellite");
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-xl border bg-muted">
        <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <MapPin className="size-3.5 text-rose-600" />
            <span>{label ?? "لوکیشن ثبت‌شده"}</span>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={mode === "street" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setMode("street")}
            >
              خیابانی
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "satellite" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setMode("satellite")}
            >
              ماهواره
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() =>
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")
              }
            >
              <Navigation className="size-3.5" />
              گوگل مپ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() =>
                window.open(`https://neshan.org/maps/@${lat},${lng},17z`, "_blank")
              }
            >
              نشان
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() =>
                window.open(`https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=17`, "_blank")
              }
            >
              بلد
            </Button>
          </div>
        </div>
        <div className="h-56 w-full" dir="ltr">
          <MapContainer
            center={[lat, lng]}
            zoom={16}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              key={mode}
              url={mode === "street" ? OSM_TILES : SAT_TILES}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[lat, lng]} icon={icon} />
            <Recenter lat={lat} lng={lng} />
            <ResizeFix />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

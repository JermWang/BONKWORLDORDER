import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Satellite-style flat map using NASA GIBS tiles, tinted neon green with grid overlay
export const SatelliteMapBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Minimal custom style with a single raster source/layer using NASA BlueMarble tiles
    const style = {
      version: 8 as const,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        imagery: {
          type: "raster" as const,
          // ESRI World Imagery (high zoom, for demo purposes)
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256,
          attribution: "ESRI World Imagery",
        },
      },
      layers: [
        {
          id: "imagery",
          type: "raster" as const,
          source: "imagery",
          paint: {
            "raster-brightness-min": 0.05,
            "raster-brightness-max": 0.9,
            "raster-contrast": 0.15,
            "raster-saturation": -1.0, // grayscale to allow CSS tinting
            "raster-opacity": 0.65,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container,
      style: style as any,
      center: [-73.9857, 40.7484], // NYC area by default; looks good in green
      zoom: 12.5, // tighter satellite look
      bearing: 15,
      pitch: 0,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: false,
    });
    mapRef.current = map;

    const onResize = () => {
      map.resize();
    };
    window.addEventListener("resize", onResize);

    // Continuous slow pan to create a live-feed feel (low CPU via interval)
    const stepPx: [number, number] = [0.6, 0.12];
    const panInterval = window.setInterval(() => {
      try {
        map.panBy(stepPx, { duration: 0 });
        const c = map.getCenter();
        const z = map.getZoom();
        const b = map.getBearing();
        const p = map.getPitch();
        window.dispatchEvent(new CustomEvent("satellite:coords", { detail: { lat: c.lat, lng: c.lng, zoom: z, bearing: b, pitch: p } }));
      } catch {}
    }, 120);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(panInterval);
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none">
      <div ref={containerRef} className="absolute inset-0 satellite-green" style={{ opacity: 0.75 }} />
      {/* Holographic tint */}
      <div className="absolute inset-0 holo-veil" />
      {/* Radar sweep */}
      <div className="absolute inset-0 overlay-radar-sweep" />
      {/* Grid overlay */}
      <div className="absolute inset-0 mix-blend-screen opacity-35" style={{
        backgroundImage: `
          linear-gradient(rgba(16,185,129,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16,185,129,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '42px 42px',
      }} />
      {/* Dotted digital grain */}
      <div className="absolute inset-0 overlay-holo-dots" />
    </div>
  );
};

export default SatelliteMapBackground;



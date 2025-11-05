import { useEffect, useMemo, useState } from "react";

type Target = { x: number; y: number };

export const SatelliteHUD = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const targets: Target[] = useMemo(() => [
    { x: 0.28, y: 0.38 },
    { x: 0.56, y: 0.46 },
    { x: 0.72, y: 0.62 },
  ], []);

  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail;
      if (d) setCoords({ lat: d.lat, lng: d.lng, zoom: d.zoom });
    };
    window.addEventListener("satellite:coords", handler as EventListener);
    return () => window.removeEventListener("satellite:coords", handler as EventListener);
  }, []);

  const format = (n: number) => n.toFixed(4);

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none mix-blend-screen">
      {/* Frame corners */}
      <div className="absolute top-6 left-6 h-10 w-10 border-t-2 border-l-2 border-emerald-400/60" />
      <div className="absolute top-6 right-6 h-10 w-10 border-t-2 border-r-2 border-emerald-400/60" />
      <div className="absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-emerald-400/60" />
      <div className="absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-emerald-400/60" />

      {/* Top data bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-emerald-500/10 to-transparent border-b border-emerald-500/20">
        <div className="flex items-center justify-between h-full px-6 text-emerald-300/80 font-mono text-[10px] tracking-widest">
          <div className="flex items-center gap-6">
            <span>CHANNEL A-12</span>
            <span>UAV-LINK: SECURE</span>
            <span>REC ●</span>
          </div>
          <div className="flex items-center gap-6">
            <span>COORD: {coords ? `${format(coords.lat)}, ${format(coords.lng)}` : "LIVE"}</span>
            <span>ZOOM: {coords ? coords.zoom.toFixed(1) : "--"}</span>
          </div>
        </div>
      </div>

      {/* Center reticle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-2 border-emerald-400/60" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-6 w-px bg-emerald-400/60" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-6 w-px bg-emerald-400/60" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-6 h-px bg-emerald-400/60" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-6 h-px bg-emerald-400/60" />
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-500/10 to-transparent border-t border-emerald-500/20">
        <div className="flex items-center justify-between h-full px-6 text-emerald-300/80 font-mono text-[10px] tracking-widest">
          <div className="flex items-center gap-4">
            <span>TARGETS: 03</span>
            <span>ZOOM: {coords ? coords.zoom.toFixed(1) : "--"}</span>
            <span>MODE: ISR</span>
          </div>
          <div className="flex items-center gap-4">
            <span>LAT/LNG: {coords ? `${format(coords.lat)}, ${format(coords.lng)}` : "LIVE"}</span>
            <span>AUTH: CONFIRMED</span>
          </div>
        </div>
      </div>

      {/* Targets */}
      {targets.map((t, i) => (
        <div key={i} className="absolute" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, transform: "translate(-50%,-50%)" }}>
          <div className="hud-target" />
        </div>
      ))}

      {/* Links between targets (simple straight segments) */}
      {(() => {
        const lines = [] as JSX.Element[];
        for (let i = 0; i < targets.length - 1; i++) {
          const a = targets[i];
          const b = targets[i + 1];
          const x1 = a.x * 100, y1 = a.y * 100;
          const x2 = b.x * 100, y2 = b.y * 100;
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx) * 180 / Math.PI;
          lines.push(
            <div key={`l${i}`} className="absolute" style={{ left: `${x1}%`, top: `${y1}%`, width: `${len}%`, height: 1, transform: `rotate(${ang}deg)`, transformOrigin: "0 0" }}>
              <div className="hud-link" />
            </div>
          );
        }
        return lines;
      })()}
    </div>
  );
};

export default SatelliteHUD;



import { useEffect, useState } from "react";

export const SatelliteHUD = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

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
    <div
      className="fixed inset-0 z-[5] pointer-events-none mix-blend-screen"
      style={{
        WebkitMaskImage: 'radial-gradient(circle 9rem at 12% 50%, transparent 99%, #000 100%)',
        maskImage: 'radial-gradient(circle 9rem at 12% 50%, transparent 99%, #000 100%)',
        WebkitMaskComposite: 'source-over',
        maskComposite: 'add'
      }}
    >
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

      {/* Center reticle removed per request */}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-500/10 to-transparent border-t border-emerald-500/20">
        <div className="flex items-center justify-between h-full px-6 text-emerald-300/80 font-mono text-[10px] tracking-widest">
          <div className="flex items-center gap-4">
            <span>ZOOM: {coords ? coords.zoom.toFixed(1) : "--"}</span>
            <span>MODE: ISR</span>
          </div>
          <div className="flex items-center gap-4">
            <span>LAT/LNG: {coords ? `${format(coords.lat)}, ${format(coords.lng)}` : "LIVE"}</span>
            <span>AUTH: CONFIRMED</span>
          </div>
        </div>
      </div>

      {/* Targets and link lines removed per request */}
    </div>
  );
};

export default SatelliteHUD;



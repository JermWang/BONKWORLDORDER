export const SatelliteFrame = () => {
  return (
    <div className="fixed inset-0 z-[4] pointer-events-none">
      {/* Rounded surveillance frame */}
      <div className="absolute inset-2 sm:inset-3 md:inset-4 lg:inset-6 rounded-3xl bg-black/45 border border-emerald-500/15 shadow-[inset_0_0_60px_rgba(0,0,0,0.7)]" />
      {/* Soft outer glow line */}
      <div className="absolute inset-2 sm:inset-3 md:inset-4 lg:inset-6 rounded-3xl ring-1 ring-emerald-500/10" />
    </div>
  );
};

export default SatelliteFrame;



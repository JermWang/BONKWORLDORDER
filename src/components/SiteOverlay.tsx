export const SiteOverlay = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9000]" aria-hidden>
      {/* Keep only subtle vignette globally to avoid interfering with hero GIF */}
      <div className="absolute inset-0 overlay-vignette" />
    </div>
  );
};

export default SiteOverlay;



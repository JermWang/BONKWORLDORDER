export const SiteOverlay = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9000]" aria-hidden>
      <div className="absolute inset-0 overlay-noise" />
      <div className="absolute inset-0 overlay-scanlines" />
      <div className="absolute inset-0 overlay-vignette" />
    </div>
  );
};

export default SiteOverlay;



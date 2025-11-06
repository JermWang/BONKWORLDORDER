import { useEffect, useRef } from "react";
import Sound from "@/lib/sound";

export const BackgroundAudio = () => {
  const startedRef = useRef(false);

  useEffect(() => {
    const start = async () => {
      if (startedRef.current) return;
      try {
        startedRef.current = true;
        await Sound.startTheme();
      } catch {
        // ignore autoplay errors; user may have blocked
        startedRef.current = false;
      }
    };

    // Try on first interaction to satisfy autoplay policies
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });

    return () => {
      window.removeEventListener("pointerdown", start as any);
      window.removeEventListener("keydown", start as any);
    };
  }, []);

  return null;
};

export default BackgroundAudio;



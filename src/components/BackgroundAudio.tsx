import { useEffect, useRef } from "react";
import { isMuted, onMuteChange } from "@/lib/mute";

export const BackgroundAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio("/sounds/bwo_theme.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    audio.muted = isMuted();

    const start = async () => {
      if (startedRef.current) return;
      try {
        startedRef.current = true;
        await audio.play();
      } catch {
        // ignore autoplay errors; user may have blocked
        startedRef.current = false;
      }
    };

    // Try on first interaction to satisfy autoplay policies
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });

    const off = onMuteChange((muted) => {
      if (audioRef.current) audioRef.current.muted = muted;
    });

    return () => {
      try { audio.pause(); } catch {}
      window.removeEventListener("pointerdown", start as any);
      window.removeEventListener("keydown", start as any);
      off();
    };
  }, []);

  return null;
};

export default BackgroundAudio;



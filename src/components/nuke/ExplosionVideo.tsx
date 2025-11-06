import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Sound from "@/lib/sound";
import { isMuted } from "@/lib/mute";

export type ExplosionVideoHandle = {
    trigger: () => void;
};

type ExplosionVideoProps = {
    videoSrc?: string; // path to explosion media (mp4/webm/gif)
    audioSrc?: string; // explosion sound
    postAudioSrc?: string; // optional stinger to play after explosion (e.g., BWO.wav)
    durationMs?: number; // only used for GIF fallback
    onComplete?: () => void;
};

export const ExplosionVideo = forwardRef<ExplosionVideoHandle, ExplosionVideoProps>(
    function ExplosionVideo({ videoSrc = "/explosion.gif", audioSrc = "/sounds/C4 Explosion FX.wav", postAudioSrc, durationMs = 3500, onComplete }, ref) {
        const videoRef = useRef<HTMLVideoElement>(null);
        const audioRef = useRef<HTMLAudioElement>(null);
        const postAudioRef = useRef<HTMLAudioElement>(null);
        const isPlayingRef = useRef(false);
        const [isPlaying, setIsPlaying] = useState(false);

        useImperativeHandle(ref, () => ({
            trigger: () => {
                if (isPlayingRef.current) return; // guard against double-trigger
                const isGif = videoSrc.toLowerCase().endsWith(".gif");
                setIsPlaying(true);
                isPlayingRef.current = true;
                // Play explosion audio via Sound manager
                const expPromise = Sound.playExplosion();
                if (isGif) {
                    // Auto-hide slightly BEFORE 1st loop completes to avoid showing the start of a 2nd loop
                    const effectiveDuration = Math.max(0, durationMs - 120);
                    // fade out audio in the last 600ms (gradual ramp)
                    const fadeStart = Math.max(0, effectiveDuration - 600);
                    let fadeInterval: number | null = null;
                    const fadeId = window.setTimeout(() => {
                        expPromise
                            .then((handle) => {
                                if (!handle) return;
                                const steps = 12;
                                const stepMs = Math.max(20, Math.floor(600 / steps));
                                let i = 0;
                                fadeInterval = window.setInterval(() => {
                                    i += 1;
                                    const vol = Math.max(0, 1 - i / steps);
                                    try { handle.setVolume(vol); } catch {}
                                    if (i >= steps && fadeInterval) {
                                        window.clearInterval(fadeInterval);
                                        fadeInterval = null;
                                    }
                                }, stepMs) as unknown as number;
                            })
                            .catch(() => {});
                    }, fadeStart);
                    // Play BWO.wav stinger slightly before GIF ends for smoother transition
                    const stingerDelay = Math.max(0, effectiveDuration - 400);
                    window.setTimeout(() => {
                        try {
                            if (postAudioSrc) {
                                // Prefer Sound manager; fallback to element if needed
                                Sound.playStinger();
                            }
                        } catch {}
                    }, stingerDelay);
                    
                    window.setTimeout(() => {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                        onComplete?.();
                        window.clearTimeout(fadeId);
                        if (fadeInterval) window.clearInterval(fadeInterval);
                    }, effectiveDuration);
                    return;
                }
                const vid = videoRef.current;
                if (!vid) return;
                vid.currentTime = 0;
                vid.play().catch(() => {
                    // Fallback if autoplay blocked
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                });
            },
        }));

        const handleEnded = () => {
            setIsPlaying(false);
            isPlayingRef.current = false;
            // Quick fade if still audible
            try {
                const el = audioRef.current;
                if (el && !el.paused) {
                    let vol = el.volume ?? 1;
                    const step = vol / 10;
                    const i = window.setInterval(() => {
                        vol = Math.max(0, vol - step);
                        el.volume = vol;
                        if (vol <= 0.02) {
                            el.pause();
                            window.clearInterval(i);
                        }
                    }, 40);
                }
            } catch {}
            onComplete?.();
        };

        if (!isPlaying) return null;

        const isGif = videoSrc.toLowerCase().endsWith(".gif");
        return (
            <div className="fixed inset-0 z-[9999] pointer-events-none">
                {/* Preloaded audio element */}
                {audioSrc ? (
                    <audio ref={audioRef} src={audioSrc} preload="auto" />
                ) : null}
                {postAudioSrc ? (
                    <audio ref={postAudioRef} src={postAudioSrc} preload="auto" />
                ) : null}
                {isGif ? (
                    <img
                        src={videoSrc}
                        alt="Explosion"
                        className="w-full h-full object-cover"
                        style={{ mixBlendMode: "screen" }}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        autoPlay
                        muted={false}
                        playsInline
                        onEnded={handleEnded}
                        className="w-full h-full object-cover"
                        style={{ mixBlendMode: "screen" }}
                    />
                )}
            </div>
        );
	}
);

export default ExplosionVideo;


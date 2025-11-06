import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
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
                // Play explosion audio
                try {
                    const el = audioRef.current;
                    if (el) {
                        el.currentTime = 0;
                        el.volume = 0.5; // lower volume
                        el.muted = isMuted();
                        el.play().catch(() => {});
                    } else if (audioSrc) {
                        const a = new Audio(audioSrc);
                        a.volume = 0.5; // lower volume
                        a.muted = isMuted();
                        a.play().catch(() => {});
                    }
                } catch {}
                if (isGif) {
                    // Auto-hide after duration for GIFs
                    // fade out audio in the last 600ms
                    const fadeStart = Math.max(0, durationMs - 600);
                    const fadeId = window.setTimeout(() => {
                        const el = audioRef.current;
                        if (!el) return;
                        let vol = el.volume ?? 1;
                        const step = vol / 12;
                        const i = window.setInterval(() => {
                            vol = Math.max(0, vol - step);
                            el.volume = vol;
                            if (vol <= 0.02) {
                                el.pause();
                                window.clearInterval(i);
                            }
                        }, 40);
                    }, fadeStart);
                    // Play BWO.wav stinger slightly before GIF ends for smoother transition
                    const stingerDelay = Math.max(0, durationMs - 400);
                    window.setTimeout(() => {
                        try {
                            if (postAudioSrc) {
                                const st = postAudioRef.current || new Audio(postAudioSrc);
                                if (!postAudioRef.current) postAudioRef.current = st as HTMLAudioElement;
                                st.currentTime = 0;
                                st.volume = 0.9;
                                st.muted = isMuted();
                                st.play().catch(() => {});
                            }
                        } catch {}
                    }, stingerDelay);
                    
                    window.setTimeout(() => {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                        onComplete?.();
                        window.clearTimeout(fadeId);
                    }, durationMs);
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


import React, { useCallback, useRef, useState } from "react";

type NukeButtonProps = {
	onFire?: (nextGlobalCount: number | null) => void;
  disabled?: boolean;
};

function playBeep() {
	try {
		const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = "square";
		o.frequency.value = 520;
		g.gain.value = 0.0001;
		o.connect(g);
		g.connect(ctx.destination);
		o.start();
		// quick down-sweep
		const now = ctx.currentTime;
		g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
		o.frequency.exponentialRampToValueAtTime(140, now + 0.18);
		g.gain.exponentialRampToValueAtTime(0.00001, now + 0.2);
		o.stop(now + 0.22);
	} catch {}
}

export const NukeButton: React.FC<NukeButtonProps> = ({ onFire, disabled }) => {
    const [cooldown, setCooldown] = useState(false);
    const [pressed, setPressed] = useState(false);
    const busyRef = useRef(false);
    const clickSrc = "/sounds/click-tap-computer-mouse.mp3";

    const playClick = useCallback(() => {
        try {
            const a = new Audio(clickSrc);
            a.volume = 0.9;
            a.play().catch(() => {});
        } catch {}
    }, []);

    const handleClick = useCallback(async () => {
        if (disabled || cooldown || busyRef.current) return;
        busyRef.current = true;
        if (!pressed) setPressed(true);
        setCooldown(true);
        try {
            onFire?.(null);
        } finally {
            // keep button visually pressed briefly, then release (tactile feedback only)
            setTimeout(() => setPressed(false), 160);
            // extend cooldown to cover full launch window (~3.5s)
            setTimeout(() => {
                setCooldown(false);
                busyRef.current = false;
            }, 3600);
        }
    }, [disabled, cooldown, onFire, pressed]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled || cooldown || busyRef.current) { e.preventDefault(); return; }
        setPressed(true);
        playClick();
    }, [disabled, cooldown, playClick]);

    const handlePointerUp = useCallback(() => {
        if (disabled) return;
        playClick();
    }, [disabled, playClick]);

	return (
		<button
            aria-pressed={pressed}
			aria-label="Launch Nuke"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
			disabled={disabled || cooldown}
			className="relative inline-flex items-center justify-center select-none transition-transform hover:scale-105 active:scale-98 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-70"
			style={{
				width: "120px",
				height: "120px",
				background: "transparent",
				border: "none",
				padding: 0,
			}}
		>
            <img
                src={pressed ? "/assets/button-pressed.png" : "/assets/button-unpressed.png"}
				alt=""
				draggable={false}
				className="w-full h-full object-contain pointer-events-none select-none"
				style={{
                    filter: cooldown ? "grayscale(0.1) brightness(0.95)" : "none",
                    transition: "filter 0.12s ease",
				}}
			/>
		</button>
	);
};

export default NukeButton;



import React, { useEffect, useState } from "react";

type NukeHUDProps = {
	isArmed: boolean;
	countdown: number | null; // seconds remaining, null = not counting
	globalStrikes: number;
	onCountdownComplete?: () => void;
};

export const NukeHUD: React.FC<NukeHUDProps> = ({
	isArmed,
	countdown,
	globalStrikes,
	onCountdownComplete,
}) => {
	const [flashRed, setFlashRed] = useState(false);

  // Tick sound per second: prefer external clip if present, else fallback
  function playTick(n: number) {
    const primaryWav = `/sounds/${n}.wav`;
    const specific = `/sounds/countdown-${n}.mp3`;
    const fallback = "/sounds/countdown-beep.mp3";
    const tryPlay = async (url: string) => {
      const a = new Audio(url);
      a.volume = 0.9;
      await a.play();
    };
    (async () => {
      try {
        // Prefer numbered WAVs provided by user
        await tryPlay(primaryWav);
      } catch {
        try {
          // Then try numbered mp3, then generic beep
          await tryPlay(specific);
        } catch {
          try {
            await tryPlay(fallback);
          } catch {
            // final synthetic fallback
            try {
              const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
              const ctx = new AudioCtx();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = "triangle";
              const base = 540;
              o.frequency.value = base + (3 - Math.max(0, n)) * 80;
              g.gain.value = 0.0001;
              o.connect(g); g.connect(ctx.destination);
              o.start();
              const now = ctx.currentTime;
              g.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
              o.frequency.exponentialRampToValueAtTime(o.frequency.value * 0.85, now + 0.12);
              g.gain.exponentialRampToValueAtTime(0.00001, now + 0.16);
              o.stop(now + 0.18);
            } catch {}
          }
        }
      }
    })();
  }

	useEffect(() => {
		if (countdown !== null && countdown <= 3 && countdown > 0) {
			setFlashRed(true);
			const t = setTimeout(() => setFlashRed(false), 300);
			return () => clearTimeout(t);
		}
	}, [countdown]);

	// Play tick sound when countdown updates (3..2..1)
	useEffect(() => {
		if (countdown !== null && countdown > 0 && countdown <= 3) {
			playTick(countdown);
		}
	}, [countdown]);

	useEffect(() => {
		if (countdown === 0) {
			onCountdownComplete?.();
		}
	}, [countdown, onCountdownComplete]);

	if (!isArmed && countdown === null) return null;

	return (
		<div className="fixed inset-0 pointer-events-none z-[9500] select-none">
			{/* Green flash overlay */}
			{flashRed && (
				<div
					className="absolute inset-0 animate-pulse"
					style={{ backgroundColor: "rgba(16,185,129,0.28)", mixBlendMode: "screen" }}
				/>
			)}

			{/* Top bar - System status */}
			<div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/80 to-transparent border-b border-emerald-600/30">
				<div className="flex items-center justify-between h-full px-6 font-mono text-xs">
					<div className="flex items-center gap-4">
						<span className="text-emerald-400 font-bold tracking-widest">ICBM LAUNCH CONTROL</span>
						<span className="text-emerald-300">
							{isArmed ? "⬤ ARMED" : "○ STANDBY"}
						</span>
					</div>
					<div className="flex items-center gap-6">
						<span className="text-emerald-300">NETWORK: ONLINE</span>
						<span className="text-emerald-200">
							GLOBAL STRIKES: <span className="font-bold text-lg">{globalStrikes.toLocaleString()}</span>
						</span>
					</div>
				</div>
			</div>

			{/* Center - Countdown display */}
			{countdown !== null && (
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<div className="relative flex items-center justify-center">
						<span className="absolute inset-0 countdown-grain" aria-hidden />
						<div
							className="font-mono font-bold leading-none select-none"
							style={{
								fontSize: "12rem",
								color: "#39FF14",
								textShadow: "0 0 30px rgba(57,255,20,1), 0 0 80px rgba(57,255,20,0.7), 0 0 140px rgba(57,255,20,0.5)",
								letterSpacing: "0.1em",
							}}
						>
							{countdown}
						</div>
					</div>
				</div>
			)}

			{/* Bottom bar - Warning text */}
			{countdown !== null && (
				<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent border-t border-emerald-600/30">
					<div className="flex items-center justify-center h-full font-mono text-sm">
						<div
							className="px-6 py-2 border-2 rounded tracking-widest font-bold animate-pulse"
							style={{
								borderColor: countdown <= 3 ? "rgb(163,230,53)" : "rgb(16,185,129)",
								color: countdown <= 3 ? "rgb(163,230,53)" : "rgb(110,231,183)",
								backgroundColor: "rgba(0, 0, 0, 0.6)",
							}}
						>
							⚠ STRATEGIC LAUNCH IMMINENT ⚠
						</div>
					</div>
				</div>
			)}

			{/* Side panels - Telemetry */}
			{countdown !== null && (
				<>
					<div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm border border-emerald-600/40 p-3 font-mono text-xs text-emerald-300 space-y-1">
						<div>TARGET: GLOBAL</div>
						<div>YIELD: 50MT</div>
						<div>STATUS: HOT</div>
						<div className="text-emerald-400">AUTH: CONFIRMED</div>
					</div>

					<div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm border border-emerald-600/40 p-3 font-mono text-xs text-emerald-300 space-y-1">
						<div>SYS: NOMINAL</div>
						<div>FUEL: 100%</div>
						<div>GUID: LOCKED</div>
						<div className="text-emerald-400">RDY: TRUE</div>
					</div>
				</>
			)}
		</div>
	);
};

export default NukeHUD;


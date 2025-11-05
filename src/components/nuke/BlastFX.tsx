import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type BlastFXHandle = {
	blast: () => void;
};

export const BlastFX = forwardRef<BlastFXHandle>(function BlastFX(_, ref) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [trigger, setTrigger] = useState(0);

	useImperativeHandle(ref, () => ({
		blast: () => setTrigger((t) => t + 1),
	}));

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf = 0;
		let running = true;
		const start = performance.now();
		const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

		const resize = () => {
			const { innerWidth: w, innerHeight: h } = window;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		const render = (ts: number) => {
			if (!running) return;
			const t = (ts - start) / 1000; // seconds
			ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

			// 0..1 normalized
			const dur = 1.6;
			const p = Math.min(1, t / dur);

			// Center
			const cx = canvas.clientWidth / 2;
			const cy = canvas.clientHeight * 0.55;

			// Shockwave ring
			const maxR = Math.hypot(canvas.clientWidth, canvas.clientHeight) * 0.6;
			const r = p * maxR;
			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			ctx.lineWidth = 3;
			ctx.strokeStyle = `hsla(120, 100%, 50%, ${0.25 * (1 - p)})`;
			ctx.shadowColor = `hsla(120, 100%, 50%, ${0.6 * (1 - p)})`;
			ctx.shadowBlur = 24 * (1 - p) + 24;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();

			// Bloom flash
			const bloom = Math.max(0, 1 - p * 1.5);
			if (bloom > 0) {
				const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.8);
				grd.addColorStop(0, `hsla(120, 100%, 50%, ${0.18 * bloom})`);
				grd.addColorStop(1, "transparent");
				ctx.fillStyle = grd;
				ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
			}

			if (p < 1) raf = requestAnimationFrame(render);
		};

		raf = requestAnimationFrame(render);

		// Briefly intensify overlays via root class
		document.documentElement.classList.add("bwo-blast");
		const rm = setTimeout(() => document.documentElement.classList.remove("bwo-blast"), 500);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			clearTimeout(rm);
		};
	}, [trigger]);

	return (
		<canvas
			ref={canvasRef}
			className="fixed inset-0 pointer-events-none z-[8500]"
			style={{ mixBlendMode: "screen" }}
		/>
	);
});

export default BlastFX;



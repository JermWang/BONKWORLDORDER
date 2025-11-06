import { useEffect, useRef } from 'react';

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }> = [];

    // Create particles (slightly increased density)
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 1,
        speedY: Math.random() * -1 - 0.5,
        speedX: Math.random() * 0.6 - 0.3,
        opacity: Math.random() * 0.5 + 0.25,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (pausedRef.current) {
        requestAnimationFrame(animate);
        return;
      }
      particles.forEach((particle) => {
        // Draw glowing particle
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 50;
        ctx.shadowColor = 'rgba(0, 255, 120, 0.75)';
        ctx.fillStyle = `rgba(0, 255, 120, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Update position
        particle.y += particle.speedY;
        particle.x += particle.speedX;

        // Reset if out of bounds
        if (particle.y < 0) {
          particle.y = canvas.height;
          particle.x = Math.random() * canvas.width;
        }
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    window.addEventListener('bwo:pause', pause as EventListener);
    window.addEventListener('bwo:resume', resume as EventListener);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('bwo:pause', pause as EventListener);
      window.removeEventListener('bwo:resume', resume as EventListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[2]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

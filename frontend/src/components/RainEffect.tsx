import { useEffect, useRef } from 'react';

interface RainEffectProps {
  intensity: number;
  active: boolean;
}

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
}

export default function RainEffect({ intensity, active }: RainEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<Drop[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dropCount = Math.floor(intensity * 400) + 20;

    const initDrops = () => {
      dropsRef.current = [];
      for (let i = 0; i < dropCount; i++) {
        dropsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          len: 10 + Math.random() * 20 + intensity * 15,
          speed: 8 + Math.random() * 12 + intensity * 10,
          opacity: 0.08 + Math.random() * 0.15 * intensity,
        });
      }
    };

    initDrops();

    const animate = () => {
      if (!active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const drop of dropsRef.current) {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1, drop.y + drop.len);
        ctx.strokeStyle = `rgba(174, 200, 255, ${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.5;

        if (drop.y > canvas.height) {
          drop.y = -drop.len;
          drop.x = Math.random() * canvas.width;
        }
        if (drop.x < 0) {
          drop.x = canvas.width;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, active]);

  return (
    <canvas
      ref={canvasRef}
      className="rain-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 5,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}

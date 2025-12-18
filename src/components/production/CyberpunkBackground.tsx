import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const CyberpunkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];

    const colors = ["#22d3ee", "#a855f7", "#f59e0b", "#10b981"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const drawCircuit = () => {
      ctx.strokeStyle = "rgba(34, 211, 238, 0.1)";
      ctx.lineWidth = 1;

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x += 100) {
          const offset = Math.sin((x + Date.now() * 0.001) * 0.02) * 10;
          ctx.lineTo(x, y + offset);
        }
        ctx.stroke();
      }

      // Vertical lines
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < canvas.height; y += 100) {
          const offset = Math.cos((y + Date.now() * 0.001) * 0.02) * 10;
          ctx.lineTo(x + offset, y);
        }
        ctx.stroke();
      }

      // Circuit nodes
      ctx.fillStyle = "rgba(34, 211, 238, 0.2)";
      for (let x = 40; x < canvas.width; x += 80) {
        for (let y = 25; y < canvas.height; y += 50) {
          const pulse = Math.sin(Date.now() * 0.003 + x * 0.01 + y * 0.01) * 0.5 + 0.5;
          ctx.globalAlpha = pulse * 0.3;
          ctx.beginPath();
          ctx.arc(x, y, 3 + pulse * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawParticles = () => {
      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle with glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.5 + Math.sin(Date.now() * 0.005 + p.x) * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    };

    const drawDataStreams = () => {
      const time = Date.now() * 0.001;
      
      // Flowing data streams
      for (let i = 0; i < 5; i++) {
        const y = (time * 50 + i * 200) % canvas.height;
        const gradient = ctx.createLinearGradient(0, y - 50, 0, y + 50);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, colors[i % colors.length] + "40");
        gradient.addColorStop(1, "transparent");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - 50, canvas.width, 100);
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawCircuit();
      drawDataStreams();
      drawParticles();
      
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

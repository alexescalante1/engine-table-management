"use client";

import { useEffect, useRef } from "react";
import { useIsMobile } from "@/views/admin/hooks";

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let mx = 0.5;
    let my = 0.5;
    let time = 0;

    // ── 3D Wave Grid config ──
    const COLS = isMobile ? 30 : 60;
    const ROWS = isMobile ? 25 : 50;
    const PERSPECTIVE = 400;
    const CAMERA_Y = -100;
    const SPREAD_X = 2800;
    const SPREAD_Z = 2400;
    const WAVE_H = 50;

    const grid: { x: number; y: number; a: number; s: number }[][] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = { x: 0, y: 0, a: 0, s: 0 };
      }
    }

    // ── Constellation Particles config ──
    const PARTICLE_COUNT = isMobile ? 40 : 120;
    const CONNECTION_DIST = isMobile ? 120 : 140;
    const MOUSE_RADIUS = 200;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }

    let particles: Particle[] = [];

    function initParticles(width: number, height: number) {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
      }));
    }

    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = canvas!.offsetWidth;
      h = canvas!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) initParticles(w, h);
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      time += 0.008;

      const mxN = (mx - 0.5) * 2;
      const myN = (my - 0.5) * 2;
      const mouseX = mx * w;
      const mouseY = my * h;

      // Layer 1: Constellation particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0.6) {
          p.vx = (p.vx / speed) * 0.6;
          p.vy = (p.vy / speed) * 0.6;
        }
      }

      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < CONNECTION_DIST * CONNECTION_DIST) {
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
          }
        }
      }
      ctx!.strokeStyle = "rgba(255,255,255,0.10)";
      ctx!.stroke();

      ctx!.beginPath();
      for (const p of particles) {
        if (p.size >= 2) continue;
        ctx!.moveTo(p.x + p.size, p.y);
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx!.fillStyle = "rgba(255,255,255,0.4)";
      ctx!.fill();

      ctx!.beginPath();
      for (const p of particles) {
        if (p.size < 2) continue;
        ctx!.moveTo(p.x + p.size, p.y);
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx!.fillStyle = "rgba(255,255,255,0.6)";
      ctx!.fill();

      ctx!.beginPath();
      for (const p of particles) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          ctx!.moveTo(mouseX, mouseY);
          ctx!.lineTo(p.x, p.y);
        }
      }
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.stroke();

      // Layer 2: 3D Wave Grid
      for (let r = 0; r < ROWS; r++) {
        const zRatio = r / (ROWS - 1);
        const z3d = zRatio * SPREAD_Z - 100;
        const zFull = z3d + PERSPECTIVE;
        if (zFull <= 0) continue;
        const scale = PERSPECTIVE / zFull;

        for (let c = 0; c < COLS; c++) {
          const xRatio = c / (COLS - 1) - 0.5;
          const x3d = xRatio * SPREAD_X;
          const dist = Math.sqrt(
            (xRatio - mxN * 0.3) ** 2 + (zRatio - 0.5 + myN * 0.2) ** 2
          );
          const y3d =
            Math.sin(time * 3 + c * 0.3 + r * 0.2) * WAVE_H * 0.6 +
            Math.cos(time * 2 + r * 0.4) * WAVE_H * 0.3 +
            Math.sin(dist * 8 - time * 4) * WAVE_H * 0.4;

          const p = grid[r][c];
          p.x = w / 2 + x3d * scale;
          p.y = h / 2 + (y3d + CAMERA_Y) * scale;
          p.a = Math.min(0.9, scale * 0.8);
          p.s = scale;
        }
      }

      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 1; c++) {
          const p = grid[r][c];
          const q = grid[r][c + 1];
          if (p.a < 0.01) continue;
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(q.x, q.y);
        }
      }
      ctx!.strokeStyle = "rgba(255,255,255,0.25)";
      ctx!.stroke();

      ctx!.beginPath();
      for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS; c++) {
          const p = grid[r][c];
          const q = grid[r + 1][c];
          if (p.a < 0.01) continue;
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(q.x, q.y);
        }
      }
      ctx!.strokeStyle = "rgba(255,255,255,0.15)";
      ctx!.stroke();

      const buckets = [0.3, 0.5, 0.7, 0.9];
      for (const maxA of buckets) {
        ctx!.beginPath();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const p = grid[r][c];
            if (p.a <= maxA - 0.2 || p.a > maxA) continue;
            const sz = Math.max(0.5, p.s * 2.2);
            ctx!.moveTo(p.x + sz, p.y);
            ctx!.arc(p.x, p.y, sz, 0, Math.PI * 2);
          }
        }
        ctx!.fillStyle = `rgba(255,255,255,${maxA})`;
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mx = (e.clientX - rect.left) / rect.width;
      my = (e.clientY - rect.top) / rect.height;
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "auto" }}
    />
  );
}

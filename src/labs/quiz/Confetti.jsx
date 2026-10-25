// Lightweight canvas confetti. Parent calls ref.current.burst(x, y, count) or ref.current.rain(count).
// The animation loop only runs while particles are alive.
import React, { useEffect, useImperativeHandle, useRef } from 'react';

const COLORS = ['#f472b6', '#22d3ee', '#fbbf24', '#4ade80', '#a78bfa', '#f87171', '#ffffff'];
const GRAVITY = 900;

export default function Confetti({ ref }) {
    const canvasRef = useRef(null);
    const sim = useRef({ parts: [], raf: 0, last: 0 });

    useImperativeHandle(ref, () => {
        const start = () => {
            const s = sim.current;
            const c = canvasRef.current;
            if (!c || s.raf) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            c.width = window.innerWidth * dpr;
            c.height = window.innerHeight * dpr;
            const ctx = c.getContext('2d');
            s.last = performance.now();
            const tick = (now) => {
                const dt = Math.min(0.05, (now - s.last) / 1000);
                s.last = now;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, c.width, c.height);
                const h = window.innerHeight;
                s.parts = s.parts.filter(p => p.y < h + 40 && (p.life -= dt) > 0);
                for (const p of s.parts) {
                    p.vx *= 1 - 1.2 * dt;
                    p.vy = p.vy * (1 - 1.2 * dt) + GRAVITY * dt * 0.6;
                    p.x += (p.vx + Math.sin(p.rot * 2) * 30) * dt;
                    p.y += p.vy * dt;
                    p.rot += p.vr * dt;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.scale(1, Math.cos(p.rot * 1.7));
                    ctx.globalAlpha = Math.min(1, p.life * 2);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
                if (s.parts.length) {
                    s.raf = requestAnimationFrame(tick);
                } else {
                    s.raf = 0;
                    ctx.clearRect(0, 0, c.width, c.height);
                }
            };
            s.raf = requestAnimationFrame(tick);
        };

        const add = (x, y, vx, vy) => {
            sim.current.parts.push({
                x, y, vx, vy,
                rot: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 12,
                w: 8 + Math.random() * 8,
                h: 5 + Math.random() * 6,
                color: COLORS[(Math.random() * COLORS.length) | 0],
                life: 2.5 + Math.random() * 2,
            });
        };

        return {
            burst(x, y, count = 70) {
                for (let i = 0; i < count; i++) {
                    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
                    const speed = 350 + Math.random() * 650;
                    add(x, y, Math.cos(a) * speed, Math.sin(a) * speed);
                }
                start();
            },
            rain(count = 220) {
                const w = window.innerWidth;
                for (let i = 0; i < count; i++) {
                    add(Math.random() * w, -20 - Math.random() * window.innerHeight * 0.6,
                        (Math.random() - 0.5) * 200, 100 + Math.random() * 200);
                }
                start();
            },
        };
    }, []);

    useEffect(() => {
        const s = sim.current;
        return () => cancelAnimationFrame(s.raf);
    }, []);

    return <canvas ref={canvasRef} className="quiz-confetti" aria-hidden="true" />;
}

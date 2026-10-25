// Procedural canvas textures (no image downloads, works offline).
import * as THREE from 'three';
import { ROOM } from './data';

function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
}

function toTexture(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

// Deterministic random so textures look the same every time
function rng(seed) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function speckle(ctx, w, h, n, colors, seed, size = 1.6) {
    const rand = rng(seed);
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(rand() * w, rand() * h, size, size);
    }
}

// One tile = 1 m x 1 m (use texture.repeat for the floor size)
export function makeFloorTexture() {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#2a3247';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, 1500, ['rgba(255,255,255,0.035)', 'rgba(0,0,0,0.08)'], 7);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.moveTo(0, 128); ctx.lineTo(256, 128);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    return toTexture(c, true);
}

// Back wall with a metre grid and a height ruler on both sides
export function makeWallTexture() {
    const ppm = 200;
    const W = ROOM.w * ppm;
    const H = ROOM.h * ppm;
    const [c, ctx] = makeCanvas(W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2b3550');
    grad.addColorStop(1, '#1d2438');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (let m = 0.5; m < Math.max(ROOM.w, ROOM.h); m += 0.5) {
        const major = Math.abs(m - Math.round(m)) < 1e-6;
        ctx.strokeStyle = major ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.05)';
        ctx.lineWidth = major ? 3 : 2;
        ctx.beginPath();
        if (m < ROOM.w) { ctx.moveTo(m * ppm, 0); ctx.lineTo(m * ppm, H); }
        if (m < ROOM.h) { ctx.moveTo(0, H - m * ppm); ctx.lineTo(W, H - m * ppm); }
        ctx.stroke();
    }

    // ruler: ticks every 10 cm, labels every metre
    ctx.strokeStyle = 'rgba(251,191,36,0.85)';
    ctx.fillStyle = 'rgba(251,191,36,0.95)';
    ctx.font = '600 44px Inter, "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    for (let k = 1; k < ROOM.h * 10; k++) {
        const y = H - k * ppm / 10;
        const len = k % 10 === 0 ? 56 : k % 5 === 0 ? 34 : 18;
        ctx.lineWidth = k % 10 === 0 ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(len, y);
        ctx.moveTo(W, y); ctx.lineTo(W - len, y);
        ctx.stroke();
        if (k % 10 === 0) {
            const label = `${k / 10} м`;
            ctx.textAlign = 'left';
            ctx.fillText(label, 68, y);
            ctx.textAlign = 'right';
            ctx.fillText(label, W - 68, y);
        }
    }
    return toTexture(c);
}

function sphereBase(color, seed, specks) {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 256);
    speckle(ctx, 512, 256, 6000, specks, seed);
    return [c, ctx];
}

function tennis() {
    const [c, ctx] = sphereBase('#cde03a', 3, ['rgba(255,255,220,0.25)', 'rgba(110,130,0,0.25)']);
    ctx.strokeStyle = '#f6f6ec';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let u = 0; u <= 512; u += 4) {
        const v = 128 + 72 * Math.sin((u / 512) * Math.PI * 4);
        if (u === 0) ctx.moveTo(u, v); else ctx.lineTo(u, v);
    }
    ctx.stroke();
    return c;
}

function basketball() {
    const [c, ctx] = sphereBase('#d2622a', 5, ['rgba(0,0,0,0.18)', 'rgba(255,190,140,0.15)']);
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 128); ctx.lineTo(512, 128);
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.moveTo(384, 0); ctx.lineTo(384, 256);
    ctx.stroke();
    for (const [cx, dir] of [[0, 1], [512, -1], [256, -1], [256, 1]]) {
        ctx.beginPath();
        for (let v = 0; v <= 256; v += 4) {
            const u = cx + dir * 62 * Math.sin((v / 256) * Math.PI);
            if (v === 0) ctx.moveTo(u, v); else ctx.lineTo(u, v);
        }
        ctx.stroke();
    }
    return c;
}

function bowling() {
    const [c, ctx] = makeCanvas(512, 256);
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#2a1d82');
    grad.addColorStop(1, '#16114a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    const rand = rng(11);
    const colors = ['#7a55ff', '#2a9dff', '#0b0830', '#c25cff'];
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.18 + rand() * 0.2;
        ctx.lineWidth = 3 + rand() * 16;
        const x = rand() * 512;
        const y = rand() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + rand() * 160 - 80, y + rand() * 80 - 40, x + rand() * 160 - 80, y + rand() * 80 - 40,
            x + rand() * 200 - 100, y + rand() * 60 - 30);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // finger holes
    for (const [x, y] of [[236, 104], [276, 104], [256, 146]]) {
        ctx.fillStyle = '#05040f';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,190,255,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    return c;
}

export function makeBallTexture(id) {
    const c = id === 'tennis' ? tennis() : id === 'basketball' ? basketball() : bowling();
    return toTexture(c);
}

export function makeCrateTexture() {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#b07a43';
    ctx.fillRect(0, 0, 256, 256);
    const rand = rng(17);
    for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(90,55,25,0.25)' : 'rgba(240,200,150,0.18)';
        ctx.lineWidth = 1 + rand() * 1.5;
        const y = rand() * 256;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + rand() * 6 - 3, 170, y + rand() * 6 - 3, 256, y + rand() * 4 - 2);
        ctx.stroke();
    }
    ctx.strokeStyle = '#5a3a1c';
    ctx.lineWidth = 4;
    for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(0, k * 64); ctx.lineTo(256, k * 64);
        ctx.stroke();
    }
    // frame and diagonal brace
    ctx.fillStyle = '#7d5128';
    ctx.fillRect(0, 0, 256, 26); ctx.fillRect(0, 230, 256, 26);
    ctx.fillRect(0, 0, 26, 256); ctx.fillRect(230, 0, 26, 256);
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-160, -13, 320, 26);
    ctx.restore();
    ctx.strokeStyle = '#4a2f15';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, 204, 204);
    ctx.strokeRect(1.5, 1.5, 253, 253);
    return toTexture(c);
}

export function makeFeatherTexture() {
    const [c, ctx] = makeCanvas(512, 128);
    const mid = 64;
    ctx.lineCap = 'round';
    for (let x = 40; x < 494; x += 2.5) {
        const t = (x - 40) / 454;
        const len = 54 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.55);
        const lean = 22 * (0.4 + t);
        const shade = 225 + Math.round(30 * Math.sin(x * 0.7));
        ctx.strokeStyle = `rgba(${shade},${shade},${Math.min(255, shade + 12)},0.92)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, mid);
        ctx.quadraticCurveTo(x + lean * 0.4, mid - len * 0.6, x + lean, mid - len);
        ctx.moveTo(x, mid);
        ctx.quadraticCurveTo(x + lean * 0.4, mid + len * 0.6, x + lean, mid + len * 0.92);
        ctx.stroke();
    }
    // downy base
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(30 + i * 4, mid + Math.sin(i) * 14, 9, 0, Math.PI * 2);
        ctx.fill();
    }
    // shaft (rachis)
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, mid + 2);
    ctx.quadraticCurveTo(260, mid - 3, 506, mid);
    ctx.stroke();
    return toTexture(c);
}

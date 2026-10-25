// Offline texture loading for the solar system. Every texture starts as a procedural canvas (so the scene
// renders instantly and never breaks) and is swapped for the real image from /public/textures when it loads.
// Images: Solar System Scope (https://www.solarsystemscope.com/textures/), CC BY 4.0.
import * as THREE from 'three';

const BASE = `${import.meta.env.BASE_URL}textures/`;
const cache = new Map();

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

// Fallback painters (used until/unless the real image loads)
function paintRocky(base, spots, seed) {
    const c = canvas(512, 256);
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 256);
    const r = rng(seed);
    for (let i = 0; i < 260; i++) {
        g.globalAlpha = 0.08 + r() * 0.18;
        g.fillStyle = spots[i % spots.length];
        g.beginPath();
        g.arc(r() * 512, r() * 256, 2 + r() * 22, 0, Math.PI * 2);
        g.fill();
    }
    return c;
}

function paintBands(colors, seed) {
    const c = canvas(512, 256);
    const g = c.getContext('2d');
    const r = rng(seed);
    for (let y = 0; y < 256; y++) {
        const band = Math.floor((y / 256) * colors.length * 2 + Math.sin(y * 0.21) * 0.8);
        g.fillStyle = colors[Math.abs(band) % colors.length];
        g.fillRect(0, y, 512, 1);
    }
    for (let i = 0; i < 120; i++) {
        g.globalAlpha = 0.06 + r() * 0.08;
        g.fillStyle = colors[i % colors.length];
        g.fillRect(r() * 512, r() * 256, 20 + r() * 80, 1 + r() * 3);
    }
    return c;
}

function paintRing() {
    const c = canvas(512, 8);
    const g = c.getContext('2d');
    const r = rng(7);
    for (let x = 0; x < 512; x++) {
        const t = x / 512;
        const gap = t > 0.64 && t < 0.69;
        const a = gap ? 0.05 : t < 0.38 ? 0.25 + r() * 0.15 : 0.6 + r() * 0.3;
        g.fillStyle = `rgba(${200 + r() * 30},${185 + r() * 25},${150 + r() * 25},${a})`;
        g.fillRect(x, 0, 1, 8);
    }
    return c;
}

function paintBlack() {
    const c = canvas(4, 4);
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 4, 4);
    return c;
}

const FALLBACKS = {
    'sun.jpg': () => paintRocky('#ff9b2f', ['#ffd060', '#e8641c', '#fff0a0'], 1),
    'mercury.jpg': () => paintRocky('#8f8a84', ['#5f5b57', '#b5b0aa'], 2),
    'venus.jpg': () => paintBands(['#e8c48a', '#d9b077', '#f0d6a4'], 3),
    'earth.jpg': () => paintRocky('#1f4f9a', ['#3f7a3a', '#c9b47a', '#2d6a2f'], 4),
    'moon.jpg': () => paintRocky('#9a9a9a', ['#6e6e6e', '#c4c4c4'], 5),
    'mars.jpg': () => paintRocky('#b5532f', ['#7d3520', '#d98b5f'], 6),
    'jupiter.jpg': () => paintBands(['#d8b48a', '#a8774f', '#efe0c4', '#c49a6c'], 7),
    'saturn.jpg': () => paintBands(['#e3cc8f', '#cdb27a', '#f0e2b6'], 8),
    'uranus.jpg': () => paintBands(['#9fd8e0', '#a8e0e6'], 9),
    'neptune.jpg': () => paintBands(['#3f63d8', '#4f7bff', '#3a59c4'], 10),
    'saturn_ring.png': paintRing,
    'earth_clouds.jpg': paintBlack,
    'stars.jpg': paintBlack,
};

/** Returns a (cached) texture that shows a procedural fallback until the real image has loaded. */
export function getTexture(file, { color = true } = {}) {
    if (cache.has(file)) return cache.get(file);
    const tex = new THREE.CanvasTexture((FALLBACKS[file] ?? paintBlack)());
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    new THREE.ImageLoader().load(
        BASE + file,
        img => {
            // The fallback may already be uploaded with another size; dispose so the GPU storage is re-created
            tex.dispose();
            tex.image = img;
            tex.needsUpdate = true;
        },
        undefined,
        () => console.warn(`[cosmos] texture ${file} failed to load, using procedural fallback`),
    );
    cache.set(file, tex);
    return tex;
}

export function textureUrl(file) {
    return BASE + file;
}

// Soft radial glow for the Sun (additive sprite)
export function getGlowTexture() {
    if (cache.has('__glow')) return cache.get('__glow');
    const c = canvas(256, 256);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,250,235,1)');
    grad.addColorStop(0.12, 'rgba(255,230,170,0.85)');
    grad.addColorStop(0.3, 'rgba(255,170,80,0.35)');
    grad.addColorStop(0.6, 'rgba(255,120,40,0.08)');
    grad.addColorStop(1, 'rgba(255,100,30,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set('__glow', tex);
    return tex;
}

// Thin ring used to highlight a hovered body
export function getHaloTexture() {
    if (cache.has('__halo')) return cache.get('__halo');
    const c = canvas(256, 256);
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 9;
    g.beginPath();
    g.arc(128, 128, 112, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 22;
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    cache.set('__halo', tex);
    return tex;
}

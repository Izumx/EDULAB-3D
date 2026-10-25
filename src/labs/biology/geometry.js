// Procedural geometry and seeded layouts for the cell models. Everything is deterministic (no Math.random).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './pick';
import { inCut, insideShape } from './layouts';

const v = new THREE.Vector3();

// Cell body: sphere (animal) or rounded box (plant). inset > 0 shrinks it, < 0 grows it.
export function shapeGeometry(shape, inset = 0) {
    if (shape.kind === 'sphere') return new THREE.SphereGeometry(shape.r - inset, 72, 48);
    const r = Math.max(0.05, shape.r - inset);
    return new RoundedBoxGeometry(2 * (shape.a - inset), 2 * (shape.b - inset), 2 * (shape.c - inset), 5, r);
}

// Half of a rounded-rectangle outline from (0,-q) through the u > 0 side to (0,q). Circle when p = q = r.
function roundedHalf(p, q, r, n = 16) {
    const raw = [[0, -q]];
    for (let i = 0; i <= n; i++) {
        const t = -Math.PI / 2 + (i / n) * (Math.PI / 2);
        raw.push([p - r + r * Math.cos(t), -q + r + r * Math.sin(t)]);
    }
    for (let i = 0; i <= n; i++) {
        const t = (i / n) * (Math.PI / 2);
        raw.push([p - r + r * Math.cos(t), q - r + r * Math.sin(t)]);
    }
    raw.push([0, q]);
    // drop duplicates and densify straight edges so the spline stays on the outline
    const pts = [];
    for (const pt of raw) {
        const last = pts[pts.length - 1];
        if (last) {
            const d = Math.hypot(pt[0] - last[0], pt[1] - last[1]);
            if (d < 1e-4) continue;
            const steps = Math.floor(d / 0.25);
            for (let s = 1; s < steps; s++) {
                pts.push([last[0] + ((pt[0] - last[0]) * s) / steps, last[1] + ((pt[1] - last[1]) * s) / steps]);
            }
        }
        pts.push(pt);
    }
    return pts;
}

// Tubes along the two cut edges of a shell (plane x = 0 for z > 0, plane z = 0 for x > 0)
export function cutRimGeometries(shape, inset, radius) {
    const a = shape.a - inset, b = shape.b - inset, c = shape.c - inset;
    const r = Math.max(0.05, shape.r - inset);
    const left = roundedHalf(c, b, Math.min(r, c, b)).map(([u, w]) => new THREE.Vector3(0, w, u));
    const right = roundedHalf(a, b, Math.min(r, a, b)).map(([u, w]) => new THREE.Vector3(u, w, 0));
    return [left, right].map(pts =>
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 160, radius, 10, false));
}

// Concentric, slightly wavy sheets of rough ER around the nucleus
export function rerGeometry(cfg) {
    const geos = [];
    for (const band of cfg.bands) {
        for (const r of cfg.radii) {
            const g = new THREE.SphereGeometry(r, 72, 30, band.phi[0], band.phi[1] - band.phi[0], band.theta[0], band.theta[1] - band.theta[0]);
            const pos = g.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i);
                const len = v.length();
                const d = 0.05 * Math.sin(v.x * 5.3 + v.y * 3.1) * Math.cos(v.z * 4.7 - v.y * 2.3);
                v.multiplyScalar((len + d) / len);
                pos.setXYZ(i, v.x, v.y, v.z);
            }
            g.computeVertexNormals();
            geos.push(g);
        }
    }
    const merged = mergeGeometries(geos);
    merged.translate(...cfg.center);
    return merged;
}

const sphereDir = (phi, theta) => new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));

// Random walk tubes: smooth ER network, chromatin threads
function walkTubes(rng, { center, extent, count, steps, step, radius, bound }) {
    const geos = [];
    for (let t = 0; t < count; t++) {
        const p = new THREE.Vector3((rng() - 0.5) * 2 * extent, (rng() - 0.5) * 2 * extent, (rng() - 0.5) * 2 * extent);
        const dir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
        const pts = [p.clone()];
        for (let s = 0; s < steps; s++) {
            dir.add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(1.1)).normalize();
            p.addScaledVector(dir, step);
            if (p.length() > bound) {
                // steer back toward the middle
                dir.addScaledVector(p.clone().normalize(), -1.5).normalize();
                p.setLength(bound);
            }
            pts.push(p.clone());
        }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps * 10, radius, 8, false);
        geos.push(g);
    }
    const merged = mergeGeometries(geos);
    merged.translate(...center);
    return merged;
}

export function serGeometry(cfg, seed = 7) {
    return walkTubes(mulberry32(seed), {
        center: cfg.center, extent: cfg.extent, count: cfg.tubes, steps: 6, step: 0.3, radius: 0.065, bound: cfg.extent * 1.25,
    });
}

export function chromatinGeometry(r, seed = 11) {
    return walkTubes(mulberry32(seed), {
        center: [0, 0, 0], extent: r * 0.45, count: 6, steps: 9, step: r * 0.22, radius: 0.026, bound: r * 0.78,
    });
}

// One Golgi cisterna: a flat disc with swollen rims, bent into a shallow bowl
export function cisternaGeometry(radius, bend = 0.4) {
    const t = 0.035, rb = 0.06;
    const profile = [new THREE.Vector2(0.001, t), new THREE.Vector2(radius - rb * 1.4, t)];
    for (let i = 0; i <= 10; i++) {
        const a = Math.PI / 2 - (i / 10) * Math.PI;
        profile.push(new THREE.Vector2(radius - rb + rb * Math.cos(a), rb * Math.sin(a)));
    }
    profile.push(new THREE.Vector2(radius - rb * 1.4, -t), new THREE.Vector2(0.001, -t));
    const g = new THREE.LatheGeometry(profile, 48);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, pos.getY(i) + bend * (x * x + z * z));
    }
    g.computeVertexNormals();
    return g;
}

// Folds of the inner mitochondrial membrane, attached alternately to opposite sides
export function cristaeGeometry(count = 6, span = 0.84) {
    const geos = [];
    for (let j = 0; j < count; j++) {
        const g = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20);
        g.scale(1, 1, 1.3);
        g.translate(j % 2 ? 0.07 : -0.07, -span / 2 + (j * span) / (count - 1), 0);
        geos.push(g);
    }
    return mergeGeometries(geos);
}

// Thylakoid stacks (grana) inside one chloroplast, in its local frame (long axis x, thin axis y)
export function granaGeometry() {
    const geos = [];
    [-0.3, -0.1, 0.1, 0.3].forEach((x, i) => {
        const z = i % 2 ? -0.08 : 0.08;
        for (let k = 0; k < 5; k++) {
            const g = new THREE.CylinderGeometry(0.075, 0.075, 0.022, 16);
            g.translate(x, -0.06 + k * 0.03, z);
            geos.push(g);
        }
    });
    return mergeGeometries(geos);
}

export function lamellaeGeometry() {
    const geos = [];
    [[-0.2, 0], [0, 0], [0.2, 0]].forEach(([x], i) => {
        const g = new THREE.BoxGeometry(0.24, 0.012, 0.05);
        g.rotateY(i % 2 ? 0.6 : -0.6);
        g.translate(x, i === 1 ? 0.015 : -0.015, 0);
        geos.push(g);
    });
    return mergeGeometries(geos);
}

// Matrices for the 2 x 9 triplets of microtubules of the cell centre
export function centrioleMatrices() {
    const out = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    [[-0.2, 0, 0, false], [0.2, 0.05, 0, true]].forEach(([ox, oy, oz, rotated]) => {
        for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            for (let j = 0; j < 3; j++) {
                const p = new THREE.Vector3(Math.cos(a) * 0.1 + Math.cos(a + 1) * j * 0.034, 0, Math.sin(a) * 0.1 + Math.sin(a + 1) * j * 0.034);
                if (rotated) p.applyQuaternion(turn);
                p.add(new THREE.Vector3(ox, oy, oz));
                q.copy(rotated ? turn : new THREE.Quaternion());
                out.push(m.clone().compose(p, q, s));
            }
        }
    });
    return out;
}

// Seeded positions: free ribosomes, ribosomes on the rough ER, cytoplasm particles
export function buildScatter(L) {
    const rng = mulberry32(L.type === 'plant' ? 2024 : 1953);
    const nuc = new THREE.Vector3(...L.nucleus.p);
    const vac = L.vacuole;
    const free = (x, y, z, margin) => {
        if (!insideShape(L.shape, x, y, z, margin) || inCut(x, z)) return false;
        if (v.set(x, y, z).distanceTo(nuc) < L.nucleus.r + 0.15) return false;
        if (vac) {
            const dx = (x - vac.p[0]) / (vac.s[0] + 0.1), dy = (y - vac.p[1]) / (vac.s[1] + 0.1), dz = (z - vac.p[2]) / (vac.s[2] + 0.1);
            if (dx * dx + dy * dy + dz * dz < 1) return false;
        }
        return true;
    };
    const sample = (count, margin) => {
        const out = [];
        const { a, b, c } = L.shape;
        for (let tries = 0; out.length < count && tries < count * 60; tries++) {
            const x = (rng() * 2 - 1) * a, y = (rng() * 2 - 1) * b, z = (rng() * 2 - 1) * c;
            if (free(x, y, z, margin)) out.push([x, y, z]);
        }
        return out;
    };

    const ribosomes = sample(L.ribosomes, 0.25);
    const particles = new Float32Array(sample(L.particles, 0.12).flat());

    const bound = [];
    const center = new THREE.Vector3(...L.rer.center);
    for (let tries = 0; bound.length < L.rer.ribosomes && tries < L.rer.ribosomes * 20; tries++) {
        const band = L.rer.bands[Math.floor(rng() * L.rer.bands.length)];
        const r = L.rer.radii[Math.floor(rng() * L.rer.radii.length)];
        const phi = band.phi[0] + rng() * (band.phi[1] - band.phi[0]);
        const theta = band.theta[0] + 0.05 + rng() * (band.theta[1] - band.theta[0] - 0.1);
        const p = sphereDir(phi, theta).multiplyScalar(r + (rng() < 0.5 ? -0.07 : 0.07)).add(center);
        if (!inCut(p.x, p.z)) bound.push([p.x, p.y, p.z]);
    }
    return { ribosomes, bound, particles };
}

// Golgi transport vesicles around the stack (local frame of the stack, axis +y)
export function golgiVesicles(seed = 5) {
    const rng = mulberry32(seed);
    const out = [];
    for (let i = 0; i < 10; i++) {
        const a = rng() * Math.PI * 2;
        const top = i < 6;
        const rad = top ? 0.2 + rng() * 0.5 : 0.85 + rng() * 0.15;
        const y = top ? 0.75 + rng() * 0.35 : 0.2 + rng() * 0.3;
        out.push({ p: [Math.cos(a) * rad, y, Math.sin(a) * rad], r: 0.06 + rng() * 0.04 });
    }
    return out;
}

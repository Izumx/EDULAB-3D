// Polyhedron toolkit: convex hull faces, counts, area and volume, and the nets (развёртки) of polyhedra.
// Pure math on plain arrays and THREE vectors; imports the bare 'three' package, so it also runs in Node for the checks.
import * as THREE from 'three';

const EPS = 1e-6;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);

export function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Faces of the convex hull: every set of coplanar vertices with all other vertices on one side.
// Each face is a list of vertex indices in counter-clockwise order seen from outside.
export function hullFaces(verts) {
    const n = verts.length;
    const center = verts.reduce((s, v) => [s[0] + v[0] / n, s[1] + v[1] / n, s[2] + v[2] / n], [0, 0, 0]);
    const seen = new Set();
    const faces = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                const nrm = cross(sub(verts[j], verts[i]), sub(verts[k], verts[i]));
                const l = len(nrm);
                if (l < EPS) continue;
                const u = [nrm[0] / l, nrm[1] / l, nrm[2] / l];
                let pos = 0;
                let neg = 0;
                const onPlane = [];
                for (let m = 0; m < n; m++) {
                    const d = dot(u, sub(verts[m], verts[i]));
                    if (Math.abs(d) < 1e-5) onPlane.push(m);
                    else if (d > 0) pos++;
                    else neg++;
                }
                if (pos && neg) continue; // not a hull plane
                const key = onPlane.join(',');
                if (seen.has(key)) continue;
                seen.add(key);
                // outward normal points away from the centre
                const out = dot(u, sub(verts[i], center)) > 0 ? u : [-u[0], -u[1], -u[2]];
                // order around the face centre, counter-clockwise seen from outside
                const fc = onPlane.reduce((s, m) => [s[0] + verts[m][0] / onPlane.length, s[1] + verts[m][1] / onPlane.length, s[2] + verts[m][2] / onPlane.length], [0, 0, 0]);
                const ref = sub(verts[onPlane[0]], fc);
                const side = cross(out, ref);
                const ang = m => {
                    const d = sub(verts[m], fc);
                    return Math.atan2(dot(d, side), dot(d, ref));
                };
                onPlane.sort((p, q) => ang(p) - ang(q));
                faces.push(onPlane);
            }
        }
    }
    return faces;
}

export function faceNormal(verts, face) {
    // Newell's method, robust for any planar polygon
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < face.length; i++) {
        const a = verts[face[i]];
        const b = verts[face[(i + 1) % face.length]];
        nx += (a[1] - b[1]) * (a[2] + b[2]);
        ny += (a[2] - b[2]) * (a[0] + b[0]);
        nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l, l / 2]; // unit normal and the polygon area
}

export const faceArea = (verts, face) => faceNormal(verts, face)[3];

export function polyStats(verts, faces) {
    const edges = new Set();
    for (const f of faces) {
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
        }
    }
    let area = 0;
    let volume = 0;
    for (const f of faces) {
        area += faceArea(verts, f);
        // divergence theorem: sum of signed tetrahedra from the origin over a triangle fan
        for (let i = 1; i < f.length - 1; i++) {
            const a = verts[f[0]], b = verts[f[i]], c = verts[f[i + 1]];
            volume += dot(a, cross(b, c)) / 6;
        }
    }
    return { V: verts.length, E: edges.size, F: faces.length, area, volume: Math.abs(volume) };
}

// Turns the polyhedron so that its largest face lies at the bottom, and centres it on its centroid
export function standOnLargestFace(verts, faces) {
    let best = 0;
    let bestArea = -1;
    faces.forEach((f, i) => {
        const a = faceArea(verts, f);
        if (a > bestArea + 1e-9) { bestArea = a; best = i; }
    });
    const nrm = faceNormal(verts, faces[best]);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(nrm[0], nrm[1], nrm[2]), new THREE.Vector3(0, -1, 0));
    const turned = verts.map(v => new THREE.Vector3(...v).applyQuaternion(q));
    const c = turned.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / turned.length);
    return { verts: turned.map(v => v.sub(c).toArray()), root: best };
}

// ------------------------------------------------------------------ nets

const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);

// A spanning tree of the face-adjacency graph. Each non-root face keeps the hinge (edge) to its parent.
function randomTree(verts, faces, root, rnd) {
    const owner = new Map();
    faces.forEach((f, fi) => {
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            owner.set(`${a}>${b}`, fi);
        }
    });
    const parent = new Array(faces.length).fill(-1);
    const hinge = new Array(faces.length).fill(null);
    const order = [root];
    const inTree = new Set([root]);
    let frontier = [];
    const addFrontier = fi => {
        const f = faces[fi];
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            const other = owner.get(`${b}>${a}`);
            if (other !== undefined && !inTree.has(other)) frontier.push({ from: fi, to: other, a, b });
        }
    };
    addFrontier(root);
    while (frontier.length) {
        const pick = Math.floor(rnd() * frontier.length);
        const e = frontier[pick];
        frontier.splice(pick, 1);
        if (inTree.has(e.to)) continue;
        inTree.add(e.to);
        parent[e.to] = e.from;
        hinge[e.to] = { a: e.a, b: e.b };
        order.push(e.to);
        addFrontier(e.to);
        frontier = frontier.filter(x => !inTree.has(x.to));
    }
    return { parent, hinge, order, root };
}

// Fixed per-face data for folding: rotation axis (a point on the hinge and a direction) and the angle that lays the
// face flat into the plane of its parent
function hingeData(verts, faces, tree) {
    return tree.order.map(fi => {
        if (fi === tree.root) return null;
        const h = tree.hinge[fi];
        const a = V3(verts[h.a]);
        const axis = V3(verts[h.b]).sub(a).normalize();
        const nc = V3(faceNormal(verts, faces[fi]));
        const np = V3(faceNormal(verts, faces[tree.parent[fi]]));
        const angle = Math.atan2(axis.dot(new THREE.Vector3().crossVectors(nc, np)), nc.dot(np));
        return { a, axis, angle };
    });
}

/**
 * Matrices that move every face from the folded polyhedron (f = 1) to the flat net (f = 0).
 * M_face = M_parent · rotation about the hinge by angle · (1 − f), all hinges described in the folded pose.
 */
export function foldMatrices(net, f, out) {
    const { tree, hinges } = net;
    const R = new THREE.Matrix4();
    const T1 = new THREE.Matrix4();
    const T2 = new THREE.Matrix4();
    tree.order.forEach((fi, k) => {
        const m = out[fi] ?? (out[fi] = new THREE.Matrix4());
        if (fi === tree.root) {
            m.identity();
            return;
        }
        const h = hinges[k];
        R.makeRotationAxis(h.axis, h.angle * (1 - f));
        T1.makeTranslation(h.a.x, h.a.y, h.a.z);
        T2.makeTranslation(-h.a.x, -h.a.y, -h.a.z);
        m.copy(out[tree.parent[fi]]).multiply(T1).multiply(R).multiply(T2);
    });
    return out;
}

// Flat net vertices (all faces at f = 0) projected onto the plane of the root face: [[x, z], ...] per face
function flatPolygons(verts, faces, net) {
    const mats = foldMatrices(net, 0, []);
    return faces.map((f, fi) => f.map(vi => {
        const p = V3(verts[vi]).applyMatrix4(mats[fi]);
        return [p.x, p.z];
    }));
}

function convexOverlap(p, q) {
    // separating axis test with a small tolerance, so faces that only share an edge do not count
    for (const poly of [p, q]) {
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const nx = b[1] - a[1];
            const ny = a[0] - b[0];
            const l = Math.hypot(nx, ny) || 1;
            let min1 = Infinity, max1 = -Infinity, min2 = Infinity, max2 = -Infinity;
            for (const v of p) { const d = (v[0] * nx + v[1] * ny) / l; min1 = Math.min(min1, d); max1 = Math.max(max1, d); }
            for (const v of q) { const d = (v[0] * nx + v[1] * ny) / l; min2 = Math.min(min2, d); max2 = Math.max(max2, d); }
            if (max1 <= min2 + 1e-4 || max2 <= min1 + 1e-4) return false;
        }
    }
    return true;
}

export function netOverlaps(verts, faces, net) {
    const polys = flatPolygons(verts, faces, net);
    for (let i = 0; i < polys.length; i++) {
        for (let j = i + 1; j < polys.length; j++) if (convexOverlap(polys[i], polys[j])) return true;
    }
    return false;
}

export function buildNet(verts, faces, root, seed) {
    const tree = randomTree(verts, faces, root, mulberry(seed));
    return { tree, hinges: hingeData(verts, faces, tree), seed };
}

// Bounding box of the flat net on the floor plane: { cx, cz, w, d }
export function netBounds(verts, faces, net) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const poly of flatPolygons(verts, faces, net)) {
        for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    }
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}

/**
 * A valid (non-overlapping) net. `preferSeed` is tried first so the net stays the same while a slider moves;
 * otherwise the most compact of many random nets is taken.
 */
export function findNet(verts, faces, root, preferSeed = null) {
    if (preferSeed !== null) {
        const net = buildNet(verts, faces, root, preferSeed);
        if (!netOverlaps(verts, faces, net)) return net;
    }
    let best = null;
    let bestScore = Infinity;
    for (let seed = 1; seed <= 400 && (best === null || seed <= 150); seed++) {
        const net = buildNet(verts, faces, root, seed);
        if (netOverlaps(verts, faces, net)) continue;
        const b = netBounds(verts, faces, net);
        const score = Math.max(b.w, b.d) * 1000 + b.w * b.d;
        if (score < bestScore) { bestScore = score; best = net; }
    }
    return best;
}

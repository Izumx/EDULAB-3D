// Checks the geometry behind the math lab: for every polyhedron the formulas for the volume and the surface area match
// the mesh, Euler's formula holds, and the net does not overlap itself and folds back exactly.
// Run: node scripts/check-math.mjs
import * as THREE from 'three';
import { SOLIDS, buildPolyhedron, defaults } from '../src/labs/math/solids.js';
import { foldMatrices } from '../src/labs/math/geom.js';
import { VIEW_CHECKS } from '../src/labs/math/voxels.js';

let problems = 0;
const fail = msg => {
    problems++;
    console.error('✗', msg);
};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

for (const solid of SOLIDS.filter(s => !s.round)) {
    // the default sizes plus the corners of every slider
    const sizes = [defaults(solid)];
    for (const extreme of ['min', 'max']) sizes.push(Object.fromEntries(solid.params.map(p => [p.id, p[extreme]])));
    for (const p of sizes) {
        const label = `${solid.id} ${JSON.stringify(p)}`;
        const poly = buildPolyhedron(solid, p);
        const { V, E, F, area, volume } = poly.stats;
        if (V - E + F !== 2) fail(`${label}: Euler V−E+F = ${V - E + F}`);
        if (!near(area, solid.S(p), 1e-5)) fail(`${label}: surface formula ${solid.S(p)} but mesh ${area}`);
        if (!near(volume, solid.V(p), 1e-5)) fail(`${label}: volume formula ${solid.V(p)} but mesh ${volume}`);
        if (!poly.net) { fail(`${label}: no valid net found`); continue; }

        // folded (f = 1) must give back the original vertices; flat (f = 0) must keep every face the same size
        const mats = foldMatrices(poly.net, 1, []);
        poly.faces.forEach((f, fi) => f.forEach(vi => {
            const q = new THREE.Vector3(...poly.verts[vi]).applyMatrix4(mats[fi]);
            if (q.distanceTo(new THREE.Vector3(...poly.verts[vi])) > 1e-6) fail(`${label}: folded pose moved face ${fi}`);
        }));
        const flat = foldMatrices(poly.net, 0, []);
        const ys = new Set();
        poly.faces.forEach((f, fi) => f.forEach(vi => ys.add(new THREE.Vector3(...poly.verts[vi]).applyMatrix4(flat[fi]).y.toFixed(4))));
        if (ys.size !== 1) fail(`${label}: the net is not flat (${[...ys].slice(0, 3)} …)`);
        // adjacent faces still touch along their hinge in every pose (the net never tears)
        for (const f of [0, 0.3, 0.7]) {
            const m = foldMatrices(poly.net, f, []);
            poly.net.tree.order.forEach(fi => {
                const par = poly.net.tree.parent[fi];
                if (par < 0) return;
                const h = poly.net.tree.hinge[fi];
                for (const vi of [h.a, h.b]) {
                    const a = new THREE.Vector3(...poly.verts[vi]).applyMatrix4(m[fi]);
                    const b = new THREE.Vector3(...poly.verts[vi]).applyMatrix4(m[par]);
                    if (a.distanceTo(b) > 1e-6) fail(`${label}: faces ${fi} and ${par} tear at f=${f}`);
                }
            });
        }
    }
}

// round solids: formulas against the textbook values at r = h = 1
const round = Object.fromEntries(SOLIDS.filter(s => s.round).map(s => [s.id, s]));
const unit = { r: 1, h: 1 };
if (!near(round.cylinder.V(unit), Math.PI)) fail('cylinder volume');
if (!near(round.cone.V(unit), Math.PI / 3)) fail('cone volume');
if (!near(round.sphere.V(unit), (4 * Math.PI) / 3)) fail('sphere volume');
if (!near(round.sphere.S(unit), 4 * Math.PI)) fail('sphere surface');
if (!near(round.cone.S(unit), Math.PI * (1 + Math.SQRT2))) fail('cone surface');

for (const [name, ok] of VIEW_CHECKS()) if (!ok) fail(`views: ${name}`);

console.log(`${SOLIDS.length} solids checked (formulas, Euler, nets).`);
if (problems) {
    console.error(`${problems} problem(s) found`);
    process.exit(1);
}
console.log('OK');

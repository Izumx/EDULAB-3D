// Where every organelle sits inside the animal and plant cells (cell-local coordinates).
// The cut-away removes the quadrant x > 0, z > 0, so organelles are placed around it and a few straddle the cut.

export const ANIMAL = {
    type: 'animal',
    shape: { kind: 'sphere', a: 3, b: 3, c: 3, r: 3 },
    camDist: 11.5,
    nucleus: { p: [0, 0, 0], r: 1.05, nucleolus: { p: [-0.12, 0.15, -0.12], r: 0.38 } },
    rer: { center: [0, 0, 0], radii: [1.35, 1.55, 1.75], bands: [{ phi: [0.05, 1.75], theta: [0.6, 2.1] }], ribosomes: 230 },
    ser: { center: [-0.5, -1.7, 1.2], extent: 0.6, tubes: 8 },
    golgi: { p: [1.55, 0.35, -1.35], scale: 1 },
    mitochondria: [
        { p: [-1.9, 1.0, 0.8], dir: [0.3, 1, 0.2] },
        { p: [0.5, -1.8, -1.2], dir: [1, 0.2, -0.3] },
        { p: [-1.2, -1.1, -1.7], dir: [1, 0.4, 0.2] },
        { p: [2.0, 1.0, -0.6], dir: [0.2, 1, 0.4] },
        { p: [-0.6, 1.9, -1.3], dir: [1, 0.1, 0.5] },
        { p: [1.45, -0.85, 0], dir: [1, 0.15, 0] },
        { p: [0, -0.9, 2.1], dir: [0, 0.15, 1] },
        { p: [-2.3, -0.6, -0.9], dir: [0, 1, 0.3] },
    ],
    lysosomes: [
        { p: [-1.9, -1.0, 0.5], r: 0.22 },
        { p: [0.3, 2.2, -1.5], r: 0.18 },
        { p: [-1.5, 1.7, -0.9], r: 0.2 },
        { p: [2.0, -0.5, -1.4], r: 0.17 },
    ],
    centrioles: { p: [0.9, 1.5, -0.7] },
    ribosomes: 160,
    particles: 520,
    focus: {
        nucleus: { p: [0, 0.1, 0], d: 5 },
        nucleolus: { p: [-0.12, 0.15, -0.12], d: 3.4 },
        mitochondria: { p: [1.45, -0.85, 0], d: 3.6 },
        rer: { p: [-0.9, 0.8, 0.95], d: 4 },
        ser: { p: [-0.5, -1.7, 1.2], d: 3.8 },
        golgi: { p: [1.55, 0.35, -1.35], d: 3.8 },
        lysosomes: { p: [-1.9, -1.0, 0.5], d: 3.2 },
        ribosomes: { p: [-1.1, 0.4, 1.5], d: 3.4 },
        centrioles: { p: [0.9, 1.5, -0.7], d: 2.8 },
    },
    labels: {
        membrane: [2.2, 2.3, 0.4],
        cytoplasm: [-1.6, -2.0, 0.6],
        nucleus: [-0.3, 1.25, 0.3],
        nucleolus: [-0.12, 0.6, -0.12],
        mitochondria: [1.45, -1.3, 0.3],
        rer: [-0.9, 1.6, 0.95],
        ser: [-0.5, -2.3, 1.3],
        golgi: [1.55, 1.0, -1.1],
        lysosomes: [-1.9, -1.4, 0.6],
        ribosomes: [-1.3, 0.1, 1.7],
        centrioles: [0.9, 1.95, -0.6],
    },
};

export const PLANT = {
    type: 'plant',
    shape: { kind: 'box', a: 2.8, b: 1.9, c: 1.8, r: 0.38 },
    camDist: 12.5,
    vacuole: { p: [-0.4, -0.05, -0.25], s: [1.85, 1.3, 1.2] },
    nucleus: { p: [1.95, 0.25, -0.2], r: 0.62, nucleolus: { p: [2.0, 0.33, -0.27], r: 0.22 } },
    rer: { center: [1.95, 0.25, -0.2], radii: [0.8, 0.95], bands: [{ phi: [0, Math.PI * 2], theta: [0.25, 0.9] }, { phi: [0, Math.PI * 2], theta: [2.3, 2.9] }], ribosomes: 150 },
    ser: { center: [-1.9, -1.3, 1.0], extent: 0.45, tubes: 6 },
    golgi: { p: [-0.4, 1.4, -1.2], scale: 0.7, dir: [0, 0.6, -0.8] },
    mitochondria: [
        { p: [-2.25, -0.3, 1.05], dir: [0, 1, 0.3] },
        { p: [1.2, -1.45, -1.3], dir: [1, 0, 0.2] },
        { p: [1.6, -1.35, 0], dir: [1, 0.1, 0] },
        { p: [-1.2, 1.45, 0.9], dir: [1, 0, 0.3] },
    ],
    chloroplasts: [
        { p: [-2.42, 0.8, 0.6], n: [-1, 0, 0] },
        { p: [-2.42, -0.8, -0.7], n: [-1, 0, 0] },
        { p: [-1.6, 1.6, -0.4], n: [0, 1, 0] },
        { p: [0.7, 1.6, -0.6], n: [0, 1, 0] },
        { p: [-1.2, -1.6, -0.3], n: [0, -1, 0] },
        { p: [0.6, -1.6, -0.7], n: [0, -1, 0] },
        { p: [-1.0, 0.2, -1.5], n: [0, 0, -1] },
        { p: [0.9, -0.4, -1.5], n: [0, 0, -1] },
        { p: [1.0, 1.55, 0.05], n: [0, 1, 0] },
        { p: [0, -1.55, 1.0], n: [0, -1, 0] },
        { p: [-0.9, 0.9, 1.5], n: [0, 0, 1] },
        { p: [2.42, -0.6, -1.0], n: [1, 0, 0] },
    ],
    lysosomes: [
        { p: [-2.1, 0.0, -1.2], r: 0.16 },
        { p: [0.2, -1.4, -1.35], r: 0.14 },
    ],
    ribosomes: 170,
    particles: 450,
    focus: {
        vacuole: { p: [-0.4, 0, -0.25], d: 7 },
        chloroplasts: { p: [1.0, 1.55, 0.05], d: 3.2 },
        nucleus: { p: [1.95, 0.25, -0.2], d: 3.8 },
        nucleolus: { p: [2.0, 0.33, -0.27], d: 2.6 },
        mitochondria: { p: [1.6, -1.35, 0], d: 3.2 },
        rer: { p: [1.95, 1.0, -0.2], d: 3.4 },
        ser: { p: [-1.9, -1.3, 1.0], d: 3.2 },
        golgi: { p: [-0.4, 1.4, -1.2], d: 3.2 },
        lysosomes: { p: [-2.1, 0.0, -1.2], d: 3 },
        ribosomes: { p: [-1.5, -1.0, 1.2], d: 3.4 },
    },
    labels: {
        cellWall: [-2.6, 2.35, 1.4],
        membrane: [2.6, 2.05, -0.6],
        cytoplasm: [-2.0, -1.75, 0.9],
        vacuole: [-0.4, 0.3, 0.6],
        chloroplasts: [1.0, 2.0, 0.1],
        nucleus: [1.95, 1.0, 0.1],
        nucleolus: [2.0, 0.55, -0.1],
        mitochondria: [1.6, -1.8, 0.2],
        rer: [1.95, 1.4, -0.4],
        ser: [-1.9, -0.75, 1.1],
        golgi: [-0.4, 1.95, -1.1],
        lysosomes: [-2.1, -0.35, -1.1],
        ribosomes: [-1.5, -1.3, 1.3],
    },
};

// Is a point inside the cut-away quadrant (with a small margin)?
export const inCut = (x, z, m = 0.05) => x > -m && z > -m;

// Is a point inside the cell body (sphere or rounded box), keeping `margin` from the membrane?
export function insideShape(shape, x, y, z, margin) {
    if (shape.kind === 'sphere') return x * x + y * y + z * z < (shape.r - margin) ** 2;
    return Math.abs(x) < shape.a - margin && Math.abs(y) < shape.b - margin && Math.abs(z) < shape.c - margin;
}

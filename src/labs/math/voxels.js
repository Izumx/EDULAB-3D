// Figure made of unit cubes on a 4×4 base and its three views (вид спереди, слева, сверху).
// heights[z * N + x]: x grows to the right, z grows toward the viewer (z = N − 1 is the front row).
// Each view is a list of rows, top to bottom, of booleans (is the cube drawn there).

export const N = 4;
export const MAX_H = 4;
export const idx = (x, z) => z * N + x;
export const emptyFigure = () => new Array(N * N).fill(0);
export const cubeCount = h => h.reduce((s, v) => s + v, 0);

// seen from the front: columns are x, rows are levels
export function frontView(h) {
    return Array.from({ length: MAX_H }, (_, r) => {
        const level = MAX_H - 1 - r;
        return Array.from({ length: N }, (_, x) => {
            for (let z = 0; z < N; z++) if (h[idx(x, z)] > level) return true;
            return false;
        });
    });
}

// seen from the left: the front of the figure is on the right of the picture, so columns are z
export function leftView(h) {
    return Array.from({ length: MAX_H }, (_, r) => {
        const level = MAX_H - 1 - r;
        return Array.from({ length: N }, (_, z) => {
            for (let x = 0; x < N; x++) if (h[idx(x, z)] > level) return true;
            return false;
        });
    });
}

// seen from above: the front is at the bottom of the picture
export const topView = h => Array.from({ length: N }, (_, z) => Array.from({ length: N }, (_, x) => h[idx(x, z)] > 0));

export const views = h => ({ front: frontView(h), left: leftView(h), top: topView(h) });

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Which of the three views of two figures coincide
export function compareViews(a, b) {
    const va = views(a);
    const vb = views(b);
    return { front: same(va.front, vb.front), left: same(va.left, vb.left), top: same(va.top, vb.top) };
}

export const allMatch = c => c.front && c.left && c.top;

// Seeded random figure with a sensible number of cubes, so every view has something in it
export function randomFigure(rnd, minCubes = 5, maxCubes = 9) {
    for (let tries = 0; tries < 200; tries++) {
        const h = emptyFigure();
        const cols = 3 + Math.floor(rnd() * 5);
        for (let c = 0; c < cols; c++) h[Math.floor(rnd() * N * N)] = 1 + Math.floor(rnd() * 3);
        const n = cubeCount(h);
        const tallest = Math.max(...h);
        if (n >= minCubes && n <= maxCubes && tallest >= 2) return h;
    }
    const h = emptyFigure();
    h[idx(1, 1)] = 3;
    h[idx(2, 1)] = 2;
    h[idx(2, 2)] = 1;
    return h;
}

// Sanity checks used by scripts/check-math.mjs
export function VIEW_CHECKS() {
    const h = emptyFigure();
    h[idx(0, 3)] = 3; // left column, front row, three cubes high
    const v = views(h);
    const col = (view, c) => view.map(r => r[c]);
    return [
        ['front view of a tower', JSON.stringify(col(v.front, 0)) === JSON.stringify([false, true, true, true])],
        ['front view elsewhere is empty', v.front.every(r => !r[1] && !r[2] && !r[3])],
        ['left view: the front row is on the right', JSON.stringify(col(v.left, 3)) === JSON.stringify([false, true, true, true]) && v.left.every(r => !r[0])],
        ['top view: the front row is at the bottom', v.top[3][0] && v.top.flat().filter(Boolean).length === 1],
        ['identical figures match', allMatch(compareViews(h, h.slice()))],
        ['a different tower does not', !allMatch(compareViews(h, (() => { const g = emptyFigure(); g[idx(1, 3)] = 3; return g; })()))],
        ['hidden cube does not change the views', (() => {
            const a = emptyFigure();
            a[idx(1, 1)] = 2; a[idx(0, 1)] = 2; a[idx(2, 1)] = 2; a[idx(1, 0)] = 2; a[idx(1, 2)] = 2;
            const b = a.slice();
            return allMatch(compareViews(a, b));
        })()],
    ];
}

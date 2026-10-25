// Tiny fixed-timestep 2D physics for the lab: balls, a feather and an axis-aligned box in a closed room.
// All state lives in the mutable `world` object (no per-frame allocations); the scene reads it in useFrame.
import { OBJECTS, ROOM, BODY_INDEX, GALILEO_HEIGHT } from './data';

const DT = 1 / 240;            // physics step, s
const MAX_STEPS = 30;          // per rendered frame
const SLOP = 0.002;            // allowed penetration, m
const BOUNCE_MIN = 0.25;       // slower floor bounces stop, m/s
const MAX_THROW = 15;          // m/s
const FLUTTER = 2.4;           // sideways acceleration of a feather in air, m/s²

export const TRAIL_POINTS = 720;  // one point every 1/40 s -> 18 s
export const TRAIL_DOTS = 200;    // stroboscope: one dot every 0.1 s
const LINE_DT = 1 / 40;
const DOT_DT = 0.1;

function makeTrail() {
    return {
        body: -1, active: false, rest: 0, version: 0,
        line: new Float32Array(TRAIL_POINTS * 3), n: 0, nextLine: 0,
        dots: new Float32Array(TRAIL_DOTS * 3), nd: 0, nextDot: 0,
    };
}

function makeBody(def, i) {
    return {
        i, def, shape: def.shape, r: def.size, m: def.mass, k: def.dragK, e: def.e, mu: def.mu, crr: def.crr ?? 0,
        x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, angle: 0, omega: 0,
        floor: false, support: false, supportNext: false, pinned: false, landT: -1, phase: i * 1.7,
    };
}

export const world = {
    bodies: OBJECTS.map(makeBody),
    g: 9.8, rho: 1.2, drag: true, timeScale: 1,
    t: 0, acc: 0,
    selected: BODY_INDEX.basketball,
    held: -1, heldVx: 0, heldVy: 0, prevTx: 0, prevTy: 0, hasPrev: false,
    trails: [makeTrail(), makeTrail()],
    shot: { active: false, done: false, body: -1, t0: 0, x0: 0, maxH: 0, flight: 0, range: 0 },
    gal: { phase: 'idle', hold: 0, t0: 0, tBall: -1, tFeather: -1, g: 0, air: false },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function setParams({ g, rho, drag, timeScale }) {
    if (g !== undefined) world.g = g;
    if (rho !== undefined) world.rho = rho;
    if (drag !== undefined) world.drag = drag;
    if (timeScale !== undefined) world.timeScale = timeScale;
}

export function selectBody(i) {
    world.selected = i;
}

function clearTrail(tr) {
    tr.active = false;
    tr.n = 0;
    tr.nd = 0;
    tr.version++;
}

function startTrail(tr, i) {
    tr.body = i;
    tr.active = true;
    tr.n = 0;
    tr.nd = 0;
    tr.rest = 0;
    tr.nextLine = world.t;
    tr.nextDot = world.t;
    tr.version++;
}

export function resetWorld() {
    world.bodies.forEach((b) => {
        b.x = b.def.start[0];
        b.y = b.def.start[1];
        b.vx = b.vy = b.omega = b.angle = 0;
        b.pinned = false;
        b.floor = b.support = b.supportNext = false;
    });
    world.held = -1;
    world.t = 0;
    world.acc = 0;
    world.trails.forEach(clearTrail);
    world.shot.active = world.shot.done = false;
    world.gal.phase = 'idle';
}

// --- Grabbing -------------------------------------------------------------

// Index of the body closest to (x, y) within `margin` metres of its surface, or -1
export function pickBody(x, y, margin) {
    let best = -1;
    let bestD = margin;
    for (const b of world.bodies) {
        let d;
        if (b.shape === 'box') {
            const dx = Math.max(Math.abs(x - b.x) - b.r, 0);
            const dy = Math.max(Math.abs(y - b.y) - b.r, 0);
            d = Math.hypot(dx, dy);
        } else {
            // the feather is drawn much wider than its collision circle
            const r = b.shape === 'feather' ? 0.16 : b.r;
            d = Math.hypot(x - b.x, y - b.y) - r;
        }
        if (d < bestD) {
            bestD = d;
            best = b.i;
        }
    }
    return best;
}

function cancelGalileo() {
    const gal = world.gal;
    if (gal.phase === 'hold' || gal.phase === 'fall') {
        gal.phase = 'idle';
        world.bodies.forEach((b) => { b.pinned = false; });
    }
}

export function grab(i) {
    const b = world.bodies[i];
    cancelGalileo();
    world.held = i;
    world.selected = i;
    world.hasPrev = false;
    world.heldVx = world.heldVy = 0;
    b.vx = b.vy = b.omega = 0;
    if (world.shot.body === i) world.shot.active = false;
    world.trails.forEach((tr) => { if (tr.body === i) tr.active = false; });
}

// Called every rendered frame while a body is held: follow the pointer, estimate the throw velocity.
export function moveHeld(tx, ty, realDt) {
    const b = world.bodies[world.held];
    if (!b) return;
    tx = clamp(tx, -ROOM.halfW + b.r, ROOM.halfW - b.r);
    ty = clamp(ty, b.r, ROOM.h - b.r);
    if (world.hasPrev && realDt > 0) {
        const a = 0.3;
        world.heldVx += ((tx - world.prevTx) / realDt - world.heldVx) * a;
        world.heldVy += ((ty - world.prevTy) / realDt - world.heldVy) * a;
    }
    world.prevTx = tx;
    world.prevTy = ty;
    world.hasPrev = true;
    const k = 1 - Math.exp(-realDt * 30);
    b.x += (tx - b.x) * k;
    b.y += (ty - b.y) * k;
    b.vx = world.heldVx;
    b.vy = world.heldVy;
}

// Let go of the held body. throwIt = false just drops it (e.g. the hand was lost).
export function release(throwIt = true) {
    const b = world.bodies[world.held];
    world.held = -1;
    if (!b) return;
    if (throwIt) {
        const s = Math.hypot(world.heldVx, world.heldVy);
        const f = s > MAX_THROW ? MAX_THROW / s : 1;
        b.vx = world.heldVx * f;
        b.vy = world.heldVy * f;
    } else {
        b.vx = b.vy = 0;
    }
    const shot = world.shot;
    shot.active = b.y - b.r > 0.03;
    shot.done = false;
    shot.body = b.i;
    shot.t0 = world.t;
    shot.x0 = b.x;
    shot.maxH = b.y - b.r;
    startTrail(world.trails[0], b.i);
    clearTrail(world.trails[1]);
}

// --- Galileo: feather and bowling ball released together ------------------

const PARK = { box: -3.0, tennis: -2.3, basketball: 2.7 };

export function startGalileo() {
    world.held = -1;
    const ball = BODY_INDEX.bowling;
    const feather = BODY_INDEX.feather;
    world.bodies.forEach((b) => {
        b.vx = b.vy = b.omega = b.angle = 0;
        b.pinned = false;
        if (b.i === ball || b.i === feather) {
            b.x = b.i === ball ? 1.2 : -1.2;
            b.y = GALILEO_HEIGHT + b.r;
            b.pinned = true;
        } else {
            b.x = PARK[b.def.id] ?? b.x;
            b.y = b.r;
        }
    });
    world.trails.forEach(clearTrail);
    world.shot.active = world.shot.done = false;
    world.selected = ball;
    const gal = world.gal;
    gal.phase = 'hold';
    gal.hold = 0.9;
    gal.tBall = gal.tFeather = -1;
}

function beginFall() {
    const gal = world.gal;
    world.bodies.forEach((b) => { b.pinned = false; });
    gal.phase = 'fall';
    gal.t0 = world.t;
    gal.g = world.g;
    gal.air = world.drag && world.rho > 0;
    startTrail(world.trails[0], BODY_INDEX.bowling);
    startTrail(world.trails[1], BODY_INDEX.feather);
}

// --- Simulation ------------------------------------------------------------

export function advance(realDt) {
    const gal = world.gal;
    if (gal.phase === 'hold') {
        gal.hold -= realDt;
        if (gal.hold <= 0) beginFall();
    }
    world.acc += realDt * world.timeScale;
    let n = 0;
    while (world.acc >= DT && n < MAX_STEPS) {
        step(DT);
        world.acc -= DT;
        n++;
    }
    if (n === MAX_STEPS) world.acc = 0;
}

function isStatic(b) {
    return b.pinned || b.i === world.held;
}

// Bodies resting on the floor (or on a supported stack) act as ground for bodies pressing down on them
// (a feather is too flimsy to hold anything up)
function invMass(b, pushY) {
    if (isStatic(b)) return 0;
    if (b.support && pushY < -0.5 && b.shape !== 'feather') return 0;
    return 1 / b.m;
}

// n points from A to B
function resolve(A, B, nx, ny, pen) {
    const ia = invMass(A, -ny);
    const ib = invMass(B, ny);
    const sum = ia + ib;
    if (sum === 0) return;

    if (ny > 0.5 && (A.support || A.pinned) && A.shape !== 'feather') B.supportNext = true;
    else if (ny < -0.5 && (B.support || B.pinned) && B.shape !== 'feather') A.supportNext = true;

    const corr = Math.max(pen - SLOP, 0) / sum;
    A.x -= nx * corr * ia;
    A.y -= ny * corr * ia;
    B.x += nx * corr * ib;
    B.y += ny * corr * ib;

    const rvx = B.vx - A.vx;
    const rvy = B.vy - A.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const e = vn < -0.4 ? Math.min(A.e, B.e) : 0;
    const jn = -(1 + e) * vn / sum;
    A.vx -= jn * nx * ia;
    A.vy -= jn * ny * ia;
    B.vx += jn * nx * ib;
    B.vy += jn * ny * ib;

    // Coulomb friction along the contact
    const tx = -ny;
    const ty = nx;
    const vt = rvx * tx + rvy * ty;
    const maxT = 0.5 * (A.mu + B.mu) * jn;
    const jt = clamp(-vt / sum, -maxT, maxT);
    A.vx -= jt * tx * ia;
    A.vy -= jt * ty * ia;
    B.vx += jt * tx * ib;
    B.vy += jt * ty * ib;
}

function collide(A, B) {
    const boxA = A.shape === 'box';
    const boxB = B.shape === 'box';
    let nx, ny, pen;
    if (!boxA && !boxB) {
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const rs = A.r + B.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rs * rs) return;
        const d = Math.sqrt(d2);
        if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = 0; ny = 1; }
        pen = rs - d;
    } else if (boxA && boxB) {
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const ox = A.r + B.r - Math.abs(dx);
        const oy = A.r + B.r - Math.abs(dy);
        if (ox <= 0 || oy <= 0) return;
        if (ox < oy) { nx = dx < 0 ? -1 : 1; ny = 0; pen = ox; } else { nx = 0; ny = dy < 0 ? -1 : 1; pen = oy; }
    } else {
        // circle C vs box X; normal from C to X
        const C = boxA ? B : A;
        const X = boxA ? A : B;
        const qx = clamp(C.x, X.x - X.r, X.x + X.r);
        const qy = clamp(C.y, X.y - X.r, X.y + X.r);
        const dx = qx - C.x;
        const dy = qy - C.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1e-12) {
            if (d2 >= C.r * C.r) return;
            const d = Math.sqrt(d2);
            nx = dx / d;
            ny = dy / d;
            pen = C.r - d;
        } else {
            // centre inside the box: push out along the shallowest axis
            const ox = X.r - Math.abs(C.x - X.x);
            const oy = X.r - Math.abs(C.y - X.y);
            if (ox < oy) { nx = C.x < X.x ? 1 : -1; ny = 0; pen = ox + C.r; } else { nx = 0; ny = C.y < X.y ? 1 : -1; pen = oy + C.r; }
        }
        if (boxA) { nx = -nx; ny = -ny; }
    }
    resolve(A, B, nx, ny, pen);
}

function walls(b, dt) {
    if (isStatic(b)) return;
    const r = b.r;
    const L = -ROOM.halfW + r;
    const R = ROOM.halfW - r;
    const T = ROOM.h - r;
    if (b.x < L) { b.x = L; if (b.vx < 0) b.vx = -b.vx * b.e; }
    else if (b.x > R) { b.x = R; if (b.vx > 0) b.vx = -b.vx * b.e; }
    if (b.y > T) { b.y = T; if (b.vy > 0) b.vy = -b.vy * b.e; }
    if (b.y < r + 1e-4) {
        if (b.y < r) {
            // first touch of the floor this step: interpolate the exact moment
            if (b.landT < 0 && b.py >= r) b.landT = world.t + dt * (b.py - r) / (b.py - b.y);
            b.y = r;
        }
        if (b.vy < 0) {
            b.vy = -b.vy * b.e;
            if (b.vy < BOUNCE_MIN) b.vy = 0;
        }
        b.floor = true;
        b.supportNext = true;
    }
}

function step(dt) {
    const { bodies, g } = world;
    const air = world.drag ? world.rho : 0;

    for (const b of bodies) {
        b.support = b.supportNext;
        b.supportNext = false;
        b.floor = false;
        b.landT = -1;
        b.px = b.x;
        b.py = b.y;
        if (isStatic(b)) continue;
        let ax = 0;
        let ay = -g;
        if (air > 0) {
            const s = Math.hypot(b.vx, b.vy);
            const c = air * b.k / b.m * s;
            ax -= c * b.vx;
            ay -= c * b.vy;
            if (b.shape === 'feather' && !b.support) {
                ax += FLUTTER * Math.sin(world.t * 4.5 + b.phase) * Math.min(1, s / 0.5) * Math.min(1, air / 1.2);
            }
        }
        b.x += b.vx * dt + 0.5 * ax * dt * dt;
        b.y += b.vy * dt + 0.5 * ay * dt * dt;
        b.vx += ax * dt;
        b.vy += ay * dt;
    }

    for (let it = 0; it < 2; it++) {
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
        }
        for (const b of bodies) walls(b, dt);
    }

    world.t += dt;

    for (const b of bodies) {
        if (isStatic(b)) continue;
        const onGround = b.floor || b.supportNext;
        // floor friction / rolling resistance (needs weight, so none in weightlessness)
        if (b.floor && g > 0) {
            const dv = (b.shape === 'ball' ? b.crr : b.mu) * g * dt;
            b.vx = Math.abs(b.vx) <= dv ? 0 : b.vx - Math.sign(b.vx) * dv;
        }
        if (b.shape === 'ball') {
            if (onGround) b.omega = -b.vx / b.r;
            b.angle += b.omega * dt;
        } else if (b.shape === 'feather') {
            const tilt = onGround || air === 0 ? 0 : 0.45 * Math.sin(world.t * 4.5 + b.phase + 1.2);
            b.angle += (tilt - b.angle) * Math.min(1, dt * 6);
        }
    }

    trackShot();
    trackGalileo();
    recordTrails(dt);
}

function trackShot() {
    const s = world.shot;
    if (!s.active) return;
    const b = world.bodies[s.body];
    const h = b.y - b.r;
    if (h > s.maxH) s.maxH = h;
    if (b.landT >= 0) {
        s.flight = b.landT - s.t0;
        s.range = Math.abs(b.x - s.x0);
        s.active = false;
        s.done = true;
    } else if (world.t - s.t0 > 30 || (b.supportNext && Math.abs(b.vx) + Math.abs(b.vy) < 0.01)) {
        s.active = false;
    }
}

function trackGalileo() {
    const gal = world.gal;
    if (gal.phase !== 'fall') return;
    const ball = world.bodies[BODY_INDEX.bowling];
    const feather = world.bodies[BODY_INDEX.feather];
    if (gal.tBall < 0 && ball.landT >= 0) gal.tBall = ball.landT - gal.t0;
    if (gal.tFeather < 0 && feather.landT >= 0) gal.tFeather = feather.landT - gal.t0;
    const elapsed = world.t - gal.t0;
    if ((gal.tBall >= 0 && gal.tFeather >= 0) || elapsed > (gal.g < 0.01 ? 2 : 40)) gal.phase = 'done';
}

function recordTrails(dt) {
    for (const tr of world.trails) {
        if (!tr.active) continue;
        const b = world.bodies[tr.body];
        if (world.t >= tr.nextLine && tr.n < TRAIL_POINTS) {
            const k = tr.n * 3;
            tr.line[k] = b.x;
            tr.line[k + 1] = b.y;
            tr.n++;
            tr.nextLine += LINE_DT;
            tr.version++;
        }
        if (world.t >= tr.nextDot && tr.nd < TRAIL_DOTS) {
            const k = tr.nd * 3;
            tr.dots[k] = b.x;
            tr.dots[k + 1] = b.y;
            tr.nd++;
            tr.nextDot += DOT_DT;
            tr.version++;
        }
        const resting = b.supportNext && Math.abs(b.vx) + Math.abs(b.vy) < 0.02;
        tr.rest = resting ? tr.rest + dt : 0;
        if (tr.rest > 0.25 || tr.n >= TRAIL_POINTS) tr.active = false;
    }
}

// --- Readout for the UI (called ~10 times per second) ----------------------

const r2 = (v) => Math.round(v * 100) / 100;

export function snapshot() {
    const b = world.bodies[world.selected];
    const sel = b ? {
        i: b.i,
        v: r2(Math.hypot(b.vx, b.vy)),
        h: r2(Math.max(0, b.y - b.r)),
    } : null;

    const s = world.shot;
    let shot = null;
    if (s.active || s.done) {
        const sb = world.bodies[s.body];
        shot = {
            body: s.body,
            active: s.active,
            flight: r2(s.active ? world.t - s.t0 : s.flight),
            maxH: r2(s.maxH),
            range: r2(s.active ? Math.abs(sb.x - s.x0) : s.range),
        };
    }

    const gl = world.gal;
    const gal = gl.phase === 'idle' ? null : {
        phase: gl.phase,
        tBall: r2(gl.tBall),
        tFeather: r2(gl.tFeather),
        elapsed: gl.phase === 'fall' ? r2(world.t - gl.t0) : 0,
        g: gl.g,
        air: gl.air,
    };
    return { sel, shot, gal };
}

// Shared, mutable hand state. Updated every video frame by tracker.js WITHOUT going through React.
// - Read it inside useFrame / requestAnimationFrame for smooth per-frame work.
// - Subscribe to discrete events (grab start/end, hand lost) with onHand().
// - Use useHandStatus() in React components that only care about status changes.
import { useSyncExternalStore } from 'react';

export const hand = {
    status: 'off',        // 'off' | 'loading' | 'ready' | 'error'
    error: null,          // human-readable error (Russian) when status === 'error'
    present: false,       // a hand is currently tracked
    x: 0, y: 0,           // filtered cursor position in screen pixels
    nx: 0, ny: 0,         // same position in normalized device coords (-1..1, y up) for three.js raycasting
    vx: 0, vy: 0,         // cursor velocity, px/s
    grabbing: false,      // pinch or closed fist
    grabOverUI: false,    // grab started over a DOM control (labs should ignore such grabs)
    gesture: 'None',      // MediaPipe gesture name: Open_Palm, Closed_Fist, Pointing_Up, Thumb_Up, ...
    landmarks: null,      // raw 21 landmarks of the tracked hand (for the preview skeleton)
    hover3d: null,        // { id, label, onSelect } of the 3D target under the cursor (set by <HandPointer/>)
};

const listeners = new Map(); // type -> Set<fn>

export function onHand(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
}

export function emitHand(type, payload) {
    listeners.get(type)?.forEach(fn => fn(payload));
    if (type === 'status' || type === 'presence') {
        statusVersion++;
        listeners.get('__react')?.forEach(fn => fn());
    }
}

// --- React binding for coarse state (status + presence only) ---
let statusVersion = 0;
let snapshot = { status: hand.status, error: hand.error, present: hand.present, v: -1 };

function getSnapshot() {
    if (snapshot.v !== statusVersion) {
        snapshot = { status: hand.status, error: hand.error, present: hand.present, v: statusVersion };
    }
    return snapshot;
}

export function useHandStatus() {
    return useSyncExternalStore(fn => onHand('__react', fn), getSnapshot);
}

// Development only: drive the hand state without a camera, e.g. from the browser console or an automated test.
//   __edulabHand.move(x, y)  - put the cursor at screen pixels (the hand becomes "present")
//   __edulabHand.grab(true)  - pinch / fist; grab(false) releases (with the current velocity)
//   __edulabHand.leave()     - the hand leaves the camera
// Loaded from main.jsx behind import.meta.env.DEV, so it never ships in the production build.
import { hand, emitHand } from './handStore';

let last = { x: 0, y: 0, t: 0 };

function isOverUI(x, y) {
    const el = document.elementFromPoint(x, y);
    return !!el && el.tagName !== 'CANVAS' && !!el.closest('button, a, input, [data-hand], .panel, .hand-ui');
}

function move(x, y) {
    const now = performance.now();
    const dt = Math.max(0.016, (now - last.t) / 1000);
    if (hand.present) {
        hand.vx = hand.vx * 0.6 + ((x - last.x) / dt) * 0.4;
        hand.vy = hand.vy * 0.6 + ((y - last.y) / dt) * 0.4;
    }
    last = { x, y, t: now };
    hand.x = x;
    hand.y = y;
    hand.nx = (x / window.innerWidth) * 2 - 1;
    hand.ny = -(y / window.innerHeight) * 2 + 1;
    hand.gesture = hand.grabbing ? 'Closed_Fist' : 'Open_Palm';
    if (!hand.present) {
        hand.present = true;
        emitHand('presence', true);
    }
}

function grab(value) {
    if (value === hand.grabbing) return;
    hand.grabbing = value;
    if (value) {
        hand.grabOverUI = isOverUI(hand.x, hand.y);
        emitHand('grabstart', { x: hand.x, y: hand.y, overUI: hand.grabOverUI });
    } else {
        emitHand('grabend', { x: hand.x, y: hand.y, vx: hand.vx, vy: hand.vy, overUI: hand.grabOverUI });
        hand.grabOverUI = false;
    }
}

function leave() {
    grab(false);
    hand.present = false;
    hand.hover3d = null;
    hand.vx = hand.vy = 0;
    emitHand('presence', false);
}

window.__edulabHand = { move, grab, leave, state: hand };

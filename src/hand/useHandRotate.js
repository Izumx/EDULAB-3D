// Rotate a three.js object by grabbing (pinch or fist) in empty space and moving the hand. Use inside a <Canvas>.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { hand } from './handStore';

/**
 * Rotate an object by grabbing (pinch or fist) in empty space and moving the hand, with inertia.
 * Grabs that start over buttons/panels are ignored.
 */
export function useHandRotate(ref, { speed = 0.005, enabled = true, axes = 'xy', maxTilt = 1.2 } = {}) {
    const state = useRef({ lastX: 0, lastY: 0, active: false, velX: 0, velY: 0 });

    useFrame(() => {
        const s = state.current;
        const obj = ref.current;
        if (!obj) return;

        const grabbing = enabled && hand.present && hand.grabbing && !hand.grabOverUI;
        if (grabbing) {
            if (!s.active) {
                s.active = true;
                s.lastX = hand.x;
                s.lastY = hand.y;
            }
            s.velY = (hand.x - s.lastX) * speed;
            s.velX = (hand.y - s.lastY) * speed;
            s.lastX = hand.x;
            s.lastY = hand.y;
        } else {
            s.active = false;
            s.velX *= 0.92;
            s.velY *= 0.92;
        }
        if (axes.includes('y')) obj.rotation.y += s.velY;
        if (axes.includes('x')) obj.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, obj.rotation.x + s.velX));
    });
}

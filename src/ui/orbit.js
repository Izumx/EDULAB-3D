// Small interaction helpers shared by the 3D labs: mouse rotation, wheel zoom and a seeded RNG.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Drag with the mouse (left button) to rotate an object, with inertia. Works alongside useHandRotate.
export function useMouseRotate(ref, { speed = 0.008, maxTilt = 1.2 } = {}) {
    const gl = useThree(s => s.gl);
    const state = useRef({ down: false, x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0 });

    useEffect(() => {
        const s = state.current;
        const el = gl.domElement;
        const down = e => {
            if (e.button !== 0) return;
            s.down = true;
            s.x = e.clientX;
            s.y = e.clientY;
        };
        const move = e => {
            if (!s.down) return;
            s.dx += e.clientX - s.x;
            s.dy += e.clientY - s.y;
            s.x = e.clientX;
            s.y = e.clientY;
        };
        const up = () => {
            s.down = false;
        };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [gl]);

    useFrame(() => {
        const s = state.current;
        const obj = ref.current;
        if (!obj) return;
        if (s.down) {
            s.vy = s.dx * speed;
            s.vx = s.dy * speed;
            s.dx = s.dy = 0;
        } else {
            s.vx *= 0.92;
            s.vy *= 0.92;
        }
        obj.rotation.y += s.vy;
        obj.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, obj.rotation.x + s.vx));
    });
}

// Mouse wheel changes a zoom factor kept in a ref (read by the camera rigs)
export function useWheelZoom(zoomRef, min = 0.55, max = 1.5) {
    const gl = useThree(s => s.gl);
    useEffect(() => {
        const el = gl.domElement;
        const wheel = e => {
            e.preventDefault();
            zoomRef.current = Math.max(min, Math.min(max, zoomRef.current * (e.deltaY > 0 ? 1.08 : 0.93)));
        };
        el.addEventListener('wheel', wheel, { passive: false });
        return () => el.removeEventListener('wheel', wheel);
    }, [gl, zoomRef, min, max]);
}

// Small deterministic RNG so random-looking layouts never jump between renders
export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

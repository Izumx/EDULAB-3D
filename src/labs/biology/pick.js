// Selection plumbing shared by the cell and DNA scenes (hand + mouse).
import { createContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { hand, onHand } from '../../hand/handStore';

export const PickCtx = createContext(null);

// Which other parts stay bright when one is selected (they belong together)
const RELATED = {
    nucleus: ['nucleolus'],
    nucleolus: ['nucleus'],
    rer: ['ribosomes'],
};
export const isRelated = (sel, id) => RELATED[sel]?.includes(id) ?? false;

/**
 * Builds the context for <Pickable>. Hover/selection live in refs (read per frame), React only sees selections.
 * Hand rules: dwell = select; a quick pinch/fist "tap" = select; grab + move = rotate (no selection).
 */
export function usePickCtx(selected, onSelect, extra) {
    const selRef = useRef(selected);
    const hoverRef = useRef(null);
    const pendingRef = useRef(null);
    const onSelectRef = useRef(onSelect);

    useEffect(() => {
        selRef.current = selected;
    }, [selected]);
    useEffect(() => {
        onSelectRef.current = onSelect;
    });

    useEffect(() => {
        const offHover = onHand('hover3d', t => {
            hoverRef.current = t?.id ?? null;
        });
        const offEnd = onHand('grabend', p => {
            const pend = pendingRef.current;
            pendingRef.current = null;
            if (pend && Math.hypot(p.x - pend.x, p.y - pend.y) < 45 && performance.now() - pend.t < 700) {
                onSelectRef.current(pend.id);
            }
        });
        return () => {
            offHover();
            offEnd();
        };
    }, []);

    return useMemo(() => ({
        getSel: () => selRef.current,
        getHover: () => hoverRef.current,
        hoverIn: id => {
            hoverRef.current = id;
        },
        hoverOut: id => {
            if (hoverRef.current === id) hoverRef.current = null;
        },
        select: id => onSelectRef.current(id),
        handSelect: id => {
            if (hand.grabbing) pendingRef.current = { id, x: hand.x, y: hand.y, t: performance.now() };
            else onSelectRef.current(id);
        },
        ...extra,
    }), [extra]);
}

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

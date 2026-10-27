// Selection plumbing shared by the cell and DNA scenes (hand + mouse).
import { createContext, useEffect, useMemo, useRef } from 'react';
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

export { useMouseRotate, useWheelZoom, mulberry32 } from '../../ui/orbit';

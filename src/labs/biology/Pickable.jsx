// A selectable part of a 3D model: hand target + mouse events + glow/dim highlighting of everything inside.
import React, { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PickCtx, isRelated } from './pick';
import { noRaycast } from './materials';


// Applies the glow / dim state to every collected material
function applyLook(mats, s, g, glowColor) {
    for (const m of mats) {
        const b = m.userData.hl;
        if (b.color) m.color.copy(b.color).multiplyScalar(1 - 0.62 * s.dim);
        if (b.emissive) {
            m.emissive.copy(b.emissive).lerp(glowColor, Math.min(1, s.glow));
            m.emissiveIntensity = b.ei * (1 - s.dim) + g * 0.75;
        }
        if (b.opacity < 1) m.opacity = b.opacity * (1 - 0.5 * s.dim) + 0.15 * g;
        if (b.intensity !== undefined) m.uniforms.uIntensity.value = b.intensity * (1 - 0.7 * s.dim) + g * 1.2;
    }
}

/**
 * Children meshes can opt out with userData: noPick (not raycastable), noClip (ignore the cut-away planes).
 * hand={false}: only mouse/list can select it (used for big background parts like the cytoplasm).
 */
export function Pickable({ id, label, color, hand = true, hoverGlow = true, children, ...props }) {
    const ctx = useContext(PickCtx);
    const ref = useRef(null);
    const fx = useRef({ glow: 0, dim: 0, clean: false, mats: [] });
    const glowColor = useMemo(() => new THREE.Color(color).multiplyScalar(1.15), [color]);

    // Collect materials once (remember their base look) and wire clipping + raycasting.
    // Runs twice in StrictMode, so already-registered materials must still be collected.
    useLayoutEffect(() => {
        const mats = new Set();
        ref.current.traverse(o => {
            if (o.isPoints || o.isLine || o.userData.noPick) o.raycast = noRaycast;
            else if (o.isMesh && ctx.raycast && !o.userData.noClip) o.raycast = ctx.raycast;
            const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            for (const m of list) {
                if (!m.userData.hl) {
                    m.userData.hl = {
                        color: m.color ? m.color.clone() : null,
                        emissive: m.emissive ? m.emissive.clone() : null,
                        ei: m.emissiveIntensity ?? 1,
                        opacity: m.opacity,
                        intensity: m.uniforms?.uIntensity?.value,
                    };
                }
                if (ctx.planes && !o.userData.noClip) {
                    m.clippingPlanes = ctx.planes;
                    m.clipIntersection = true;
                }
                mats.add(m);
            }
        });
        fx.current.mats = [...mats];
        fx.current.clean = false;
    }, [ctx]);

    useFrame((state, dt) => {
        const s = fx.current;
        const sel = ctx.getSel();
        const hov = ctx.getHover();
        const glowT = sel === id ? 1 : hov === id && hoverGlow ? 0.5 : 0;
        const dimT = sel && sel !== id && !isRelated(sel, id) ? 1 : 0;
        const k = 1 - Math.exp(-dt * 7);
        s.glow += (glowT - s.glow) * k;
        s.dim += (dimT - s.dim) * k;
        const active = sel === id || Math.abs(glowT - s.glow) > 0.002 || Math.abs(dimT - s.dim) > 0.002;
        if (!active && s.clean) return;
        s.clean = !active;

        const pulse = sel === id ? 0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 3.2) : 1;
        const g = s.glow * pulse;
        applyLook(s.mats, s, g, glowColor);
    });

    const select = e => {
        if (e.delta > 8) return; // it was a drag, not a click
        e.stopPropagation();
        ctx.select(id);
    };

    return (
        <group
            ref={ref}
            {...props}
            userData={hand ? { handTarget: { id, label, onSelect: () => ctx.handSelect(id) } } : undefined}
            onClick={select}
            onPointerOver={e => {
                e.stopPropagation();
                ctx.hoverIn(id);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                ctx.hoverOut(id);
                document.body.style.cursor = '';
            }}
        >
            {children}
        </group>
    );
}

// The globe: coordinates under the cursor, parallels and meridians, cities, and points to find by their coordinates.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { useMouseRotate, useWheelZoom } from '../../ui/orbit';
import { makeRimMaterial } from '../biology/materials';
import { getTexture } from '../cosmos/textures';
import { Arc, CityDot, GeoLine, Graticule, Marker } from './GlobeParts';
import { OccludeCtx } from './occlude';
import { CITIES, LINES, faceRotation, latText, lonText, toLatLon } from './geo';

const START_ROTATION = [0.25, -2.3, 0];
const hit = { ndc: new THREE.Vector2(), local: new THREE.Vector3() };

function stepGlobe(state, dt, g, st, focus, spin, zoom) {
    if (st.focusKey !== focus.key) {
        st.focusKey = focus.key;
        st.tween = focus.lat === null ? null : faceRotation(focus.lat, focus.lon);
    }
    if (st.tween) {
        if (hand.present && hand.grabbing && !hand.grabOverUI) {
            st.tween = null;
        } else {
            const k = 1 - Math.exp(-dt * 4);
            const dy = Math.atan2(Math.sin(st.tween.y - g.rotation.y), Math.cos(st.tween.y - g.rotation.y));
            g.rotation.y += dy * k;
            g.rotation.x += (st.tween.x - g.rotation.x) * k;
            if (Math.abs(dy) < 0.003 && Math.abs(st.tween.x - g.rotation.x) < 0.003) st.tween = null;
        }
    } else if (spin && !st.down && !(hand.present && hand.grabbing)) {
        g.rotation.y += dt * 0.06;
    }
    const cam = state.camera;
    cam.position.set(0, 0, cam.position.z + (4.9 * zoom.current - cam.position.z) * (1 - Math.exp(-dt * 3)));
    cam.lookAt(0, 0, 0);
}

// Shows the coordinates under the pointer and remembers them for a hand "click" (kept outside the component: it mutates DOM)
function writeHud(h, st, p) {
    if (!h?.el) return;
    h.last = p;
    const text = p ? `${latText(p.lat)} · ${lonText(p.lon)}` : '';
    if (text === st.text) return;
    st.text = text;
    h.el.textContent = text;
    h.el.classList.toggle('empty', !text);
}

export default function GlobeScene({ focus, selectedCity, onCity, showLines, extraLines, markers, arc, pick, onPick, showCities, hud, zoom }) {
    const root = useRef(null);
    const globe = useRef(null);
    const st = useRef({ focusKey: -1, tween: null, down: false, frame: 0, text: '' });
    const gl = useThree(s => s.gl);
    const camera = useThree(s => s.camera);
    const mouse = useRef({ x: 0, y: 0, inside: false });
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const occluders = useMemo(() => [globe], []);
    const earth = getTexture('earth.jpg');
    const rim = useMemo(() => makeRimMaterial('#5aa9ff', { power: 2.6, intensity: 1.0 }), []);
    useEffect(() => () => rim.dispose(), [rim]);

    useHandRotate(root, { speed: 0.005, maxTilt: 1.4 });
    useMouseRotate(root, { speed: 0.007, maxTilt: 1.4 });
    useWheelZoom(zoom, 0.55, 1.5);

    // mouse position in normalized device coordinates, and whether a drag is going on
    useEffect(() => {
        const el = gl.domElement;
        const move = e => {
            const r = el.getBoundingClientRect();
            mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
            mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
            mouse.current.inside = true;
        };
        const leave = () => { mouse.current.inside = false; };
        const down = () => { st.current.down = true; st.current.tween = null; };
        const up = () => { st.current.down = false; };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointerup', up);
        return () => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointerup', up);
        };
    }, [gl]);

    // the point of the globe under the hand (or the mouse), as latitude and longitude
    const readPointer = () => {
        const g = globe.current;
        if (!g) return null;
        const usingHand = hand.present;
        if (!usingHand && !mouse.current.inside) return null;
        hit.ndc.set(usingHand ? hand.nx : mouse.current.x, usingHand ? hand.ny : mouse.current.y);
        raycaster.setFromCamera(hit.ndc, camera);
        const h = raycaster.intersectObject(g, false)[0];
        if (!h) return null;
        g.worldToLocal(hit.local.copy(h.point));
        return toLatLon(hit.local.x, hit.local.y, hit.local.z);
    };

    useFrame((state, dt) => {
        if (root.current) stepGlobe(state, dt, root.current, st.current, focus, !selectedCity && !pick, zoom);
        // coordinates under the pointer, ~15 times a second
        const a = st.current;
        if ((a.frame++ & 3) === 0) writeHud(hud.current, a, readPointer());
    });

    return (
        <OccludeCtx.Provider value={occluders}>
            <ambientLight intensity={1.05} />
            <directionalLight position={[4, 3, 6]} intensity={1.7} />
            <group ref={root} rotation={START_ROTATION}>
                <mesh ref={globe}
                    userData={pick ? { handTarget: { id: 'globe', label: 'Отметить здесь', onSelect: () => { const p = hud.current?.last; if (p) onPick(p); } } } : undefined}
                    onClick={e => {
                        if (e.delta > 8 || !pick) return;
                        e.stopPropagation();
                        const local = e.object.worldToLocal(e.point.clone());
                        onPick(toLatLon(local.x, local.y, local.z));
                    }}>
                    <sphereGeometry args={[1, 96, 64]} />
                    <meshStandardMaterial map={earth} roughness={0.92} metalness={0} />
                </mesh>
                <mesh scale={1.07} material={rim} userData={{ noPick: true }}>
                    <sphereGeometry args={[1, 48, 32]} />
                </mesh>

                <Graticule />
                {LINES.filter(l => showLines.includes(l.id)).map(l => <GeoLine key={l.id} kind={l.kind} value={l.value} color={l.color} />)}
                {extraLines.map((l, i) => <GeoLine key={`x${i}-${l.kind}-${l.value}`} kind={l.kind} value={l.value} color={l.color} radius={0.006} />)}

                {showCities && CITIES.map(c => <CityDot key={c.id} city={c} selected={selectedCity === c.id} onCity={onCity} />)}
                {markers.map(m => <Marker key={`${m.lat}-${m.lon}-${m.color}`} {...m} />)}
                {arc && <Arc a={arc.a} b={arc.b} color={arc.color} />}
            </group>
        </OccludeCtx.Provider>
    );
}

// «Фазы Луны»: the Sun lights the Earth–Moon system from the left; a small second view shows the Moon as seen from Earth.
import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { getGlowTexture, getTexture } from './textures';
import { ORBIT_R, MOON_PHASES, SYNODIC, angleOfDay, moonPosition } from './moon';

const EARTH_R = 1.05;
const MOON_R = 0.45;
const SUN_X = -13;
const tmp = new THREE.Vector3();

// Sunlight: a few parallel rays coming from the Sun
function SunRays() {
    const geo = useMemo(() => {
        const pts = [];
        for (const y of [-1.2, 0, 1.2]) {
            for (const z of [-4.5, -1.5, 1.5, 4.5]) pts.push(SUN_X + 3, y * 0.6, z, -6.2, y * 0.6, z);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return g;
    }, []);
    useEffect(() => () => geo.dispose(), [geo]);
    return (
        <lineSegments geometry={geo}>
            <lineBasicMaterial color="#fde68a" transparent opacity={0.35} />
        </lineSegments>
    );
}

function OrbitRing() {
    const geo = useMemo(() => {
        const pts = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
        }
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, []);
    useEffect(() => () => geo.dispose(), [geo]);
    return (
        <line geometry={geo}>
            <lineBasicMaterial color="#a78bfa" transparent opacity={0.45} />
        </line>
    );
}

// Eight clickable spots on the orbit, one per named phase
function PhaseMarkers({ onPick, phase }) {
    return MOON_PHASES.map((p, i) => {
        const pos = moonPosition((i / 8) * Math.PI * 2, new THREE.Vector3());
        return (
            <mesh key={p.name} position={pos}
                userData={{ handTarget: { id: `moon-phase-${i}`, label: p.name, onSelect: () => onPick(i) } }}
                onClick={e => { e.stopPropagation(); onPick(i); }}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = ''; }}>
                <sphereGeometry args={[0.16, 16, 12]} />
                <meshBasicMaterial color={i === phase ? '#fde047' : '#a78bfa'} transparent opacity={i === phase ? 0.9 : 0.5} />
            </mesh>
        );
    });
}

function advance(clock, dt, playing, req) {
    if (req.pending) {
        // shortest way round the month
        let d = req.target - clock.day;
        if (d > SYNODIC / 2) d -= SYNODIC;
        if (d < -SYNODIC / 2) d += SYNODIC;
        clock.day += d * (1 - Math.exp(-dt * 4));
        if (Math.abs(d) < 0.01) {
            clock.day = req.target;
            req.pending = false;
        }
    } else if (playing) {
        clock.day += dt * (SYNODIC / 24); // a lunar month in 24 seconds
    }
    clock.day = ((clock.day % SYNODIC) + SYNODIC) % SYNODIC;
}

export default function MoonScene({ playing, goto, onProgress, onPick, moonRef, phase, showLabels }) {
    const root = useRef(null);
    const earth = useRef(null);
    const moon = useRef(null);
    const sight = useRef(null);
    const moonLabel = useRef(null);
    const clock = useRef({ day: goto.day, reported: -1, since: 0 });
    const req = useRef({ target: goto.day, pending: false });
    const earthTex = getTexture('earth.jpg');
    const moonTex = getTexture('moon.jpg');
    const sunTex = getTexture('sun.jpg');
    const sightGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), []);
    useEffect(() => () => sightGeo.dispose(), [sightGeo]);

    useHandRotate(root, { speed: 0.005, axes: 'y' });

    useEffect(() => {
        req.current.target = goto.day;
        req.current.pending = true;
    }, [goto]);

    useFrame((state, dt) => {
        const c = clock.current;
        advance(c, Math.min(dt, 0.1), playing && !(hand.present && hand.grabbing && !hand.grabOverUI), req.current);
        const angle = angleOfDay(c.day);
        moonRef.current.angle = angle;
        moonPosition(angle, tmp);
        if (moon.current) {
            moon.current.position.copy(tmp);
            moon.current.rotation.y = angle; // the same side always faces the Earth
        }
        if (moonLabel.current) moonLabel.current.position.set(tmp.x, tmp.y + 0.8, tmp.z);
        if (sight.current) {
            const p = sight.current.geometry.attributes.position;
            p.setXYZ(1, tmp.x, tmp.y, tmp.z);
            p.needsUpdate = true;
            sight.current.computeLineDistances();
        }
        if (earth.current) earth.current.rotation.y += dt * 0.6;

        c.since += dt;
        if (c.since > 0.12 && Math.abs(c.day - c.reported) > 0.005) {
            c.since = 0;
            c.reported = c.day;
            onProgress(c.day);
        }
        const cam = state.camera;
        // whole orbit in the free space between the side panels, the Sun glowing at the left edge
        cam.position.lerp(tmp.set(1.5, 13.5, 9.5), 0.06);
        cam.lookAt(1.2, 0, 0.6);
    });

    return (
        <>
            <ambientLight intensity={0.06} />
            <directionalLight position={[-60, 0, 0]} intensity={3.2} />
            <group ref={root}>
                {/* the Sun, far to the left */}
                <mesh position={[SUN_X, 0, 0]}>
                    <sphereGeometry args={[1.6, 48, 32]} />
                    <meshBasicMaterial map={sunTex} toneMapped={false} />
                </mesh>
                <sprite position={[SUN_X, 0, 0]} scale={9}>
                    <spriteMaterial map={getGlowTexture()} color="#ffcf7a" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
                </sprite>
                <SunRays />
                <OrbitRing />
                <PhaseMarkers onPick={onPick} phase={phase} />
                <mesh ref={earth}
                    userData={{ handTarget: { id: 'moon-earth', label: 'Земля', onSelect: () => {} } }}>
                    <sphereGeometry args={[EARTH_R, 64, 48]} />
                    <meshStandardMaterial map={earthTex} roughness={0.9} />
                </mesh>
                <mesh ref={moon} userData={{ handTarget: { id: 'moon-moon', label: 'Луна', onSelect: () => {} } }}>
                    <sphereGeometry args={[MOON_R, 48, 32]} />
                    <meshStandardMaterial map={moonTex} roughness={1} />
                </mesh>
                <line ref={sight} geometry={sightGeo}>
                    <lineDashedMaterial color="#e0f2fe" transparent opacity={0.5} dashSize={0.2} gapSize={0.15} />
                </line>
                {showLabels && (
                    <>
                        <Label3D position={[-5.4, 0, 5.6]} color="#fbbf24">← к Солнцу</Label3D>
                        <Label3D position={[-4.6, 0.6, -5.6]} color="#fde68a">Солнечный свет →</Label3D>
                        <Label3D position={[0, -EARTH_R - 0.5, 0]} color="#38bdf8">Земля</Label3D>
                        <group ref={moonLabel}><Label3D color="#e5e7eb">Луна</Label3D></group>
                    </>
                )}
            </group>
        </>
    );
}

// --------------------------------------------------------------------------- the Moon as seen from Earth

function MoonFromEarth({ moonRef }) {
    const moon = useRef(null);
    const moonTex = getTexture('moon.jpg');
    const dir = useMemo(() => new THREE.Vector3(), []);
    useFrame(state => {
        const a = moonRef.current.angle ?? 0;
        // the observer stands on the Earth and looks at the Moon; north is up
        moonPosition(a, dir).normalize();
        state.camera.position.copy(dir).multiplyScalar(-3.1);
        state.camera.up.set(0, 1, 0);
        state.camera.lookAt(0, 0, 0);
        if (moon.current) moon.current.rotation.y = a;
    });
    return (
        <>
            <ambientLight intensity={0.035} />
            <directionalLight position={[-60, 0, 0]} intensity={3.4} />
            <mesh ref={moon}>
                <sphereGeometry args={[1, 64, 48]} />
                <meshStandardMaterial map={moonTex} roughness={1} />
            </mesh>
        </>
    );
}

export function MoonView({ moonRef }) {
    return (
        <div className="moon-view">
            <Canvas camera={{ position: [0, 0, 3.1], fov: 42 }} dpr={[1, 2]}>
                <MoonFromEarth moonRef={moonRef} />
            </Canvas>
        </div>
    );
}

// Flat icon of a phase for the bottom bar (lit part drawn with the terminator ellipse)
export function MoonIcon({ index, size = 40 }) {
    const a = (index / 8) * Math.PI * 2;
    const r = size / 2 - 1;
    const c = size / 2;
    const k = Math.cos(a); // terminator ellipse half-width / r
    const waxing = a <= Math.PI;
    // lit limb: right half while waxing, left half while waning
    const limb = waxing ? `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r}` : `M ${c} ${c - r} A ${r} ${r} 0 0 0 ${c} ${c + r}`;
    const rx = Math.abs(k) * r;
    // the terminator bulges toward the dark side before quarter and toward the lit side after it
    const sweep = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
    const lit = index === 0 ? '' : `${limb} A ${rx} ${r} 0 0 ${sweep} ${c} ${c - r} Z`;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <circle cx={c} cy={c} r={r} fill="#1f2433" stroke="rgba(255,255,255,0.25)" />
            {index === 4 ? <circle cx={c} cy={c} r={r} fill="#f1f0e8" /> : lit && <path d={lit} fill="#f1f0e8" />}
        </svg>
    );
}


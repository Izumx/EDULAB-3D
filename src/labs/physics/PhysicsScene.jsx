// 3D stage of the physics lab: the room, the bodies, trails and vectors. All motion is read from `world` in useFrame.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LabCanvas, Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { ROOM, OBJECTS } from './data';
import {
    world, advance, pickBody, grab, release, moveHeld, snapshot, TRAIL_POINTS, TRAIL_DOTS,
} from './engine';
import { makeBallTexture, makeCrateTexture, makeFeatherTexture, makeFloorTexture, makeWallTexture } from './textures';

const ACCENT = '#fbbf24';
const HAND_MARGIN = 0.45;  // hand tracking is imprecise: grab within 45 cm of a body
const MOUSE_MARGIN = 0.08;
const DEPTH = ROOM.front - ROOM.back;
const ZMID = (ROOM.front + ROOM.back) / 2;

// Mutable input state shared by the pointer listeners and the frame loop
const mouse = { nx: 0, ny: 0, inside: false, down: false, pressed: false, released: false };
const pointer = { hover: -1 };

// Preallocated helpers (no allocations per frame)
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _hit = new THREE.Vector3();
const _dummy = new THREE.Object3D();

// Project normalized screen coords onto the plane z = 0 (result in _hit)
function worldPoint(camera, nx, ny) {
    _ndc.set(nx, ny);
    _ray.setFromCamera(_ndc, camera);
    return _ray.ray.intersectPlane(_plane, _hit) !== null;
}

// Fit the room into the screen area between the side panels
function fitCamera(camera, w, h) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    const side = Math.min(19 * rem, 0.27 * w) + 2.2 * rem;
    const top = 76 + 0.6 * rem;
    const bottom = 13.2 * rem; // the measurements bar lives under the room
    const availW = Math.max(w - 2 * side, w * 0.45);
    const availH = Math.max(h - top - bottom, h * 0.5);
    const ppm = Math.min(availW / (ROOM.w * 1.08 + 0.3), availH / (ROOM.h * 1.08 + 0.3));
    const fov = (camera.fov * Math.PI) / 180;
    const dist = h / (2 * Math.tan(fov / 2) * ppm);
    const lookY = ROOM.h / 2 - (h / 2 - (top + availH / 2)) / ppm;
    camera.position.set(0, lookY + dist * 0.1, dist);
    camera.lookAt(0, lookY, 0);
}

// ---------------------------------------------------------------- room

function Lights() {
    return (
        <>
            <ambientLight intensity={0.45} />
            <hemisphereLight args={['#dfeaff', '#2a1d0c', 0.6]} />
            <directionalLight
                position={[2.5, 7, 6]} intensity={1.9} castShadow
                shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02}
                shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={6} shadow-camera-bottom={-3}
                shadow-camera-near={1} shadow-camera-far={20}
            />
            <directionalLight position={[-5, 3, 4]} intensity={0.5} color="#9fc0ff" />
            <pointLight position={[0, ROOM.h - 0.4, 0.5]} intensity={5} distance={8} decay={2} color="#ffd38a" />
        </>
    );
}

function Edge({ position, size, opacity = 0.9 }) {
    return (
        <mesh position={position}>
            <boxGeometry args={size} />
            <meshBasicMaterial color={ACCENT} toneMapped={false} transparent opacity={opacity} />
        </mesh>
    );
}

function Room({ tint }) {
    const floorTex = useMemo(() => {
        const t = makeFloorTexture();
        t.repeat.set(ROOM.w, DEPTH);
        t.offset.set(0.5, 0);
        return t;
    }, []);
    const wallTex = useMemo(() => makeWallTexture(), []);
    useEffect(() => () => { floorTex.dispose(); wallTex.dispose(); }, [floorTex, wallTex]);

    const floorMat = useRef();
    const wallMat = useRef();
    const target = useMemo(() => new THREE.Color(tint), [tint]);
    useFrame(() => {
        floorMat.current?.color.lerp(target, 0.05);
        wallMat.current?.color.lerp(target, 0.05);
    });

    const { w, h, halfW, back, front } = ROOM;
    const t = 0.035;
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ZMID]} receiveShadow>
                <planeGeometry args={[w, DEPTH]} />
                <meshStandardMaterial ref={floorMat} map={floorTex} roughness={0.85} color="#a9c8ff" />
            </mesh>
            <mesh position={[0, h / 2, back]} receiveShadow>
                <planeGeometry args={[w, h]} />
                <meshStandardMaterial ref={wallMat} map={wallTex} roughness={0.9} color="#a9c8ff" />
            </mesh>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * halfW, h / 2, ZMID]} rotation={[0, (-s * Math.PI) / 2, 0]}>
                    <planeGeometry args={[DEPTH, h]} />
                    <meshStandardMaterial color="#9db7ff" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            ))}
            <mesh position={[0, h, ZMID]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, DEPTH]} />
                <meshStandardMaterial color="#9db7ff" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {/* glowing frame of the stage */}
            <Edge position={[0, 0, front]} size={[w + t, t, t]} />
            <Edge position={[0, h, front]} size={[w + t, t, t]} />
            <Edge position={[-halfW, h / 2, front]} size={[t, h, t]} />
            <Edge position={[halfW, h / 2, front]} size={[t, h, t]} />
            <Edge position={[0, h, back]} size={[w, t, t]} opacity={0.35} />
            <Edge position={[-halfW, h / 2, back]} size={[t, h, t]} opacity={0.35} />
            <Edge position={[halfW, h / 2, back]} size={[t, h, t]} opacity={0.35} />
            <Edge position={[-halfW, 0, ZMID]} size={[t, t, DEPTH]} opacity={0.35} />
            <Edge position={[halfW, 0, ZMID]} size={[t, t, DEPTH]} opacity={0.35} />
        </group>
    );
}

// ---------------------------------------------------------------- bodies

function BallMesh({ def }) {
    const tex = useMemo(() => makeBallTexture(def.id), [def.id]);
    useEffect(() => () => tex.dispose(), [tex]);
    return (
        <mesh castShadow rotation={[0.35, 0.6, 0]}>
            <sphereGeometry args={[def.size, 48, 32]} />
            {def.id === 'bowling'
                ? <meshPhysicalMaterial map={tex} roughness={0.18} metalness={0.05} clearcoat={1} clearcoatRoughness={0.06} />
                : <meshStandardMaterial map={tex} roughness={def.id === 'tennis' ? 0.95 : 0.7} />}
        </mesh>
    );
}

function BoxMesh({ def }) {
    const tex = useMemo(() => makeCrateTexture(), []);
    useEffect(() => () => tex.dispose(), [tex]);
    const s = def.size * 2;
    return (
        <mesh castShadow receiveShadow>
            <boxGeometry args={[s, s, s]} />
            <meshStandardMaterial map={tex} roughness={0.8} />
        </mesh>
    );
}

function FeatherMesh() {
    const tex = useMemo(() => makeFeatherTexture(), []);
    useEffect(() => () => tex.dispose(), [tex]);
    return (
        <mesh position={[0, 0.005, 0]}>
            <planeGeometry args={[0.46, 0.115]} />
            <meshStandardMaterial map={tex} transparent alphaTest={0.2} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
    );
}

// Visual radius used for the selection halo
const haloRadius = (def) => (def.shape === 'box' ? def.size * 1.45 : def.shape === 'feather' ? 0.25 : def.size);

function Body({ def, index, onSelect }) {
    const pos = useRef();
    const rot = useRef();
    const halo = useRef();
    const R = haloRadius(def);

    useFrame((state) => {
        const b = world.bodies[index];
        pos.current.position.set(b.x, b.y, 0);
        rot.current.rotation.z = b.angle;
        const target = world.held === index ? 1 : world.selected === index ? 0.75 : pointer.hover === index ? 0.45 : 0;
        const m = halo.current.material;
        m.opacity += (target - m.opacity) * 0.2;
        halo.current.visible = m.opacity > 0.02;
        const pulse = pointer.hover === index || world.held === index ? 1 + 0.05 * Math.sin(state.clock.elapsedTime * 6) : 1;
        halo.current.scale.setScalar(pulse);
    });

    return (
        <group
            ref={pos}
            userData={{ handTarget: { id: `phys-${def.id}`, label: `${def.name} · ${def.massLabel}`, onSelect: () => onSelect(index) } }}
        >
            <group ref={rot}>
                {def.shape === 'ball' && <BallMesh def={def} />}
                {def.shape === 'box' && <BoxMesh def={def} />}
                {def.shape === 'feather' && <FeatherMesh />}
            </group>
            <mesh ref={halo} visible={false}>
                <ringGeometry args={[R * 1.2, R * 1.36, 56]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

// ---------------------------------------------------------------- trails (ribbon + stroboscope dots)

const RIBBON_W = 0.022;

function makeRibbon() {
    const index = new Uint16Array((TRAIL_POINTS - 1) * 6);
    for (let k = 0; k < TRAIL_POINTS - 1; k++) {
        const a = k * 2;
        index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], k * 6);
    }
    return { pos: new Float32Array(TRAIL_POINTS * 2 * 3), index, built: 0, dotsBuilt: 0, version: -1 };
}
const RIBBONS = [makeRibbon(), makeRibbon()];

function Trail({ which, color }) {
    const mesh = useRef();
    const dots = useRef();
    const { pos, index } = RIBBONS[which];

    useFrame(() => {
        const rb = RIBBONS[which];
        const tr = world.trails[which];
        if (tr.version === rb.version) return;
        rb.version = tr.version;
        const L = tr.line;
        const P = rb.pos;
        const n = tr.n;
        if (n < rb.built) rb.built = 0;
        for (let k = Math.max(0, rb.built - 1); k < n; k++) {
            const p = Math.max(0, k - 1) * 3;
            const q = Math.min(n - 1, k + 1) * 3;
            const dx = L[q] - L[p];
            const dy = L[q + 1] - L[p + 1];
            const len = Math.hypot(dx, dy) || 1;
            const ox = (-dy / len) * RIBBON_W;
            const oy = (dx / len) * RIBBON_W;
            const x = L[k * 3];
            const y = L[k * 3 + 1];
            const o = k * 6;
            P[o] = x + ox; P[o + 1] = y + oy; P[o + 2] = 0;
            P[o + 3] = x - ox; P[o + 4] = y - oy; P[o + 5] = 0;
        }
        rb.built = n;
        const geo = mesh.current.geometry;
        geo.setDrawRange(0, Math.max(0, n - 1) * 6);
        geo.attributes.position.needsUpdate = true;

        const D = tr.dots;
        const inst = dots.current;
        if (tr.nd < rb.dotsBuilt) rb.dotsBuilt = 0;
        for (let k = rb.dotsBuilt; k < tr.nd; k++) {
            _dummy.position.set(D[k * 3], D[k * 3 + 1], 0.02);
            _dummy.updateMatrix();
            inst.setMatrixAt(k, _dummy.matrix);
        }
        rb.dotsBuilt = tr.nd;
        inst.count = tr.nd;
        inst.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <mesh ref={mesh} frustumCulled={false} renderOrder={2}>
                <bufferGeometry drawRange={{ start: 0, count: 0 }}>
                    <bufferAttribute attach="attributes-position" args={[pos, 3]} usage={THREE.DynamicDrawUsage} />
                    <bufferAttribute attach="index" args={[index, 1]} />
                </bufferGeometry>
                <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <instancedMesh ref={dots} args={[undefined, undefined, TRAIL_DOTS]} count={0} frustumCulled={false} renderOrder={3}>
                <sphereGeometry args={[0.045, 12, 8]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </instancedMesh>
        </group>
    );
}

// ---------------------------------------------------------------- vectors and labels

function Arrow({ groupRef, shaftRef, headRef, color, radius = 0.03 }) {
    return (
        <group ref={groupRef} visible={false}>
            <mesh ref={shaftRef}>
                <cylinderGeometry args={[radius, radius, 1, 12]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh ref={headRef}>
                <coneGeometry args={[radius * 3, 0.2, 18]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
        </group>
    );
}

// Set an arrow (pointing along +y in its group) to the given length
function setArrowLength(shaft, head, len) {
    const shaftLen = Math.max(0.001, len - 0.2);
    shaft.scale.y = shaftLen;
    shaft.position.y = shaftLen / 2;
    head.position.y = shaftLen + 0.1;
}

function VelocityArrow() {
    const group = useRef();
    const shaft = useRef();
    const head = useRef();
    useFrame(() => {
        const b = world.bodies[world.selected];
        const s = b ? Math.hypot(b.vx, b.vy) : 0;
        const show = s > 0.08 && world.gal.phase !== 'hold';
        group.current.visible = show;
        if (!show) return;
        const ux = b.vx / s;
        const uy = b.vy / s;
        const ext = b.shape === 'box' ? b.r * Math.min(1 / Math.abs(ux || 1e-6), 1 / Math.abs(uy || 1e-6)) : b.shape === 'feather' ? 0.1 : b.r;
        group.current.position.set(b.x + ux * ext, b.y + uy * ext, 0.05);
        group.current.rotation.z = Math.atan2(uy, ux) - Math.PI / 2;
        setArrowLength(shaft.current, head.current, Math.min(2.4, 0.25 + s * 0.2));
    });
    return <Arrow groupRef={group} shaftRef={shaft} headRef={head} color="#4ade80" />;
}

const G_ARROW_X = ROOM.halfW - 0.45;
const G_ARROW_TOP = ROOM.h - 0.3;

function GravityArrow({ g }) {
    const group = useRef();
    const shaft = useRef();
    const head = useRef();
    const len = useRef(0.7);
    useFrame(() => {
        const target = world.g > 0.01 ? 0.3 + world.g * 0.055 : 0;
        len.current += (target - len.current) * 0.1;
        group.current.visible = len.current > 0.22;
        setArrowLength(shaft.current, head.current, len.current);
    });
    return (
        <group position={[G_ARROW_X, G_ARROW_TOP, -0.2]}>
            <group rotation={[0, 0, Math.PI]}>
                <Arrow groupRef={group} shaftRef={shaft} headRef={head} color="#f87171" radius={0.035} />
            </group>
            <Label3D position={[-0.95, -0.05, 0]} color="#f87171">
                g = {g.toFixed(1).replace('.', ',')} м/с²
            </Label3D>
        </group>
    );
}

function SelectedLabel({ index }) {
    const group = useRef();
    useFrame(() => {
        const b = world.bodies[world.selected];
        if (!b) return;
        const top = b.shape === 'feather' ? 0.12 : b.r;
        group.current.position.set(b.x, Math.min(b.y + top + 0.3, ROOM.h + 0.15), 0);
    });
    const def = OBJECTS[index];
    return (
        <group ref={group}>
            {def && <Label3D position={[0, 0, 0]} color={ACCENT}>{def.name}</Label3D>}
        </group>
    );
}

// ---------------------------------------------------------------- simulation driver

function Simulation({ onSelect, onReadout }) {
    const gl = useThree((s) => s.gl);
    const input = useRef({ src: null, handWas: false, cursor: '', fitKey: '', readoutT: 1, lastKey: '' });

    // Mouse / touch dragging on the canvas
    useEffect(() => {
        const el = gl.domElement;
        const toNdc = (e) => {
            const r = el.getBoundingClientRect();
            mouse.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
            mouse.ny = -((e.clientY - r.top) / r.height) * 2 + 1;
        };
        const down = (e) => {
            if (e.button !== 0) return;
            toNdc(e);
            mouse.down = true;
            mouse.pressed = true;
            el.setPointerCapture?.(e.pointerId);
        };
        const move = (e) => {
            toNdc(e);
            mouse.inside = true;
        };
        const up = (e) => {
            if (!mouse.down) return;
            mouse.down = false;
            mouse.released = true;
            if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
        };
        const leave = () => { mouse.inside = false; };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', leave);
        return () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            el.removeEventListener('pointerleave', leave);
            mouse.down = mouse.pressed = mouse.released = mouse.inside = false;
        };
    }, [gl]);

    // Runs before every other useFrame (priority -1): input -> physics -> readout
    useFrame((state, delta) => {
        const s = input.current;
        const { camera, size } = state;
        const rd = Math.min(delta, 0.1);

        const key = `${size.width}x${size.height}`;
        if (key !== s.fitKey) {
            s.fitKey = key;
            fitCamera(camera, size.width, size.height);
        }

        if (world.held < 0) s.src = null;

        // hand: grab (pinch / fist) near a body, release throws it
        const handGrab = hand.present && hand.grabbing && !hand.grabOverUI;
        if (handGrab && !s.handWas && world.held < 0 && worldPoint(camera, hand.nx, hand.ny)) {
            const i = pickBody(_hit.x, _hit.y, HAND_MARGIN);
            if (i >= 0) {
                grab(i);
                s.src = 'hand';
                onSelect(i);
            }
        }
        if (!handGrab && s.src === 'hand') {
            release(hand.present); // hand lost -> just drop it
            s.src = null;
        }
        s.handWas = handGrab;

        // mouse
        if (mouse.pressed) {
            mouse.pressed = false;
            if (world.held < 0 && worldPoint(camera, mouse.nx, mouse.ny)) {
                const i = pickBody(_hit.x, _hit.y, MOUSE_MARGIN);
                if (i >= 0) {
                    grab(i);
                    s.src = 'mouse';
                    onSelect(i);
                }
            }
        }
        if (mouse.released) {
            mouse.released = false;
            if (s.src === 'mouse') {
                release(true);
                s.src = null;
            }
        }

        if (s.src) {
            const nx = s.src === 'hand' ? hand.nx : mouse.nx;
            const ny = s.src === 'hand' ? hand.ny : mouse.ny;
            if (worldPoint(camera, nx, ny)) moveHeld(_hit.x, _hit.y, rd);
        }

        // hover highlight + mouse cursor
        let hover = -1;
        let mouseHover = -1;
        if (world.held < 0) {
            if (hand.present && worldPoint(camera, hand.nx, hand.ny)) hover = pickBody(_hit.x, _hit.y, HAND_MARGIN);
            if (mouse.inside && worldPoint(camera, mouse.nx, mouse.ny)) {
                mouseHover = pickBody(_hit.x, _hit.y, MOUSE_MARGIN);
                if (hover < 0) hover = mouseHover;
            }
        }
        pointer.hover = hover;
        const cursor = s.src === 'mouse' ? 'grabbing' : mouseHover >= 0 ? 'grab' : 'default';
        if (cursor !== s.cursor) {
            s.cursor = cursor;
            state.gl.domElement.style.cursor = cursor;
        }

        advance(rd);

        // measurements for the panel, ~10 times per second
        s.readoutT += rd;
        if (s.readoutT >= 0.1) {
            s.readoutT = 0;
            const snap = snapshot();
            const k = JSON.stringify(snap);
            if (k !== s.lastKey) {
                s.lastKey = k;
                onReadout(snap);
            }
        }
    }, -1);

    return null;
}

export function PhysicsStage({ tint, g, selected, onSelect, onReadout }) {
    return (
        <div className="phys-stage">
            <LabCanvas lights={false} shadows camera={{ position: [0, 2.4, 13], fov: 35 }}>
                <Lights />
                <Room tint={tint} />
                {OBJECTS.map((def, i) => <Body key={def.id} def={def} index={i} onSelect={onSelect} />)}
                <Trail which={0} color={ACCENT} />
                <Trail which={1} color="#7dd3fc" />
                <VelocityArrow />
                <GravityArrow g={g} />
                <SelectedLabel index={selected} />
                <Simulation onSelect={onSelect} onReadout={onReadout} />
            </LabCanvas>
        </div>
    );
}

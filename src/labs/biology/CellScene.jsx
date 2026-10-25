// 3D cell (animal or plant) with a cut-away, selectable organelles and a camera that turns toward the selection.
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { PickCtx, usePickCtx, useMouseRotate, useWheelZoom } from './pick';
import { Pickable } from './Pickable';
import { makeRimMaterial, makeClipRaycast } from './materials';
import * as G from './geometry';
import { ANIMAL, PLANT } from './layouts';
import { ORGANELLES } from './content';

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const START_ROTATION = [0.12, -Math.PI / 4, 0];

// The cut removes the quadrant x > 0, z > 0 of the cell (planes are in world space and follow the group each frame)
const BASE_PLANES = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];

function syncPlanes(planes, matrix) {
    for (let i = 0; i < planes.length; i++) planes[i].copy(BASE_PLANES[i]).applyMatrix4(matrix);
}

const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const quatTo = dir => new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(...dir).normalize());

function rim(color, opts) {
    const m = makeRimMaterial(color, opts);
    m.side = THREE.DoubleSide;
    return m;
}

function useDispose(items) {
    useEffect(() => () => items.forEach(i => i?.dispose?.()), [items]);
}

// Writes a fixed list of matrices into an InstancedMesh
function useInstances(ref, matrices) {
    useLayoutEffect(() => {
        const mesh = ref.current;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [ref, matrices]);
}

// ---------------------------------------------------------------- shells

function Shell({ id, shape, inset, color, tube, fill }) {
    const geo = useMemo(() => G.shapeGeometry(shape, inset), [shape, inset]);
    const tubes = useMemo(() => G.cutRimGeometries(shape, inset, tube), [shape, inset, tube]);
    const rimMat = useMemo(() => rim(color, { power: 2.2, intensity: 1.0 }), [color]);
    const disposables = useMemo(() => [geo, rimMat, ...tubes], [geo, rimMat, tubes]);
    useDispose(disposables);
    return (
        <Pickable id={id} label={ORGANELLES[id].name} color={color}>
            <mesh geometry={geo} userData={{ noPick: true }}>
                <meshStandardMaterial color={color} transparent opacity={fill} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh geometry={geo} material={rimMat} userData={{ noPick: true }} renderOrder={2} />
            {tubes.map((t, i) => (
                <mesh key={i} geometry={t} userData={{ noClip: true }}>
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.4} />
                </mesh>
            ))}
        </Pickable>
    );
}

function Cytoplasm({ scatter }) {
    const ref = useRef(null);
    useFrame(state => {
        // particles drift slowly, so the cytoplasm feels alive
        if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.1;
    });
    return (
        <Pickable id="cytoplasm" label={ORGANELLES.cytoplasm.name} color={ORGANELLES.cytoplasm.color} hand={false} hoverGlow={false}>
            <points ref={ref}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[scatter.particles, 3]} />
                </bufferGeometry>
                <pointsMaterial color="#f0abfc" size={0.06} sizeAttenuation transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
        </Pickable>
    );
}

// ---------------------------------------------------------------- nucleus

const PORE_COUNT = 44;
const poreMatrices = r => {
    const out = [];
    for (let i = 0; i < PORE_COUNT; i++) {
        const y = 1 - (i / (PORE_COUNT - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const a = i * Math.PI * (3 - Math.sqrt(5));
        const dir = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
        out.push(new THREE.Matrix4().compose(dir.clone().multiplyScalar(r * 1.005), new THREE.Quaternion().setFromUnitVectors(Z, dir), new THREE.Vector3(1, 1, 1)));
    }
    return out;
};

function Nucleus({ L }) {
    const { p, r, nucleolus } = L.nucleus;
    const poresRef = useRef(null);
    const chromatin = useMemo(() => G.chromatinGeometry(r), [r]);
    const pores = useMemo(() => poreMatrices(r), [r]);
    const rimMat = useMemo(() => rim('#a78bfa', { power: 2, intensity: 1.2 }), []);
    useDispose(useMemo(() => [chromatin, rimMat], [chromatin, rimMat]));
    useInstances(poresRef, pores);
    return (
        <>
            <Pickable id="nucleus" label={ORGANELLES.nucleus.name} color={ORGANELLES.nucleus.color} position={p}>
                <mesh>
                    <sphereGeometry args={[r, 48, 32]} />
                    <meshStandardMaterial color="#8b5cf6" emissive="#6d28d9" emissiveIntensity={0.35} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh material={rimMat} userData={{ noPick: true }}>
                    <sphereGeometry args={[r * 1.01, 48, 32]} />
                </mesh>
                <instancedMesh ref={poresRef} args={[undefined, undefined, PORE_COUNT]} userData={{ noPick: true }}>
                    <torusGeometry args={[0.055, 0.017, 8, 14]} />
                    <meshStandardMaterial color="#ede9fe" emissive="#c4b5fd" emissiveIntensity={0.6} />
                </instancedMesh>
                <mesh geometry={chromatin}>
                    <meshStandardMaterial color="#f0abfc" emissive="#c026d3" emissiveIntensity={0.3} roughness={0.5} />
                </mesh>
            </Pickable>
            <Pickable id="nucleolus" label={ORGANELLES.nucleolus.name} color={ORGANELLES.nucleolus.color} position={nucleolus.p}>
                <mesh>
                    <sphereGeometry args={[nucleolus.r, 32, 24]} />
                    <meshStandardMaterial color="#c026d3" emissive="#86198f" emissiveIntensity={0.5} roughness={0.45} />
                </mesh>
            </Pickable>
        </>
    );
}

// ---------------------------------------------------------------- endoplasmic reticulum and ribosomes

const ribosomeMatrices = points => points.map(p => new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]));

function RoughER({ L, scatter }) {
    const ref = useRef(null);
    const geo = useMemo(() => G.rerGeometry(L.rer), [L]);
    const mats = useMemo(() => ribosomeMatrices(scatter.bound), [scatter]);
    useDispose(useMemo(() => [geo], [geo]));
    useInstances(ref, mats);
    return (
        <Pickable id="rer" label={ORGANELLES.rer.name} color={ORGANELLES.rer.color}>
            <mesh geometry={geo}>
                <meshStandardMaterial color="#38bdf8" emissive="#0369a1" emissiveIntensity={0.3} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
            <instancedMesh ref={ref} args={[undefined, undefined, mats.length]}>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0" emissiveIntensity={0.25} />
            </instancedMesh>
        </Pickable>
    );
}

function SmoothER({ L }) {
    const geo = useMemo(() => G.serGeometry(L.ser), [L]);
    useDispose(useMemo(() => [geo], [geo]));
    return (
        <Pickable id="ser" label={ORGANELLES.ser.name} color={ORGANELLES.ser.color}>
            <mesh geometry={geo}>
                <meshStandardMaterial color="#2dd4bf" emissive="#0f766e" emissiveIntensity={0.35} roughness={0.45} />
            </mesh>
        </Pickable>
    );
}

function FreeRibosomes({ scatter }) {
    const ref = useRef(null);
    const mats = useMemo(() => ribosomeMatrices(scatter.ribosomes), [scatter]);
    useInstances(ref, mats);
    return (
        <Pickable id="ribosomes" label={ORGANELLES.ribosomes.name} color={ORGANELLES.ribosomes.color}>
            <instancedMesh ref={ref} args={[undefined, undefined, mats.length]}>
                <sphereGeometry args={[0.05, 8, 6]} />
                <meshStandardMaterial color="#e2e8f0" emissive="#e2e8f0" emissiveIntensity={0.25} />
            </instancedMesh>
        </Pickable>
    );
}

// ---------------------------------------------------------------- Golgi, lysosomes, centrioles

const GOLGI_COLORS = ['#fbbf24', '#f59e0b', '#fbbf24', '#f59e0b', '#fcd34d'];

function Golgi({ L }) {
    const { p, scale = 1, dir } = L.golgi;
    const geos = useMemo(() => GOLGI_COLORS.map((_, j) => G.cisternaGeometry(0.82 - j * 0.05, 0.35)), []);
    const vesicles = useMemo(() => G.golgiVesicles(), []);
    const q = useMemo(() => (dir ? quatTo(dir) : new THREE.Quaternion()), [dir]);
    useDispose(geos);
    return (
        <Pickable id="golgi" label={ORGANELLES.golgi.name} color={ORGANELLES.golgi.color} position={p} scale={scale} quaternion={q}>
            {geos.map((g, j) => (
                <mesh key={j} geometry={g} position={[0, j * 0.15 - 0.3, 0]}>
                    <meshStandardMaterial color={GOLGI_COLORS[j]} emissive="#b45309" emissiveIntensity={0.3} roughness={0.45} side={THREE.DoubleSide} />
                </mesh>
            ))}
            {vesicles.map((v, i) => (
                <mesh key={i} position={v.p}>
                    <sphereGeometry args={[v.r, 14, 10]} />
                    <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={0.35} roughness={0.4} />
                </mesh>
            ))}
        </Pickable>
    );
}

function Lysosomes({ L }) {
    return (
        <Pickable id="lysosomes" label={ORGANELLES.lysosomes.name} color={ORGANELLES.lysosomes.color}>
            {L.lysosomes.map((ly, i) => (
                <group key={i} position={ly.p}>
                    <mesh>
                        <sphereGeometry args={[ly.r, 20, 14]} />
                        <meshStandardMaterial color="#f87171" emissive="#b91c1c" emissiveIntensity={0.4} transparent opacity={0.75} roughness={0.35} />
                    </mesh>
                    <mesh>
                        <sphereGeometry args={[ly.r * 0.5, 12, 10]} />
                        <meshStandardMaterial color="#fecaca" emissive="#fecaca" emissiveIntensity={0.3} />
                    </mesh>
                </group>
            ))}
        </Pickable>
    );
}

function Centrioles({ L }) {
    const ref = useRef(null);
    const mats = useMemo(() => G.centrioleMatrices(), []);
    useInstances(ref, mats);
    return (
        <Pickable id="centrioles" label={ORGANELLES.centrioles.name} color={ORGANELLES.centrioles.color} position={L.centrioles.p}>
            <instancedMesh ref={ref} args={[undefined, undefined, mats.length]}>
                <cylinderGeometry args={[0.02, 0.02, 0.42, 6]} />
                <meshStandardMaterial color="#818cf8" emissive="#4f46e5" emissiveIntensity={0.45} roughness={0.4} />
            </instancedMesh>
        </Pickable>
    );
}

// ---------------------------------------------------------------- mitochondria, chloroplasts, vacuole

function Mitochondria({ L }) {
    const items = useMemo(() => L.mitochondria.map(m => ({ p: m.p, q: quatTo(m.dir) })), [L]);
    const capsule = useMemo(() => new THREE.CapsuleGeometry(0.27, 0.5, 6, 16), []);
    const cristae = useMemo(() => G.cristaeGeometry(6, 0.84), []);
    useDispose(useMemo(() => [capsule, cristae], [capsule, cristae]));
    return (
        <Pickable id="mitochondria" label={ORGANELLES.mitochondria.name} color={ORGANELLES.mitochondria.color}>
            {items.map((it, i) => (
                <group key={i} position={it.p} quaternion={it.q}>
                    <mesh geometry={capsule}>
                        <meshStandardMaterial color="#fb923c" emissive="#c2410c" emissiveIntensity={0.35} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
                    </mesh>
                    <mesh geometry={cristae}>
                        <meshStandardMaterial color="#fdba74" emissive="#ea580c" emissiveIntensity={0.3} roughness={0.5} />
                    </mesh>
                </group>
            ))}
        </Pickable>
    );
}

function Chloroplasts({ L }) {
    const items = useMemo(() => L.chloroplasts.map(c => ({ p: c.p, q: quatTo(c.n) })), [L]);
    const grana = useMemo(() => G.granaGeometry(), []);
    const lamellae = useMemo(() => G.lamellaeGeometry(), []);
    useDispose(useMemo(() => [grana, lamellae], [grana, lamellae]));
    return (
        <Pickable id="chloroplasts" label={ORGANELLES.chloroplasts.name} color={ORGANELLES.chloroplasts.color}>
            {items.map((it, i) => (
                <group key={i} position={it.p} quaternion={it.q}>
                    <mesh scale={[0.46, 0.17, 0.28]}>
                        <sphereGeometry args={[1, 24, 16]} />
                        <meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.35} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
                    </mesh>
                    <mesh geometry={grana}>
                        <meshStandardMaterial color="#15803d" emissive="#166534" emissiveIntensity={0.4} roughness={0.5} />
                    </mesh>
                    <mesh geometry={lamellae}>
                        <meshStandardMaterial color="#86efac" emissive="#4ade80" emissiveIntensity={0.3} roughness={0.5} />
                    </mesh>
                </group>
            ))}
        </Pickable>
    );
}

function Vacuole({ L }) {
    const { p, s } = L.vacuole;
    const rimMat = useMemo(() => rim('#22d3ee', { power: 2.4, intensity: 0.9 }), []);
    useDispose(useMemo(() => [rimMat], [rimMat]));
    return (
        <Pickable id="vacuole" label={ORGANELLES.vacuole.name} color={ORGANELLES.vacuole.color} position={p} scale={s}>
            <mesh>
                <sphereGeometry args={[1, 48, 32]} />
                <meshStandardMaterial color="#22d3ee" emissive="#0e7490" emissiveIntensity={0.25} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh material={rimMat} userData={{ noPick: true }}>
                <sphereGeometry args={[1.005, 48, 32]} />
            </mesh>
        </Pickable>
    );
}

// ---------------------------------------------------------------- camera / rotation rig

// One frame of the rig. Kept outside the hook because it mutates three.js objects.
function stepRig(state, dt, g, s, L, selected, zoom, planes) {
    if (s.tween) {
        if (hand.present && hand.grabbing && !hand.grabOverUI) {
            s.tween = null;
        } else {
            const k = 1 - Math.exp(-dt * 4);
            const dy = wrapAngle(s.tween.yaw - g.rotation.y);
            const dx = s.tween.pitch - g.rotation.x;
            g.rotation.y += dy * k;
            g.rotation.x += dx * k;
            if (Math.abs(dy) < 0.004 && Math.abs(dx) < 0.004) s.tween = null;
        }
    }
    g.updateWorldMatrix(true, false);
    syncPlanes(planes, g.matrixWorld);

    const f = L.focus[selected];
    let dist = L.camDist * (L.type === 'plant' ? 1.05 : 1.3); // leave room for the side panels
    if (f) {
        s.target.set(f.p[0], f.p[1], f.p[2]);
        g.localToWorld(s.target);
        dist = f.d * 1.3;
    } else {
        s.target.set(0, 0, 0);
    }
    dist *= zoom.current;
    s.want.set(s.target.x, s.target.y + dist * 0.05, s.target.z + dist);
    const cam = state.camera;
    if (!s.init) {
        s.pos.copy(cam.position);
        s.look.set(0, 0, 0);
        s.init = true;
    }
    const k = 1 - Math.exp(-dt * 3);
    s.pos.lerp(s.want, k);
    s.look.lerp(s.target, k);
    cam.position.copy(s.pos);
    cam.lookAt(s.look);
}

// Yaw that turns a part toward the viewer. Parts near the cut-away are viewed through the opening (never edge-on to the
// cut plane); parts on the far side are faced directly.
function viewYaw(focus) {
    const CUT = Math.PI / 4;
    if (!focus || Math.hypot(focus.p[0], focus.p[2]) < 0.35) return -CUT;
    const phi = Math.atan2(focus.p[2], focus.p[0]);
    const delta = wrapAngle(CUT - phi);
    const t = Math.min(1, Math.max(0, 1 - (Math.abs(delta) - 0.87) / 0.87));
    const view = phi + delta * t;
    return Math.atan2(-Math.cos(view), Math.sin(view));
}

// Turns the cell so the selected part faces the viewer and flies the camera to it
function useCellRig(root, L, selected, nonce, zoom, planes) {
    const gl = useThree(s => s.gl);
    const st = useRef({ tween: null, pos: new THREE.Vector3(), look: new THREE.Vector3(), target: new THREE.Vector3(), want: new THREE.Vector3(), init: false });

    useEffect(() => {
        st.current.tween = { yaw: viewYaw(L.focus[selected]), pitch: 0.12 };
    }, [L, selected, nonce]);

    // A manual grab cancels the automatic turn
    useEffect(() => {
        const el = gl.domElement;
        const cancel = () => { st.current.tween = null; };
        el.addEventListener('pointerdown', cancel);
        return () => el.removeEventListener('pointerdown', cancel);
    }, [gl]);

    useFrame((state, dt) => {
        if (root.current) stepRig(state, dt, root.current, st.current, L, selected, zoom, planes);
    });
}

// ---------------------------------------------------------------- the scene

export default function CellScene({ type, selected, onSelect, showLabels, zoom, viewNonce }) {
    const L = type === 'plant' ? PLANT : ANIMAL;
    const root = useRef(null);
    const planes = useMemo(() => BASE_PLANES.map(p => p.clone()), []);
    const extra = useMemo(() => ({ planes, raycast: makeClipRaycast(planes) }), [planes]);
    const ctx = usePickCtx(selected, onSelect, extra);
    const scatter = useMemo(() => G.buildScatter(L), [L]);
    const plant = type === 'plant';

    useHandRotate(root, { speed: 0.006 });
    useMouseRotate(root);
    useWheelZoom(zoom);
    useCellRig(root, L, selected, viewNonce, zoom, planes);

    const labelIds = selected ? [selected] : showLabels ? Object.keys(L.labels) : [];

    return (
        <PickCtx.Provider value={ctx}>
            <pointLight position={[2, 1.5, 4]} intensity={26} distance={16} color="#ffe4f1" />
            <group ref={root} rotation={START_ROTATION}>
                {plant && <Shell id="cellWall" shape={L.shape} inset={-0.16} color="#a3e635" tube={0.09} fill={0.07} />}
                <Shell id="membrane" shape={L.shape} inset={0} color="#f472b6" tube={0.06} fill={0.05} />
                <Cytoplasm scatter={scatter} />
                <Nucleus L={L} />
                <RoughER L={L} scatter={scatter} />
                <SmoothER L={L} />
                <Golgi L={L} />
                <Mitochondria L={L} />
                <Lysosomes L={L} />
                <FreeRibosomes scatter={scatter} />
                {plant ? <Vacuole L={L} /> : <Centrioles L={L} />}
                {plant && <Chloroplasts L={L} />}

                {labelIds.map(id => L.labels[id] && (
                    <Label3D key={id} position={L.labels[id]} color={ORGANELLES[id].color}
                        style={selected === id ? { fontSize: '1.15rem', background: 'rgba(7, 11, 22, 0.92)' } : undefined}>
                        {ORGANELLES[id].name}
                    </Label3D>
                ))}
            </group>
        </PickCtx.Provider>
    );
}

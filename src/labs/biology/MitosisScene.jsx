// Mitosis: chromosomes condense, line up on the equator, sister chromatids are pulled to the poles, the cell pinches in two.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { useMouseRotate, useWheelZoom, mulberry32 } from './pick';
import { makeRimMaterial } from './materials';
import { chromatinGeometry } from './geometry';
import { CHROMOSOMES, DAUGHTER_X, PHASE_COUNT, createState, mitosisState } from './mitosis';

const R = 3; // cell radius
const NUC_R = 1.35;
const START_ROTATION = [0.15, 0.35, 0];
const Y = new THREE.Vector3(0, 1, 0);
const tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), m: new THREE.Matrix4() };

// ------------------------------------------------------------------ cell membrane that can pinch in two

function deformCell(geo, base, stretch, pinch) {
    const pos = geo.attributes.position;
    const sx = 1 + stretch;
    for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3] * sx;
        // a waist at the equator; it narrows almost to zero at the end of cytokinesis
        const f = 1 - pinch * Math.exp(-((x / 1.15) ** 2));
        pos.setXYZ(i, x, base[i * 3 + 1] * f, base[i * 3 + 2] * f);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere(); // the cell grows when it stretches; keep frustum culling right
}

function Membrane({ state }) {
    const geo = useMemo(() => new THREE.SphereGeometry(R, 72, 48), []);
    const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
    const rim = useMemo(() => {
        const m = makeRimMaterial('#4ade80', { power: 2.2, intensity: 1.05 });
        m.side = THREE.DoubleSide;
        return m;
    }, []);
    const last = useRef({ stretch: -1, pinch: -1 });
    useEffect(() => () => { geo.dispose(); rim.dispose(); }, [geo, rim]);
    useFrame(() => {
        const s = state.current;
        const l = last.current;
        if (Math.abs(l.stretch - s.stretch) + Math.abs(l.pinch - s.pinch) < 1e-4) return;
        l.stretch = s.stretch;
        l.pinch = s.pinch;
        deformCell(geo, base, s.stretch, s.pinch);
    });
    return (
        <>
            <mesh geometry={geo} renderOrder={2}>
                <meshStandardMaterial color="#86efac" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh geometry={geo} material={rim} renderOrder={3} />
        </>
    );
}

// ------------------------------------------------------------------ chromosomes

const ARM_GEO = new THREE.SphereGeometry(1, 18, 12); // stretched into an ellipsoid arm

// One chromatid = two arms hinged at the centromere
function Chromatid({ index, state, color }) {
    const group = useRef(null);
    const up = useRef(null);
    const down = useRef(null);
    const mats = useRef([]);
    const arm = CHROMOSOMES[index >> 1].arm;

    useFrame(() => {
        const g = group.current;
        const s = state.current;
        const ch = s.chromatids[index];
        if (!g) return;
        g.position.copy(ch.pos);
        g.quaternion.copy(ch.quat);
        // condensing: long thin threads become short thick arms
        const c = s.condense;
        const len = arm * (2.4 - 1.4 * c);
        const r = 0.04 + 0.1 * c;
        for (const [ref, sign] of [[up, 1], [down, -1]]) {
            const m = ref.current;
            m.rotation.z = sign * ch.fold;
            const capsule = m.children[0];
            capsule.position.y = sign * len * 0.47;
            capsule.scale.set(r, len / 2, r);
        }
        g.visible = s.chromVisible > 0.01;
        for (const mat of mats.current) mat.opacity = s.chromVisible;
    });

    const mat = (
        <meshStandardMaterial ref={el => { if (el && !mats.current.includes(el)) mats.current.push(el); }}
            color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} transparent />
    );
    return (
        <group ref={group}>
            <group ref={up}><mesh geometry={ARM_GEO}>{mat}</mesh></group>
            <group ref={down}><mesh geometry={ARM_GEO}>{mat}</mesh></group>
            <mesh scale={0.07}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.6} />
            </mesh>
        </group>
    );
}

// ------------------------------------------------------------------ nucleus, centrioles, spindle

function Nucleus({ state }) {
    const shell = useRef(null);
    const inner = useRef(null);
    const chrom = useRef(null);
    const chromatin = useMemo(() => chromatinGeometry(1.05), []);
    useEffect(() => () => chromatin.dispose(), [chromatin]);
    useFrame(() => {
        const s = state.current;
        shell.current.opacity = 0.35 * s.nucleus;
        inner.current.opacity = s.nucleus;
        chrom.current.opacity = s.chromatin;
        shell.current.visible = inner.current.visible = s.nucleus > 0.01;
        chrom.current.visible = s.chromatin > 0.01;
    });
    return (
        <group>
            <mesh>
                <sphereGeometry args={[NUC_R, 48, 32]} />
                <meshStandardMaterial ref={shell} color="#a78bfa" emissive="#6d28d9" emissiveIntensity={0.35} transparent depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[-0.15, 0.2, 0]} scale={0.4}>
                <sphereGeometry args={[1, 24, 18]} />
                <meshStandardMaterial ref={inner} color="#c026d3" emissive="#86198f" emissiveIntensity={0.5} transparent />
            </mesh>
            <mesh geometry={chromatin} scale={NUC_R / 1.05}>
                <meshStandardMaterial ref={chrom} color="#f9a8d4" emissive="#db2777" emissiveIntensity={0.35} transparent />
            </mesh>
        </group>
    );
}

function DaughterNuclei({ state }) {
    const mats = useRef([]);
    const groups = useRef([]);
    useFrame(() => {
        const s = state.current;
        for (const m of mats.current) m.opacity = 0.32 * s.daughters;
        for (const g of groups.current) if (g) { g.visible = s.daughters > 0.01; g.scale.setScalar(0.6 + 0.4 * s.daughters); }
    });
    return [-1, 1].map((side, i) => (
        <group key={side} position={[side * DAUGHTER_X, 0, 0]} ref={el => { groups.current[i] = el; }}>
            <mesh>
                <sphereGeometry args={[0.85, 40, 28]} />
                <meshStandardMaterial ref={el => { if (el && !mats.current.includes(el)) mats.current.push(el); }}
                    color="#a78bfa" emissive="#6d28d9" emissiveIntensity={0.35} transparent depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    ));
}

const NEAR_NUCLEUS = new THREE.Vector3(0.4, 1.75, 0.5);

function Centrioles({ state }) {
    const groups = useRef([]);
    useFrame(() => {
        const s = state.current;
        groups.current.forEach((g, i) => {
            if (!g) return;
            const side = i === 0 ? -1 : 1;
            tmp.a.set(side * s.poleX, 0, 0);
            // both pairs start side by side next to the nucleus and travel to opposite poles
            tmp.b.copy(NEAR_NUCLEUS).x += side * 0.22;
            g.position.lerpVectors(tmp.b, tmp.a, s.centriole);
        });
    });
    return [0, 1].map(i => (
        <group key={i} ref={el => { groups.current[i] = el; }}>
            {[0, 1].map(j => (
                <mesh key={j} rotation={j ? [0, 0, Math.PI / 2] : [0, 0, 0]} position={j ? [0.1, 0.05, 0] : [-0.08, 0, 0]}>
                    <cylinderGeometry args={[0.07, 0.07, 0.3, 12]} />
                    <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={0.7} roughness={0.4} />
                </mesh>
            ))}
        </group>
    ));
}

// Spindle: fibres from each pole to the centromeres, fibres between the poles and short astral rays
const POLAR = 10;
const ASTRAL = 9;
const FIBRES = CHROMOSOMES.length * 2 + POLAR * 2 + ASTRAL * 2;
const FIBRE_GEO = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);

function setFibre(mesh, i, a, b, r) {
    tmp.d.subVectors(b, a);
    const len = tmp.d.length();
    tmp.q.setFromUnitVectors(Y, tmp.d.multiplyScalar(1 / (len || 1)));
    tmp.s.set(r, len, r);
    tmp.m.compose(tmp.a.addVectors(a, b).multiplyScalar(0.5), tmp.q, tmp.s);
    mesh.setMatrixAt(i, tmp.m);
}

function Spindle({ state }) {
    const ref = useRef(null);
    const mat = useRef(null);
    const astral = useMemo(() => {
        const rng = mulberry32(31);
        return Array.from({ length: ASTRAL }, () => new THREE.Vector3(rng() * 0.8 + 0.2, rng() * 2 - 1, rng() * 2 - 1).normalize());
    }, []);
    const pts = useMemo(() => ({ pole: new THREE.Vector3(), other: new THREE.Vector3(), mid: new THREE.Vector3(), end: new THREE.Vector3() }), []);

    useFrame(() => {
        const s = state.current;
        const mesh = ref.current;
        mesh.visible = s.spindle > 0.01;
        mat.current.opacity = 0.55 * s.spindle;
        if (!mesh.visible) return;
        let n = 0;
        const r = 0.012;
        // kinetochore fibres: each chromatid is held by its own pole
        s.chromatids.forEach((ch, i) => {
            const side = i % 2 === 0 ? -1 : 1;
            pts.pole.set(side * s.poleX, 0, 0);
            setFibre(mesh, n++, pts.pole, ch.pos, r * 1.2);
        });
        // polar fibres bow around the chromosomes
        for (let k = 0; k < POLAR; k++) {
            const a = (k / POLAR) * Math.PI * 2;
            pts.mid.set(0, Math.cos(a) * 1.25, Math.sin(a) * 1.25);
            pts.pole.set(-s.poleX, 0, 0);
            pts.other.set(s.poleX, 0, 0);
            setFibre(mesh, n++, pts.pole, pts.mid, r);
            setFibre(mesh, n++, pts.mid, pts.other, r);
        }
        // astral rays
        for (const side of [-1, 1]) {
            for (const d of astral) {
                pts.pole.set(side * s.poleX, 0, 0);
                pts.end.set(side * d.x, d.y, d.z).multiplyScalar(0.55).add(pts.pole);
                setFibre(mesh, n++, pts.pole, pts.end, r);
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={ref} args={[FIBRE_GEO, undefined, FIBRES]} frustumCulled={false}>
            <meshBasicMaterial ref={mat} color="#fef9c3" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}

// Metaphase plate: a faint disc in the equator plane
function Plate({ state }) {
    const mat = useRef(null);
    const mesh = useRef(null);
    useFrame(() => {
        const s = state.current;
        mat.current.opacity = 0.22 * s.plate;
        mesh.current.visible = s.plate > 0.01;
    });
    return (
        <mesh ref={mesh} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[1.55, 48]} />
            <meshBasicMaterial ref={mat} color="#fde047" transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}

// Labels that follow moving parts
function Labels({ state, phase }) {
    const refs = useRef({});
    useFrame(() => {
        const s = state.current;
        const r = refs.current;
        if (r.chromosome) {
            r.chromosome.position.copy(s.chromatids[0].pos);
            r.chromosome.position.y += 0.75;
            r.chromosome.visible = s.chromVisible > 0.5;
        }
        if (r.centriole) {
            r.centriole.position.set(s.poleX * s.centriole + (1 - s.centriole) * 0.2, 0.55 + (1 - s.centriole) * 1.75, 0);
        }
        if (r.spindle) {
            r.spindle.position.set(-s.poleX * 0.5, -1.0, 0);
            r.spindle.visible = s.spindle > 0.5;
        }
        if (r.nucleus) {
            r.nucleus.position.set(0, -NUC_R - 0.25, 0);
            r.nucleus.visible = s.nucleus > 0.5;
        }
        if (r.plate) {
            r.plate.position.set(0, -1.75, 0);
            r.plate.visible = s.plate > 0.5;
        }
        if (r.daughter) {
            r.daughter.position.set(DAUGHTER_X, -1.1, 0);
            r.daughter.visible = s.daughters > 0.5;
        }
    });
    const items = [
        ['chromosome', 'Хромосома', '#f43f5e', [1, 2, 3]],
        ['centriole', 'Центриоли', '#818cf8', [0, 1, 2, 3, 4]],
        ['spindle', 'Веретено деления', '#fde68a', [2, 3]],
        ['nucleus', 'Ядро', '#a78bfa', [0]],
        ['plate', 'Экватор (метафазная пластинка)', '#fde047', [2]],
        ['daughter', 'Новое ядро', '#a78bfa', [4]],
    ].filter(it => it[3].includes(phase));
    return items.map(([id, text, color]) => (
        <group key={id} ref={el => { refs.current[id] = el; }}>
            <Label3D color={color}>{text}</Label3D>
        </group>
    ));
}

// ------------------------------------------------------------------ the scene

function advance(clock, dt, playing, goto) {
    if (goto.pending) {
        // jump requested by a phase button or the slider: glide there quickly
        const d = goto.target - clock.t;
        clock.t += d * (1 - Math.exp(-dt * 5));
        if (Math.abs(d) < 0.002) {
            clock.t = goto.target;
            goto.pending = false;
        }
    } else if (playing) {
        clock.t += dt * 0.13; // about 8 seconds per phase
        if (clock.t >= PHASE_COUNT) clock.t = 0;
    }
}

export default function MitosisScene({ playing, goto, onProgress, showLabels, zoom, phase }) {
    const root = useRef(null);
    const state = useRef(null);
    if (state.current === null) state.current = createState(goto.t);
    const clock = useRef({ t: goto.t, reported: -1, since: 0 });
    const req = useRef({ target: goto.t, pending: false });

    useHandRotate(root, { speed: 0.006 });
    useMouseRotate(root);
    useWheelZoom(zoom);

    useEffect(() => {
        req.current.target = goto.t;
        req.current.pending = true;
    }, [goto]);

    useFrame((frameState, dt) => {
        const c = clock.current;
        advance(c, Math.min(dt, 0.1), playing && !(hand.present && hand.grabbing && !hand.grabOverUI), req.current);
        mitosisState(c.t, state.current);
        // tell the panel where we are about 8 times a second
        c.since += dt;
        if (c.since > 0.12 && Math.abs(c.t - c.reported) > 0.001) {
            c.since = 0;
            c.reported = c.t;
            onProgress(c.t);
        }
        const cam = frameState.camera;
        const want = (12.5 + state.current.stretch * 9) * zoom.current;
        cam.position.x += (0 - cam.position.x) * 0.08;
        cam.position.y += (1.6 - cam.position.y) * 0.08;
        cam.position.z += (want - cam.position.z) * 0.08;
        cam.lookAt(0, 0, 0);
    });

    return (
        <>
            <pointLight position={[0, 3, 5]} intensity={30} distance={20} color="#ecfccb" />
            <group ref={root} rotation={START_ROTATION}>
                <Membrane state={state} />
                <Nucleus state={state} />
                <DaughterNuclei state={state} />
                <Plate state={state} />
                <Spindle state={state} />
                <Centrioles state={state} />
                {CHROMOSOMES.flatMap((ch, c) => [0, 1].map(s => (
                    <Chromatid key={`${c}-${s}`} index={c * 2 + s} state={state} color={ch.color} />
                )))}
                {showLabels && <Labels state={state} phase={phase} />}
            </group>
        </>
    );
}

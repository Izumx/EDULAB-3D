// 3D scene of the molecule constructor: loose atoms floating in a flask, snapping into the real molecule geometry.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { ELEMENTS } from './elements';
import { MAX_ATOMS, chargeSup } from './match';

const S = 1; // scene units per angstrom
const FLASK_R = 3.4;
const SNAP = 1.15; // seconds the atoms need to fly into the molecule

const V = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    x: new THREE.Vector3(),
    z: new THREE.Vector3(),
    m: new THREE.Matrix4(),
};
const REF_Z = new THREE.Vector3(0, 0, 1);
const REF_Y = new THREE.Vector3(0, 1, 0);

const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// Display radius of an atom ball (ions in a crystal are drawn by their ionic radius)
const radiusOf = (el, ion) => S * (ion ? 0.5 * (ELEMENTS[el].ionR ?? ELEMENTS[el].r) + 0.08 : 0.2 + 0.38 * ELEMENTS[el].r);

// Fixed slots on a shell inside the flask; consecutive atoms land far apart so they never overlap
function flaskSlot(i) {
    const k = (i * 5) % MAX_ATOMS;
    const y = 1 - (2 * (k + 0.5)) / MAX_ATOMS;
    const ring = Math.sqrt(1 - y * y);
    const a = k * Math.PI * (3 - Math.sqrt(5));
    const r = 2.05;
    return new THREE.Vector3(Math.cos(a) * ring * r, y * r * 0.9, Math.sin(a) * ring * r);
}

// ---------------------------------------------------------------- the plan: where every atom wants to be

function centroid(atoms) {
    const c = [0, 0, 0];
    let n = 0;
    for (const a of atoms) {
        if (a.x) continue;
        c[0] += a.p[0]; c[1] += a.p[1]; c[2] += a.p[2];
        n++;
    }
    return c.map(v => v / (n || 1));
}

// Flask atoms get the molecule slots of their element in order; neighbour ions of crystals are extra "ghost" atoms
function makePlan(atoms, mol) {
    if (!mol) {
        return {
            radius: 0,
            items: atoms.map((a, i) => ({ key: a.id, el: a.el, target: flaskSlot(i), start: flaskSlot(i).multiplyScalar(0.3), rad: radiusOf(a.el, false), ion: null, bob: true })),
            bonds: [],
        };
    }
    const c = centroid(mol.atoms);
    const pos = mol.atoms.map(a => new THREE.Vector3((a.p[0] - c[0]) * S, (a.p[1] - c[1]) * S, (a.p[2] - c[2]) * S));
    const pool = {};
    atoms.forEach(a => { (pool[a.el] ||= []).push(a); });
    const keyOf = [];
    const items = [];
    mol.atoms.forEach((a, i) => {
        if (a.x) {
            keyOf[i] = `ghost-${i}`;
            items.push({ key: keyOf[i], el: a.el, target: pos[i], start: pos[i].clone(), rad: radiusOf(a.el, !!a.q), ion: a.q ?? null, ghost: true, bob: false });
        } else {
            const src = pool[a.el].shift();
            keyOf[i] = src.id;
            items.push({ key: src.id, el: a.el, target: pos[i], start: null, rad: radiusOf(a.el, !!a.q), ion: a.q ?? null, bob: false });
        }
    });
    const radius = pos.reduce((m, p, i) => Math.max(m, p.length() + radiusOf(mol.atoms[i].el, !!mol.atoms[i].q)), 0);
    const bonds = mol.bonds.map(([i, j, order]) => ({ a: keyOf[i], b: keyOf[j], order }));
    return { radius, items, bonds };
}

// ---------------------------------------------------------------- atoms

function AtomMesh({ item, sim, labels, glow, onPick, mode }) {
    const group = useRef(null);
    const mat = useRef(null);
    const el = ELEMENTS[item.el];
    const label = item.ion ? `${item.el}${chargeSup(item.ion)}` : item.el;

    useLayoutEffect(() => {
        sim.map.set(item.key, { pos: (item.start ?? item.target).clone(), rad: item.rad * 0.15, sc: 0, t: 0 });
        return () => { sim.map.delete(item.key); };
    }, [sim, item.key]); // eslint-disable-line react-hooks/exhaustive-deps

    useFrame((state, dt) => {
        const st = sim.map.get(item.key);
        const g = group.current;
        if (!st || !g) return;
        st.t += dt;
        // flying atoms follow their target; later atoms leave a little later for a fluid snap
        const k = 1 - Math.exp(-dt * (mode === 'molecule' ? 4.2 : 5.5));
        V.a.copy(item.target);
        if (item.bob) {
            const t = state.clock.elapsedTime;
            V.a.x += Math.sin(t * 0.9 + item.rad * 9) * 0.1;
            V.a.y += Math.sin(t * 1.1 + item.rad * 5) * 0.12;
            V.a.z += Math.cos(t * 0.8 + item.rad * 7) * 0.1;
        }
        st.pos.lerp(V.a, k);
        st.rad += (item.rad - st.rad) * (1 - Math.exp(-dt * 5));
        st.sc += (1 - st.sc) * (1 - Math.exp(-dt * 7));
        g.position.copy(st.pos);
        g.scale.setScalar(Math.max(st.rad * st.sc, 1e-3));
        if (mat.current) mat.current.emissiveIntensity += ((glow ? 0.75 : 0.18) - mat.current.emissiveIntensity) * 0.2;
    });

    return (
        <group ref={group}
            userData={item.ghost ? undefined : { handTarget: { id: item.key, label: `${el.name}${item.ion ? ` (ион ${item.el}${chargeSup(item.ion)})` : ''}`, onSelect: () => onPick(item.el) } }}
            onClick={e => { if (e.delta > 8) return; e.stopPropagation(); onPick(item.el); }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <mesh>
                <sphereGeometry args={[1, 40, 28]} />
                <meshPhysicalMaterial ref={mat} color={el.color} emissive={el.color} emissiveIntensity={0.18} roughness={0.32} metalness={0.05}
                    clearcoat={0.7} clearcoatRoughness={0.25} transparent={!!item.ghost} opacity={item.ghost ? 0.38 : 1} depthWrite={!item.ghost} />
            </mesh>
            {labels && !item.ghost && (
                <Label3D position={[0, 1.45, 0]} style={{ fontSize: '1rem' }}>
                    {label}
                </Label3D>
            )}
        </group>
    );
}

// ---------------------------------------------------------------- bonds

const BOND_GEO = new THREE.CylinderGeometry(1, 1, 1, 14, 1, false);
const BOND_STYLES = {
    0: [{ x: 0, r: 0.025, o: 0.55, solid: false }],
    1: [{ x: 0, r: 0.075, o: 1, solid: true }],
    1.5: [{ x: 0, r: 0.075, o: 1, solid: true }, { x: -0.16, r: 0.04, o: 0.55, solid: false }],
    2: [{ x: -0.1, r: 0.06, o: 1, solid: true }, { x: 0.1, r: 0.06, o: 1, solid: true }],
    3: [{ x: -0.14, r: 0.052, o: 1, solid: true }, { x: 0, r: 0.052, o: 1, solid: true }, { x: 0.14, r: 0.052, o: 1, solid: true }],
};

function Bond({ bond, sim }) {
    const group = useRef(null);
    const styles = BOND_STYLES[bond.order] ?? BOND_STYLES[1];

    useFrame(() => {
        const g = group.current;
        const A = sim.map.get(bond.a);
        const B = sim.map.get(bond.b);
        if (!g || !A || !B) return;
        const k = smooth(0, 1, sim.bond);
        g.visible = k > 0.01;
        if (!g.visible) return;
        V.a.copy(B.pos).sub(A.pos);
        const len = V.a.length();
        if (len < 1e-4) return;
        V.a.multiplyScalar(1 / len);
        // frame: y along the bond, x perpendicular to it and to the reference axis (so double bonds lie flat)
        V.x.crossVectors(V.a, Math.abs(V.a.z) > 0.9 ? REF_Y : REF_Z).normalize();
        V.z.crossVectors(V.x, V.a);
        V.m.makeBasis(V.x, V.a, V.z);
        g.quaternion.setFromRotationMatrix(V.m);
        g.position.copy(A.pos).add(B.pos).multiplyScalar(0.5);
        g.scale.set(k, len, k);
    });

    return (
        <group ref={group} visible={false}>
            {styles.map((s, i) => (
                <mesh key={i} geometry={BOND_GEO} position={[s.x, 0, 0]} scale={[s.r, 1, s.r]}>
                    <meshStandardMaterial color="#cbd5e1" emissive="#94a3b8" emissiveIntensity={0.25} roughness={0.4} transparent={s.o < 1} opacity={s.o} depthWrite={s.o >= 1} />
                </mesh>
            ))}
        </group>
    );
}

// ---------------------------------------------------------------- effects

const rng = seed => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const BURST_N = 160;

// Sparks flying out of the molecule at the moment the atoms click together
function Burst({ formKey, colors }) {
    const points = useRef(null);
    const light = useRef(null);
    const ring = useRef(null);
    const born = useRef(-1);
    const data = useMemo(() => {
        const r = rng(formKey * 7919 + 13);
        const pos = new Float32Array(BURST_N * 3);
        const dir = new Float32Array(BURST_N * 3);
        const col = new Float32Array(BURST_N * 3);
        const tmp = new THREE.Color();
        for (let i = 0; i < BURST_N; i++) {
            const u = r() * 2 - 1;
            const a = r() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            const speed = 1.2 + r() * 2.6;
            dir[i * 3] = Math.cos(a) * s * speed;
            dir[i * 3 + 1] = u * speed;
            dir[i * 3 + 2] = Math.sin(a) * s * speed;
            tmp.set(colors[Math.floor(r() * colors.length)]).lerp(new THREE.Color('#ffffff'), 0.35);
            col.set([tmp.r, tmp.g, tmp.b], i * 3);
        }
        return { pos, dir, col };
    }, [formKey, colors]);

    useFrame((state) => {
        if (born.current < 0) born.current = state.clock.elapsedTime + SNAP * 0.82;
        const age = state.clock.elapsedTime - born.current;
        const p = points.current;
        if (!p) return;
        const visible = age > 0 && age < 1.8;
        p.visible = visible;
        if (ring.current) ring.current.visible = visible;
        if (light.current) light.current.intensity = age > 0 ? 55 * Math.exp(-age * 3.4) : 0;
        if (!visible) return;
        const e = 1 - Math.exp(-age * 2.4);
        const arr = p.geometry.attributes.position.array;
        for (let i = 0; i < BURST_N * 3; i++) arr[i] = data.dir[i] * e;
        p.geometry.attributes.position.needsUpdate = true;
        p.material.opacity = Math.max(0, 1 - age / 1.8);
        if (ring.current) {
            ring.current.scale.setScalar(0.5 + e * 5.5);
            ring.current.material.opacity = Math.max(0, 0.7 - age * 0.45);
        }
    });

    return (
        <>
            <points ref={points} visible={false} frustumCulled={false}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
                    <bufferAttribute attach="attributes-color" args={[data.col, 3]} />
                </bufferGeometry>
                <pointsMaterial size={0.16} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
            </points>
            <mesh ref={ring} visible={false} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.92, 1, 64]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <pointLight ref={light} intensity={0} distance={14} color="#ffffff" />
        </>
    );
}

const flaskVertex = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
}`;
const flaskFragment = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity;
varying vec3 vN; varying vec3 vV;
void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    gl_FragColor = vec4(uColor * f * 1.4, f * uOpacity);
}`;

// A soft glass sphere around the loose atoms; it fades once a molecule has formed
function Flask({ visible }) {
    const mat = useRef(null);
    const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#22d3ee') }, uOpacity: { value: 1 } }), []);
    useFrame((_, dt) => {
        const u = mat.current?.uniforms.uOpacity;
        if (u) u.value += ((visible ? 1 : 0) - u.value) * (1 - Math.exp(-dt * 4));
    });
    return (
        <mesh>
            <sphereGeometry args={[FLASK_R, 64, 48]} />
            <shaderMaterial ref={mat} vertexShader={flaskVertex} fragmentShader={flaskFragment} transparent depthWrite={false}
                blending={THREE.AdditiveBlending} side={THREE.DoubleSide} uniforms={uniforms} />
        </mesh>
    );
}

// ---------------------------------------------------------------- the scene

function stepScene(state, dt, g, sim, mol, plan, zoom, shake) {
    const cam = state.camera;
    // camera distance follows the size of what is on screen
    const want = (mol ? Math.min(22, Math.max(5.6, plan.radius * 2.5 + 3)) : 12) * zoom.current;
    cam.position.x += (0 - cam.position.x) * (1 - Math.exp(-dt * 3));
    cam.position.y += (0.4 - cam.position.y) * (1 - Math.exp(-dt * 3));
    cam.position.z += (want - cam.position.z) * (1 - Math.exp(-dt * 2.4));
    cam.lookAt(0, 0, 0);

    const holding = hand.present && hand.grabbing && !hand.grabOverUI;
    if (!holding && !sim.dragging) g.rotation.y += dt * (mol ? 0.22 : 0.08);

    // wrong combination: a quick shake
    if (shake.current > 0) {
        shake.current = Math.max(0, shake.current - dt);
        g.position.x = Math.sin(shake.current * 55) * 0.18 * Math.min(1, shake.current * 4);
    } else {
        g.position.x = 0;
    }
    sim.bond = mol ? smooth(SNAP * 0.55, SNAP * 0.95, sim.sinceForm) : 0;
    sim.sinceForm += dt;
}

// A new molecule restarts the snap timers and turns the model to its nicest view
function startForm(sim, group, mol) {
    sim.sinceForm = 0;
    if (mol && group) {
        group.rotation.x = mol.view[0];
        group.rotation.y = mol.view[1];
    }
}

export default function ChemScene({ atoms, mol, formKey, labels, picked, onPick, zoom, shakeKey }) {
    const root = useRef(null);
    const [sim] = useState(() => ({ map: new Map(), bond: 0, sinceForm: 0, dragging: false }));
    const shake = useRef(0);
    const gl = useThree(s => s.gl);
    const plan = useMemo(() => makePlan(atoms, mol), [atoms, mol]);
    const colors = useMemo(() => (mol ? [...new Set(mol.atoms.map(a => ELEMENTS[a.el].color))] : ['#ffffff']), [mol]);

    useHandRotate(root, { speed: 0.006 });

    // Mouse drag rotates the scene; the idle spin pauses meanwhile
    useEffect(() => {
        const el = gl.domElement;
        let down = false, x = 0, y = 0;
        const onDown = e => { if (e.button === 0) { down = true; sim.dragging = true; x = e.clientX; y = e.clientY; } };
        const onMove = e => {
            if (!down || !root.current) return;
            root.current.rotation.y += (e.clientX - x) * 0.008;
            root.current.rotation.x = Math.max(-1.2, Math.min(1.2, root.current.rotation.x + (e.clientY - y) * 0.008));
            x = e.clientX; y = e.clientY;
        };
        const onUp = () => { down = false; sim.dragging = false; };
        const onWheel = e => { e.preventDefault(); zoom.current = Math.max(0.55, Math.min(1.6, zoom.current * (e.deltaY > 0 ? 1.08 : 0.93))); };
        el.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            el.removeEventListener('wheel', onWheel);
        };
    }, [gl, sim, zoom]);

    useEffect(() => {
        startForm(sim, root.current, mol);
    }, [formKey, mol, sim]);

    useEffect(() => {
        if (shakeKey) shake.current = 0.55;
    }, [shakeKey]);

    useFrame((state, dt) => {
        if (root.current) stepScene(state, dt, root.current, sim, mol, plan, zoom, shake);
    });

    return (
        <>
            <pointLight position={[-4, 3, 5]} intensity={40} distance={30} color="#bff3ff" />
            <Sparkles count={60} scale={[16, 10, 8]} size={2.5} speed={0.25} opacity={0.35} color="#9be7ff" />
            <group ref={root}>
                <Flask visible={!mol} />
                {plan.items.map(item => (
                    <AtomMesh key={item.key} item={item} sim={sim} labels={labels} glow={picked === item.el} onPick={onPick} mode={mol ? 'molecule' : 'flask'} />
                ))}
                {plan.bonds.map((b, i) => <Bond key={`${formKey}-${i}`} bond={b} sim={sim} />)}
                {mol && <Burst key={formKey} formKey={formKey} colors={colors} />}
            </group>
        </>
    );
}

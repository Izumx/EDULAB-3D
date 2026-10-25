// «Реакции»: reactant molecules on top, faint product outlines below (the side panels leave a tall free area). When the equation is balanced and
// started, bonds break, every atom flies to its place in a product molecule and new bonds form.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { ELEMENTS } from './elements';
import { BY_ID } from './match';

const GAP = 0.9; // space between molecules, Å
const SIDE_GAP = 1.1; // half of the space for the arrow between reactants (top) and products (bottom)
const MAX_ROW = 7; // Å: longer rows wrap
const DURATION = 3.4; // seconds of the reaction animation
const UP = new THREE.Vector3(0, 1, 0);
const REF = new THREE.Vector3(0, 0, 1);
const tmp = { d: new THREE.Vector3(), x: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4() };

const radiusOf = el => 0.2 + 0.38 * ELEMENTS[el].r;
const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// Real atoms of a molecule (crystal neighbours dropped), centred and turned to its nice view
function moleculeAtoms(mol) {
    const real = mol.atoms.map((a, i) => ({ ...a, i })).filter(a => !a.x);
    const c = real.reduce((s, a) => s.add(new THREE.Vector3(...a.p)), new THREE.Vector3()).multiplyScalar(1 / real.length);
    const rot = new THREE.Euler(mol.view[0] * 0.6, mol.view[1] * 0.6, 0);
    const atoms = real.map(a => ({ el: a.el, src: a.i, p: new THREE.Vector3(...a.p).sub(c).applyEuler(rot) }));
    const radius = atoms.reduce((m, a) => Math.max(m, a.p.length() + radiusOf(a.el)), 0.4);
    const index = new Map(atoms.map((a, k) => [a.src, k]));
    const bonds = mol.bonds
        .filter(([i, j]) => index.has(i) && index.has(j))
        .map(([i, j, order]) => [index.get(i), index.get(j), order || 1]);
    return { atoms, bonds, radius };
}

// Lays out the molecules of one side in rows, centred on x. Reactants (dir = 1) go above the arrow, products below.
function layoutSide(side, coefs, dir) {
    const items = [];
    side.forEach(([id], i) => {
        const shape = moleculeAtoms(BY_ID.get(id));
        for (let k = 0; k < coefs[i]; k++) items.push(shape);
    });
    const rowsOf = [];
    let row = [];
    let w = 0;
    for (const it of items) {
        const add = it.radius * 2 + (row.length ? GAP : 0);
        if (row.length && w + add > MAX_ROW) {
            rowsOf.push(row);
            row = [];
            w = 0;
        }
        row.push(it);
        w += it.radius * 2 + (row.length > 1 ? GAP : 0);
    }
    if (row.length) rowsOf.push(row);

    const atoms = [];
    const bonds = [];
    let width = 0;
    let y = dir * SIDE_GAP;
    for (const r of rowsOf) {
        const h = Math.max(...r.map(it => it.radius));
        y += dir * h;
        const rw = r.reduce((sum, it) => sum + it.radius * 2, 0) + GAP * (r.length - 1);
        width = Math.max(width, rw);
        let x = -rw / 2;
        for (const it of r) {
            const cx = x + it.radius;
            const base = atoms.length;
            it.atoms.forEach(a => atoms.push({ el: a.el, pos: a.p.clone().add(new THREE.Vector3(cx, y, 0)) }));
            it.bonds.forEach(([i, j, o]) => bonds.push([base + i, base + j, o]));
            x += it.radius * 2 + GAP;
        }
        y += dir * (h + GAP * 0.6);
    }
    return { atoms, bonds, width, extent: Math.abs(y) };
}

// Each reactant atom gets a product slot of the same element: both lists sorted left to right
function matchAtoms(from, to) {
    const target = new Array(from.length).fill(null);
    const els = new Set(from.map(a => a.el));
    for (const el of els) {
        const a = from.map((x, i) => ({ x, i })).filter(o => o.x.el === el).sort((p, q) => p.x.pos.x - q.x.pos.x);
        const b = to.map((x, i) => ({ x, i })).filter(o => o.x.el === el).sort((p, q) => p.x.pos.x - q.x.pos.x);
        a.forEach((o, k) => { if (b[k]) target[o.i] = b[k].i; });
    }
    return target;
}

// Small deterministic random generator, so a reaction always looks the same
function makeRng(seed) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
    };
}

// ------------------------------------------------------------------ bonds

const BOND_GEO = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false);
const OFFSETS = { 1: [0], 1.5: [0, -0.15], 2: [-0.09, 0.09], 3: [-0.13, 0, 0.13] };

function placeBond(group, a, b, k) {
    tmp.d.subVectors(b, a);
    const len = tmp.d.length();
    if (len < 1e-4) return;
    tmp.d.multiplyScalar(1 / len);
    tmp.x.crossVectors(tmp.d, Math.abs(tmp.d.z) > 0.9 ? UP : REF).normalize();
    tmp.z.crossVectors(tmp.x, tmp.d);
    tmp.m.makeBasis(tmp.x, tmp.d, tmp.z);
    group.quaternion.setFromRotationMatrix(tmp.m);
    group.position.addVectors(a, b).multiplyScalar(0.5);
    group.scale.set(k, len, k);
}

function Bonds({ list, getPos, visibility, ghost }) {
    const refs = useRef([]);
    const mats = useRef([]);
    useFrame(() => {
        const v = visibility();
        list.forEach(([i, j], n) => {
            const g = refs.current[n];
            if (!g) return;
            g.visible = v > 0.01;
            if (g.visible) placeBond(g, getPos(i), getPos(j), Math.max(v, 0.05));
        });
        for (const m of mats.current) if (m) m.opacity = (ghost ? 0.25 : 1) * Math.min(1, v * 1.5);
    });
    let mi = 0;
    return list.map(([, , order], n) => (
        <group key={n} ref={el => { refs.current[n] = el; }} visible={false}>
            {(OFFSETS[order] ?? OFFSETS[1]).map((off, k) => {
                const idx = mi++;
                const thin = order === 1.5 && k === 1;
                return (
                    <mesh key={k} geometry={BOND_GEO} position={[off, 0, 0]} scale={[thin ? 0.035 : order >= 2 ? 0.055 : 0.075, 1, thin ? 0.035 : order >= 2 ? 0.055 : 0.075]}>
                        <meshStandardMaterial ref={el => { mats.current[idx] = el; }} color="#cbd5e1" emissive="#94a3b8" emissiveIntensity={0.25}
                            roughness={0.4} transparent />
                    </mesh>
                );
            })}
        </group>
    ));
}

// ------------------------------------------------------------------ scene

function stepAtoms(meshes, plan, e, time) {
    plan.left.atoms.forEach((a, i) => {
        const mesh = meshes[i];
        if (!mesh) return;
        const t = plan.target[i];
        const to = t === null ? a.pos : plan.right.atoms[t].pos;
        // each atom leaves at a slightly different moment and flies along its own arc
        const k = smooth(0.12 + plan.delay[i] * 0.18, 0.88, e);
        mesh.position.lerpVectors(a.pos, to, k);
        mesh.position.x += Math.sin(Math.PI * k) * plan.lift[i];
        mesh.position.z += Math.sin(Math.PI * k) * plan.swing[i];
        // a small shiver while the bonds are breaking
        const shake = e > 0.02 && e < 0.2 ? 0.05 * Math.sin(time * 40 + i) : 0;
        mesh.position.x += shake;
    });
}

export default function ReactionScene({ reaction, leftCoefs, rightCoefs, runKey, onDone, labels, zoom }) {
    const root = useRef(null);
    const meshes = useRef([]);
    const anim = useRef({ e: 0, running: false, doneSent: false });
    const gl = useThree(s => s.gl);

    const plan = useMemo(() => {
        const left = layoutSide(reaction.left, leftCoefs, 1);
        const right = layoutSide(reaction.right, rightCoefs, -1);
        const target = matchAtoms(left.atoms, right.atoms);
        const rnd = makeRng(7);
        const delay = left.atoms.map(() => rnd());
        const lift = left.atoms.map(() => (rnd() - 0.5) * 2.4); // sideways arc, x
        const swing = left.atoms.map(() => (rnd() - 0.5) * 2.2);
        // product bonds address product slots; turn them into the reactant atoms that will sit there
        const owner = new Map(target.map((t, i) => [t, i]));
        const productBonds = right.bonds.filter(([i, j]) => owner.has(i) && owner.has(j)).map(([i, j, o]) => [owner.get(i), owner.get(j), o]);
        // centre of the picture, nudged down a little: the equation bar covers the bottom of the screen
        const mid = (left.extent - right.extent) / 2 - 0.6;
        return { left, right, target, delay, lift, swing, productBonds, mid };
    }, [reaction, leftCoefs, rightCoefs]);

    useHandRotate(root, { speed: 0.005, maxTilt: 0.8 });

    // mouse drag rotates the scene
    useEffect(() => {
        const el = gl.domElement;
        let down = false, x = 0, y = 0;
        const onDown = e => { if (e.button === 0) { down = true; x = e.clientX; y = e.clientY; } };
        const onMove = e => {
            if (!down || !root.current) return;
            root.current.rotation.y += (e.clientX - x) * 0.006;
            root.current.rotation.x = Math.max(-0.8, Math.min(0.8, root.current.rotation.x + (e.clientY - y) * 0.006));
            x = e.clientX; y = e.clientY;
        };
        const onUp = () => { down = false; };
        el.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            el.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [gl]);

    // a new run starts from the reactants; any change of the equation resets the picture
    useEffect(() => {
        anim.current = { e: 0, running: runKey > 0, doneSent: false };
    }, [runKey, plan]);

    const getPos = i => meshes.current[i]?.position ?? plan.left.atoms[i].pos;

    useFrame((state, dt) => {
        const a = anim.current;
        if (a.running) {
            a.e = Math.min(1, a.e + dt / DURATION);
            if (a.e >= 1 && !a.doneSent) {
                a.doneSent = true;
                onDone();
            }
        }
        stepAtoms(meshes.current, plan, a.e, state.clock.elapsedTime);

        const cam = state.camera;
        // fit the free area between the side panels (about a third of the width, two thirds of the height)
        const span = Math.max(plan.left.width, plan.right.width);
        const height = plan.left.extent + plan.right.extent;
        const want = Math.max(9, span * 1.9, height * 1.75) * zoom.current;
        cam.position.x += (0 - cam.position.x) * 0.08;
        cam.position.y += (plan.mid + 0.8 - cam.position.y) * 0.08;
        cam.position.z += (want - cam.position.z) * 0.08;
        cam.lookAt(0, plan.mid, 0);
        if (root.current && !(hand.present && hand.grabbing)) root.current.rotation.y *= 0.995; // drift back to the front
    });

    const ghostsVisible = () => 1 - smooth(0.75, 0.95, anim.current.e);
    const reactantBonds = () => 1 - smooth(0.02, 0.2, anim.current.e);
    const productBonds = () => smooth(0.86, 1, anim.current.e);

    return (
        <>
            <pointLight position={[-4, 4, 6]} intensity={40} distance={40} color="#bff3ff" />
            <group ref={root}>
                {/* atoms of the reactants (they become the products) */}
                {plan.left.atoms.map((a, i) => (
                    <mesh key={`${reaction.id}-${i}`} ref={el => { meshes.current[i] = el; }} position={a.pos}
                        userData={{ handTarget: { id: `r-atom-${i}`, label: ELEMENTS[a.el].name, onSelect: () => {} } }}>
                        <sphereGeometry args={[radiusOf(a.el), 32, 24]} />
                        <meshPhysicalMaterial color={ELEMENTS[a.el].color} emissive={ELEMENTS[a.el].color} emissiveIntensity={0.18}
                            roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.25} />
                        {labels && plan.left.atoms.length <= 12 && <Label3D position={[0, radiusOf(a.el) + 0.25, 0]} style={{ fontSize: '0.9rem' }}>{a.el}</Label3D>}
                    </mesh>
                ))}
                <Bonds list={plan.left.bonds} getPos={getPos} visibility={reactantBonds} />
                <Bonds list={plan.productBonds} getPos={getPos} visibility={productBonds} />

                {/* faint outlines of the products: where the atoms are going */}
                <GhostProducts plan={plan} visible={ghostsVisible} />
                <Label3D position={[0, 0, 0]} style={{ fontSize: '2.4rem', padding: '0 0.4em', background: 'transparent', border: 0 }}>↓</Label3D>
            </group>
        </>
    );
}

function GhostProducts({ plan, visible }) {
    const group = useRef(null);
    const mats = useRef([]);
    useFrame(() => {
        const v = visible();
        if (group.current) group.current.visible = v > 0.01;
        for (const m of mats.current) if (m) m.opacity = 0.22 * v;
    });
    const fixed = i => plan.right.atoms[i].pos;
    return (
        <group ref={group}>
            {plan.right.atoms.map((a, i) => (
                <mesh key={i} position={a.pos}>
                    <sphereGeometry args={[radiusOf(a.el), 24, 18]} />
                    <meshStandardMaterial ref={el => { mats.current[i] = el; }} color={ELEMENTS[a.el].color} transparent opacity={0.22} depthWrite={false} />
                </mesh>
            ))}
            <Bonds list={plan.right.bonds} getPos={fixed} visibility={visible} ghost />
        </group>
    );
}

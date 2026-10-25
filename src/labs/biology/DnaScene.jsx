// DNA double helix: coloured base pairs (A=T, G≡C), sugar-phosphate backbones and a replication-fork animation.
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { PickCtx, usePickCtx, useMouseRotate, useWheelZoom } from './pick';
import { Pickable } from './Pickable';
import { makeLetterTexture } from './materials';
import { DNA_PARTS } from './content';
import { BASE_COLOR, LETTER_RU, N, OPEN_X, RAMP, TYPES, buildModel, openAmount, smooth } from './dna';

const UP = new THREE.Vector3(0, 1, 0);
const TINY = 1e-4;
const IDENTITY = new THREE.Quaternion();
const START_ROTATION = [0.12, 0.6, 0.06];
const SUGAR_COLOR = ['#a78bfa', '#ddd6fe'];
const PHOS_COLOR = ['#fb923c', '#fed7aa'];
const SEG_COLOR = ['#9d8cf0', '#e0d9fb'];

const pale = (hex, k = 0.55) => new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k);

// One entry per element copy: strand 0/1, isNew (a freshly built partner strand) and side (-1 / +1 daughter helix)
function copies() {
    const out = [];
    for (let s = 0; s < 2; s++) {
        out.push({ strand: s, isNew: false, side: s ? 1 : -1 });
        out.push({ strand: s, isNew: true, side: s ? -1 : 1 });
    }
    return out;
}

const scratch = {
    m: new THREE.Matrix4(),
    p: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    s: new THREE.Vector3(),
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    d: new THREE.Vector3(),
};

function put(mesh, index, pos, quat, scale) {
    scratch.m.compose(pos, quat, scale);
    mesh.setMatrixAt(index, scratch.m);
}

// Writes every instance for the current fork position f. Called only while the animation runs.
function applyFork(parts, model, f) {
    const { p, q, s, a, b, d } = scratch;
    const open = model.pairs.map((_, i) => openAmount(i, f));
    const grow = open.map(o => smooth(0.35, 0.95, o));

    // base plates + letters
    const counters = { A: 0, T: 0, G: 0, C: 0 };
    parts.baseItems.forEach((it, n) => {
        const base = model.pairs[it.pair].bases[it.strand];
        const k = it.isNew ? grow[it.pair] : 1;
        const mesh = parts.bases[base.type];
        p.copy(base.center);
        p.x += it.side * OPEN_X * open[it.pair];
        s.copy(base.scale).multiplyScalar(Math.max(k, TINY));
        put(mesh, counters[base.type]++, p, base.quat, s);
        const sprite = parts.letters[n];
        sprite.position.copy(p).y += 0.08;
        sprite.scale.setScalar(Math.max(k * 0.3, TINY));
    });

    // sugars and phosphates (nodes), remembering the position of each node for the backbone segments
    parts.nodeItems.forEach((it, n) => {
        const node = model.nodes[it.strand][it.k];
        const k = it.isNew ? grow[node.pair] : 1;
        const pos = parts.nodePos[n];
        pos.copy(node.p);
        pos.x += it.side * OPEN_X * open[node.pair];
        parts.nodeScale[n] = k;
        s.setScalar(Math.max(k, TINY));
        put(node.kind === 'S' ? parts.sugar : parts.phos, it.index, pos, IDENTITY, s);
    });

    // backbone bonds between neighbouring nodes of the same strand copy
    parts.segItems.forEach((it, n) => {
        const A = parts.nodePos[it.a];
        const B = parts.nodePos[it.b];
        const k = Math.min(parts.nodeScale[it.a], parts.nodeScale[it.b]);
        a.copy(A);
        b.copy(B);
        d.copy(b).sub(a);
        const len = d.length();
        p.copy(a).add(b).multiplyScalar(0.5);
        q.setFromUnitVectors(UP, d.multiplyScalar(1 / (len || 1)));
        s.set(Math.max(k, TINY), Math.max(len, TINY), Math.max(k, TINY));
        put(parts.seg, n, p, q, s);
    });

    // hydrogen bonds: the old ones vanish as the strands part, new ones appear inside each daughter helix
    parts.hbItems.forEach((it, n) => {
        const hb = model.pairs[it.pair].hbonds[it.j];
        const o = open[it.pair];
        const k = it.set === 0 ? 1 - smooth(0, 0.12, o) : grow[it.pair];
        p.copy(hb.center);
        p.x += it.set * OPEN_X * o;
        s.set(Math.max(k, TINY), hb.scale.y * Math.max(k, TINY), Math.max(k, TINY));
        put(parts.hb, n, p, hb.quat, s);
    });

    for (const mesh of [parts.sugar, parts.phos, parts.seg, parts.hb, ...Object.values(parts.bases)]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }

    // 5' / 3' tags follow the ends of the old strands
    parts.ends.forEach((e, n) => {
        const node = model.nodes[e.strand][e.k];
        const g = parts.endRefs[n];
        if (!g) return;
        g.position.copy(node.p);
        g.position.x += e.side * OPEN_X * open[node.pair];
        g.position.y += e.dy;
    });
}

function useParts(model) {
    return useMemo(() => {
        const cp = copies();
        const baseItems = [];
        const nodeItems = [];
        const segItems = [];
        const hbItems = [];
        const counts = { A: 0, T: 0, G: 0, C: 0 };
        let sugarN = 0, phosN = 0;

        for (const c of cp) {
            for (let i = 0; i < N; i++) {
                baseItems.push({ pair: i, ...c });
                counts[model.pairs[i].bases[c.strand].type]++;
            }
        }
        // node and segment indices (nodePos is shared storage so segments can look up their endpoints)
        const nodeIndex = new Map();
        for (const c of cp) {
            const list = model.nodes[c.strand];
            list.forEach((node, k) => {
                const n = nodeItems.length;
                nodeIndex.set(`${c.strand}-${c.isNew}-${k}`, n);
                nodeItems.push({ ...c, k, index: node.kind === 'S' ? sugarN++ : phosN++ });
            });
        }
        for (const c of cp) {
            const list = model.nodes[c.strand];
            for (let k = 0; k < list.length - 1; k++) {
                segItems.push({
                    ...c,
                    a: nodeIndex.get(`${c.strand}-${c.isNew}-${k}`),
                    b: nodeIndex.get(`${c.strand}-${c.isNew}-${k + 1}`),
                });
            }
        }
        for (const set of [0, -1, 1]) {
            for (let i = 0; i < N; i++) {
                model.pairs[i].hbonds.forEach((_, j) => hbItems.push({ pair: i, j, set }));
            }
        }
        // old strand ends: strand 0 runs 5'->3' upwards, strand 1 is antiparallel
        const last = model.nodes[0].length - 1;
        const ends = [
            { strand: 0, k: 0, side: -1, dy: -0.55, text: "5′", color: '#38bdf8' },
            { strand: 0, k: last, side: -1, dy: 0.55, text: "3′", color: '#38bdf8' },
            { strand: 1, k: 0, side: 1, dy: -0.55, text: "3′", color: '#fb923c' },
            { strand: 1, k: last, side: 1, dy: 0.55, text: "5′", color: '#fb923c' },
        ];
        return {
            baseItems, nodeItems, segItems, hbItems, ends, counts, sugarN, phosN,
            nodePos: nodeItems.map(() => new THREE.Vector3()),
            nodeScale: nodeItems.map(() => 1),
        };
    }, [model]);
}

export default function DnaScene({ selected, onSelect, unzip, zoom, showLabels }) {
    const root = useRef(null);
    const gl = useThree(s => s.gl);
    const model = useMemo(() => buildModel(), []);
    const spec = useParts(model);
    const ctx = usePickCtx(selected, onSelect, null);

    const refs = useRef({ A: null, T: null, G: null, C: null, sugar: null, phos: null, seg: null, hb: null });
    const endRefs = useRef([]);
    const state = useRef({ u: 0, dirty: true, down: false, applied: -1 });

    useHandRotate(root, { speed: 0.006 });
    useMouseRotate(root);
    useWheelZoom(zoom);

    // Letter badges on the bases (А, Т, Г, Ц), drawn on a canvas so Cyrillic works offline
    const spriteMats = useMemo(() => {
        const out = {};
        for (const t of TYPES) {
            const tex = makeLetterTexture(LETTER_RU[t], BASE_COLOR[t]);
            out[t] = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        }
        return out;
    }, []);
    useEffect(() => () => Object.values(spriteMats).forEach(m => { m.map.dispose(); m.dispose(); }), [spriteMats]);

    const sprites = useMemo(() => spec.baseItems.map(it => {
        const sp = new THREE.Sprite(spriteMats[model.pairs[it.pair].bases[it.strand].type]);
        sp.userData.noPick = true;
        sp.raycast = () => {};
        return sp;
    }), [spec, spriteMats, model]);

    // Static instance colours (new strands are drawn paler)
    useLayoutEffect(() => {
        const r = refs.current;
        const idx = { A: 0, T: 0, G: 0, C: 0 };
        spec.baseItems.forEach(it => {
            const type = model.pairs[it.pair].bases[it.strand].type;
            r[type].setColorAt(idx[type]++, it.isNew ? pale(BASE_COLOR[type]) : new THREE.Color(BASE_COLOR[type]));
        });
        let si = 0, pi = 0;
        spec.nodeItems.forEach(it => {
            const kind = model.nodes[it.strand][it.k].kind;
            if (kind === 'S') r.sugar.setColorAt(si++, new THREE.Color(SUGAR_COLOR[+it.isNew]));
            else r.phos.setColorAt(pi++, new THREE.Color(PHOS_COLOR[+it.isNew]));
        });
        spec.segItems.forEach((it, n) => r.seg.setColorAt(n, new THREE.Color(SEG_COLOR[+it.isNew])));
        for (const key of [...TYPES, 'sugar', 'phos', 'seg']) r[key].instanceColor.needsUpdate = true;
        state.current.dirty = true;
    }, [spec, model]);

    // Mouse down tracking, so the idle spin never fights the user
    useEffect(() => {
        const el = gl.domElement;
        const down = () => { state.current.down = true; };
        const up = () => { state.current.down = false; };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointerup', up);
        return () => {
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointerup', up);
        };
    }, [gl]);

    const look = useRef(new THREE.Vector3());

    useFrame((state3d, dt) => {
        const g = root.current;
        const s = state.current;
        if (!g) return;

        // unzip progress (about 5 s from closed to fully open)
        const target = unzip ? 1 : 0;
        if (s.u !== target) {
            const dir = target > s.u ? 1 : -1;
            s.u = Math.min(1, Math.max(0, s.u + dir * dt * 0.2));
            s.dirty = true;
        }
        if (s.dirty) {
            const r = refs.current;
            applyFork({ ...spec, bases: r, sugar: r.sugar, phos: r.phos, seg: r.seg, hb: r.hb, letters: sprites, endRefs: endRefs.current },
                model, s.u * (N - 1 + RAMP));
            s.dirty = false;
        }

        // slow idle spin, paused while the user holds the model or something is selected
        const holding = s.down || (hand.present && hand.grabbing && !hand.grabOverUI);
        if (!holding && !selected) g.rotation.y += dt * 0.16;

        const k = 1 - Math.exp(-dt * 3);
        const dist = 17.5 * zoom.current;
        const cam = state3d.camera;
        cam.position.x += (0 - cam.position.x) * k;
        cam.position.y += (1.5 - cam.position.y) * k;
        cam.position.z += (dist - cam.position.z) * k;
        cam.lookAt(look.current);
    });

    const nSugar = spec.sugarN;
    const nPhos = spec.phosN;
    const mat = { roughness: 0.35, metalness: 0.1 };

    return (
        <PickCtx.Provider value={ctx}>
            <group ref={root} rotation={START_ROTATION}>
                {TYPES.map(t => {
                    const part = DNA_PARTS[t];
                    return (
                        <Pickable key={t} id={t} label={part.name} color={part.color}>
                            <instancedMesh ref={el => { refs.current[t] = el; }} args={[undefined, undefined, spec.counts[t]]} frustumCulled={false}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="#ffffff" emissive={part.color} emissiveIntensity={0.18} {...mat} />
                            </instancedMesh>
                        </Pickable>
                    );
                })}
                <Pickable id="sugar" label={DNA_PARTS.sugar.name} color={DNA_PARTS.sugar.color}>
                    <instancedMesh ref={el => { refs.current.sugar = el; }} args={[undefined, undefined, nSugar]} frustumCulled={false}>
                        <sphereGeometry args={[0.17, 14, 10]} />
                        <meshStandardMaterial color="#ffffff" emissive={DNA_PARTS.sugar.color} emissiveIntensity={0.15} {...mat} />
                    </instancedMesh>
                    <instancedMesh ref={el => { refs.current.seg = el; }} args={[undefined, undefined, spec.segItems.length]} frustumCulled={false}>
                        <cylinderGeometry args={[0.055, 0.055, 1, 8]} />
                        <meshStandardMaterial color="#ffffff" emissive={DNA_PARTS.sugar.color} emissiveIntensity={0.12} {...mat} />
                    </instancedMesh>
                </Pickable>
                <Pickable id="phosphate" label={DNA_PARTS.phosphate.name} color={DNA_PARTS.phosphate.color}>
                    <instancedMesh ref={el => { refs.current.phos = el; }} args={[undefined, undefined, nPhos]} frustumCulled={false}>
                        <sphereGeometry args={[0.12, 12, 8]} />
                        <meshStandardMaterial color="#ffffff" emissive={DNA_PARTS.phosphate.color} emissiveIntensity={0.18} {...mat} />
                    </instancedMesh>
                </Pickable>
                <Pickable id="hbond" label={DNA_PARTS.hbond.name} color="#ffffff">
                    <instancedMesh ref={el => { refs.current.hb = el; }} args={[undefined, undefined, spec.hbItems.length]} frustumCulled={false}>
                        <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
                        <meshStandardMaterial color="#f8fafc" emissive="#ffffff" emissiveIntensity={0.5} roughness={0.4} />
                    </instancedMesh>
                </Pickable>

                {sprites.map((sp, i) => <primitive key={i} object={sp} />)}

                {showLabels && spec.ends.map((e, n) => (
                    <group key={n} ref={el => { endRefs.current[n] = el; state.current.dirty = true; }}>
                        <Label3D color={e.color}>{e.text}</Label3D>
                    </group>
                ))}
            </group>
        </PickCtx.Provider>
    );
}

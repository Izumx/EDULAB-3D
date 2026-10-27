// «Тела»: a polyhedron that unfolds into its net (развёртка), or a round solid with its dimensions marked.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { hand } from '../../hand/handStore';
import { useHandRotate } from '../../hand/useHandRotate';
import { useMouseRotate, useWheelZoom } from '../../ui/orbit';
import { foldMatrices, netBounds } from './geom';

const START_ROTATION = [0.25, 0.5, 0];

const faceColor = i => new THREE.Color().setHSL((i * 0.382 + 0.08) % 1, 0.55, 0.56);

// Triangle fan of a convex face in the folded pose
function faceGeometry(verts, face) {
    const pos = [];
    for (let i = 1; i < face.length - 1; i++) {
        for (const k of [0, i, i + 1]) pos.push(...verts[face[k]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
}

function outlineGeometry(verts, face) {
    const pts = face.map(i => new THREE.Vector3(...verts[i]));
    return new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
}

function faceCentre(verts, face) {
    const c = [0, 0, 0];
    for (const i of face) { c[0] += verts[i][0]; c[1] += verts[i][1]; c[2] += verts[i][2]; }
    return c.map(v => v / face.length);
}

function Polyhedron({ poly, fold, showEdges, showNumbers }) {
    const groups = useRef([]);
    const shift = useRef(null);
    const mats = useRef([]);
    const lastFold = useRef(-1);

    const parts = useMemo(() => poly.faces.map((f, i) => ({
        geo: faceGeometry(poly.verts, f),
        line: outlineGeometry(poly.verts, f),
        color: faceColor(i),
        centre: faceCentre(poly.verts, f),
    })), [poly]);
    const bounds = useMemo(() => netBounds(poly.verts, poly.faces, poly.net), [poly]);
    useEffect(() => () => parts.forEach(p => { p.geo.dispose(); p.line.dispose(); }), [parts]);

    // a new polyhedron must be drawn at the current fold even if the fold itself did not change
    useEffect(() => { lastFold.current = -1; }, [poly]);

    useFrame(() => {
        const f = fold.current;
        if (Math.abs(f - lastFold.current) < 1e-5) return;
        lastFold.current = f;
        foldMatrices(poly.net, f, mats.current);
        groups.current.forEach((g, i) => {
            if (!g) return;
            g.matrix.copy(mats.current[i]);
            g.matrixWorldNeedsUpdate = true;
        });
        // the net is centred while the solid is folded around the origin
        if (shift.current) shift.current.position.set(-(1 - f) * bounds.cx, 0.0, -(1 - f) * bounds.cz);
    });

    return (
        <group ref={shift}>
            {parts.map((p, i) => (
                <group key={i} ref={el => { groups.current[i] = el; }} matrixAutoUpdate={false}>
                    <mesh geometry={p.geo}>
                        <meshStandardMaterial color={p.color} roughness={0.5} metalness={0.05} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
                    </mesh>
                    {showEdges && (
                        <line geometry={p.line}>
                            <lineBasicMaterial color="#0b1020" />
                        </line>
                    )}
                    {showNumbers && <Label3D position={p.centre} style={{ fontSize: '0.95rem' }}>{i + 1}</Label3D>}
                </group>
            ))}
        </group>
    );
}

// ------------------------------------------------------------------ round solids

function Segment({ from, to, color, label, labelOffset = [0, 0, 0] }) {
    const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]), [from, to]);
    useEffect(() => () => geo.dispose(), [geo]);
    const mid = [(from[0] + to[0]) / 2 + labelOffset[0], (from[1] + to[1]) / 2 + labelOffset[1], (from[2] + to[2]) / 2 + labelOffset[2]];
    return (
        <>
            <line geometry={geo}><lineBasicMaterial color={color} linewidth={2} /></line>
            <Label3D position={mid} color={color}>{label}</Label3D>
        </>
    );
}

function RoundSolid({ solid, p, showEdges }) {
    const { r, h } = p;
    const body = (() => {
        if (solid.id === 'cylinder') return <cylinderGeometry args={[r, r, h, 72, 1]} />;
        if (solid.id === 'cone') return <coneGeometry args={[r, h, 72, 1]} />;
        return <sphereGeometry args={[r, 64, 40]} />;
    })();
    return (
        <group>
            <mesh>
                {body}
                <meshStandardMaterial color="#60a5fa" roughness={0.45} metalness={0.08} transparent opacity={0.82} />
            </mesh>
            {showEdges && (
                <mesh>
                    {body}
                    <meshBasicMaterial color="#e0f2fe" wireframe transparent opacity={0.28} />
                </mesh>
            )}
            {solid.id === 'cylinder' && (
                <>
                    <Segment from={[0, h / 2, 0]} to={[r, h / 2, 0]} color="#fbbf24" label="r" labelOffset={[0, 0.25, 0]} />
                    <Segment from={[r, -h / 2, 0]} to={[r, h / 2, 0]} color="#4ade80" label="h" labelOffset={[0.25, 0, 0]} />
                </>
            )}
            {solid.id === 'cone' && (
                <>
                    <Segment from={[0, -h / 2, 0]} to={[r, -h / 2, 0]} color="#fbbf24" label="r" labelOffset={[0, -0.25, 0]} />
                    <Segment from={[0, -h / 2, 0]} to={[0, h / 2, 0]} color="#4ade80" label="h" labelOffset={[0.25, 0, 0]} />
                    <Segment from={[r, -h / 2, 0]} to={[0, h / 2, 0]} color="#f472b6" label="l" labelOffset={[0.25, 0.1, 0]} />
                </>
            )}
            {solid.id === 'sphere' && <Segment from={[0, 0, 0]} to={[r, 0, 0]} color="#fbbf24" label="r" labelOffset={[0, 0.25, 0]} />}
        </group>
    );
}

// ------------------------------------------------------------------ scene

function stepCamera(state, dt, fitR, lookY, zoom) {
    const cam = state.camera;
    const dist = fitR * 4.3 * zoom;
    const k = 1 - Math.exp(-dt * 3);
    cam.position.x += (0 - cam.position.x) * k;
    cam.position.y += (lookY + dist * 0.42 - cam.position.y) * k;
    cam.position.z += (dist - cam.position.z) * k;
    cam.lookAt(0, lookY, 0);
}

export default function SolidScene({ solid, params, poly, goto, onProgress, showEdges, showNumbers, zoom }) {
    const root = useRef(null);
    const fold = useRef(1);
    const clock = useRef({ target: 1, reported: -1, since: 0, scrub: false });

    useHandRotate(root, { speed: 0.006 });
    useMouseRotate(root);
    useWheelZoom(zoom);

    useEffect(() => {
        clock.current.target = goto.f;
        clock.current.scrub = !!goto.scrub;
        if (goto.reset) fold.current = goto.f;
    }, [goto]);

    // folded radius and net radius for framing
    const fit = useMemo(() => {
        if (!poly) return { folded: Math.max(params.r ?? 1, (params.h ?? 0) / 2, 1) * 1.1, flat: 0, floorY: 0 };
        const folded = Math.max(...poly.verts.map(v => Math.hypot(...v)));
        const b = netBounds(poly.verts, poly.faces, poly.net);
        return { folded, flat: Math.hypot(b.w, b.d) / 2, floorY: Math.min(...poly.verts.map(v => v[1])) };
    }, [poly, params]);

    useFrame((state, dt) => {
        const c = clock.current;
        const d = c.target - fold.current;
        if (Math.abs(d) > 1e-4) {
            const rate = c.scrub ? 12 : 1.6; // dragging the slider follows closely; the buttons glide
            fold.current += Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * rate * dt, 0.35 * dt));
        }
        c.since += dt;
        if (c.since > 0.1 && Math.abs(fold.current - c.reported) > 0.001) {
            c.since = 0;
            c.reported = fold.current;
            onProgress(fold.current);
        }
        const f = poly ? fold.current : 1;
        const fitR = fit.folded * f + fit.flat * 0.9 * (1 - f);
        stepCamera(state, dt, fitR, fit.floorY * (1 - f) * 0.8, zoom.current);
        if (root.current && !poly) root.current.rotation.y += hand.grabbing ? 0 : dt * 0.15;
    });

    return (
        <>
            <pointLight position={[3, 6, 5]} intensity={55} distance={40} color="#e0f2fe" />
            <group ref={root} rotation={START_ROTATION}>
                {poly
                    ? <Polyhedron key={solid.id} poly={poly} fold={fold} showEdges={showEdges} showNumbers={showNumbers} />
                    : <RoundSolid solid={solid} p={params} showEdges={showEdges} />}
            </group>
        </>
    );
}

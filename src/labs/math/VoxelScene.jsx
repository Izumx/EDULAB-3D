// «Виды»: a figure of unit cubes on a 4×4 base. Tap a column or a cube to add (or remove) a cube; drag to turn the scene.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { useHandRotate } from '../../hand/useHandRotate';
import { useMouseRotate, useWheelZoom } from '../../ui/orbit';
import { MAX_H, N, idx } from './voxels';

const START_ROTATION = [0.55, 0.65, 0];
const LEVEL_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'];
const world = (x, z) => [x - (N - 1) / 2, z - (N - 1) / 2];

function Cube({ x, y, z, onTap, remove, geo, edges }) {
    const [wx, wz] = world(x, z);
    const color = LEVEL_COLORS[y % LEVEL_COLORS.length];
    return (
        <group position={[wx, y + 0.5, wz]}
            userData={{ handTarget: { id: `cube-${x}-${y}-${z}`, label: remove ? 'Убрать кубик' : 'Добавить кубик сверху', onSelect: () => onTap(x, z) } }}
            onClick={e => { if (e.delta > 8) return; e.stopPropagation(); onTap(x, z); }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <mesh geometry={geo}>
                <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
            </mesh>
            <lineSegments geometry={edges}>
                <lineBasicMaterial color="#0b1020" />
            </lineSegments>
        </group>
    );
}

function Tile({ x, z, onTap, remove }) {
    const [wx, wz] = world(x, z);
    return (
        <mesh position={[wx, -0.06, wz]}
            userData={{ handTarget: { id: `tile-${x}-${z}`, label: remove ? 'Пустая клетка' : 'Поставить кубик', onSelect: () => onTap(x, z) } }}
            onClick={e => { if (e.delta > 8) return; e.stopPropagation(); onTap(x, z); }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <boxGeometry args={[0.96, 0.12, 0.96]} />
            <meshStandardMaterial color="#1e2a4a" roughness={0.7} />
        </mesh>
    );
}

export default function VoxelScene({ heights, onTap, remove, zoom }) {
    const root = useRef(null);
    const geo = useMemo(() => new THREE.BoxGeometry(0.94, 0.94, 0.94), []);
    const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
    useEffect(() => () => { geo.dispose(); edges.dispose(); }, [geo, edges]);

    useHandRotate(root, { speed: 0.006 });
    useMouseRotate(root);
    useWheelZoom(zoom);

    useFrame((state, dt) => {
        const cam = state.camera;
        const k = 1 - Math.exp(-dt * 3);
        const d = 11.5 * zoom.current;
        cam.position.x += (0 - cam.position.x) * k;
        cam.position.y += (d * 0.34 - cam.position.y) * k;
        cam.position.z += (d - cam.position.z) * k;
        cam.lookAt(0, 0.9, 0);
    });

    const cubes = [];
    for (let z = 0; z < N; z++) {
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < Math.min(MAX_H, heights[idx(x, z)]); y++) cubes.push([x, y, z]);
        }
    }

    return (
        <>
            <pointLight position={[3, 7, 6]} intensity={60} distance={40} color="#eaf2ff" />
            <group ref={root} rotation={START_ROTATION}>
                {Array.from({ length: N * N }, (_, i) => <Tile key={i} x={i % N} z={Math.floor(i / N)} onTap={onTap} remove={remove} />)}
                {cubes.map(([x, y, z]) => <Cube key={`${x}-${y}-${z}`} x={x} y={y} z={z} onTap={onTap} remove={remove} geo={geo} edges={edges} />)}
                <Label3D position={[0, 0, N / 2 + 0.6]} color="#60a5fa">спереди</Label3D>
                <Label3D position={[-N / 2 - 0.9, 0, 0]} color="#34d399">слева</Label3D>
            </group>
        </>
    );
}

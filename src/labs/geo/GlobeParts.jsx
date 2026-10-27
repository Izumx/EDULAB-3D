// Pieces drawn on the globe: grid, lines of latitude/longitude, markers, arcs and city dots.
import React, { useContext, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { OccludeCtx } from './occlude';
import { toVec } from './geo';

const GRATICULE = '#ffffff';

// ------------------------------------------------------------------ lines on the sphere

function circleCurve(kind, value, r) {
    const pts = [];
    if (kind === 'lat') {
        for (let i = 0; i < 180; i++) pts.push(new THREE.Vector3(...toVec(value, -180 + (i / 180) * 360, r)));
        return new THREE.CatmullRomCurve3(pts, true);
    }
    for (let i = 0; i <= 90; i++) pts.push(new THREE.Vector3(...toVec(-90 + (i / 90) * 180, value, r)));
    return new THREE.CatmullRomCurve3(pts, false);
}

export function GeoLine({ kind, value, color, radius = 0.0045, opacity = 1 }) {
    const geo = useMemo(() => new THREE.TubeGeometry(circleCurve(kind, value, 1.004), 200, radius, 6, kind === 'lat'), [kind, value, radius]);
    useEffect(() => () => geo.dispose(), [geo]);
    return (
        <mesh geometry={geo} userData={{ noPick: true }}>
            <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
        </mesh>
    );
}

// Thin grid every 30°
export function Graticule() {
    const geo = useMemo(() => {
        const pos = [];
        const seg = 96;
        for (const lat of [-60, -30, 30, 60]) {
            for (let i = 0; i < seg; i++) {
                pos.push(...toVec(lat, -180 + (i / seg) * 360, 1.002), ...toVec(lat, -180 + ((i + 1) / seg) * 360, 1.002));
            }
        }
        for (let lon = -180; lon < 180; lon += 30) {
            for (let i = 0; i < seg / 2; i++) {
                pos.push(...toVec(-90 + (i / (seg / 2)) * 180, lon, 1.002), ...toVec(-90 + ((i + 1) / (seg / 2)) * 180, lon, 1.002));
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        return g;
    }, []);
    useEffect(() => () => geo.dispose(), [geo]);
    return (
        <lineSegments geometry={geo} userData={{ noPick: true }}>
            <lineBasicMaterial color={GRATICULE} transparent opacity={0.22} />
        </lineSegments>
    );
}

// A great-circle arc between two points (the shortest way), lifted a little off the surface
export function Arc({ a, b, color }) {
    const geo = useMemo(() => {
        const A = new THREE.Vector3(...toVec(a.lat, a.lon));
        const B = new THREE.Vector3(...toVec(b.lat, b.lon));
        const ang = A.angleTo(B);
        const pts = [];
        for (let i = 0; i <= 48; i++) {
            const t = i / 48;
            const p = A.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang || 1)).add(B.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang || 1)));
            pts.push(ang < 1e-4 ? A.clone() : p.normalize().multiplyScalar(1.01 + Math.sin(Math.PI * t) * 0.03));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.006, 6, false);
    }, [a, b]);
    useEffect(() => () => geo.dispose(), [geo]);
    return <mesh geometry={geo} userData={{ noPick: true }}><meshBasicMaterial color={color} /></mesh>;
}

export function Marker({ lat, lon, color, label, size = 0.028 }) {
    const occ = useContext(OccludeCtx);
    const p = toVec(lat, lon, 1.01);
    return (
        <group position={p}>
            <mesh userData={{ noPick: true }}>
                <sphereGeometry args={[size, 20, 14]} />
                <meshBasicMaterial color={color} />
            </mesh>
            {label && <Label3D position={[0, 0.07, 0]} color={color} occlude={occ}>{label}</Label3D>}
        </group>
    );
}

export function CityDot({ city, selected, onCity }) {
    const occ = useContext(OccludeCtx);
    const p = toVec(city.lat, city.lon, 1.008);
    return (
        <group position={p}
            userData={{ handTarget: { id: `city-${city.id}`, label: city.name, onSelect: () => onCity(city.id) } }}
            onClick={e => { if (e.delta > 8) return; e.stopPropagation(); onCity(city.id); }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}>
            <mesh>
                <sphereGeometry args={[selected ? 0.03 : 0.02, 18, 12]} />
                <meshBasicMaterial color={selected ? '#ffffff' : '#fde047'} />
            </mesh>
            {/* a larger invisible target so a hand cursor can hit the dot */}
            <mesh>
                <sphereGeometry args={[0.05, 10, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {selected && <Label3D position={[0, 0.075, 0]} color="#fde047" occlude={occ}>{city.name}</Label3D>}
        </group>
    );
}


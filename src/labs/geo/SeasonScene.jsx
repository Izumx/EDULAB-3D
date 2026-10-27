// Seasons: the Sun stands at the left, the Earth's axis leans toward it by the declination, and the globe spins with the time.
// Rotation is world = Rz(declination) · Ry(15° · UTC hours): see seasonRotation() in geo.js, which scripts/check-geo.mjs verifies.
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Label3D } from '../../ui/three';
import { getGlowTexture, getTexture } from '../cosmos/textures';
import { makeRimMaterial } from '../biology/materials';
import { GeoLine, Graticule, Marker } from './GlobeParts';
import { OccludeCtx } from './occlude';
import { LINES, seasonRotation } from './geo';

const SUN_X = -3.7;
const SIDE_CAMERA = new THREE.Vector3(-0.42, 0.14, 0.9).normalize();
const TOP_CAMERA = new THREE.Vector3(0, 1, 0.001).normalize();
const UP_SIDE = new THREE.Vector3(0, 1, 0);
const UP_TOP = new THREE.Vector3(0, 0, -1);
const LINE_IDS = ['equator', 'tropicN', 'tropicS', 'polarN', 'polarS'];

// Moves the tilt and spin groups smoothly toward their targets (the spin takes the shortest way round)
function easeRotation(tiltGroup, spinGroup, target, dt) {
    const k = 1 - Math.exp(-dt * 9);
    tiltGroup.rotation.z += (target.tilt - tiltGroup.rotation.z) * k;
    const d = Math.atan2(Math.sin(target.spin - spinGroup.rotation.y), Math.cos(target.spin - spinGroup.rotation.y));
    spinGroup.rotation.y += d * k;
}

function stepCamera(state, dt, view, zoom, tmp) {
    const cam = state.camera;
    const k = 1 - Math.exp(-dt * 3);
    const dist = 5.4 * zoom.current;
    tmp.copy(view === 'north' ? TOP_CAMERA : SIDE_CAMERA).multiplyScalar(dist);
    cam.position.lerp(tmp, k);
    cam.up.lerp(view === 'north' ? UP_TOP : UP_SIDE, k).normalize();
    cam.lookAt(0, 0, 0);
}

export default function SeasonScene({ decl, utc, place, view, zoom }) {
    const tilt = useRef(null);
    const spin = useRef(null);
    const globe = useRef(null);
    const first = useRef(true);
    const tmp = useMemo(() => new THREE.Vector3(), []);
    const occluders = useMemo(() => [globe], []);
    const earth = getTexture('earth.jpg');
    const rim = useMemo(() => makeRimMaterial('#5aa9ff', { power: 2.6, intensity: 1.0 }), []);
    useEffect(() => () => rim.dispose(), [rim]);
    const target = seasonRotation(decl, utc);

    useFrame((state, dt) => {
        if (!tilt.current || !spin.current) return;
        if (first.current) {
            first.current = false;
            tilt.current.rotation.z = target.tilt;
            spin.current.rotation.y = target.spin;
        }
        easeRotation(tilt.current, spin.current, target, Math.min(dt, 0.1));
        stepCamera(state, dt, view, zoom, tmp);
    });

    return (
        <OccludeCtx.Provider value={occluders}>
            <ambientLight intensity={0.09} />
            {/* the Sun is always at the left; sunlight comes from −x */}
            <directionalLight position={[-10, 0, 0]} intensity={3.6} />
            <sprite position={[SUN_X, 0, 0]} scale={2.4}>
                <spriteMaterial map={getGlowTexture()} color="#ffd27a" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <Label3D position={[SUN_X, -0.95, 0]} color="#fbbf24">Солнце · свет →</Label3D>

            <group ref={tilt}>
                {/* the axis leans with the globe */}
                <mesh userData={{ noPick: true }}>
                    <cylinderGeometry args={[0.006, 0.006, 2.7, 8]} />
                    <meshBasicMaterial color="#e2e8f0" transparent opacity={0.65} />
                </mesh>
                {view === 'side' && <Label3D position={[0, 1.5, 0]} color="#e2e8f0">Северный полюс</Label3D>}
                {view === 'side' && <Label3D position={[0, -1.5, 0]} color="#e2e8f0">Южный полюс</Label3D>}

                <group ref={spin}>
                    <mesh ref={globe}>
                        <sphereGeometry args={[1, 96, 64]} />
                        <meshStandardMaterial map={earth} roughness={0.92} metalness={0} />
                    </mesh>
                    <Graticule />
                    {LINES.filter(l => LINE_IDS.includes(l.id)).map(l => <GeoLine key={l.id} kind={l.kind} value={l.value} color={l.color} />)}
                    {/* the point where the Sun stands at the zenith right now */}
                    <Marker lat={decl} lon={(12 - utc) * 15} color="#facc15" size={0.022} />
                    {place && <GeoLine kind="lat" value={place.lat} color="#ffffff" radius={0.005} opacity={0.9} />}
                    {place && <Marker lat={place.lat} lon={place.lon} color="#ffffff" label={place.name} size={0.028} />}
                </group>
                <mesh scale={1.07} material={rim} userData={{ noPick: true }}>
                    <sphereGeometry args={[1, 48, 32]} />
                </mesh>
            </group>
        </OccludeCtx.Provider>
    );
}

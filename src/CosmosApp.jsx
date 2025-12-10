import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS } from './data/planets';
import { HandController } from './components/HandController';

const Planet = ({ data, onClick, isSelected, handRotation }) => {
    const mesh = useRef();
    const [hovered, setHover] = useState(false);

    // Load Texture
    const texture = useLoader(THREE.TextureLoader, data.texture || '/vite.svg');

    // Orbit Animation
    useFrame(({ clock }) => {
        if (!mesh.current) return;

        // If Selected, Hand controls orientation?
        if (isSelected && handRotation) {
            // Smoothly lerp towards hand rotation
            mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, handRotation[0], 0.1);
            mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, handRotation[1], 0.1);
            // Keep position static relative to camera or let it float?
            // For now, let's keep orbit paused if selected to inspect
        } else {
            // Standard Orbit
            const t = clock.getElapsedTime() * data.speed;
            mesh.current.position.x = Math.sin(t) * data.distance;
            mesh.current.position.z = Math.cos(t) * data.distance;
            mesh.current.rotation.y += 0.005;
        }
    });

    return (
        <group>
            {/* Orbit Ring */}
            {!isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[data.distance - 0.05, data.distance + 0.05, 64]} />
                    <meshBasicMaterial color="#333" side={THREE.DoubleSide} transparent opacity={0.3} />
                </mesh>
            )}

            {/* The Planet */}
            <mesh
                ref={mesh}
                onClick={(e) => { e.stopPropagation(); onClick(mesh.current.position); }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                <sphereGeometry args={[data.radius, 64, 64]} />
                <meshStandardMaterial
                    map={texture}
                    color={data.texture ? '#ffffff' : data.color} // Use white if texture exists to not tint it
                    emissive={data.color}
                    emissiveIntensity={hovered && !isSelected ? 0.2 : 0}
                    roughness={0.8}
                    metalness={0.1}
                />

                {/* Rings (Saturn) */}
                {data.rings && (
                    <mesh rotation={[Math.PI / 3, 0, 0]}>
                        <ringGeometry args={[data.rings.inner, data.rings.outer, 64]} />
                        <meshStandardMaterial color={data.rings.color} side={THREE.DoubleSide} transparent opacity={0.6} />
                    </mesh>
                )}

                {/* Atmosphere Glow (Earth/Venus) */}
                {(data.name === 'Earth' || data.name === 'Venus') && (
                    <mesh scale={[1.05, 1.05, 1.05]}>
                        <sphereGeometry args={[data.radius, 32, 32]} />
                        <meshBasicMaterial color={data.name === 'Earth' ? '#44aaff' : '#ffaa00'} transparent opacity={0.1} side={THREE.BackSide} />
                    </mesh>
                )}

                {/* Label */}
                {(hovered || isSelected) && (
                    <Html position={[0, data.radius + 0.5, 0]} center>
                        <div style={{
                            color: 'white',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '4px 8px',
                            borderRadius: 8,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${data.color}`
                        }}>
                            {data.name}
                        </div>
                    </Html>
                )}
            </mesh>
        </group>
    );
};

const Sun = () => {
    return (
        <mesh>
            <sphereGeometry args={[2.5, 64, 64]} />
            <meshStandardMaterial color="#FFD700" emissive="#FF8800" emissiveIntensity={3} />
            <pointLight intensity={3} distance={200} decay={2} color="#ffaa00" />

            {/* Solar Glow */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} side={THREE.BackSide} />
            </mesh>
        </mesh>
    );
};

// Camera Controller
const CameraController = ({ target }) => {
    useFrame(({ camera, controls }) => {
        if (target) {
            // Fly closer for high fidelity inspection
            // Dynamic destination based on planet position?
            // For MVP, if planet is paused (isSelected=true), we can just zoom to it safely.
            const offset = 4;
            const desiredPos = new THREE.Vector3(target.x, target.y + 2, target.z + 5);
            // camera.position.lerp(desiredPos, 0.04);
            // camera.lookAt(target);
            // OrbitControls make manual camera override tricky without disabling them.
            // Let's rely on user navigation once "Focused".
        }
    });
    return null;
};

// Logic for the entire Solar System group
const SolarSystem = ({ children, handRotation, isFocused }) => {
    const group = useRef();

    useFrame(() => {
        if (group.current && !isFocused && handRotation) {
            // Rotate the entire solar system based on hand position
            // Using lerp for smooth movement
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, handRotation[0] * 0.5, 0.05);
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, handRotation[1] * 0.5, 0.05);
        }
    });

    return (
        <group ref={group}>
            {children}
        </group>
    );
};

// Zoom Controller Component
const ZoomController = ({ zoomDist, isPinching }) => {
    useFrame(({ camera, controls }) => {
        if (!controls) return;

        // Only override if pinching or settling
        // Calculate current distance to target
        const currentDist = camera.position.distanceTo(controls.target);

        if (Math.abs(currentDist - zoomDist) > 0.5) {
            const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
            // Smoothly move camera to desired distance
            // If we are pinching, we want responsive control.
            // If not, we let OrbitControls handle it, BUT we need to sync our zoomDist state 
            // to the actual distance if the user used the mouse wheel.

            // Strategy: Hand wins.
            const targetPos = controls.target.clone().add(direction.multiplyScalar(zoomDist));
            camera.position.lerp(targetPos, 0.1);
        }
    });
    return null;
};

export const CosmosApp = ({ onBack }) => {
    const [selectedPlanetName, setSelectedPlanetName] = useState(null);
    const [handState, setHandState] = useState({ x: 0, y: 0, isPinching: false, rotation: [0, 0, 0] });
    const [zoomDist, setZoomDist] = useState(40);
    const prevHandY = useRef(null);

    // Zoom Logic
    useEffect(() => {
        if (handState.isPinching) {
            if (prevHandY.current !== null) {
                const deltaY = handState.y - prevHandY.current;
                // Move Hand UP (Negative Delta) -> Zoom In (Decrease Dist)
                // Move Hand DOWN (Positive Delta) -> Zoom Out (Increase Dist)
                setZoomDist(current => {
                    const newDist = current + deltaY * 0.1; // Sensitivity
                    return Math.max(10, Math.min(100, newDist)); // Clamp
                });
            }
            prevHandY.current = handState.y;
        } else {
            prevHandY.current = null;
        }
    }, [handState.isPinching, handState.y]);

    const handlePlanetClick = (name, position) => {
        if (selectedPlanetName === name) {
            setSelectedPlanetName(null);
        } else {
            setSelectedPlanetName(name);
        }
    };

    const selectedPlanetData = PLANETS.find(p => p.name === selectedPlanetName);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
            <HandController onHandUpdate={setHandState} />

            <Canvas camera={{ position: [0, 30, 40], fov: 60 }} shadows>
                <ambientLight intensity={0.2} />
                <Stars radius={200} depth={50} count={8000} factor={4} saturation={0} fade speed={0.5} />

                <ZoomController zoomDist={zoomDist} isPinching={handState.isPinching} />

                <SolarSystem handRotation={handState.rotation} isFocused={!!selectedPlanetName}>
                    <Sun />
                    <Suspense fallback={null}>
                        {PLANETS.map((p) => (
                            <Planet
                                key={p.name}
                                data={p}
                                isSelected={selectedPlanetName === p.name}
                                handRotation={handState.rotation}
                                onClick={(pos) => handlePlanetClick(p.name, pos)}
                            />
                        ))}
                    </Suspense>
                </SolarSystem>

                {/* Lighting for realism */}
                <directionalLight position={[10, 10, 5]} intensity={1} />

                <OrbitControls
                    enablePan={true}
                    enableZoom={true} // Allow mouse zoom too
                    maxDistance={100}
                    minDistance={5}
                    // Disable auto-rotate if manipulating
                    autoRotate={!selectedPlanetName && !handState.isPinching && Math.abs(handState.rotation[0]) < 0.1}
                    autoRotateSpeed={0.5}
                    // Sync zoom state on mouse interaction?
                    onChange={(e) => {
                        if (!handState.isPinching && e?.target?.object) {
                            // Easiest is just let them fight or sync one way.
                            // For MVP, Hand overrides.
                        }
                    }}
                />
            </Canvas>

            {/* UI Overlay */}
            <div className="ui-layer">
                <header>
                    <button onClick={onBack} className="back-btn">← Back</button>
                    <h1>Cosmos Explorer</h1>
                    <p style={{ marginTop: 5, fontSize: '0.9rem', color: '#aaa' }}>
                        {selectedPlanetName
                            ? "Use your HAND to rotate the planet"
                            : "Pinch & Move UP/DOWN to Zoom!"}
                    </p>
                </header>

                {/* Planet Info Card */}
                {selectedPlanetData && (
                    <div style={{
                        position: 'absolute',
                        bottom: 40, left: 40,
                        width: 350,
                        background: 'rgba(0,0,0,0.6)',
                        border: `1px solid ${selectedPlanetData.color}`,
                        borderRadius: 20,
                        padding: 25,
                        backdropFilter: 'blur(15px)',
                        boxShadow: `0 0 30px ${selectedPlanetData.color}40`,
                        animation: 'fadeIn 0.5s'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '2rem' }}>{selectedPlanetData.name}</h2>
                            <button
                                onClick={() => setSelectedPlanetName(null)}
                                style={{
                                    background: 'transparent', border: '1px solid #555', color: '#aaa',
                                    borderRadius: '50%', width: 30, height: 30, cursor: 'pointer'
                                }}
                            >✕</button>
                        </div>
                        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
                        <p style={{ fontSize: '1rem', color: '#ddd', lineHeight: '1.5' }}>{selectedPlanetData.desc}</p>

                        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.8rem', color: '#888' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10 }}>
                                <span style={{ display: 'block', color: '#aaa', marginBottom: 5 }}>Distance</span>
                                <b style={{ color: 'white', fontSize: '1rem' }}>{selectedPlanetData.distance} AU</b>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10 }}>
                                <span style={{ display: 'block', color: '#aaa', marginBottom: 5 }}>Radius</span>
                                <b style={{ color: 'white', fontSize: '1rem' }}>{selectedPlanetData.radius} x Earth</b>
                            </div>
                        </div>

                        {/* Hand Icon Hint */}
                        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, color: '#00ffff' }}>
                            <div style={{ width: 10, height: 10, background: '#00ffff', borderRadius: '50%', boxShadow: '0 0 10px #00ffff' }}></div>
                            <small>Hand Tracking Active</small>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars, Box, Sphere, Text, Trail } from '@react-three/drei';
import { HandController } from './components/HandController';
import * as THREE from 'three';

// Custom lightweight physics engine hook - MUST BE USED INSIDE <Canvas>
const usePhysicsEngine = (initialObjects, externalGravity, resetTrigger, onHandPosUpdate) => {
    const [objects, setObjects] = useState(initialObjects);

    const physicsState = useRef({
        objects: initialObjects.map(obj => ({
            ...obj,
            velocity: new THREE.Vector3(0, 0, 0),
            position: new THREE.Vector3(...obj.position),
            isGrabbed: false
        })),
        handPos: new THREE.Vector3(0, -100, 0),
        prevHandPos: new THREE.Vector3(0, -100, 0),
        handVelocity: new THREE.Vector3(0, 0, 0),
        grabbedObjId: null,
        isPinching: false,
        lastReset: 0
    });

    useEffect(() => {
        if (resetTrigger !== physicsState.current.lastReset) {
            physicsState.current.objects.forEach((obj, i) => {
                obj.position.set(...initialObjects[i].position);
                obj.velocity.set(0, 0, 0);
                obj.isGrabbed = false;
            });
            physicsState.current.grabbedObjId = null;
            physicsState.current.lastReset = resetTrigger;
        }
    }, [resetTrigger, initialObjects]);

    useFrame((_, delta) => {
        const s = physicsState.current;
        const dt = Math.min(delta, 0.05);

        // Calculate Hand Velocity
        s.handVelocity.subVectors(s.handPos, s.prevHandPos).divideScalar(dt);
        s.prevHandPos.copy(s.handPos);

        // 1. Handle Grabbing
        if (s.isPinching) {
            if (s.grabbedObjId === null) {
                // Try to grab
                let closestObj = null;
                let minDst = 2.0;

                s.objects.forEach(obj => {
                    const d = obj.position.distanceTo(s.handPos);
                    if (d < minDst) {
                        minDst = d;
                        closestObj = obj;
                    }
                });

                if (closestObj) {
                    s.grabbedObjId = closestObj.id;
                    closestObj.isGrabbed = true;
                }
            }
        } else {
            // Release
            if (s.grabbedObjId !== null) {
                const obj = s.objects.find(o => o.id === s.grabbedObjId);
                if (obj) {
                    obj.isGrabbed = false;
                    // Throw! Apply hand velocity + boost
                    obj.velocity.copy(s.handVelocity).multiplyScalar(0.8);
                }
                s.grabbedObjId = null;
            }
        }

        // 2. Physics Step
        s.objects.forEach(obj => {
            if (obj.isGrabbed) {
                // Follow Hand
                obj.position.lerp(s.handPos, 0.2);
                obj.velocity.set(0, 0, 0);
            } else {
                // Gravity
                obj.velocity.y += externalGravity * dt;

                // Repulsion (optional, if we want hand to still push things when not grabbing)
                const distToHand = obj.position.distanceTo(s.handPos);
                if (distToHand < 3.0 && s.grabbedObjId !== obj.id) {
                    const dir = new THREE.Vector3().subVectors(obj.position, s.handPos).normalize();
                    const force = (3.5 - distToHand) * 20 * dt;
                    obj.velocity.add(dir.multiplyScalar(force));
                }

                // Move
                obj.position.add(obj.velocity.clone().multiplyScalar(dt));

                // Floor Collision
                if (obj.position.y < obj.radius) {
                    obj.position.y = obj.radius;
                    obj.velocity.y *= -0.7;
                    obj.velocity.x *= 0.95;
                    obj.velocity.z *= 0.95;
                }

                // Wall Constraints
                const wall = 12;
                ['x', 'z'].forEach(axis => {
                    if (Math.abs(obj.position[axis]) > wall) {
                        obj.position[axis] = Math.sign(obj.position[axis]) * wall;
                        obj.velocity[axis] *= -0.8;
                    }
                });
            }
        });

        // 3. Object-Object Collisions
        for (let i = 0; i < s.objects.length; i++) {
            for (let j = i + 1; j < s.objects.length; j++) {
                const obj1 = s.objects[i];
                const obj2 = s.objects[j];

                if (obj1.isGrabbed || obj2.isGrabbed) continue;

                const dist = obj1.position.distanceTo(obj2.position);
                const minDist = obj1.radius + obj2.radius;

                if (dist < minDist) {
                    const normal = new THREE.Vector3().subVectors(obj1.position, obj2.position).normalize();
                    const overlap = minDist - dist;
                    obj1.position.add(normal.clone().multiplyScalar(overlap / 2));
                    obj2.position.sub(normal.clone().multiplyScalar(overlap / 2));

                    const vRel = new THREE.Vector3().subVectors(obj1.velocity, obj2.velocity);
                    const speed = vRel.dot(normal);

                    if (speed < 0) {
                        const impulse = normal.multiplyScalar(speed);
                        obj1.velocity.sub(impulse);
                        obj2.velocity.add(impulse);
                        obj1.velocity.multiplyScalar(0.98);
                        obj2.velocity.multiplyScalar(0.98);
                    }
                }
            }
        }
    });

    const updateHand3D = (vec, isPinching) => {
        physicsState.current.handPos.copy(vec);
        physicsState.current.isPinching = isPinching;
        if (onHandPosUpdate) onHandPosUpdate(vec);
        return physicsState.current; // Return state for gesture checks
    };

    return { objectsState: physicsState.current.objects, updateHand3D };
};

// Physics Object Component
const PhysObject = ({ obj }) => {
    const mesh = useRef();
    useFrame(() => {
        if (mesh.current) {
            mesh.current.position.copy(obj.position);
            // Only rotate if not grabbed
            if (!obj.isGrabbed) {
                mesh.current.rotation.x += obj.velocity.z * 0.05;
                mesh.current.rotation.z -= obj.velocity.x * 0.05;
            }
        }
    });

    return (
        <group ref={mesh}>
            <Trail width={obj.radius * 5} length={4} color={obj.color} attenuation={(t) => t * t}>
                {obj.type === 'box' && (
                    <Box args={[obj.size, obj.size, obj.size]}>
                        <meshStandardMaterial color={obj.color} roughness={0.4} />
                    </Box>
                )}
                {obj.type === 'sphere' && (
                    <Sphere args={[obj.radius, 32, 32]}>
                        <meshStandardMaterial color={obj.color} roughness={0.2} metalness={0.5} />
                    </Sphere>
                )}
            </Trail>
        </group>
    );
};

const PhysicsConnector = ({ handState, updateHand3D, setGravity, setGestureActive }) => {
    useFrame(({ camera }) => {
        if (handState && (handState.x !== 0 || handState.y !== 0)) {
            // Project 2D screen coords to 3D
            const vector = new THREE.Vector3(
                (handState.x / window.innerWidth) * 2 - 1,
                -(handState.y / window.innerHeight) * 2 + 1,
                0.5
            );

            // Check for Gravity Gesture Control Zone (Bottom 20% of screen)
            const isBottomZone = vector.y < -0.6;

            if (isBottomZone && handState.isPinching) {
                setGestureActive(true);
                // Map X (-1 to 1) to Gravity (-20 to 20)
                const clampedX = Math.max(-0.8, Math.min(0.8, vector.x));
                const g = (clampedX / 0.8) * 20;
                setGravity(g);
            } else {
                setGestureActive(false);
            }

            vector.unproject(camera);
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));
            pos.z = Math.max(Math.min(pos.z, 5), -5);

            updateHand3D(pos, handState.isPinching);
        }
    });
    return null;
}

const PhysicsScene = ({ initialObjects, gravity, setGravity, resetTrigger, handState, setGestureActive }) => {
    const { objectsState, updateHand3D } = usePhysicsEngine(initialObjects, gravity, resetTrigger);
    return (
        <>
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={0.5} />
            <PhysicsConnector
                handState={handState}
                updateHand3D={updateHand3D}
                setGravity={setGravity}
                setGestureActive={setGestureActive}
            />
            {objectsState.map(obj => <PhysObject key={obj.id} obj={obj} />)}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
                <gridHelper args={[100, 20]} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} />
            </mesh>
            <Environment preset="city" />
            <OrbitControls makeDefault />
        </>
    );
};

export const PhysicsApp = ({ onBack }) => {
    const [handState, setHandState] = useState({ x: 0, y: 0, isPinching: false, rotation: [0, 0, 0] });
    const [gravity, setGravity] = useState(-9.8);
    const [resetCount, setResetCount] = useState(0);
    const [gestureActive, setGestureActive] = useState(false);

    const initialObjects = useMemo(() => {
        const objs = [];
        const colors = ['#ff0055', '#33ff00', '#00aaff', '#ffaa00', '#aa00ff'];
        for (let i = 0; i < 15; i++) {
            objs.push({
                id: i,
                type: Math.random() > 0.6 ? 'box' : 'sphere',
                size: 0.8 + Math.random() * 0.8,
                radius: 0.4 + Math.random() * 0.5,
                position: [(Math.random() - 0.5) * 10, 5 + Math.random() * 10, (Math.random() - 0.5) * 6],
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        return objs;
    }, []);

    const handleReset = () => setResetCount(c => c + 1);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#111' }}>
            <HandController onHandUpdate={setHandState} />

            <Canvas camera={{ position: [0, 8, 20], fov: 50 }} shadows>
                <Suspense fallback={<Text color="white" position={[0, 0, 0]}>Loading Physics...</Text>}>
                    <PhysicsScene
                        initialObjects={initialObjects}
                        gravity={gravity}
                        setGravity={setGravity}
                        resetTrigger={resetCount}
                        handState={handState}
                        setGestureActive={setGestureActive}
                    />
                </Suspense>
            </Canvas>

            {/* UI HUD */}
            <div className="ui-layer" style={{ pointerEvents: 'none' }}>
                <header style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: 20, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={onBack} className="back-btn" style={{ pointerEvents: 'auto' }}>← Back</button>
                    <div style={{ textAlign: 'center', color: 'white' }}>
                        <h1>Physics Lab</h1>
                        <p style={{ color: '#aaa', marginTop: 5 }}>Interactive Simulation</p>
                    </div>
                </header>

                <div style={{ position: 'absolute', bottom: 40, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 40, pointerEvents: 'auto' }}>

                    {/* Gravity Slider Control */}
                    <div style={{
                        background: gestureActive ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0,0,0,0.6)',
                        padding: '20px 30px',
                        borderRadius: 20,
                        border: `2px solid ${gestureActive ? '#00ffff' : '#444'}`,
                        textAlign: 'center',
                        transition: 'all 0.2s'
                    }}>
                        <label style={{ color: '#00ffff', fontFamily: 'Orbitron', display: 'block', marginBottom: 10 }}>
                            Gravity: {gravity.toFixed(1)} m/s²
                        </label>
                        <input
                            type="range"
                            min="-20"
                            max="20"
                            step="0.1"
                            value={gravity}
                            onChange={(e) => setGravity(parseFloat(e.target.value))}
                            style={{ width: 200, accentColor: '#00ffff' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.8rem', marginTop: 5 }}>
                            <span>Left (Down)</span>
                            <span>Mid (0)</span>
                            <span>Right (Up)</span>
                        </div>
                    </div>

                    <button
                        className="hud-btn"
                        onClick={handleReset}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            border: '1px solid #ff5555', padding: '15px 30px', borderRadius: 30, cursor: 'pointer',
                            fontSize: '1rem', fontFamily: 'Orbitron', height: 'fit-content', marginBottom: 20
                        }}
                    >
                        Reset Objects
                    </button>
                </div>

                <div style={{ position: 'absolute', top: '50%', right: 20, color: '#aaa', width: 250, textAlign: 'right' }}>
                    <p><b>GRAB & THROW</b><br />Pinch near an object to grab it.<br />Release to throw.</p>
                    <br />
                    <p><b>GESTURE CONTROL</b><br />Pinch at bottom of screen<br />and move Left/Right to<br />change Gravity!</p>
                </div>
            </div>
        </div>
    );
};

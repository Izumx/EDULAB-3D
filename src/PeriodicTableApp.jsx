import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, Environment } from '@react-three/drei';
import { ELEMENTS } from './data/elements';

const AtomModel = ({ element, position, onClick }) => {
    const mesh = useRef();
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.rotation.y += 0.01;
            mesh.current.rotation.z += 0.005;
        }
    });

    return (
        <group position={position} onClick={onClick} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            {/* Nucleus */}
            <mesh ref={mesh}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color={element.color}
                    emissive={element.color}
                    emissiveIntensity={hovered ? 0.8 : 0.2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Electrons (simplified rings) */}
            <mesh rotation={[Math.PI / 3, 0, 0]}>
                <ringGeometry args={[0.8, 0.85, 32]} />
                <meshBasicMaterial color="#ffffff" side={2} transparent opacity={0.3} />
            </mesh>
            <mesh rotation={[-Math.PI / 3, 0, 0]}>
                <ringGeometry args={[0.8, 0.85, 32]} />
                <meshBasicMaterial color="#ffffff" side={2} transparent opacity={0.3} />
            </mesh>

            {/* Label */}
            <Text
                position={[0, -1.2, 0]}
                fontSize={0.4}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {element.symbol}
            </Text>
        </group>
    );
};

export const PeriodicTableApp = ({ onBack }) => {
    const [selectedElement, setSelectedElement] = useState(null);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050510' }}>

            <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Environment preset="city" />

                <Suspense fallback={null}>
                    {/* Render atoms in a grid in 3D space */}
                    <group position={[-8, 4, 0]}>
                        {ELEMENTS.map((el, index) => {
                            const col = index % 10;
                            const row = Math.floor(index / 10);
                            return (
                                <AtomModel
                                    key={el.symbol}
                                    element={el}
                                    position={[col * 2, -row * 2.5, 0]}
                                    onClick={() => setSelectedElement(el)}
                                />
                            );
                        })}
                    </group>
                </Suspense>

                <OrbitControls enableZoom={true} enablePan={true} />
            </Canvas>

            {/* UI Overlay */}
            <div className="ui-layer">
                <header>
                    <button onClick={onBack} className="back-btn">← Back</button>
                    <h1>Periodic Table 3D</h1>
                    <p style={{ color: '#aaa' }}>Interactive Element Gallery</p>
                </header>

                {/* Element Detail Card */}
                {selectedElement && (
                    <div style={{
                        position: 'absolute', top: '50%', right: 40, transform: 'translateY(-50%)',
                        width: 300, padding: 30,
                        background: 'rgba(20, 20, 40, 0.8)',
                        border: `2px solid ${selectedElement.color}`,
                        borderRadius: 20,
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        animation: 'fadeIn 0.3s'
                    }}>
                        <h1 style={{ fontSize: '3rem', margin: 0, color: selectedElement.color }}>{selectedElement.symbol}</h1>
                        <h2 style={{ margin: '10px 0' }}>{selectedElement.name}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                            <div>
                                <small style={{ color: '#aaa' }}>Atomic #</small>
                                <div style={{ fontSize: '1.2rem' }}>{selectedElement.atomicNumber}</div>
                            </div>
                            <div>
                                <small style={{ color: '#aaa' }}>Mass</small>
                                <div style={{ fontSize: '1.2rem' }}>{selectedElement.mass}</div>
                            </div>
                        </div>
                        <p style={{ lineHeight: 1.5, color: '#ccc' }}>{selectedElement.desc}</p>
                        <button
                            onClick={() => setSelectedElement(null)}
                            style={{
                                marginTop: 20, padding: '10px 20px', width: '100%',
                                background: 'rgba(255,255,255,0.1)', border: 'none',
                                color: 'white', cursor: 'pointer', borderRadius: 10
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

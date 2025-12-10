import React, { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Molecule } from './Molecule';
import { ELEMENTS } from '../data/elements';

const DraggedAtom = ({ element, x, y }) => {
    const { viewport } = useThree();
    // Map screen x/y (pixels) to 3D space
    // x,y are in window pixels relative to top-left

    // Normalize x/y to -0.5 to 0.5
    // Note: This matches the default ortho projection or perspective at z=0 plane if camera is centered
    // Basic scaling for default camera setup
    const nX = (x / window.innerWidth) - 0.5;
    const nY = -((y / window.innerHeight) - 0.5); // Invert Y because screen Y is down, 3D Y is up

    // Multiplier depends on Field of View and Camera Distance
    // At distance 5, fov 50: visible height is approx 4.66
    // visible width is height * aspect

    const visibleHeight = 2 * Math.tan((50 * Math.PI / 180) / 2) * 5;
    const visibleWidth = visibleHeight * (viewport.width / viewport.height);

    const pos = [
        nX * visibleWidth,
        nY * visibleHeight,
        0
    ];

    return (
        <group position={pos}>
            <Molecule atoms={[{ element: element, position: [0, 0, 0] }]} bonds={[]} />
        </group>
    );
};

const MixedAtoms = ({ elements }) => {
    // Arrange elements in a loose cluster/circle
    return (
        <group>
            {elements.map((el, i) => {
                const angle = (i / elements.length) * Math.PI * 2;
                const radius = 1.5;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                // Add a slight wobble wiggle or float
                return (
                    <group key={i} position={[x, y, 0]}>
                        <Molecule atoms={[{ element: el, position: [0, 0, 0] }]} bonds={[]} />
                    </group>
                );
            })}
        </group>
    );
};

export const Scene = ({ rotation, molecule, draggedElement, handPos, mixingZone = [] }) => {
    const groupRef = useRef();

    return (
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ height: '100vh', width: '100vw', background: 'transparent' }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            <group ref={groupRef} rotation={rotation || [0, 0, 0]}>
                {molecule ? (
                    <Molecule atoms={molecule.atoms} bonds={molecule.bonds} />
                ) : (
                    <MixedAtoms elements={mixingZone} />
                )}
            </group>

            {draggedElement && handPos && (
                <DraggedAtom element={draggedElement} x={handPos.x} y={handPos.y} />
            )}

            <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
            <Environment preset="city" />
            <OrbitControls makeDefault enablePan={false} enableZoom={true} />
        </Canvas>
    );
};

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder } from '@react-three/drei';

export const DNAStrand = ({ handRotation }) => {
    const group = useRef();

    useFrame((state, delta) => {
        if (group.current) {
            // Auto-rotate slowly
            group.current.rotation.y += delta * 0.2;

            // Hand Interaction - Additive Rotation or Direct Control?
            // "Rotate with hand" usually implies direct control.
            if (handRotation) {
                // Determine if hand is "active" (non-zero rotation usually implies tracking)
                // HandController returns [rotX, rotY, 0].
                // Let's add hand rotation to the base rotation
                group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, handRotation[0] * 0.5, 0.1);
                group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, handRotation[1] * 0.5, 0.1);
            }
        }
    });

    const numPairs = 20;
    const radius = 2;
    const height = 10;
    const gap = height / numPairs;

    return (
        <group ref={group}>
            {Array.from({ length: numPairs }).map((_, i) => {
                const y = i * gap - height / 2;
                const angle = i * 0.5;
                const x1 = Math.cos(angle) * radius;
                const z1 = Math.sin(angle) * radius;
                const x2 = Math.cos(angle + Math.PI) * radius;
                const z2 = Math.sin(angle + Math.PI) * radius;

                return (
                    <group key={i} position={[0, y, 0]}>
                        {/* Sugar-Phosphate Backbone (Spheres) */}
                        <Sphere position={[x1, 0, z1]} args={[0.3, 16, 16]}>
                            <meshStandardMaterial color="#00ffff" roughness={0.3} metalness={0.8} />
                        </Sphere>
                        <Sphere position={[x2, 0, z2]} args={[0.3, 16, 16]}>
                            <meshStandardMaterial color="#ff00ff" roughness={0.3} metalness={0.8} />
                        </Sphere>

                        {/* Base Pair (Cylinder connection) */}
                        <mesh rotation={[0, -angle, Math.PI / 2]} position={[0, 0, 0]}>
                            <cylinderGeometry args={[0.1, 0.1, radius * 2, 8]} />
                            <meshStandardMaterial color="white" opacity={0.5} transparent />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
};

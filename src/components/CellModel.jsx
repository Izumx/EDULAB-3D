import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Capsule, Text } from '@react-three/drei';

const Organelle = ({ position, color, name, type, scale = 1, rotation, onClick, isHovered }) => {
    return (
        <group
            position={position}
            rotation={rotation || [0, 0, 0]}
            scale={isHovered ? scale * 1.2 : scale}
            onClick={(e) => { e.stopPropagation(); onClick && onClick(name); }}
        >
            {type === 'nucleus' && (
                <Sphere args={[1.5, 32, 32]}>
                    <meshStandardMaterial color={color} roughness={0.3} emissive={color} emissiveIntensity={isHovered ? 0.5 : 0.1} />
                </Sphere>
            )}
            {type === 'mitochondria' && (
                <Capsule args={[0.3, 1, 16, 16]}>
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isHovered ? 0.5 : 0.1} />
                </Capsule>
            )}
            {type === 'ribosome' && (
                <Sphere args={[0.1, 8, 8]}>
                    <meshStandardMaterial color={color} />
                </Sphere>
            )}
        </group>
    );
};

export const CellModel = ({ rotation, onOrganelleClick }) => {
    const groupRef = useRef();
    const membraneRef = useRef();
    const [hoveredOrg, setHoveredOrg] = React.useState(null);

    // Living Cell Animation
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.05; // Slower rotation
        }
        if (membraneRef.current) {
            // Pulse effect
            const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
            membraneRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group ref={groupRef} rotation={rotation}>
            {/* Cell Membrane */}
            <Sphere ref={membraneRef} args={[5, 64, 64]}>
                <meshPhysicalMaterial
                    color="#aaddff"
                    transmission={0.6} // Glass-like
                    opacity={0.3}
                    transparent
                    roughness={0.1}
                    thickness={1}
                />
            </Sphere>

            {/* Nucleus */}
            <Organelle
                position={[0, 0, 0]}
                color="#ff5555"
                name="Nucleus"
                type="nucleus"
                onClick={onOrganelleClick}
                isHovered={hoveredOrg === 'Nucleus'}
                onPointerOver={() => setHoveredOrg('Nucleus')}
                onPointerOut={() => setHoveredOrg(null)}
            />

            {/* Mitochondria scattered */}
            <Organelle
                position={[2, 1, 1]}
                color="#ffa500"
                name="Mitochondria"
                type="mitochondria"
                rotation={[0.5, 0.5, 0]}
                onClick={onOrganelleClick}
                isHovered={hoveredOrg === 'Mitochondria'}
                onPointerOver={() => setHoveredOrg('Mitochondria')}
                onPointerOut={() => setHoveredOrg(null)}
            />
            <Organelle position={[-2, -1, 1]} color="#ffa500" name="Mitochondria" type="mitochondria" rotation={[0.2, 0, 0.5]} onClick={onOrganelleClick} />
            <Organelle position={[1, -2, -1]} color="#ffa500" name="Mitochondria" type="mitochondria" rotation={[1, 0, 0]} onClick={onOrganelleClick} />

            {/* Ribosomes */}
            {Array.from({ length: 20 }).map((_, i) => {
                const x = (Math.random() - 0.5) * 6;
                const y = (Math.random() - 0.5) * 6;
                const z = (Math.random() - 0.5) * 6;
                // Keep inside sphere roughly
                if (x * x + y * y + z * z > 16) return null;
                return <Organelle key={i} position={[x, y, z]} color="#ffffff" name="" type="ribosome" />;
            })}
        </group>
    );
};

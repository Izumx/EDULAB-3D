import React, { useMemo } from 'react';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// CPK coloring for common elements
const ELEMENT_COLORS = {
    H: '#FFFFFF',
    C: '#909090',
    O: '#FF0D0D',
    N: '#3050F8',
    Cl: '#1FF01F',
};

const ELEMENT_RADII = {
    H: 0.3,
    C: 0.7,
    O: 0.6,
    N: 0.65,
    Cl: 0.8,
};

const Atom = ({ position, element }) => {
    const color = ELEMENT_COLORS[element] || '#FF00FF';
    const radius = ELEMENT_RADII[element] || 0.5;

    return (
        <Sphere position={position} args={[radius, 32, 32]}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </Sphere>
    );
};

const Bond = ({ start, end }) => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    const length = direction.length();

    // Calculate orientation
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    return (
        <group position={midPoint} quaternion={quaternion}>
            <Cylinder args={[0.15, 0.15, length, 16]}>
                <meshStandardMaterial color="#CCCCCC" />
            </Cylinder>
        </group>
    );
};

export const Molecule = ({ atoms, bonds }) => {
    return (
        <group>
            {atoms.map((atom, i) => (
                <Atom key={i} position={atom.position} element={atom.element} />
            ))}
            {bonds.map((bond, i) => (
                <Bond key={i} start={atoms[bond.startIdx].position} end={atoms[bond.endIdx].position} />
            ))}
        </group>
    );
};

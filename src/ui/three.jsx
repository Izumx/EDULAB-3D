// Shared three.js building blocks. Everything here works offline (no HDR/font downloads).
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { HandPointer } from '../hand/three';

// Studio-style lighting without drei <Environment> (which downloads HDRs from a CDN and crashes offline)
export function LabLights({ intensity = 1 }) {
    return (
        <>
            <ambientLight intensity={0.35 * intensity} />
            <hemisphereLight args={['#cfe8ff', '#1a1030', 0.6 * intensity]} />
            <directionalLight position={[5, 8, 6]} intensity={1.6 * intensity} />
            <directionalLight position={[-6, -2, -4]} intensity={0.5 * intensity} color="#8fb8ff" />
        </>
    );
}

// Full-screen canvas with hand picking wired in. Pass lights={false} to light the scene yourself.
export function LabCanvas({ children, camera = { position: [0, 0, 8], fov: 50 }, lights = true, ...props }) {
    return (
        <div className="lab-canvas">
            <Canvas camera={camera} dpr={[1, 2]} {...props}>
                {lights && <LabLights />}
                <HandPointer />
                <Suspense fallback={null}>{children}</Suspense>
            </Canvas>
        </div>
    );
}

// Crisp, Cyrillic-safe text label in 3D space (use instead of drei <Text>, which fetches fonts from a CDN)
export function Label3D({ position, children, color, style, ...props }) {
    return (
        <Html position={position} center zIndexRange={[5, 0]} {...props}>
            <div className="label-3d" style={{ ...(color ? { borderColor: color } : null), ...style }}>{children}</div>
        </Html>
    );
}

// three.js helpers: rim-glow shader, clipping-aware raycast, letter textures.
import * as THREE from 'three';

const fresnelVertex = /* glsl */ `
#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vN;
varying vec3 vV;
void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
}`;

const fresnelFragment = /* glsl */ `
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uColor;
uniform float uPower;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main() {
    #include <clipping_planes_fragment>
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower) * uIntensity;
    gl_FragColor = vec4(uColor * f, f);
}`;

// Soft glowing rim (fresnel) for translucent membranes — the "subsurface" look without a transmission pass
export function makeRimMaterial(color, { power = 2.4, intensity = 1.1 } = {}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(color) },
            uPower: { value: power },
            uIntensity: { value: intensity },
        },
        vertexShader: fresnelVertex,
        fragmentShader: fresnelFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        clipping: true,
    });
}

/**
 * Clipping planes only hide pixels; raycasts still hit the invisible part.
 * This raycast drops hits that lie in the clipped (cut-away) region, so the hand and mouse can reach inside.
 */
export function makeClipRaycast(planes) {
    return function clippedRaycast(raycaster, intersects) {
        const hits = [];
        Object.getPrototypeOf(this).raycast.call(this, raycaster, hits);
        for (const h of hits) {
            if (!planes.every(p => p.distanceToPoint(h.point) < 0)) intersects.push(h);
        }
    };
}

export const noRaycast = () => {};

// Round badge with a Cyrillic letter, drawn on a canvas (works offline, no font downloads)
export function makeLetterTexture(letter, color) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 76px Nunito, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + 4);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}

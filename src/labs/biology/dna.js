// Geometry of the DNA double helix: positions of backbones, bases and hydrogen bonds. Pure math, no React.
// Axis of the helix is +y. About 10 base pairs per turn; the second strand is shifted by PHASE radians,
// which leaves a wide (major) and a narrow (minor) groove like in real DNA.
import * as THREE from 'three';

export const SEQ = 'ATGCGTACCTGAATGCCGTA';
export const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
export const N = SEQ.length;
export const TYPES = ['A', 'T', 'G', 'C'];
export const BASE_COLOR = { A: '#ef4444', T: '#facc15', G: '#22c55e', C: '#3b82f6' };
export const LETTER_RU = { A: 'А', T: 'Т', G: 'Г', C: 'Ц' };
export const OPEN_X = 2.75; // how far each daughter helix moves from the axis when the fork is fully open
export const RAMP = 5; // how many pairs the fork opening is spread over

const PER_TURN = 10;
const R = 1.0;
const RISE = 0.5;
const PHASE = 2.4;
const SUGAR = 0.15; // distance from the sugar centre where a base starts
const UP = new THREE.Vector3(0, 1, 0);

export const isPurine = t => t === 'A' || t === 'G';
const baseLength = t => (isPurine(t) ? 0.8 : 0.56);
const baseWidth = t => (isPurine(t) ? 0.3 : 0.22);

export function buildModel() {
    const step = (2 * Math.PI) / PER_TURN;
    const pairs = [];
    for (let i = 0; i < N; i++) {
        const y = (i - (N - 1) / 2) * RISE;
        const a1 = i * step;
        const a2 = a1 + PHASE;
        const sugar = [
            new THREE.Vector3(R * Math.sin(a1), y, R * Math.cos(a1)),
            new THREE.Vector3(R * Math.sin(a2), y, R * Math.cos(a2)),
        ];
        const u1 = sugar[1].clone().sub(sugar[0]).normalize();
        const dir = [u1, u1.clone().negate()];
        const w1 = new THREE.Vector3().crossVectors(UP, u1).normalize();
        const side = [w1, w1.clone().negate()];
        const type = [SEQ[i], COMP[SEQ[i]]];

        const bases = [0, 1].map(s => {
            const len = baseLength(type[s]);
            const center = sugar[s].clone().addScaledVector(dir[s], SUGAR + len / 2);
            const end = sugar[s].clone().addScaledVector(dir[s], SUGAR + len);
            const m = new THREE.Matrix4().makeBasis(side[s], UP, dir[s]);
            return {
                type: type[s],
                center,
                end,
                quat: new THREE.Quaternion().setFromRotationMatrix(m),
                scale: new THREE.Vector3(baseWidth(type[s]), 0.07, len),
            };
        });

        // hydrogen bonds sit in the gap between the two bases: 2 for A=T, 3 for G≡C
        const mid = bases[0].end.clone().add(bases[1].end).multiplyScalar(0.5);
        const gap = bases[0].end.distanceTo(bases[1].end);
        const count = type[0] === 'A' || type[0] === 'T' ? 2 : 3;
        const offsets = count === 2 ? [-0.07, 0.07] : [-0.09, 0, 0.09];
        const hbQuat = new THREE.Quaternion().setFromUnitVectors(UP, u1);
        const hbonds = offsets.map(o => ({
            center: mid.clone().addScaledVector(w1, o),
            quat: hbQuat,
            scale: new THREE.Vector3(1, Math.max(gap, 0.05), 1),
        }));

        pairs.push({ i, y, sugar, bases, hbonds });
    }

    // Backbone nodes along each strand: sugar, phosphate, sugar, phosphate ... (2N - 1 nodes)
    const nodes = [0, 1].map(s => {
        const list = [];
        for (let i = 0; i < N; i++) {
            list.push({ pair: i, kind: 'S', p: pairs[i].sugar[s].clone() });
            if (i < N - 1) {
                const a = i * step + (s ? PHASE : 0) + step / 2;
                const y = (pairs[i].y + pairs[i + 1].y) / 2;
                list.push({ pair: i, kind: 'P', p: new THREE.Vector3(R * Math.sin(a), y, R * Math.cos(a)) });
            }
        }
        return list;
    });

    return { pairs, nodes };
}

export const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// How far pair i has opened (0 = closed helix, 1 = fully separated) when the fork has travelled f pairs from the top
export const openAmount = (i, f) => smooth(0, 1, (f - (N - 1 - i)) / RAMP);

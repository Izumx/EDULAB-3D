// Mitosis model: phase texts (grades 9–10) and the state of every part at a moment t (0 … 5).
// t in [i, i + 1) is phase i; during the first 70 % of a phase the parts move from the previous phase's
// arrangement to this one, then they hold still so the teacher can explain the picture.
import * as THREE from 'three';

export const PHASES = [
    {
        id: 'inter',
        name: 'Интерфаза',
        sub: 'подготовка к делению',
        set: '2n2c → 2n4c',
        text: 'Клетка растёт и готовится к делению. Хромосомы деспирализованы — в ядре видны только тонкие нити хроматина. Молекулы ДНК удваиваются: каждая хромосома теперь состоит из двух одинаковых сестринских хроматид.',
    },
    {
        id: 'pro',
        name: 'Профаза',
        sub: 'хромосомы становятся видны',
        set: '2n4c',
        text: 'Хромосомы спирализуются: укорачиваются и утолщаются. Ядрышко и ядерная оболочка исчезают. Центриоли расходятся к полюсам клетки, между ними образуется веретено деления.',
    },
    {
        id: 'meta',
        name: 'Метафаза',
        sub: 'хромосомы на экваторе',
        set: '2n4c',
        text: 'Хромосомы выстраиваются в плоскости экватора клетки — образуется метафазная пластинка. Нити веретена прикрепляются к центромерам. Хромосомы спирализованы сильнее всего, поэтому именно в метафазе их считают и изучают.',
    },
    {
        id: 'ana',
        name: 'Анафаза',
        sub: 'хроматиды расходятся',
        set: '4n4c',
        text: 'Центромеры разделяются, и нити веретена растягивают сестринские хроматиды к противоположным полюсам. Теперь каждая хроматида — самостоятельная хромосома, и у каждого полюса оказывается полный набор хромосом. Это самая короткая фаза.',
    },
    {
        id: 'telo',
        name: 'Телофаза',
        sub: 'образуются две клетки',
        set: '2n2c в каждой клетке',
        text: 'Хромосомы у полюсов деспирализуются, вокруг них образуются новые ядерные оболочки и ядрышки. Веретено деления исчезает. Цитоплазма делится перетяжкой (цитокинез) — получаются две дочерние клетки.',
    },
];

export const MITOSIS_INFO = {
    name: 'Митоз — деление клетки',
    text: 'Из одной клетки образуются две дочерние с точно таким же набором хромосом, как у материнской. Так растёт организм, заживают раны, обновляются клетки кожи и крови.',
    model: 'В модели 2n = 4: две пары гомологичных хромосом (длинная и короткая). Красные хромосомы получены от матери, синие — от отца.',
};

export const PHASE_COUNT = PHASES.length;

export const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

// --------------------------------------------------------------------------- chromosomes

// Two pairs of homologous chromosomes: long and short; maternal (red) and paternal (blue)
export const CHROMOSOMES = [
    { arm: 0.8, color: '#f43f5e' },
    { arm: 0.8, color: '#3b82f6' },
    { arm: 0.48, color: '#fb7185' },
    { arm: 0.48, color: '#60a5fa' },
];

const POLE_X = 2.3;
const ANA_X = 1.85;
const SISTER_GAP = 0.11;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Places inside the nucleus where the chromosomes condense during prophase
const SCATTER = [
    { p: v(-0.45, 0.45, 0.25), a: v(0.3, 1, 0.2) },
    { p: v(0.4, -0.35, 0.45), a: v(1, 0.4, -0.3) },
    { p: v(0.3, 0.55, -0.4), a: v(-0.6, 0.3, 1) },
    { p: v(-0.4, -0.5, -0.35), a: v(0.2, -0.5, 1) },
];

// Orientation of a chromatid: local x points to its pole, local y along the arms
function frame(poleDir, armDir) {
    const x = poleDir.clone().normalize();
    const y = armDir.clone().addScaledVector(x, -armDir.dot(x)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// Key arrangement of one chromatid (c = chromosome index, s = 0 goes to the left pole, 1 to the right)
function chromatidKey(phase, c, s) {
    const side = s === 0 ? -1 : 1;
    const pole = v(side, 0, 0);
    if (phase <= 1) {
        const sc = SCATTER[c];
        const q = frame(v(side, 0.2, 0), sc.a);
        const off = v(side * SISTER_GAP, 0, 0).applyQuaternion(frame(v(1, 0.2, 0), sc.a));
        return { pos: sc.p.clone().add(off), quat: q, fold: 0 };
    }
    const a = (c / CHROMOSOMES.length) * Math.PI * 2 + Math.PI / 4;
    const radial = v(0, Math.cos(a), Math.sin(a));
    if (phase === 2) {
        const pos = radial.clone().multiplyScalar(1.0);
        pos.x = side * SISTER_GAP;
        return { pos, quat: frame(pole, radial), fold: 0 };
    }
    const pos = radial.clone().multiplyScalar(0.45);
    pos.x = side * ANA_X;
    return { pos, quat: frame(pole, radial), fold: 0.95 }; // arms trail behind the centromere (V shape)
}

const KEYS = [0, 1, 2, 3, 4].map(phase => ({
    phase,
    chromatids: CHROMOSOMES.flatMap((_, c) => [0, 1].map(s => chromatidKey(phase, c, s))),
    condense: [0, 1, 1, 1, 0.25][phase],
    chromVisible: [0, 1, 1, 1, 0.35][phase],
    nucleus: [1, 0.08, 0, 0, 0][phase],
    chromatin: [1, 0, 0, 0, 0][phase],
    daughters: [0, 0, 0, 0, 1][phase],
    centriole: [0, 1, 1, 1, 1][phase], // 0: next to the nucleus, 1: at the poles
    spindle: [0, 0.55, 1, 1, 0][phase],
    plate: [0, 0, 1, 0, 0][phase],
    stretch: [0, 0, 0, 0.22, 0.38][phase],
    pinch: [0, 0, 0, 0.1, 0.9][phase],
}));

const lerp = (a, b, k) => a + (b - a) * k;

/** Everything the scene needs at moment t (0 … PHASE_COUNT). Writes into `out` to avoid allocations. */
export function mitosisState(t, out) {
    const tt = Math.min(PHASE_COUNT - 0.0001, Math.max(0, t));
    const phase = Math.floor(tt);
    const k = phase === 0 ? 1 : smoothstep(0, 0.7, tt - phase);
    const A = KEYS[Math.max(0, phase - 1)];
    const B = KEYS[phase];
    for (const key of ['condense', 'chromVisible', 'nucleus', 'chromatin', 'daughters', 'centriole', 'spindle', 'plate', 'stretch', 'pinch']) {
        out[key] = lerp(A[key], B[key], k);
    }
    out.phase = phase;
    out.chromatids.forEach((ch, i) => {
        const a = A.chromatids[i];
        const b = B.chromatids[i];
        ch.pos.lerpVectors(a.pos, b.pos, k);
        ch.quat.slerpQuaternions(a.quat, b.quat, k);
        ch.fold = lerp(a.fold, b.fold, k);
    });
    out.poleX = POLE_X + out.stretch * 1.2;
    return out;
}

// Filled in right away: child components read the state in their first frame, before the scene updates it
export function createState(t = 0) {
    const state = {
        phase: 0,
        poleX: POLE_X,
        chromatids: KEYS[0].chromatids.map(() => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fold: 0 })),
    };
    return mitosisState(t, state);
}

export const DAUGHTER_X = ANA_X + 0.1;

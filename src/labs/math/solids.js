// Catalog of solids for the «Тела» mode: parameters, formulas (with the numbers substituted) and geometry.
// Lengths are in conventional units (ед.). Polyhedra come as vertices; faces are found by the convex hull.
import { findNet, hullFaces, polyStats, standOnLargestFace } from './geom.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const SQ2 = Math.SQRT2;
const SQ3 = Math.sqrt(3);
const SQ5 = Math.sqrt(5);

const param = (id, label, def, min = 1, max = 3, step = 0.1) => ({ id, label, def, min, max, step });

// Russian number format: comma as the decimal separator, up to 2 decimals
export const fmt = (x, d = 2) => {
    const s = (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
};

const cube = a => {
    const h = a / 2;
    return [[-h, -h, -h], [h, -h, -h], [-h, h, -h], [h, h, -h], [-h, -h, h], [h, -h, h], [-h, h, h], [h, h, h]];
};

const box = (a, b, c) => {
    const x = a / 2, y = b / 2, z = c / 2;
    return [[-x, -y, -z], [x, -y, -z], [-x, y, -z], [x, y, -z], [-x, -y, z], [x, -y, z], [-x, y, z], [x, y, z]];
};

const prism = (a, h) => {
    const r = a / SQ3;
    const ring = y => [90, 210, 330].map(d => [r * Math.cos((d * Math.PI) / 180), y, r * Math.sin((d * Math.PI) / 180)]);
    return [...ring(-h / 2), ...ring(h / 2)];
};

const pyramid = (a, h) => [[-a / 2, -h / 2, -a / 2], [a / 2, -h / 2, -a / 2], [a / 2, -h / 2, a / 2], [-a / 2, -h / 2, a / 2], [0, h / 2, 0]];

const tetra = a => {
    const s = a / (2 * SQ2);
    return [[s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s]];
};

const octa = a => {
    const s = a / SQ2;
    return [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]];
};

const dodeca = a => {
    const k = a / (2 / PHI); // the base dodecahedron has edge 2/φ
    const pts = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push([x, y, z]);
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
        pts.push([0, s / PHI, t * PHI], [s / PHI, t * PHI, 0], [s * PHI, 0, t / PHI]);
    }
    return pts.map(p => p.map(v => v * k));
};

const icosa = a => {
    const k = a / 2; // the base icosahedron has edge 2
    const pts = [];
    for (const s of [-1, 1]) for (const t of [-1, 1]) pts.push([0, s, t * PHI], [s, t * PHI, 0], [s * PHI, 0, t]);
    return pts.map(p => p.map(v => v * k));
};

const A = def => param('a', 'ребро a', def, 1, 3);

// Every polyhedron entry has: verts(p), V(p) and S(p) as formulas, plus texts with the numbers substituted
export const SOLIDS = [
    {
        id: 'tetra', short: 'Тетраэдр', name: 'Тетраэдр', group: 'Правильные многогранники', params: [A(2.4)], verts: p => tetra(p.a),
        V: p => (SQ2 / 12) * p.a ** 3, S: p => SQ3 * p.a ** 2,
        formV: 'V = (√2 / 12) · a³', calcV: p => `(√2 / 12) · ${fmt(p.a)}³`, formS: 'S = √3 · a²', calcS: p => `√3 · ${fmt(p.a)}²`,
        note: 'Четыре правильных треугольника. Самый «простой» многогранник: у него меньше всего граней.',
    },
    {
        id: 'cube', short: 'Куб', name: 'Куб (гексаэдр)', group: 'Правильные многогранники', params: [A(2)], verts: p => cube(p.a),
        V: p => p.a ** 3, S: p => 6 * p.a ** 2,
        formV: 'V = a³', calcV: p => `${fmt(p.a)}³`, formS: 'S = 6 · a²', calcS: p => `6 · ${fmt(p.a)}²`,
        note: 'Шесть одинаковых квадратов. Развёрток у куба ровно 11 разных — попробуйте найти хотя бы несколько.',
    },
    {
        id: 'octa', short: 'Октаэдр', name: 'Октаэдр', group: 'Правильные многогранники', params: [A(2)], verts: p => octa(p.a),
        V: p => (SQ2 / 3) * p.a ** 3, S: p => 2 * SQ3 * p.a ** 2,
        formV: 'V = (√2 / 3) · a³', calcV: p => `(√2 / 3) · ${fmt(p.a)}³`, formS: 'S = 2√3 · a²', calcS: p => `2√3 · ${fmt(p.a)}²`,
        note: 'Восемь правильных треугольников. Центры граней куба — вершины октаэдра, и наоборот.',
    },
    {
        id: 'dodeca', short: 'Додекаэдр', name: 'Додекаэдр', group: 'Правильные многогранники', params: [A(1.4)], verts: p => dodeca(p.a),
        V: p => ((15 + 7 * SQ5) / 4) * p.a ** 3, S: p => 3 * Math.sqrt(25 + 10 * SQ5) * p.a ** 2,
        formV: 'V = ((15 + 7√5) / 4) · a³', calcV: p => `((15 + 7√5) / 4) · ${fmt(p.a)}³`,
        formS: 'S = 3√(25 + 10√5) · a²', calcS: p => `3√(25 + 10√5) · ${fmt(p.a)}²`,
        note: 'Двенадцать правильных пятиугольников. Платон связывал его с устройством всей Вселенной.',
    },
    {
        id: 'icosa', short: 'Икосаэдр', name: 'Икосаэдр', group: 'Правильные многогранники', params: [A(1.8)], verts: p => icosa(p.a),
        V: p => ((5 * (3 + SQ5)) / 12) * p.a ** 3, S: p => 5 * SQ3 * p.a ** 2,
        formV: 'V = (5(3 + √5) / 12) · a³', calcV: p => `(5(3 + √5) / 12) · ${fmt(p.a)}³`, formS: 'S = 5√3 · a²', calcS: p => `5√3 · ${fmt(p.a)}²`,
        note: 'Двадцать правильных треугольников. Такую форму имеют многие вирусы — это самая экономная «упаковка».',
    },
    {
        id: 'box', short: 'Брусок', name: 'Параллелепипед', group: 'Призмы и пирамиды', params: [param('a', 'длина a', 2.4), param('b', 'высота b', 1.4), param('c', 'ширина c', 1.8)],
        verts: p => box(p.a, p.b, p.c), V: p => p.a * p.b * p.c, S: p => 2 * (p.a * p.b + p.b * p.c + p.a * p.c),
        formV: 'V = a · b · c', calcV: p => `${fmt(p.a)} · ${fmt(p.b)} · ${fmt(p.c)}`,
        formS: 'S = 2(ab + bc + ac)', calcS: p => `2(${fmt(p.a * p.b)} + ${fmt(p.b * p.c)} + ${fmt(p.a * p.c)})`,
        note: 'Три пары одинаковых прямоугольников. Кирпич, коробка, комната — всё это параллелепипеды.',
    },
    {
        id: 'prism', short: 'Призма', name: 'Треугольная призма', group: 'Призмы и пирамиды', params: [param('a', 'сторона основания a', 2), param('h', 'высота h', 2.4)],
        verts: p => prism(p.a, p.h), V: p => (SQ3 / 4) * p.a ** 2 * p.h, S: p => (SQ3 / 2) * p.a ** 2 + 3 * p.a * p.h,
        formV: 'V = S осн. · h = (√3 / 4) · a² · h', calcV: p => `(√3 / 4) · ${fmt(p.a)}² · ${fmt(p.h)}`,
        formS: 'S = 2 · S осн. + 3 · a · h', calcS: p => `(√3 / 2) · ${fmt(p.a)}² + 3 · ${fmt(p.a)} · ${fmt(p.h)}`,
        note: 'Два равных треугольника-основания и три прямоугольные боковые грани.',
    },
    {
        id: 'pyramid', short: 'Пирамида', name: 'Четырёхугольная пирамида', group: 'Призмы и пирамиды', params: [param('a', 'сторона основания a', 2), param('h', 'высота h', 2.4)],
        verts: p => pyramid(p.a, p.h), V: p => (p.a ** 2 * p.h) / 3, S: p => p.a ** 2 + 2 * p.a * Math.sqrt(p.h ** 2 + (p.a / 2) ** 2),
        formV: 'V = ⅓ · S осн. · h = ⅓ · a² · h', calcV: p => `⅓ · ${fmt(p.a)}² · ${fmt(p.h)}`,
        formS: 'S = a² + 2a · l,  l = √(h² + (a/2)²)', calcS: p => `${fmt(p.a)}² + 2 · ${fmt(p.a)} · ${fmt(Math.sqrt(p.h ** 2 + (p.a / 2) ** 2))}`,
        note: 'Квадрат в основании и четыре равнобедренных треугольника. Объём пирамиды ровно в три раза меньше объёма призмы с тем же основанием и высотой.',
    },
    {
        id: 'cylinder', short: 'Цилиндр', name: 'Цилиндр', group: 'Тела вращения', round: true, params: [param('r', 'радиус r', 1.1, 0.5, 2), param('h', 'высота h', 2.4)],
        V: p => Math.PI * p.r ** 2 * p.h, S: p => 2 * Math.PI * p.r * (p.r + p.h),
        formV: 'V = π · r² · h', calcV: p => `π · ${fmt(p.r)}² · ${fmt(p.h)}`, formS: 'S = 2πr · (r + h)', calcS: p => `2π · ${fmt(p.r)} · (${fmt(p.r)} + ${fmt(p.h)})`,
        counts: ['2 основания (круги)', '1 боковая поверхность'],
        note: 'Развёртка: два круга и прямоугольник 2πr × h. Боковая поверхность, свёрнутая в трубу, — это и есть цилиндр.',
    },
    {
        id: 'cone', short: 'Конус', name: 'Конус', group: 'Тела вращения', round: true, params: [param('r', 'радиус r', 1.3, 0.5, 2), param('h', 'высота h', 2.4)],
        V: p => (Math.PI * p.r ** 2 * p.h) / 3, S: p => Math.PI * p.r * (p.r + Math.hypot(p.r, p.h)),
        formV: 'V = ⅓ · π · r² · h', calcV: p => `⅓ · π · ${fmt(p.r)}² · ${fmt(p.h)}`, formS: 'S = πr · (r + l),  l = √(r² + h²)',
        calcS: p => `π · ${fmt(p.r)} · (${fmt(p.r)} + ${fmt(Math.hypot(p.r, p.h))})`,
        counts: ['1 основание (круг)', '1 боковая поверхность'],
        note: 'Развёртка боковой поверхности — круговой сектор с радиусом l. Объём конуса втрое меньше объёма цилиндра с тем же основанием и высотой.',
    },
    {
        id: 'sphere', short: 'Шар', name: 'Шар', group: 'Тела вращения', round: true, params: [param('r', 'радиус r', 1.5, 0.5, 2.2)],
        V: p => (4 / 3) * Math.PI * p.r ** 3, S: p => 4 * Math.PI * p.r ** 2,
        formV: 'V = ⁴⁄₃ · π · r³', calcV: p => `⁴⁄₃ · π · ${fmt(p.r)}³`, formS: 'S = 4π · r²', calcS: p => `4π · ${fmt(p.r)}²`,
        counts: ['1 сферическая поверхность'],
        note: 'Поверхность шара нельзя развернуть на плоскость без разрывов и растяжений. Поэтому любая карта мира искажает форму или размеры.',
    },
];

export const SOLID_BY_ID = Object.fromEntries(SOLIDS.map(s => [s.id, s]));
export const SOLID_GROUPS = ['Правильные многогранники', 'Призмы и пирамиды', 'Тела вращения'];
export const defaults = solid => Object.fromEntries(solid.params.map(p => [p.id, p.def]));

// The net chosen last time for each solid: reused while a slider moves, so the net does not change shape on every tick
const seedCache = new Map();

/**
 * Everything the scene needs for a polyhedron: vertices turned to stand on the largest face, faces, counts and a net.
 */
export function buildPolyhedron(solid, p) {
    const raw = solid.verts(p);
    const faces0 = hullFaces(raw);
    const { verts, root } = standOnLargestFace(raw, faces0);
    const stats = polyStats(verts, faces0);
    const net = findNet(verts, faces0, root, seedCache.get(solid.id) ?? null);
    if (net) seedCache.set(solid.id, net.seed);
    return { verts, faces: faces0, root, stats, net };
}

// Human-readable face shape: "6 квадратов", "8 треугольников"
export function describeFaces(verts, faces) {
    const by = {};
    for (const f of faces) by[f.length] = (by[f.length] || 0) + 1;
    const names = { 3: ['треугольник', 'треугольника', 'треугольников'], 4: ['четырёхугольник', 'четырёхугольника', 'четырёхугольников'], 5: ['пятиугольник', 'пятиугольника', 'пятиугольников'] };
    const plural = (n, [one, few, many]) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
    return Object.entries(by).map(([k, n]) => `${n} ${plural(n, names[k] ?? names[4])}`).join(' и ');
}

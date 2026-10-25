// Molecule catalog for the constructor. Geometry is built from real bond lengths (Å) and angles,
// so the 3D models show correct shapes. Atoms with { x: true } are neighbours in a crystal
// (drawn translucent, not counted in the formula); { q } is the ion charge.
// Bond order: 1, 1.5 (delocalized), 2, 3; 0 = contact between ions in a crystal (thin line).
import { ELEMENTS } from './elements.js';

const DEG = Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => mul(a, 1 / Math.hypot(...a));

// --- Direction sets (unit vectors) ---
const dirAt = deg => [Math.cos(deg * DEG), Math.sin(deg * DEG), 0];
const LINEAR = [[1, 0, 0], [-1, 0, 0]];
const TRIGONAL = [dirAt(90), dirAt(210), dirAt(330)];
const bent = a => [
    [Math.sin((a / 2) * DEG), -Math.cos((a / 2) * DEG), 0],
    [-Math.sin((a / 2) * DEG), -Math.cos((a / 2) * DEG), 0],
];
// Three bonds pointing down with angle `a` between any two (lone pair on top)
function pyramid(a) {
    const c = Math.sqrt((Math.cos(a * DEG) + 0.5) / 1.5);
    const s = Math.sqrt(1 - c * c);
    return [0, 120, 240].map(f => [s * Math.cos(f * DEG), -c, s * Math.sin(f * DEG)]);
}
const TETRA = [[0, 1, 0], ...pyramid(109.47)];
const OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const SQUARE = [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]];
const CUBE = [[1, 1, 1], [-1, -1, -1], [1, -1, 1], [-1, 1, 1], [1, 1, -1], [-1, -1, 1], [1, -1, -1], [-1, 1, -1]].map(norm);

// --- Builder ---
function molecule(meta, build) {
    const atoms = [];
    const bonds = [];
    const P = i => (Array.isArray(i) ? i : atoms[i].p);
    const b = {
        atom(el, p, opt) {
            atoms.push({ el, p, ...opt });
            return atoms.length - 1;
        },
        bond(i, j, order = 1) {
            bonds.push([i, j, order]);
        },
        // New atom bonded to c: |c-new| = len, angle(bb, c, new) = ang, dihedral(a, bb, c, new) = dih (0 = cis to a)
        place(el, c, bb, a, len, ang, dih = 0, opt) {
            const C = P(c);
            const B = P(bb);
            const bc = norm(sub(C, B));
            let n = a == null ? null : cross(sub(B, P(a)), bc);
            if (!n || Math.hypot(...n) < 1e-6) {
                // No reference: keep the new atom in the xy plane
                const z = Math.abs(bc[2]) > 0.99 ? [0, 1, 0] : [0, 0, 1];
                n = sub(z, mul(bc, dot(z, bc)));
            }
            n = norm(n);
            const m = cross(n, bc);
            const t = ang * DEG;
            const f = dih * DEG;
            const p = add(C, add(mul(bc, -len * Math.cos(t)), add(mul(m, len * Math.sin(t) * Math.cos(f)), mul(n, len * Math.sin(t) * Math.sin(f)))));
            return b.atom(el, p, opt);
        },
        star(el, center, dirs, len, order = 1, opt) {
            return dirs.map(d => {
                const i = b.atom(el, add(P(center), mul(d, len)), opt);
                b.bond(center, i, order);
                return i;
            });
        },
    };
    build(b);
    const comp = {};
    for (const a of atoms) if (!a.x) comp[a.el] = (comp[a.el] || 0) + 1;
    return { view: [0.3, -0.5], ...meta, atoms, bonds, comp };
}

// --- Shape generators ---
const diatomic = (e1, e2, len, order = 1) => b => b.bond(b.atom(e1, [0, 0, 0]), b.atom(e2, [len, 0, 0]), order);

const central = (c, l, dirs, len, order = 1) => b => b.star(l, b.atom(c, [0, 0, 0]), dirs, len, order);

// 2x2x2 fragment of the rock-salt (NaCl type) lattice. First two ions form the formula unit.
const rockSalt = (cat, cq, an, aq) => b => {
    const d = ELEMENTS[cat].ionR + ELEMENTS[an].ionR;
    const pts = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    pts.forEach(([i, j, k], n) => {
        const anion = (i + j + k) % 2 === 1;
        b.atom(anion ? an : cat, [i * d, j * d, k * d], { q: anion ? aq : cq, x: n > 1 });
    });
    pts.forEach((p, i) => pts.forEach((q, j) => {
        if (j > i && Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) === 1) b.bond(i, j, 0);
    }));
};

// Central ion with its coordination shell; the first `real` ligands belong to the formula unit
const cluster = (cEl, cq, lEl, lq, dirs, d, real) => b => {
    const c = b.atom(cEl, [0, 0, 0], { q: cq });
    dirs.forEach((u, i) => b.bond(c, b.atom(lEl, mul(u, d), { q: lq, x: i >= real }), 0));
};

// Corundum (Al2O3, Fe2O3): two MO6 octahedra sharing a face of three O
const corundum = m => b => {
    const d = m === 'Al' ? 1.91 : 2.03;
    const rho = d * Math.sqrt(2 / 3);
    const h = d / Math.sqrt(3);
    const m1 = b.atom(m, [0, h, 0], { q: '3+' });
    const m2 = b.atom(m, [0, -h, 0], { q: '3+' });
    const tri = (y, rot, x) => [0, 120, 240].map(a =>
        b.atom('O', [rho * Math.cos((a + rot) * DEG), y, rho * Math.sin((a + rot) * DEG)], { q: '2-', x }));
    const shared = tri(0, 90, false);
    const top = tri(2 * h, 150, true);
    const bottom = tri(-2 * h, 150, true);
    shared.forEach(o => { b.bond(m1, o, 0); b.bond(m2, o, 0); });
    top.forEach(o => b.bond(m1, o, 0));
    bottom.forEach(o => b.bond(m2, o, 0));
};

// Metal hydroxide MOH: M+ next to the OH- group
const hydroxide = (m, d) => b => {
    const o = b.atom('O', [0, 0, 0]);
    b.bond(o, b.atom('H', [0.96, 0, 0]));
    b.bond(o, b.atom(m, [-d, 0, 0], { q: '+' }), 0);
};

// --- Texts reused by many entries ---
const NONPOLAR = 'ковалентная неполярная';
const POLAR = 'ковалентная полярная';
const IONIC = 'ионная';
const MOLECULAR = 'молекулярная';
const LINEAR_2 = 'линейная (двухатомная молекула)';
const ROCK_SALT = 'кубическая: каждый ион окружён 6 ионами другого знака';
const LATTICE_NOTE = 'В ионном кристалле нет отдельных молекул. Показан фрагмент решётки: полупрозрачные ионы — соседи в кристалле.';
const CLUSTER_NOTE = 'Ионное вещество: показана формульная единица и ближайшие ионы-соседи (полупрозрачные).';
const ORGANIC_BOND = 'ковалентная: C–C неполярная, C–H слабополярная';

export const MOLECULES = [
    // ---------- Simple substances ----------
    molecule({
        id: 'H2', formula: 'H2', name: 'Водород', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Самый лёгкий газ во Вселенной.', 'Сгорает с образованием только воды — экологичное топливо.'],
    }, diatomic('H', 'H', 0.74)),
    molecule({
        id: 'O2', formula: 'O2', name: 'Кислород', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Составляет около 21% воздуха.', 'Необходим для дыхания и горения.'],
    }, diatomic('O', 'O', 1.21, 2)),
    molecule({
        id: 'N2', formula: 'N2', name: 'Азот', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Составляет около 78% воздуха.', 'Тройная связь N≡N очень прочная, поэтому азот малоактивен.'],
    }, diatomic('N', 'N', 1.1, 3)),
    molecule({
        id: 'F2', formula: 'F2', name: 'Фтор', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Самый активный неметалл, самый электроотрицательный элемент.', 'Светло-жёлтый ядовитый газ.'],
    }, diatomic('F', 'F', 1.42)),
    molecule({
        id: 'Cl2', formula: 'Cl2', name: 'Хлор', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Жёлто-зелёный ядовитый газ с резким запахом.', 'Применяют для обеззараживания питьевой воды.'],
    }, diatomic('Cl', 'Cl', 1.99)),
    molecule({
        id: 'Br2', formula: 'Br2', name: 'Бром', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Единственный неметалл, который при обычных условиях — жидкость.', 'Красно-бурая жидкость с ядовитыми парами.'],
    }, diatomic('Br', 'Br', 2.28)),
    molecule({
        id: 'I2', formula: 'I2', name: 'Иод', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Тёмно-фиолетовые кристаллы; при нагревании возгоняются в фиолетовый пар.', 'Спиртовой раствор иода — антисептик.'],
    }, diatomic('I', 'I', 2.67)),
    molecule({
        id: 'O3', formula: 'O3', name: 'Озон', cls: 'Простое вещество (аллотропия кислорода)', bond: NONPOLAR, lattice: MOLECULAR, shape: 'угловая, 117°',
        facts: ['Озоновый слой поглощает опасный ультрафиолет Солнца.', 'Образуется при грозовых разрядах — «запах свежести».'],
        note: 'Связи O–O одинаковые — промежуточные между одинарной и двойной (показаны пунктиром).', view: [0.1, -0.2],
    }, central('O', 'O', bent(116.8), 1.28, 1.5)),
    molecule({
        id: 'P4', formula: 'P4', name: 'Белый фосфор', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR, shape: 'тетраэдр (угол P–P–P 60°)',
        facts: ['Светится в темноте и самовоспламеняется на воздухе — хранят под водой.', 'Очень ядовит.'],
    }, b => {
        const s = 2.21 / (2 * Math.SQRT2);
        const ps = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => b.atom('P', mul(v, s)));
        ps.forEach((p, i) => ps.forEach((q, j) => j > i && b.bond(p, q)));
    }),
    molecule({
        id: 'S8', formula: 'S8', name: 'Сера', alt: 'ромбическая', cls: 'Простое вещество (неметалл)', bond: NONPOLAR, lattice: MOLECULAR,
        shape: 'кольцо-«корона» из 8 атомов',
        facts: ['Жёлтые кристаллы, не смачиваются водой.', 'Применяют для производства серной кислоты и вулканизации резины.'],
        view: [0.55, 0],
    }, b => {
        // Crown: S–S 2.05 Å, S–S–S 108°
        const R = 2.345;
        const h = 0.495;
        const ss = Array.from({ length: 8 }, (_, k) =>
            b.atom('S', [R * Math.cos(k * 45 * DEG), k % 2 ? h : -h, R * Math.sin(k * 45 * DEG)]));
        ss.forEach((s, k) => b.bond(s, ss[(k + 1) % 8]));
    }),

    // ---------- Hydrogen compounds ----------
    molecule({
        id: 'H2O', formula: 'H2O', name: 'Вода', alt: 'оксид водорода', cls: 'Оксид', bond: POLAR, lattice: MOLECULAR, shape: 'угловая, 104,5°',
        facts: ['Встречается в природе во всех трёх агрегатных состояниях.', 'Лёд легче воды, поэтому водоёмы не промерзают до дна.'],
        view: [0.1, -0.25],
    }, central('O', 'H', bent(104.5), 0.96)),
    molecule({
        id: 'H2O2', formula: 'H2O2', name: 'Пероксид водорода', cls: 'Пероксид', bond: 'ковалентная: O–H полярная, O–O неполярная', lattice: MOLECULAR,
        shape: 'незамкнутая «книжка»: атомы H по разные стороны от связи O–O',
        facts: ['3%-й раствор используют для обработки ран.', 'Легко разлагается: 2H₂O₂ → 2H₂O + O₂↑'],
    }, b => {
        const o1 = b.atom('O', [0, 0, 0]);
        const o2 = b.atom('O', [1.47, 0, 0]);
        b.bond(o1, o2);
        const h1 = b.place('H', o1, o2, null, 0.95, 94.8);
        b.bond(o1, h1);
        b.bond(o2, b.place('H', o2, o1, h1, 0.95, 94.8, 111.5));
    }),
    molecule({
        id: 'NH3', formula: 'NH3', name: 'Аммиак', cls: 'Летучее водородное соединение', bond: POLAR, lattice: MOLECULAR, shape: 'треугольная пирамида, 107°',
        facts: ['Газ с резким запахом; 10%-й раствор — нашатырный спирт.', 'Главное сырьё для азотных удобрений.'],
        view: [0.35, -0.3],
    }, central('N', 'H', pyramid(107), 1.01)),
    molecule({
        id: 'CH4', formula: 'CH4', name: 'Метан', cls: 'Углеводород (алкан)', bond: 'ковалентная слабополярная', lattice: MOLECULAR, shape: 'тетраэдр, 109,5°',
        facts: ['Главный компонент природного газа.', 'Горит голубым пламенем: CH₄ + 2O₂ → CO₂ + 2H₂O'],
    }, central('C', 'H', TETRA, 1.09)),
    molecule({
        id: 'HCl', formula: 'HCl', name: 'Хлороводород', cls: 'Водородное соединение (раствор — кислота)', bond: POLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Раствор в воде — соляная кислота.', 'Соляная кислота входит в состав желудочного сока.'],
    }, diatomic('H', 'Cl', 1.27)),
    molecule({
        id: 'HF', formula: 'HF', name: 'Фтороводород', cls: 'Водородное соединение (раствор — кислота)', bond: POLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Связь H–F — самая полярная среди галогеноводородов.', 'Плавиковая кислота разъедает стекло — ею делают надписи на стекле.'],
    }, diatomic('H', 'F', 0.92)),
    molecule({
        id: 'HBr', formula: 'HBr', name: 'Бромоводород', cls: 'Водородное соединение (раствор — кислота)', bond: POLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Бесцветный газ, дымит на влажном воздухе.', 'Раствор — бромоводородная кислота, она сильнее соляной.'],
    }, diatomic('H', 'Br', 1.41)),
    molecule({
        id: 'H2S', formula: 'H2S', name: 'Сероводород', cls: 'Водородное соединение (раствор — кислота)', bond: POLAR, lattice: MOLECULAR, shape: 'угловая, 92°',
        facts: ['Ядовитый газ с запахом тухлых яиц.', 'Есть в вулканических газах и некоторых минеральных источниках.'],
        view: [0.1, -0.25],
    }, central('S', 'H', bent(92.1), 1.34)),
    molecule({
        id: 'PH3', formula: 'PH3', name: 'Фосфин', cls: 'Летучее водородное соединение', bond: 'ковалентная (практически неполярная)', lattice: MOLECULAR,
        shape: 'треугольная пирамида, 93,5°',
        facts: ['Ядовитый газ с запахом гнилой рыбы.', 'Угол H–P–H (93,5°) меньше, чем H–N–H в аммиаке (107°).'],
        view: [0.35, -0.3],
    }, central('P', 'H', pyramid(93.5), 1.42)),
    molecule({
        id: 'SiH4', formula: 'SiH4', name: 'Силан', cls: 'Летучее водородное соединение', bond: POLAR, lattice: MOLECULAR, shape: 'тетраэдр, 109,5°',
        facts: ['Самовоспламеняется на воздухе.', 'Используют для получения сверхчистого кремния для микросхем.'],
    }, central('Si', 'H', TETRA, 1.48)),

    // ---------- Oxides ----------
    molecule({
        id: 'CO', formula: 'CO', name: 'Угарный газ', alt: 'оксид углерода(II)', cls: 'Несолеобразующий оксид', bond: POLAR, lattice: MOLECULAR, shape: LINEAR_2,
        facts: ['Без цвета и запаха, очень ядовит: связывается с гемоглобином крови.', 'Восстановитель в металлургии: Fe₂O₃ + 3CO → 2Fe + 3CO₂'],
        note: 'Тройная связь: две обычные ковалентные и одна донорно-акцепторная.',
    }, diatomic('C', 'O', 1.13, 3)),
    molecule({
        id: 'CO2', formula: 'CO2', name: 'Углекислый газ', alt: 'оксид углерода(IV)', cls: 'Кислотный оксид', bond: POLAR, lattice: MOLECULAR, shape: 'линейная, 180°',
        facts: ['Мы его выдыхаем, а растения поглощают при фотосинтезе.', 'Твёрдый CO₂ — «сухой лёд».'],
        note: 'Связи полярные, но молекула неполярна: она симметрична.', view: [0.2, -0.3],
    }, central('C', 'O', LINEAR, 1.16, 2)),
    molecule({
        id: 'SO2', formula: 'SO2', name: 'Сернистый газ', alt: 'оксид серы(IV)', cls: 'Кислотный оксид', bond: POLAR, lattice: MOLECULAR, shape: 'угловая, 119°',
        facts: ['Газ с резким запахом; образуется при горении серы.', 'Одна из причин кислотных дождей.'],
        view: [0.1, -0.25],
    }, central('S', 'O', bent(119), 1.43, 2)),
    molecule({
        id: 'SO3', formula: 'SO3', name: 'Серный ангидрид', alt: 'оксид серы(VI)', cls: 'Кислотный оксид', bond: POLAR, lattice: MOLECULAR, shape: 'плоский треугольник, 120°',
        facts: ['С водой образует серную кислоту: SO₃ + H₂O → H₂SO₄', 'Бесцветная летучая жидкость, дымит на воздухе.'],
        view: [0.15, -0.2],
    }, central('S', 'O', TRIGONAL, 1.42, 2)),
    molecule({
        id: 'NO2', formula: 'NO2', name: 'Бурый газ', alt: 'оксид азота(IV)', cls: 'Кислотный оксид', bond: POLAR, lattice: MOLECULAR, shape: 'угловая, 134°',
        facts: ['Ядовитый бурый газ — «лисий хвост» над заводскими трубами.', 'Образуется при грозе и в выхлопных газах.'],
        note: 'Связи N–O одинаковые — промежуточные между одинарной и двойной.', view: [0.1, -0.2],
    }, central('N', 'O', bent(134.3), 1.2, 1.5)),
    molecule({
        id: 'SiO2', formula: 'SiO2', name: 'Кварц', alt: 'оксид кремния(IV)', cls: 'Кислотный оксид', bond: POLAR, lattice: 'атомная',
        shape: 'тетраэдры SiO₄, связанные общими вершинами',
        facts: ['Основа песка, кварца и горного хрусталя.', 'Из него делают стекло; очень твёрдый и тугоплавкий.'],
        note: 'Молекул SiO₂ нет — это атомный кристалл. Показан фрагмент: полупрозрачные атомы — соседи.',
    }, b => {
        const si = b.atom('Si', [0, 0, 0]);
        const os = TETRA.map((u, i) => b.atom('O', mul(u, 1.61), { x: i >= 2 }));
        os.forEach((o, i) => {
            b.bond(si, o);
            b.bond(o, b.place('Si', o, si, os[(i + 1) % 4], 1.61, 144, 180, { x: true }));
        });
    }),
    molecule({
        id: 'MgO', formula: 'MgO', name: 'Оксид магния', alt: 'жжёная магнезия', cls: 'Основный оксид', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Образуется при горении магния ослепительно белым пламенем.', 'Тугоплавкий белый порошок (плавится при ≈2800 °C).'],
        note: LATTICE_NOTE, ions: 'Mg²⁺ и O²⁻',
    }, rockSalt('Mg', '2+', 'O', '2-')),
    molecule({
        id: 'CaO', formula: 'CaO', name: 'Негашёная известь', alt: 'оксид кальция', cls: 'Основный оксид', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Бурно реагирует с водой («гашение»): CaO + H₂O → Ca(OH)₂', 'Получают обжигом известняка: CaCO₃ → CaO + CO₂'],
        note: LATTICE_NOTE, ions: 'Ca²⁺ и O²⁻',
    }, rockSalt('Ca', '2+', 'O', '2-')),
    molecule({
        id: 'Na2O', formula: 'Na2O', name: 'Оксид натрия', cls: 'Основный оксид', bond: IONIC, lattice: 'ионная',
        shape: 'каждый ион O²⁻ окружён 8 ионами Na⁺ (по вершинам куба)',
        facts: ['Бурно реагирует с водой, образуя щёлочь: Na₂O + H₂O → 2NaOH', 'Белое твёрдое вещество.'],
        note: CLUSTER_NOTE, ions: 'Na⁺ и O²⁻',
    }, cluster('O', '2-', 'Na', '+', CUBE, 2.4, 2)),
    molecule({
        id: 'Al2O3', formula: 'Al2O3', name: 'Корунд', alt: 'оксид алюминия', cls: 'Амфотерный оксид', bond: IONIC, lattice: 'ионная',
        shape: 'каждый ион Al³⁺ окружён 6 ионами O²⁻ (октаэдр)',
        facts: ['Рубин и сапфир — это корунд с примесями.', 'Тонкая плёнка Al₂O₃ защищает алюминий от коррозии.'],
        note: CLUSTER_NOTE, ions: 'Al³⁺ и O²⁻', view: [0.25, -0.4],
    }, corundum('Al')),
    molecule({
        id: 'Fe2O3', formula: 'Fe2O3', name: 'Оксид железа(III)', alt: 'гематит', cls: 'Амфотерный оксид', bond: IONIC, lattice: 'ионная',
        shape: 'каждый ион Fe³⁺ окружён 6 ионами O²⁻ (октаэдр)',
        facts: ['Основная часть ржавчины и руды красного железняка.', 'Используют как красно-коричневый пигмент (охра, сурик).'],
        note: CLUSTER_NOTE, ions: 'Fe³⁺ и O²⁻', view: [0.25, -0.4],
    }, corundum('Fe')),
    molecule({
        id: 'CuO', formula: 'CuO', name: 'Оксид меди(II)', cls: 'Основный оксид', bond: IONIC, lattice: 'ионная',
        shape: 'ион Cu²⁺ окружён 4 ионами O²⁻ (квадрат)',
        facts: ['Чёрный порошок.', 'Водород восстанавливает его до меди: CuO + H₂ → Cu + H₂O'],
        note: CLUSTER_NOTE, ions: 'Cu²⁺ и O²⁻', view: [0.5, -0.3],
    }, cluster('Cu', '2+', 'O', '2-', SQUARE, 1.95, 1)),

    // ---------- Acids ----------
    molecule({
        id: 'H2SO4', formula: 'H2SO4', name: 'Серная кислота', cls: 'Кислородсодержащая кислота', bond: POLAR, lattice: MOLECULAR,
        shape: 'тетраэдр вокруг атома S',
        facts: ['Тяжёлая маслянистая жидкость — главный продукт химической промышленности.', 'При разбавлении льют кислоту в воду, а не наоборот!'],
    }, b => {
        const s = b.atom('S', [0, 0, 0]);
        const t = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map(norm);
        const [o1, o2] = b.star('O', s, t.slice(0, 2), 1.42, 2);
        const [o3, o4] = b.star('O', s, t.slice(2), 1.57, 1);
        b.bond(o3, b.place('H', o3, s, o4, 0.97, 108.5, 180));
        b.bond(o4, b.place('H', o4, s, o3, 0.97, 108.5, 180));
        void o1; void o2;
    }),
    molecule({
        id: 'HNO3', formula: 'HNO3', name: 'Азотная кислота', cls: 'Кислородсодержащая кислота', bond: POLAR, lattice: MOLECULAR,
        shape: 'плоская, вокруг атома N — треугольник',
        facts: ['Сильная кислота и сильный окислитель.', 'Используют для производства удобрений и красителей.'],
        note: 'Две связи N–O одинаковые — промежуточные между одинарной и двойной.', view: [0.1, -0.2],
    }, b => {
        const n = b.atom('N', [0, 0, 0]);
        const oh = b.atom('O', mul(dirAt(270), 1.41));
        b.bond(n, oh);
        const [o2] = b.star('O', n, [dirAt(30), dirAt(150)], 1.2, 1.5);
        b.bond(oh, b.place('H', oh, n, o2, 0.96, 102, 0));
    }),
    molecule({
        id: 'H2CO3', formula: 'H2CO3', name: 'Угольная кислота', cls: 'Кислородсодержащая кислота', bond: POLAR, lattice: MOLECULAR,
        shape: 'плоская, вокруг атома C — треугольник, 120°',
        facts: ['Слабая и неустойчивая — есть в газированной воде.', 'Легко распадается: H₂CO₃ → H₂O + CO₂↑'],
        view: [0.1, -0.2],
    }, b => {
        const c = b.atom('C', [0, 0, 0]);
        const [o1] = b.star('O', c, [dirAt(90)], 1.21, 2);
        for (const d of [dirAt(210), dirAt(330)]) {
            const o = b.atom('O', mul(d, 1.34));
            b.bond(c, o);
            b.bond(o, b.place('H', o, c, o1, 0.97, 108, 0));
        }
    }),
    molecule({
        id: 'H3PO4', formula: 'H3PO4', name: 'Ортофосфорная кислота', cls: 'Кислородсодержащая кислота', bond: POLAR, lattice: MOLECULAR,
        shape: 'тетраэдр вокруг атома P',
        facts: ['Кислота средней силы, твёрдая и нелетучая.', 'Сырьё для фосфорных удобрений; пищевая добавка E338.'],
        view: [0.35, -0.4],
    }, b => {
        const p = b.atom('P', [0, 0, 0]);
        const [o1] = b.star('O', p, [TETRA[0]], 1.52, 2);
        for (const d of TETRA.slice(1)) {
            const o = b.atom('O', mul(d, 1.57));
            b.bond(p, o);
            b.bond(o, b.place('H', o, p, o1, 0.96, 112, 180));
        }
    }),

    // ---------- Bases ----------
    molecule({
        id: 'NaOH', formula: 'NaOH', name: 'Гидроксид натрия', alt: 'едкий натр', cls: 'Основание (щёлочь)', bond: 'ионная (Na⁺ и OH⁻) и ковалентная полярная (O–H)',
        lattice: 'ионная', shape: 'ион Na⁺ и гидроксид-ион OH⁻',
        facts: ['Сильная щёлочь, разъедает кожу и ткани.', 'Используют для производства мыла и бумаги.'],
        ions: 'Na⁺ и OH⁻', view: [0.15, -0.3],
    }, hydroxide('Na', 2.35)),
    molecule({
        id: 'KOH', formula: 'KOH', name: 'Гидроксид калия', alt: 'едкое кали', cls: 'Основание (щёлочь)', bond: 'ионная (K⁺ и OH⁻) и ковалентная полярная (O–H)',
        lattice: 'ионная', shape: 'ион K⁺ и гидроксид-ион OH⁻',
        facts: ['Сильная щёлочь.', 'Электролит в щелочных батарейках; из него делают жидкое мыло.'],
        ions: 'K⁺ и OH⁻', view: [0.15, -0.3],
    }, hydroxide('K', 2.7)),
    molecule({
        id: 'CaOH2', formula: 'Ca(OH)2', name: 'Гидроксид кальция', alt: 'гашёная известь', cls: 'Основание (щёлочь)',
        bond: 'ионная (Ca²⁺ и OH⁻) и ковалентная полярная (O–H)', lattice: 'ионная', shape: 'ион Ca²⁺ и два иона OH⁻',
        facts: ['Раствор — известковая вода.', 'Известковая вода мутнеет от CO₂ — так обнаруживают углекислый газ.'],
        ions: 'Ca²⁺ и OH⁻', view: [0.15, -0.3],
    }, b => {
        const ca = b.atom('Ca', [0, 0, 0], { q: '2+' });
        [[2.37, 0], [-2.37, 180]].forEach(([x, dih]) => {
            const o = b.atom('O', [x, 0, 0]);
            b.bond(ca, o, 0);
            b.bond(o, b.place('H', o, ca, [0, 1, 0], 0.96, 120, dih));
        });
    }),

    // ---------- Salts ----------
    molecule({
        id: 'NaCl', formula: 'NaCl', name: 'Поваренная соль', alt: 'хлорид натрия', cls: 'Соль', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Кристаллы соли — кубики, как и её решётка.', 'Минерал галит (каменная соль); много её в морской воде.'],
        note: LATTICE_NOTE, ions: 'Na⁺ и Cl⁻',
    }, rockSalt('Na', '+', 'Cl', '-')),
    molecule({
        id: 'KCl', formula: 'KCl', name: 'Хлорид калия', cls: 'Соль', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Важное калийное удобрение (минерал сильвин).', 'Используют как заменитель поваренной соли.'],
        note: LATTICE_NOTE, ions: 'K⁺ и Cl⁻',
    }, rockSalt('K', '+', 'Cl', '-')),
    molecule({
        id: 'KI', formula: 'KI', name: 'Иодид калия', cls: 'Соль', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Добавляют в поваренную соль для профилактики нехватки иода.', 'Белые кристаллы, хорошо растворимы в воде.'],
        note: LATTICE_NOTE, ions: 'K⁺ и I⁻',
    }, rockSalt('K', '+', 'I', '-')),
    molecule({
        id: 'LiCl', formula: 'LiCl', name: 'Хлорид лития', cls: 'Соль', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Соли лития окрашивают пламя в карминово-красный цвет.', 'Сильно поглощает влагу — используют как осушитель воздуха.'],
        note: LATTICE_NOTE, ions: 'Li⁺ и Cl⁻',
    }, rockSalt('Li', '+', 'Cl', '-')),
    molecule({
        id: 'NaF', formula: 'NaF', name: 'Фторид натрия', cls: 'Соль', bond: IONIC, lattice: 'ионная', shape: ROCK_SALT,
        facts: ['Фториды в зубной пасте укрепляют зубную эмаль.', 'В больших количествах ядовит.'],
        note: LATTICE_NOTE, ions: 'Na⁺ и F⁻',
    }, rockSalt('Na', '+', 'F', '-')),
    molecule({
        id: 'CaCl2', formula: 'CaCl2', name: 'Хлорид кальция', cls: 'Соль', bond: IONIC, lattice: 'ионная',
        shape: 'ион Ca²⁺ окружён 6 ионами Cl⁻ (октаэдр)',
        facts: ['Посыпают дороги против гололёда.', 'Хорошо поглощает влагу — используется как осушитель.'],
        note: CLUSTER_NOTE, ions: 'Ca²⁺ и Cl⁻',
    }, cluster('Ca', '2+', 'Cl', '-', OCTA, 2.74, 2)),
    molecule({
        id: 'MgCl2', formula: 'MgCl2', name: 'Хлорид магния', cls: 'Соль', bond: IONIC, lattice: 'ионная',
        shape: 'ион Mg²⁺ окружён 6 ионами Cl⁻ (октаэдр)',
        facts: ['Придаёт морской воде горьковатый вкус.', 'Электролизом его расплава получают магний.'],
        note: CLUSTER_NOTE, ions: 'Mg²⁺ и Cl⁻',
    }, cluster('Mg', '2+', 'Cl', '-', OCTA, 2.5, 2)),
    molecule({
        id: 'FeS', formula: 'FeS', name: 'Сульфид железа(II)', cls: 'Соль', bond: 'ионная (с долей ковалентной)', lattice: 'ионная',
        shape: 'ион Fe²⁺ окружён 6 ионами S²⁻ (октаэдр)',
        facts: ['Получают нагреванием смеси порошков: Fe + S → FeS', 'С соляной кислотой выделяет сероводород H₂S.'],
        note: CLUSTER_NOTE, ions: 'Fe²⁺ и S²⁻',
    }, cluster('Fe', '2+', 'S', '2-', OCTA, 2.45, 1)),
    molecule({
        id: 'CaCO3', formula: 'CaCO3', name: 'Карбонат кальция', alt: 'мел, мрамор, известняк', cls: 'Соль',
        bond: 'ионная (Ca²⁺ и CO₃²⁻) и ковалентная полярная (внутри CO₃²⁻)', lattice: 'ионная', shape: 'ион CO₃²⁻ — плоский треугольник, 120°',
        facts: ['Из него состоят мел, мрамор, раковины и яичная скорлупа.', 'С кислотами «вскипает» — выделяется CO₂.'],
        ions: 'Ca²⁺ и CO₃²⁻', note: 'Связи C–O в ионе CO₃²⁻ одинаковые — промежуточные между одинарной и двойной.', view: [0.15, -0.3],
    }, b => {
        const c = b.atom('C', [0, 0, 0]);
        const [o1] = b.star('O', c, TRIGONAL, 1.28, 1.5);
        b.bond(o1, b.atom('Ca', mul(TRIGONAL[0], 1.28 + 2.36), { q: '2+' }), 0);
    }),
    molecule({
        id: 'NaHCO3', formula: 'NaHCO3', name: 'Пищевая сода', alt: 'гидрокарбонат натрия', cls: 'Кислая соль',
        bond: 'ионная (Na⁺ и HCO₃⁻) и ковалентная полярная', lattice: 'ионная', shape: 'ион HCO₃⁻ — плоский, вокруг C треугольник',
        facts: ['Разрыхлитель теста: при нагревании выделяет CO₂.', 'С уксусом «шипит»: выделяется углекислый газ.'],
        ions: 'Na⁺ и HCO₃⁻', view: [0.15, -0.3],
    }, b => {
        const c = b.atom('C', [0, 0, 0]);
        const oh = b.atom('O', mul(dirAt(270), 1.34));
        b.bond(c, oh);
        const [o2, o3] = b.star('O', c, [dirAt(30), dirAt(150)], 1.26, 1.5);
        b.bond(oh, b.place('H', oh, c, o2, 0.97, 110, 0));
        b.bond(o3, b.atom('Na', mul(dirAt(150), 1.26 + 2.4), { q: '+' }), 0);
    }),
    molecule({
        id: 'CuSO4', formula: 'CuSO4', name: 'Сульфат меди(II)', cls: 'Соль', bond: 'ионная (Cu²⁺ и SO₄²⁻) и ковалентная полярная (внутри SO₄²⁻)',
        lattice: 'ионная', shape: 'ион SO₄²⁻ — тетраэдр',
        facts: ['Безводный — белый порошок; с водой даёт синий медный купорос CuSO₄·5H₂O.', 'Применяют для защиты растений от грибковых болезней.'],
        ions: 'Cu²⁺ и SO₄²⁻',
    }, b => {
        const s = b.atom('S', [0, 0, 0]);
        const [o1] = b.star('O', s, TETRA, 1.49, 1.5);
        b.bond(o1, b.atom('Cu', mul(TETRA[0], 1.49 + 1.95), { q: '2+' }), 0);
    }),

    // ---------- Other binary compounds ----------
    molecule({
        id: 'BeCl2', formula: 'BeCl2', name: 'Хлорид бериллия', cls: 'Соль', bond: POLAR, lattice: MOLECULAR, shape: 'линейная, 180°',
        facts: ['Пример линейной молекулы (sp-гибридизация бериллия).', 'Соединения бериллия очень ядовиты.'],
        note: 'Отдельные молекулы BeCl₂ существуют в газе; в твёрдом веществе они соединены в цепочки.', view: [0.2, -0.3],
    }, central('Be', 'Cl', LINEAR, 1.8)),
    molecule({
        id: 'BF3', formula: 'BF3', name: 'Фторид бора', cls: 'Бинарное соединение', bond: POLAR, lattice: MOLECULAR, shape: 'плоский треугольник, 120°',
        facts: ['Пример sp²-гибридизации: все атомы в одной плоскости.', 'Ядовитый газ; катализатор в органическом синтезе.'],
        note: 'Связи полярные, но молекула неполярна: она симметрична.', view: [0.15, -0.2],
    }, central('B', 'F', TRIGONAL, 1.31)),
    molecule({
        id: 'CCl4', formula: 'CCl4', name: 'Тетрахлорметан', cls: 'Галогенпроизводное углеводорода', bond: POLAR, lattice: MOLECULAR, shape: 'тетраэдр, 109,5°',
        facts: ['Негорючая жидкость; раньше применялся в огнетушителях.', 'Ядовит; хороший растворитель жиров.'],
        note: 'Связи полярные, но молекула неполярна: она симметрична.',
    }, central('C', 'Cl', TETRA, 1.77)),

    // ---------- Organic ----------
    molecule({
        id: 'C2H6', formula: 'C2H6', name: 'Этан', cls: 'Углеводород (алкан)', bond: ORGANIC_BOND, lattice: MOLECULAR,
        shape: 'у каждого атома C — тетраэдр, 109,5°',
        facts: ['Входит в состав природного газа.', 'Все связи одинарные (sp³-гибридизация).'],
    }, b => {
        const c1 = b.atom('C', [0, 0, 0]);
        const c2 = b.atom('C', [1.53, 0, 0]);
        b.bond(c1, c2);
        const ref = [0.5, 1, 0];
        for (const d of [60, 180, 300]) b.bond(c1, b.place('H', c1, c2, ref, 1.09, 111, d));
        for (const d of [0, 120, 240]) b.bond(c2, b.place('H', c2, c1, ref, 1.09, 111, d));
    }),
    molecule({
        id: 'C2H4', formula: 'C2H4', name: 'Этилен', cls: 'Углеводород (алкен)', bond: ORGANIC_BOND, lattice: MOLECULAR,
        shape: 'плоская, углы ≈120°',
        facts: ['Ускоряет созревание фруктов.', 'Из этилена получают полиэтилен.'],
        view: [0.15, -0.3],
    }, b => {
        const c1 = b.atom('C', [0, 0, 0]);
        const c2 = b.atom('C', [1.34, 0, 0]);
        b.bond(c1, c2, 2);
        const ref = [0.5, 1, 0];
        for (const d of [0, 180]) {
            b.bond(c1, b.place('H', c1, c2, ref, 1.09, 121.3, d));
            b.bond(c2, b.place('H', c2, c1, ref, 1.09, 121.3, d));
        }
    }),
    molecule({
        id: 'C2H2', formula: 'C2H2', name: 'Ацетилен', cls: 'Углеводород (алкин)', bond: ORGANIC_BOND, lattice: MOLECULAR, shape: 'линейная, 180°',
        facts: ['В кислороде горит пламенем до 3000 °C — для сварки и резки металлов.', 'Получают из карбида кальция и воды.'],
        view: [0.2, -0.3],
    }, b => {
        const c1 = b.atom('C', [0, 0, 0]);
        const c2 = b.atom('C', [1.2, 0, 0]);
        b.bond(c1, c2, 3);
        b.bond(c1, b.atom('H', [-1.06, 0, 0]));
        b.bond(c2, b.atom('H', [2.26, 0, 0]));
    }),
    molecule({
        id: 'CH3OH', formula: 'CH3OH', name: 'Метанол', alt: 'метиловый спирт', cls: 'Спирт', bond: 'ковалентная полярная (C–O, O–H) и слабополярная (C–H)',
        lattice: MOLECULAR, shape: 'тетраэдр у атома C, угол C–O–H ≈ 109°',
        facts: ['Сильный яд: даже небольшое количество вызывает слепоту.', 'Растворитель и сырьё для производства пластмасс.'],
    }, b => {
        const c = b.atom('C', [0, 0, 0]);
        const o = b.atom('O', [1.43, 0, 0]);
        b.bond(c, o);
        const h = b.place('H', o, c, null, 0.96, 108.5, 0);
        b.bond(o, h);
        for (const d of [60, 180, 300]) b.bond(c, b.place('H', c, o, h, 1.09, 109.5, d));
    }),
    molecule({
        id: 'C2H5OH', formula: 'C2H5OH', name: 'Этанол', alt: 'этиловый спирт', cls: 'Спирт', bond: 'ковалентная полярная (C–O, O–H), неполярная (C–C)',
        lattice: MOLECULAR, shape: 'тетраэдры у атомов C, зигзаг C–C–O',
        facts: ['Получают брожением сахаров.', 'Растворитель и антисептик (медицинский спирт).'],
    }, b => {
        const c1 = b.atom('C', [0, 0, 0]);
        const c2 = b.atom('C', [1.53, 0, 0]);
        b.bond(c1, c2);
        const o = b.place('O', c2, c1, [0, -1, 0], 1.43, 109.5, 180);
        b.bond(c2, o);
        b.bond(o, b.place('H', o, c2, c1, 0.96, 108.5, 180));
        for (const d of [60, 180, 300]) b.bond(c1, b.place('H', c1, c2, o, 1.09, 110, d));
        for (const d of [120, 240]) b.bond(c2, b.place('H', c2, c1, o, 1.09, 110, d));
    }),
    molecule({
        id: 'CH3COOH', formula: 'CH3COOH', name: 'Уксусная кислота', cls: 'Карбоновая кислота', bond: 'ковалентная полярная и неполярная (C–C)',
        lattice: MOLECULAR, shape: 'группа COOH плоская, углы ≈120°',
        facts: ['Столовый уксус — 6–9%-й раствор уксусной кислоты.', 'Слабая кислота с резким запахом.'],
    }, b => {
        const c1 = b.atom('C', [0, 0, 0]);
        const c2 = b.atom('C', [1.52, 0, 0]);
        b.bond(c1, c2);
        const ref = [0.5, 1, 0];
        const o1 = b.place('O', c2, c1, ref, 1.21, 123, 0);
        b.bond(c2, o1, 2);
        const o2 = b.place('O', c2, c1, ref, 1.36, 112, 180);
        b.bond(c2, o2);
        b.bond(o2, b.place('H', o2, c2, o1, 0.97, 107, 0));
        for (const d of [0, 120, 240]) b.bond(c1, b.place('H', c1, c2, o1, 1.09, 110, d));
    }),
    molecule({
        id: 'C6H6', formula: 'C6H6', name: 'Бензол', cls: 'Ароматический углеводород (арен)', bond: ORGANIC_BOND, lattice: MOLECULAR,
        shape: 'плоский правильный шестиугольник, 120°',
        facts: ['Все связи C–C одинаковые — промежуточные между одинарной и двойной.', 'Ядовит; важное сырьё для красителей и лекарств.'],
        note: 'Шесть электронов образуют общее π-облако над и под кольцом (показано пунктиром).', view: [0.25, -0.15],
    }, b => {
        const cs = [];
        for (let k = 0; k < 6; k++) cs.push(b.atom('C', mul(dirAt(90 + k * 60), 1.39)));
        cs.forEach((c, k) => {
            b.bond(c, cs[(k + 1) % 6], 1.5);
            b.bond(c, b.atom('H', mul(dirAt(90 + k * 60), 2.48)));
        });
    }),
];

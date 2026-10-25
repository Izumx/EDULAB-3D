// Solar system data: accurate facts for the info card (NASA planetary fact sheets) + render parameters.
// Two scales: "visual" (compressed so everything fits the screen) and "real" (sizes and distances in one
// scale, unit = Earth's equatorial radius). The scene log-interpolates between them.

export const EARTH_DIAMETER = 12756; // km, equatorial
const AU_KM = 149.6e6;
const SUN_DIAMETER = 1392700;

// Mean ecliptic longitude at J2000 (deg) + orbital period (days) -> approximate positions for today's date.
export const J2000_MS = Date.UTC(2000, 0, 1, 12);

export const BODIES = [
    {
        id: 'sun', name: 'Солнце', kind: 'star', color: '#ffb547',
        texture: 'sun.jpg',
        visual: { r: 5 },
        tilt: 7.25, spinHours: 609.1,
        type: 'Звезда — жёлтый карлик',
        diameter: 1392700, xEarth: '109',
        day: '≈ 25 земных суток (на экваторе)',
        temp: '≈ +5500 °C на поверхности, ≈ 15 млн °C в ядре',
        extra: [['Возраст', '≈ 4,6 млрд лет'], ['Планет', '8']],
        fact: 'В Солнце сосредоточено 99,86 % массы всей Солнечной системы. Его свет долетает до Земли примерно за 8 минут 20 секунд.',
    },
    {
        id: 'mercury', name: 'Меркурий', kind: 'planet', color: '#a8a29a',
        texture: 'mercury.jpg',
        visual: { r: 0.5, d: 9 },
        aMkm: 57.9, au: '0,39', periodDays: 87.97, L0: 252.25, tilt: 0.03, spinHours: 1407.6,
        type: 'Планета земной группы',
        diameter: 4879, xEarth: '0,38',
        period: '88 земных суток',
        day: '58,6 земных суток',
        moons: 0,
        temp: '+167 °C (от −173 до +427 °C)',
        fact: 'Солнечные сутки на Меркурии (от восхода до восхода) длятся 176 земных суток — дольше, чем его год. Атмосферы почти нет, поэтому днём там жарко, а ночью очень холодно.',
    },
    {
        id: 'venus', name: 'Венера', kind: 'planet', color: '#e8c48a',
        texture: 'venus.jpg',
        visual: { r: 0.78, d: 12.5 },
        aMkm: 108.2, au: '0,72', periodDays: 224.7, L0: 181.98, tilt: 177.4, spinHours: 5832.5,
        atmosphere: { color: '#ffd9a0', intensity: 1.1 },
        type: 'Планета земной группы',
        diameter: 12104, xEarth: '0,95',
        period: '225 земных суток',
        day: '243 земных суток, в обратную сторону',
        moons: 0,
        temp: '+464 °C',
        fact: 'Венера — самая горячая планета: плотная атмосфера из углекислого газа создаёт сильнейший парниковый эффект. Её сутки длиннее её года, а Солнце там восходит на западе.',
    },
    {
        id: 'earth', name: 'Земля', kind: 'planet', color: '#4a90e2',
        texture: 'earth.jpg', clouds: 'earth_clouds.jpg',
        visual: { r: 0.8, d: 16.5 },
        aMkm: 149.6, au: '1,00', periodDays: 365.256, L0: 100.46, tilt: 23.44, spinHours: 23.934,
        atmosphere: { color: '#6cb6ff', intensity: 1.4 },
        type: 'Планета земной группы',
        diameter: 12756, xEarth: '1',
        period: '365,26 суток (1 год)',
        day: '23 ч 56 мин',
        moons: 1, moonNames: 'Луна',
        temp: '+15 °C',
        fact: 'Единственная известная планета, на которой есть жизнь. Около 71 % поверхности Земли покрыто водой.',
    },
    {
        id: 'mars', name: 'Марс', kind: 'planet', color: '#d0603a',
        texture: 'mars.jpg',
        visual: { r: 0.58, d: 21 },
        aMkm: 228.0, au: '1,52', periodDays: 686.98, L0: 355.43, tilt: 25.19, spinHours: 24.623,
        atmosphere: { color: '#ffb08a', intensity: 0.45 },
        type: 'Планета земной группы',
        diameter: 6792, xEarth: '0,53',
        period: '687 земных суток (1,88 года)',
        day: '24 ч 37 мин',
        moons: 2, moonNames: 'Фобос и Деймос',
        temp: '−65 °C',
        fact: 'На Марсе находится гора Олимп — самый высокий вулкан Солнечной системы, высотой около 22 км. Красный цвет планете придают оксиды железа в грунте.',
    },
    {
        id: 'jupiter', name: 'Юпитер', kind: 'planet', color: '#d8b48a',
        texture: 'jupiter.jpg',
        visual: { r: 2.68, d: 31 },
        aMkm: 778.5, au: '5,20', periodDays: 4332.6, L0: 34.40, tilt: 3.13, spinHours: 9.925,
        type: 'Газовый гигант',
        diameter: 142984, xEarth: '11,2',
        period: '11,86 земного года',
        day: '9 ч 56 мин',
        moons: 97,
        temp: '−110 °C (в облаках)',
        fact: 'Юпитер в 2,5 раза массивнее всех остальных планет, вместе взятых. Большое Красное Пятно — гигантский вихрь, в котором поместилась бы вся Земля.',
    },
    {
        id: 'saturn', name: 'Сатурн', kind: 'planet', color: '#e3cc8f',
        texture: 'saturn.jpg', ring: 'saturn_ring.png',
        visual: { r: 2.46, d: 44 },
        aMkm: 1432.0, au: '9,58', periodDays: 10759, L0: 49.94, tilt: 26.73, spinHours: 10.56,
        type: 'Газовый гигант',
        diameter: 120536, xEarth: '9,45',
        period: '29,5 земного года',
        day: '≈ 10 ч 33 мин',
        moons: 274,
        temp: '−140 °C (в облаках)',
        fact: 'Средняя плотность Сатурна меньше плотности воды. Его кольца состоят из кусочков льда и камня — от пылинок до глыб размером с дом.',
    },
    {
        id: 'uranus', name: 'Уран', kind: 'planet', color: '#9fd8e0',
        texture: 'uranus.jpg',
        visual: { r: 1.6, d: 55 },
        aMkm: 2867.0, au: '19,2', periodDays: 30687, L0: 313.23, tilt: 97.77, spinHours: 17.24,
        atmosphere: { color: '#a8f0ff', intensity: 0.7 },
        type: 'Ледяной гигант',
        diameter: 51118, xEarth: '4,01',
        period: '84 земных года',
        day: '17 ч 14 мин, в обратную сторону',
        moons: 29,
        temp: '−195 °C',
        fact: 'Уран вращается «лёжа на боку» — его ось наклонена на 98°. Поэтому каждый полюс там 42 года освещён Солнцем, а следующие 42 года погружён во тьму.',
    },
    {
        id: 'neptune', name: 'Нептун', kind: 'planet', color: '#4f7bff',
        texture: 'neptune.jpg',
        visual: { r: 1.58, d: 64 },
        aMkm: 4515.0, au: '30,1', periodDays: 60190, L0: 304.88, tilt: 28.32, spinHours: 16.11,
        atmosphere: { color: '#7aa2ff', intensity: 0.8 },
        type: 'Ледяной гигант',
        diameter: 49528, xEarth: '3,88',
        period: '165 земных лет',
        day: '16 ч 6 мин',
        moons: 16,
        temp: '−200 °C',
        fact: 'На Нептуне дуют самые сильные ветры в Солнечной системе — до 2000 км/ч. Его открыли «на кончике пера»: сначала положение планеты вычислили, а потом нашли её в телескоп (1846 г.).',
    },
    {
        id: 'moon', name: 'Луна', kind: 'moon', parent: 'earth', color: '#bdbdbd',
        texture: 'moon.jpg',
        visual: { r: 0.3, d: 1.9 },
        distKm: 384400, periodDays: 27.32, L0: 218.32, tilt: 6.7,
        type: 'Естественный спутник Земли',
        diameter: 3475, xEarth: '0,27',
        period: '27,3 суток (оборот вокруг Земли)',
        day: '27,3 суток — столько же, сколько оборот вокруг Земли',
        temp: 'от −173 °C ночью до +127 °C днём',
        fact: 'Луна всегда повёрнута к Земле одной стороной: оборот вокруг своей оси она делает за то же время, что и оборот вокруг Земли.',
    },
];

export const BODY_BY_ID = Object.fromEntries(BODIES.map(b => [b.id, b]));
export const PLANETS = BODIES.filter(b => b.kind === 'planet');
export const BAR_BODIES = BODIES.filter(b => b.kind !== 'moon');

// Real-scale geometry (unit = Earth's equatorial radius)
const EARTH_R_KM = EARTH_DIAMETER / 2;
for (const b of BODIES) {
    b.real = {
        r: b.diameter / 2 / EARTH_R_KM,
        d: b.aMkm ? (b.aMkm * 1e6) / EARTH_R_KM : b.distKm ? b.distKm / EARTH_R_KM : 0,
    };
}

// Log-interpolate a size between the visual (k = 0) and real (k = 1) scale.
export function lerpScale(visual, real, k) {
    if (k <= 0) return visual;
    if (k >= 1) return real;
    return Math.exp(Math.log(visual) * (1 - k) + Math.log(real) * k);
}

export const SPEEDS = [
    { id: 'pause', label: 'Пауза', icon: '⏸', days: 0 },
    { id: 'x1', label: '×1', days: 2 },
    { id: 'x10', label: '×10', days: 20 },
    { id: 'x100', label: '×100', days: 200 },
];

// "If the Sun were a 30 cm ball": diameter and distance in the same scale.
const BALL = 0.3 / SUN_DIAMETER; // metres per km
function fmt(n, digits) {
    return n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
export function ballScale(b) {
    const mm = b.diameter * BALL * 1000;
    const size = mm < 10 ? `${fmt(mm, 1)} мм` : `${fmt(mm / 10, 1)} см`;
    if (b.kind === 'moon') return `Ø ${size}, в ${fmt(b.distKm * BALL * 100, 0)} см от «Земли»`;
    const m = b.aMkm * 1e6 * BALL;
    return `Ø ${size}, в ${fmt(m, m < 20 ? 1 : 0)} м от «Солнца»`;
}

export function formatKm(n) {
    return `${n.toLocaleString('ru-RU')} км`;
}

export function formatMkm(n) {
    return `${fmt(n, 1)} млн км`;
}

export const AU = AU_KM;

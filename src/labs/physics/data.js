// Static data for the physics lab: the room, the objects and the gravity presets.

// Room in metres. Bodies move in the vertical plane z = 0.
export const ROOM = { w: 7, h: 4, halfW: 3.5, back: -1.0, front: 0.8 };

export const GALILEO_HEIGHT = 3; // m, drop height of the bottom of both bodies

// size = radius (balls, feather) or half of the edge (box) as drawn on screen.
// Drag uses the REAL cross-section: F = rho * k * v^2, k = Cd * A / 2.
const ball = (r, cd) => 0.5 * cd * Math.PI * r * r;

export const OBJECTS = [
    {
        id: 'box', name: 'Деревянный ящик', shape: 'box', size: 0.2,
        mass: 5, massLabel: '5 кг', dragK: 0.5 * 1.05 * 0.09, e: 0.25, mu: 0.45,
        start: [-2.5, 2.0],
    },
    {
        id: 'tennis', name: 'Теннисный мяч', shape: 'ball', size: 0.09,
        mass: 0.058, massLabel: '58 г', dragK: ball(0.0335, 0.55), e: 0.75, mu: 0.5, crr: 0.05,
        start: [-1.4, 3.2],
    },
    {
        id: 'feather', name: 'Перо', shape: 'feather', size: 0.06,
        // ~0,6 m/s terminal speed in air, like a real bird feather
        mass: 0.0005, massLabel: '0,5 г', dragK: 0.01, e: 0.05, mu: 0.9,
        start: [-0.3, 3.0],
    },
    {
        id: 'basketball', name: 'Баскетбольный мяч', shape: 'ball', size: 0.24,
        mass: 0.62, massLabel: '620 г', dragK: ball(0.12, 0.47), e: 0.8, mu: 0.6, crr: 0.03,
        start: [0.9, 2.6],
    },
    {
        id: 'bowling', name: 'Шар для боулинга', shape: 'ball', size: 0.21,
        mass: 7, massLabel: '7 кг', dragK: ball(0.109, 0.47), e: 0.12, mu: 0.3, crr: 0.012,
        start: [2.2, 1.6],
    },
];

export const BODY_INDEX = Object.fromEntries(OBJECTS.map((o, i) => [o.id, i]));

// g in m/s², rho = air density near the surface, kg/m³
export const PRESETS = [
    {
        id: 'earth', name: 'Земля', dot: '#3b82f6', g: 9.8, rho: 1.2, tint: '#a9c8ff',
        text: 'Ускорение свободного падения g ≈ 9,8 м/с²: каждую секунду скорость свободно падающего тела '
            + 'увеличивается на 9,8 м/с. С высоты 3 м тело падает примерно 0,8 с. '
            + 'Воздух заметно тормозит лёгкие тела с большой площадью — например, перо.',
    },
    {
        id: 'moon', name: 'Луна', dot: '#cbd5e1', g: 1.6, rho: 0, tint: '#d4d7df',
        text: 'На Луне g ≈ 1,6 м/с² — примерно в 6 раз меньше, чем на Земле. Мяч, брошенный вверх с той же скоростью, '
            + 'поднимется в 6 раз выше и пробудет в полёте в 6 раз дольше. Атмосферы нет, поэтому перо и молоток '
            + 'падают одинаково — это показал астронавт Дэвид Скотт («Аполлон-15», 1971).',
    },
    {
        id: 'mars', name: 'Марс', dot: '#ef6b3a', g: 3.7, rho: 0.02, tint: '#ff9a70',
        text: 'На Марсе g ≈ 3,7 м/с² — в 2,6 раза меньше земного. Подпрыгнув с той же скоростью, вы подниметесь '
            + 'в 2,6 раза выше. Атмосфера Марса очень разреженная: её плотность у поверхности примерно '
            + 'в 60 раз меньше земной, поэтому сопротивление воздуха слабое.',
    },
    {
        id: 'jupiter', name: 'Юпитер', dot: '#e0a96d', g: 24.8, rho: 0.16, tint: '#ffd08f',
        text: 'У Юпитера нет твёрдой поверхности: значение g ≈ 24,8 м/с² дано для верхней границы облаков. '
            + 'Это в 2,5 раза больше, чем на Земле: школьник массой 50 кг весил бы там около 1240 Н вместо 490 Н.',
    },
    {
        id: 'zero', name: 'Невесомость', dot: null, g: 0, rho: 1.2, tint: '#bfaaff',
        text: 'Так ведут себя тела внутри МКС: станция и всё, что в ней, свободно падают вместе, поэтому предметы '
            + 'не падают на пол. Толкните предмет — он полетит прямолинейно и равномерно, пока не ударится о стену '
            + '(первый закон Ньютона). На станции есть воздух, поэтому движение постепенно замедляется.',
    },
];

export const EARTH_G = 9.8;

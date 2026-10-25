// Moon phases: texts and geometry. The Sun is far to the left (−x); the Moon orbits the Earth counter-clockwise
// as seen from the north (from above), so the waxing Moon is lit on the right for an observer in the northern hemisphere.

export const SYNODIC = 29.53; // days from new moon to new moon

export const MOON_PHASES = [
    {
        name: 'Новолуние', short: 'Новолуние',
        text: 'Луна находится между Землёй и Солнцем и повёрнута к нам неосвещённой стороной, поэтому её не видно.',
    },
    {
        name: 'Растущий серп', short: 'Серп',
        text: 'Через несколько дней после новолуния появляется узкий серп. Его видно вечером на западе вскоре после заката.',
    },
    {
        name: 'Первая четверть', short: '1-я четверть',
        text: 'Освещена правая половина диска. Луна отошла от Солнца на 90° и видна в первой половине ночи.',
    },
    {
        name: 'Растущая луна', short: 'Растущая',
        text: 'Освещено больше половины диска, и с каждым днём освещённая часть растёт.',
    },
    {
        name: 'Полнолуние', short: 'Полнолуние',
        text: 'Земля находится между Солнцем и Луной, и к нам повёрнута вся освещённая половина Луны. Полная Луна восходит на закате и видна всю ночь.',
    },
    {
        name: 'Убывающая луна', short: 'Убывающая',
        text: 'Освещённая часть уменьшается, а Луна восходит с каждым вечером всё позже.',
    },
    {
        name: 'Последняя четверть', short: 'Посл. четверть',
        text: 'Освещена левая половина диска. Луну хорошо видно во второй половине ночи и утром.',
    },
    {
        name: 'Старый серп', short: 'Старый серп',
        text: 'Узкий серп виден под утро на востоке, незадолго до восхода Солнца. Затем снова наступает новолуние.',
    },
];

export const MOON_FACTS = [
    'Фазы Луны — это не тень Земли! Солнце всегда освещает половину Луны, а мы видим эту половину под разными углами. Тень Земли падает на Луну только во время лунного затмения.',
    'Луна всегда повёрнута к Земле одной стороной: оборот вокруг оси и оборот вокруг Земли занимают одно и то же время.',
    'Правило для Северного полушария: если к серпу можно мысленно приставить палочку и получится буква «Р» — Луна растёт, если серп похож на «С» — стареет.',
];

export const ORBIT_R = 5;

// Angle of the Moon from the new-moon position (radians) for a day of the lunar month
export const angleOfDay = day => (((day % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC) * Math.PI * 2;

// Nearest of the 8 named phases
export const phaseIndex = angle => Math.round(angle / (Math.PI / 4)) % 8;

// Day of the month at the middle of each named phase
export const phaseDay = i => (i / 8) * SYNODIC;

// Share of the visible disc that is lit (0 … 1)
export const litFraction = angle => (1 - Math.cos(angle)) / 2;

// Position of the Moon on its orbit: new moon toward the Sun (−x), first quarter toward the viewer (+z)
export function moonPosition(angle, out) {
    return out.set(-Math.cos(angle) * ORBIT_R, 0, Math.sin(angle) * ORBIT_R);
}

export const formatDay = d => d.toFixed(1).replace('.', ',');

// Geography math: coordinates on a sphere, distances, the Sun's declination and the length of the day.
// Convention (matches the equirectangular Earth texture on a three.js SphereGeometry, north along +y):
//   lon 0° looks toward +x, east is toward −z:  x = cos φ · cos λ,  y = sin φ,  z = −cos φ · sin λ

const RAD = Math.PI / 180;
export const TILT = 23.44; // axis tilt, degrees
export const EARTH_R_KM = 6371;

export function toVec(lat, lon, r = 1) {
    const f = lat * RAD;
    const l = lon * RAD;
    return [r * Math.cos(f) * Math.cos(l), r * Math.sin(f), -r * Math.cos(f) * Math.sin(l)];
}

// Latitude and longitude (degrees) of a point on the sphere, given in the globe's own frame
export function toLatLon(x, y, z) {
    const l = Math.hypot(x, y, z) || 1;
    return { lat: Math.asin(Math.max(-1, Math.min(1, y / l))) / RAD, lon: Math.atan2(-z, x) / RAD };
}

// Great-circle distance in km (haversine)
export function distanceKm(a, b) {
    const dLat = (b.lat - a.lat) * RAD;
    const dLon = (b.lon - a.lon) * RAD;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Rotation (radians) that brings a point to the front of the globe with north up: Euler 'XYZ' = [tiltX, yawY]
export function faceRotation(lat, lon, maxTilt = 62) {
    return { x: Math.max(-maxTilt, Math.min(maxTilt, lat)) * RAD, y: (-90 - lon) * RAD };
}

export const normLon = lon => ((((lon + 180) % 360) + 360) % 360) - 180;

// ---------------------------------------------------------------- the Sun

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // a common year

// Day of the year (1 … 365) to "21 июня"
export function dateText(n) {
    let d = Math.round(n);
    for (let m = 0; m < 12; m++) {
        if (d <= MONTH_DAYS[m]) return `${d} ${MONTHS[m]}`;
        d -= MONTH_DAYS[m];
    }
    return '31 декабря';
}

export function dayOfYear(month, day) {
    let n = day;
    for (let m = 0; m < month - 1; m++) n += MONTH_DAYS[m];
    return n;
}

export const KEY_DATES = [
    { n: dayOfYear(3, 21), label: '21 марта', name: 'весеннее равноденствие' },
    { n: dayOfYear(6, 21), label: '21 июня', name: 'летнее солнцестояние' },
    { n: dayOfYear(9, 23), label: '23 сентября', name: 'осеннее равноденствие' },
    { n: dayOfYear(12, 22), label: '22 декабря', name: 'зимнее солнцестояние' },
];

// Declination of the Sun (the latitude where it is at the zenith at noon), degrees
export function declination(n) {
    const a = (360 / 365.24) * (n + 10) + (360 / Math.PI) * 0.0167 * Math.sin((360 / 365.24) * (n - 2) * RAD);
    return -Math.asin(Math.sin(TILT * RAD) * Math.cos(a * RAD)) / RAD;
}

// Direction to the Sun in the globe's frame for a UTC time (hours), as a unit vector
export function sunVector(decl, utcHours) {
    const subsolarLon = (12 - utcHours) * 15;
    return toVec(decl, subsolarLon);
}

// Length of daylight in hours at a latitude (no atmosphere): 0 = polar night, 24 = polar day
export function dayLength(lat, decl) {
    const c = -Math.tan(lat * RAD) * Math.tan(decl * RAD);
    if (c >= 1) return 0;
    if (c <= -1) return 24;
    return (2 * Math.acos(c)) / RAD / 15;
}

// Height of the Sun above the horizon at local noon, degrees
export const noonAltitude = (lat, decl) => 90 - Math.abs(lat - decl);

export function hoursText(h) {
    if (h <= 0.001) return 'полярная ночь';
    if (h >= 23.999) return 'полярный день';
    const m = Math.round(h * 60);
    return `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`;
}

// Mean solar time at a longitude for a UTC time (hours)
export const solarTime = (utcHours, lon) => (((utcHours + lon / 15) % 24) + 24) % 24;

export function clockText(h) {
    const m = Math.round(h * 60) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Is the Sun above the horizon at this place and time?
export function isDay(lat, lon, decl, utcHours) {
    const s = sunVector(decl, utcHours);
    const p = toVec(lat, lon);
    return s[0] * p[0] + s[1] * p[1] + s[2] * p[2] > 0;
}

// Season of the northern hemisphere for a day of the year
export function seasonNorth(n) {
    if (n >= 80 && n < 172) return 'весна';
    if (n >= 172 && n < 266) return 'лето';
    if (n >= 266 && n < 356) return 'осень';
    return 'зима';
}

// ---------------------------------------------------------------- places and lines

export const CITIES = [
    { id: 'astana', name: 'Астана', lat: 51.13, lon: 71.43, info: 'Столица Казахстана. Одна из самых холодных столиц мира: зимой бывает ниже −30 °C.' },
    { id: 'almaty', name: 'Алматы', lat: 43.24, lon: 76.89, info: 'Крупнейший город Казахстана у подножия гор Заилийского Алатау.' },
    { id: 'moscow', name: 'Москва', lat: 55.75, lon: 37.62, info: 'Столица России, самый большой город Европы.' },
    { id: 'london', name: 'Лондон', lat: 51.51, lon: -0.13, info: 'Через пригород Лондона — Гринвич — проходит нулевой меридиан.' },
    { id: 'newyork', name: 'Нью-Йорк', lat: 40.71, lon: -74.01, info: 'Крупнейший город США на берегу Атлантического океана.' },
    { id: 'rio', name: 'Рио-де-Жанейро', lat: -22.91, lon: -43.17, info: 'Город в Южном полушарии: когда в Казахстане зима, там лето.' },
    { id: 'capetown', name: 'Кейптаун', lat: -33.92, lon: 18.42, info: 'Город на самом юге Африки, где встречаются два океана.' },
    { id: 'cairo', name: 'Каир', lat: 30.04, lon: 31.24, info: 'Столица Египта на реке Нил, рядом с великими пирамидами. Почти на широте северного тропика.' },
    { id: 'beijing', name: 'Пекин', lat: 39.9, lon: 116.41, info: 'Столица Китая — страны с самым большим числом жителей.' },
    { id: 'tokyo', name: 'Токио', lat: 35.68, lon: 139.69, info: 'Столица Японии. Здесь Солнце встаёт раньше, чем почти везде в мире: Япония — «страна восходящего солнца».' },
    { id: 'sydney', name: 'Сидней', lat: -33.87, lon: 151.21, info: 'Самый большой город Австралии. Времена года там противоположны нашим.' },
    { id: 'delhi', name: 'Дели', lat: 28.61, lon: 77.21, info: 'Столица Индии, на широте почти такой же, как у Каира.' },
    { id: 'reykjavik', name: 'Рейкьявик', lat: 64.15, lon: -21.94, info: 'Самая северная столица мира. Летом здесь почти нет ночи — белые ночи.' },
    { id: 'vostok', name: 'Станция «Восток»', lat: -78.46, lon: 106.84, info: 'Российская антарктическая станция. Здесь самая низкая температура на Земле: −89,2 °C.' },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

export const LINES = [
    { id: 'equator', name: 'Экватор', kind: 'lat', value: 0, color: '#f87171', text: 'Параллель 0°. Делит Землю на Северное и Южное полушария. Солнце в полдень над головой в дни равноденствий.' },
    { id: 'tropicN', name: 'Северный тропик', kind: 'lat', value: TILT, color: '#fb923c', text: 'Параллель 23,4° с. ш. (тропик Рака). Самая северная широта, где Солнце бывает в зените — 21 июня.' },
    { id: 'tropicS', name: 'Южный тропик', kind: 'lat', value: -TILT, color: '#fb923c', text: 'Параллель 23,4° ю. ш. (тропик Козерога). Солнце в зените здесь 22 декабря.' },
    { id: 'polarN', name: 'Северный полярный круг', kind: 'lat', value: 90 - TILT, color: '#38bdf8', text: 'Параллель 66,6° с. ш. К северу от неё бывают полярный день и полярная ночь.' },
    { id: 'polarS', name: 'Южный полярный круг', kind: 'lat', value: -(90 - TILT), color: '#38bdf8', text: 'Параллель 66,6° ю. ш. К югу от неё бывают полярный день и полярная ночь.' },
    { id: 'prime', name: 'Нулевой меридиан', kind: 'lon', value: 0, color: '#facc15', text: 'Меридиан 0° проходит через Гринвич (Лондон). От него отсчитывают долготу на восток и на запад.' },
    { id: 'dateline', name: 'Меридиан 180°', kind: 'lon', value: 180, color: '#a78bfa', text: 'Рядом проходит линия перемены дат: пересекая её на запад, календарь переводят на сутки вперёд.' },
];

// Hemisphere text: "51,1° с. ш."
const fmt1 = x => (Math.round(Math.abs(x) * 10) / 10).toFixed(1).replace('.', ',');
export const latText = lat => `${fmt1(lat)}° ${lat >= 0 ? 'с. ш.' : 'ю. ш.'}`;
export const lonText = lon => `${fmt1(normLon(lon))}° ${normLon(lon) >= 0 ? 'в. д.' : 'з. д.'}`;

// Whole degrees for tasks: "51° с. ш."
export const latInt = lat => `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'с. ш.' : 'ю. ш.'}`;
export const lonInt = lon => `${Math.abs(Math.round(normLon(lon)))}° ${normLon(lon) >= 0 ? 'в. д.' : 'з. д.'}`;

// Stars for the accuracy of an answer (distance in km)
export const starsFor = km => (km < 400 ? 3 : km < 1000 ? 2 : km < 2200 ? 1 : 0);

// Seasons view: the Sun stands still at the left (−x). The globe is tilted toward it by the declination (rotation about z)
// and spins about its own axis with the time of day (rotation about y):  world = Rz(decl) · Ry(spin) · point
export const seasonRotation = (decl, utcHours) => ({ tilt: decl * RAD, spin: utcHours * 15 * RAD });

// Is a point lit when the globe is turned like that? (used to check the scene against the formulas)
export function litInSeasonScene(lat, lon, decl, utcHours) {
    const { tilt, spin } = seasonRotation(decl, utcHours);
    const [x, y, z] = toVec(lat, lon);
    const x1 = x * Math.cos(spin) + z * Math.sin(spin); // only the x of the spun point matters after the tilt about z
    const wx = x1 * Math.cos(tilt) - y * Math.sin(tilt);
    return -wx > 0;
}

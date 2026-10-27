// Checks the geography math: coordinate conversions, distances, the Sun's declination and the length of the day.
// Run: node scripts/check-geo.mjs
import {
    CITIES, KEY_DATES, declination, dayLength, dateText, dayOfYear, distanceKm, faceRotation, hoursText, isDay, latText, lonText, noonAltitude,
    litInSeasonScene, solarTime, toLatLon, toVec,
} from '../src/labs/geo/geo.js';

let problems = 0;
const fail = msg => {
    problems++;
    console.error('✗', msg);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1) vector <-> coordinates round trip, and the texture convention (lon 0 toward +x, east toward −z)
for (const lat of [-80, -33.9, 0, 23.4, 51.1, 89]) {
    for (const lon of [-170, -74, 0, 31.2, 90, 151.2, 180]) {
        const v = toVec(lat, lon);
        const back = toLatLon(...v);
        if (!near(back.lat, lat, 1e-9) || !near(Math.abs(back.lon), Math.abs(lon), 1e-9) && !(Math.abs(lon) === 180 && Math.abs(back.lon) === 180)) {
            fail(`round trip ${lat},${lon} -> ${back.lat},${back.lon}`);
        }
    }
}
const [gx, gy, gz] = toVec(0, 0);
if (!(near(gx, 1, 1e-12) && near(gy, 0, 1e-12) && near(gz, 0, 1e-12))) fail('lon 0 must be +x');
if (!(toVec(0, 90)[2] < -0.999)) fail('east (+90°) must be toward −z');
if (!(toVec(90, 0)[1] > 0.999)) fail('north pole must be +y');

// 2) the rotation that brings a place to the front really puts it toward +z with north up
for (const c of CITIES) {
    const r = faceRotation(c.lat, c.lon, 90);
    const [x, y, z] = toVec(c.lat, c.lon);
    // Euler 'XYZ' = Rx · Ry · (v): yaw first, then tilt
    const x1 = x * Math.cos(r.y) + z * Math.sin(r.y);
    const z1 = -x * Math.sin(r.y) + z * Math.cos(r.y);
    const y2 = y * Math.cos(r.x) - z1 * Math.sin(r.x);
    const z2 = y * Math.sin(r.x) + z1 * Math.cos(r.x);
    if (!near(x1, 0, 1e-9) || !near(y2, 0, 1e-9) || z2 < 0.999) fail(`${c.name} is not in front after faceRotation (${x1.toFixed(3)}, ${y2.toFixed(3)}, ${z2.toFixed(3)})`);
}

// 3) distances against known values (km)
const city = id => CITIES.find(c => c.id === id);
const d1 = distanceKm(city('moscow'), city('london'));
if (!near(d1, 2500, 60)) fail(`Moscow–London ${d1.toFixed(0)} km (expected ≈ 2500)`);
const d2 = distanceKm(city('newyork'), city('london'));
if (!near(d2, 5570, 80)) fail(`New York–London ${d2.toFixed(0)} km (expected ≈ 5570)`);
if (!near(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 }), Math.PI * 6371, 1)) fail('half a great circle');
if (distanceKm(city('astana'), city('astana')) !== 0) fail('distance to itself');

// 4) the Sun
for (const kd of KEY_DATES) {
    const d = declination(kd.n);
    const want = { 'весеннее равноденствие': 0, 'летнее солнцестояние': 23.44, 'осеннее равноденствие': 0, 'зимнее солнцестояние': -23.44 }[kd.name];
    if (!near(d, want, 0.6)) fail(`declination on ${kd.label}: ${d.toFixed(2)}° (expected ${want}°)`);
}
if (dateText(dayOfYear(6, 21)) !== '21 июня') fail(`date text ${dateText(dayOfYear(6, 21))}`);
if (dateText(1) !== '1 января' || dateText(365) !== '31 декабря') fail('date text bounds');
const dJun = declination(dayOfYear(6, 21));
const dDec = declination(dayOfYear(12, 22));
const dMar = declination(dayOfYear(3, 21));
// day length: 12 h at the equator all year, 12 h everywhere at the equinox, polar day/night beyond the circles
for (const n of [1, 80, 172, 266, 355]) if (!near(dayLength(0, declination(n)), 12, 0.1)) fail(`equator day length on day ${n}`);
for (const lat of [-60, -30, 20, 51, 70]) if (!near(dayLength(lat, dMar), 12, 0.15)) fail(`equinox day length at ${lat}°: ${dayLength(lat, dMar).toFixed(2)}`);
if (dayLength(70, dJun) !== 24) fail('polar day at 70°N in June');
if (dayLength(70, dDec) !== 0) fail('polar night at 70°N in December');
if (dayLength(-70, dJun) !== 0) fail('polar night at 70°S in June');
const astanaJun = dayLength(city('astana').lat, dJun);
if (!near(astanaJun, 16.3, 0.3)) fail(`Astana in June ${astanaJun.toFixed(2)} h (expected ≈ 16.3)`);
const astanaDec = dayLength(city('astana').lat, dDec);
if (!near(astanaJun + astanaDec, 24, 0.3)) fail('day lengths of a latitude at the two solstices must add up to 24 h');
if (!near(noonAltitude(51.13, dJun), 62.3, 0.3)) fail(`noon altitude Astana June ${noonAltitude(51.13, dJun)}`);
if (!near(noonAltitude(0, dMar), 90, 0.6)) fail('Sun in the zenith at the equator at the equinox');
if (hoursText(0) !== 'полярная ночь' || hoursText(24) !== 'полярный день' || hoursText(12.5) !== '12 ч 30 мин') fail('hours text');

// 5) day and night follow the clock: at 12:00 UTC it is noon on the Greenwich meridian, at 00:00 UTC it is night there
if (!isDay(0, 0, 0, 12) || isDay(0, 0, 0, 0)) fail('day/night at Greenwich');
if (!isDay(0, 90, 0, 6) || isDay(0, 90, 0, 18)) fail('day/night at 90°E (sunrise at 00 UTC+6 …)');
if (!near(solarTime(12, 71.43), 16.762, 0.01)) fail('solar time in Astana at 12 UTC');
if (latText(51.13) !== '51,1° с. ш.' || latText(-33.9) !== '33,9° ю. ш.' || lonText(-74.01) !== '74,0° з. д.' || lonText(71.43) !== '71,4° в. д.') fail('coordinate text');

// 6) the seasons scene (fixed Sun at the left, tilted spinning globe) lights exactly the points the formulas say are in daylight
let compared = 0;
for (const n of [1, 80, 172, 266, 355]) {
    for (const utc of [0, 3.3, 6, 9.7, 12, 15, 18.2, 21.5]) {
        const decl = declination(n);
        for (let lat = -85; lat <= 85; lat += 17) {
            for (let lon = -180; lon < 180; lon += 29) {
                compared++;
                if (isDay(lat, lon, decl, utc) !== litInSeasonScene(lat, lon, decl, utc)) fail(`scene and formula disagree at day ${n}, ${utc} UTC, ${lat},${lon}`);
            }
        }
    }
}

console.log(`${CITIES.length} places checked (conversions, distances, declination, day length), ${compared} day/night points compared with the scene.`);
if (problems) {
    console.error(`${problems} problem(s) found`);
    process.exit(1);
}
console.log('OK');

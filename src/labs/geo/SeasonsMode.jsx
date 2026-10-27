// «Времена года»: the day/night line for any date and hour, the length of the day at a chosen place, and the orbit diagram.
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf, Moon, Pause, Play, Snowflake, Sprout, Sun } from 'lucide-react';
import { LabCanvas } from '../../ui/three';
import SeasonScene from './SeasonScene';
import {
    CITIES, KEY_DATES, TILT, clockText, dateText, dayLength, declination, hoursText, isDay, latText, lonText, noonAltitude, seasonNorth, solarTime,
} from './geo';

const CAMERA = { position: [0, 0, 4.3], fov: 40, near: 0.1, far: 100 };
const SEASON_ICON = {
    весна: <Sprout className="ico" style={{ color: '#4ade80' }} aria-hidden="true" />,
    лето: <Sun className="ico" style={{ color: '#fbbf24' }} aria-hidden="true" />,
    осень: <Leaf className="ico" style={{ color: '#fb923c' }} aria-hidden="true" />,
    зима: <Snowflake className="ico" style={{ color: '#7dd3fc' }} aria-hidden="true" />,
};

// Orbit seen from above (not to scale): Earth at the angle of the chosen date, its axis always tilted the same way
function OrbitDiagram({ n }) {
    const a = ((n - 80) / 365.24) * Math.PI * 2; // 21 March at the right, 21 June at the top
    const cx = 100, cy = 80, rx = 66, ry = 50;
    const ex = cx + rx * Math.cos(a);
    const ey = cy - ry * Math.sin(a);
    const marks = [
        { n: 80, text: 'Весна', sub: '21 марта' },
        { n: 172, text: 'Лето', sub: '21 июня' },
        { n: 266, text: 'Осень', sub: '23 сент.' },
        { n: 356, text: 'Зима', sub: '22 дек.' },
    ];
    const tilt = (TILT * Math.PI) / 180;
    // direction from the Earth to the Sun, for the lit half
    const toSun = Math.atan2(cy - ey, cx - ex);
    return (
        <svg className="geo-orbit" viewBox="-14 0 228 166" role="img" aria-label="Орбита Земли">
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <circle cx={cx} cy={cy} r="9" fill="#fbbf24" />
            <circle cx={cx} cy={cy} r="14" fill="#fbbf24" opacity="0.18" />
            {marks.map(m => {
                const ang = ((m.n - 80) / 365.24) * Math.PI * 2;
                const x = cx + rx * Math.cos(ang);
                const y = cy - ry * Math.sin(ang);
                return (
                    <g key={m.n}>
                        <circle cx={x} cy={y} r="2.4" fill="rgba(255,255,255,0.55)" />
                        <text x={x + (Math.cos(ang) > 0.5 ? 6 : Math.cos(ang) < -0.5 ? -6 : 0)} y={y + (Math.sin(ang) > 0.5 ? -8 : Math.sin(ang) < -0.5 ? 14 : 3)}
                            fontSize="8" fontWeight="700" fill="#e5e7eb" textAnchor={Math.cos(ang) > 0.5 ? 'start' : Math.cos(ang) < -0.5 ? 'end' : 'middle'}>
                            {m.text}
                        </text>
                    </g>
                );
            })}
            <g transform={`translate(${ex} ${ey})`}>
                <circle r="8" fill="#1e3a8a" />
                <path d={`M 0 -8 A 8 8 0 0 ${1} 0 8 Z`} fill="#60a5fa" transform={`rotate(${(toSun * 180) / Math.PI})`} />
                <line x1={-Math.sin(tilt) * 14} y1={Math.cos(tilt) * 14} x2={Math.sin(tilt) * 14} y2={-Math.cos(tilt) * 14} stroke="#f1f5f9" strokeWidth="1.5" />
                <circle cx={Math.sin(tilt) * 14} cy={-Math.cos(tilt) * 14} r="1.8" fill="#f1f5f9" />
            </g>
            <text x="100" y="160" fontSize="7" textAnchor="middle" fill="rgba(255,255,255,0.6)">Вид сверху, не в масштабе. Наклон оси не меняется.</text>
        </svg>
    );
}

export default function SeasonsMode() {
    const [n, setN] = useState(KEY_DATES[1].n);
    const [utc, setUtc] = useState(12);
    const [placeId, setPlaceId] = useState('astana');
    const [playing, setPlaying] = useState(false);
    const [view, setView] = useState('side');
    const zoom = useRef(1);

    // one day in about 12 seconds
    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(() => setUtc(h => (h + 0.2) % 24), 100);
        return () => clearInterval(id);
    }, [playing]);

    const place = CITIES.find(c => c.id === placeId);
    const decl = declination(n);
    const len = dayLength(place.lat, decl);
    const noon = noonAltitude(place.lat, decl);
    const local = solarTime(utc, place.lon);
    const day = isDay(place.lat, place.lon, decl, utc);
    const south = place.lat < 0;
    const season = seasonNorth(n);
    const seasonHere = south ? { весна: 'осень', лето: 'зима', осень: 'весна', зима: 'лето' }[season] : season;

    // ◀ ▶ walk through the places; the globe turns to each one
    const step = d => {
        const c = CITIES[(CITIES.findIndex(x => x.id === placeId) + d + CITIES.length) % CITIES.length];
        setPlaceId(c.id);
    };

    return (
        <>
            <LabCanvas camera={CAMERA} lights={false}>
                <SeasonScene decl={decl} utc={utc} place={place} view={view} zoom={zoom} />
            </LabCanvas>

            <aside className="lab-left geo-left">
                <div className="panel geo-panel">
                    <div className="panel-title">Дата: {dateText(n)}</div>
                    <div className="geo-dates">
                        {KEY_DATES.map(k => (
                            <button key={k.n} className={`btn geo-date${Math.abs(n - k.n) < 1 ? ' active' : ''}`} onClick={() => setN(k.n)}>
                                <b>{k.label}</b><small>{k.name}</small>
                            </button>
                        ))}
                    </div>
                    <input className="geo-range" type="range" min="1" max="365" step="1" value={n} aria-label="Дата"
                        style={{ '--fill': `${((n - 1) / 364) * 100}%` }} onChange={e => setN(parseInt(e.target.value, 10))} />
                </div>
                <div className="panel geo-panel">
                    <div className="panel-title">Время (по Гринвичу): {clockText(utc)}</div>
                    <input className="geo-range" type="range" min="0" max="24" step="0.1" value={utc} aria-label="Время"
                        style={{ '--fill': `${(utc / 24) * 100}%` }} onChange={e => { setPlaying(false); setUtc(parseFloat(e.target.value)); }} />
                    <button className={`btn geo-play${playing ? ' active' : ''}`} onClick={() => setPlaying(p => !p)}>{playing ? <><Pause /> Пауза</> : <><Play /> Сутки</>}</button>
                </div>
            </aside>

            <aside className="lab-right geo-right">
                <div className="panel geo-card">
                    <OrbitDiagram n={n} />
                </div>
                <div className="panel geo-card">
                    <div className="geo-stepper">
                        <button className="btn btn-icon" onClick={() => step(-1)} aria-label="Предыдущее место"><ChevronLeft /></button>
                        <div className="geo-stepper-name">
                            <b>{place.name}</b>
                            <small>{latText(place.lat)} · {lonText(place.lon)}</small>
                        </div>
                        <button className="btn btn-icon" onClick={() => step(1)} aria-label="Следующее место"><ChevronRight /></button>
                    </div>
                    <div className="geo-facts" role="status">
                        <div className="geo-fact"><span>Сейчас здесь</span><b>{SEASON_ICON[seasonHere]} {seasonHere}</b></div>
                        <div className="geo-fact"><span>Длина дня</span><b>{hoursText(len)}</b></div>
                        <div className="geo-fact"><span>Солнце в полдень</span><b>{len === 0 ? 'не встаёт' : `${noon.toFixed(0)}° над горизонтом`}</b></div>
                        <div className="geo-fact"><span>Солнечное время</span><b>{clockText(local)} {day ? <Sun className="ico" style={{ color: '#fbbf24' }} aria-label="день" /> : <Moon className="ico" style={{ color: '#c4b5fd' }} aria-label="ночь" />}</b></div>
                        <div className="geo-fact"><span>Солнце в зените на</span><b>{latText(decl)}</b></div>
                    </div>
                </div>
            </aside>

            <nav className="lab-bottom geo-bar" aria-label="Вид">
                <button className="btn btn-icon geo-zoom" onClick={() => { zoom.current = Math.min(1.5, zoom.current * 1.18); }} aria-label="Отдалить">−</button>
                <button className="btn btn-icon geo-zoom" onClick={() => { zoom.current = Math.max(0.55, zoom.current * 0.85); }} aria-label="Приблизить">+</button>
                <button className={`btn${view === 'side' ? ' active' : ''}`} onClick={() => setView('side')}>Сбоку</button>
                <button className={`btn${view === 'north' ? ' active' : ''}`} onClick={() => setView('north')}>Над Северным полюсом</button>
            </nav>
        </>
    );
}

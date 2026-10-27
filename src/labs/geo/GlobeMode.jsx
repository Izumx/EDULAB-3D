// «Глобус» mode: read coordinates, meet the main lines and cities, then find points by their coordinates.
import React, { useRef, useState } from 'react';
import { LabCanvas } from '../../ui/three';
import GlobeScene from './GlobeScene';
import { CITIES, CITY_BY_ID, LINES, distanceKm, latInt, latText, lonInt, lonText, starsFor } from './geo';

const CAMERA = { position: [0, 0, 4.3], fov: 40, near: 0.1, far: 100 };
const SHORT = { equator: 'Экватор', tropicN: 'Тропик Рака', tropicS: 'Тропик Козерога', polarN: 'Полярный круг С', polarS: 'Полярный круг Ю', prime: 'Гринвич 0°', dateline: 'Меридиан 180°' };
const STARS = n => '★'.repeat(n) + '☆'.repeat(3 - n);

export default function GlobeMode() {
    const [selected, setSelected] = useState(null);
    const [focus, setFocus] = useState({ key: 0, lat: null, lon: null });
    const [lines, setLines] = useState(['equator', 'prime']);
    const [lastLine, setLastLine] = useState('equator');
    const [task, setTask] = useState(null); // { target, hints, answer }
    const [score, setScore] = useState({ rounds: 0, stars: 0 });
    const hud = useRef({ el: null, last: null });
    const zoom = useRef(1);

    const city = selected ? CITY_BY_ID[selected] : null;

    const focusOn = c => setFocus(f => ({ key: f.key + 1, lat: c ? c.lat : null, lon: c ? c.lon : null }));

    const onCity = id => {
        if (task) return;
        const next = id === selected ? null : id;
        setSelected(next);
        focusOn(next ? CITY_BY_ID[next] : null);
    };

    const toggleLine = id => {
        setLines(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
        setLastLine(id);
    };

    const newTask = () => {
        const pool = CITIES.filter(c => c.id !== task?.target.id);
        const target = pool[Math.floor(Math.random() * pool.length)];
        setTask({ target, hints: 0, answer: null });
        setSelected(null);
        setFocus(f => ({ key: f.key + 1, lat: 20, lon: target.lon + 70 })); // start looking at the wrong side
    };

    const endTask = () => {
        setTask(null);
        focusOn(null);
    };

    const onPick = p => {
        if (!task || task.answer) return;
        const km = distanceKm(task.target, p);
        const stars = starsFor(km);
        setTask(t => ({ ...t, answer: { ...p, km, stars } }));
        setScore(s => ({ rounds: s.rounds + 1, stars: s.stars + stars }));
    };

    // hint 1: the parallel of the place, hint 2: its meridian as well
    const extra = [];
    if (task && !task.answer) {
        if (task.hints >= 1) extra.push({ kind: 'lat', value: task.target.lat, color: '#fbbf24' });
        if (task.hints >= 2) extra.push({ kind: 'lon', value: task.target.lon, color: '#fbbf24' });
    }
    const markers = [];
    let arc = null;
    if (task?.answer) {
        markers.push({ lat: task.target.lat, lon: task.target.lon, color: '#4ade80', label: task.target.name });
        markers.push({ lat: task.answer.lat, lon: task.answer.lon, color: '#f87171', label: 'Ваш ответ' });
        arc = { a: task.target, b: task.answer, color: '#f8fafc' };
    }

    const line = LINES.find(l => l.id === lastLine);

    return (
        <>
            <LabCanvas camera={CAMERA} lights={false}>
                <GlobeScene focus={focus} selectedCity={selected} onCity={onCity} showLines={lines} extraLines={extra} markers={markers}
                    arc={arc} pick={!!task && !task.answer} onPick={onPick} showCities={!task} hud={hud} zoom={zoom} />
            </LabCanvas>

            <aside className="lab-left geo-left">
                <div className="panel geo-panel">
                    <div className="panel-title">{task ? 'Города скрыты' : 'Города и места'}</div>
                    {task ? (
                        <p className="geo-muted">Найдите точку только по координатам — как на настоящей карте.</p>
                    ) : (
                        <div className="geo-cities">
                            {CITIES.map(c => (
                                <button key={c.id} className={`btn geo-city${selected === c.id ? ' active' : ''}`} onClick={() => onCity(c.id)}>
                                    {c.name.replace('Станция «Восток»', 'Восток').replace('Рио-де-Жанейро', 'Рио')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <aside className="lab-right geo-right">
                <div className="panel geo-panel">
                    <div className="panel-title">Линии на глобусе</div>
                    <div className="geo-lines">
                        {LINES.map(l => (
                            <button key={l.id} className={`btn geo-line${lines.includes(l.id) ? ' active' : ''}`} onClick={() => toggleLine(l.id)}
                                aria-pressed={lines.includes(l.id)} style={{ '--c': l.color }}>
                                <i />{SHORT[l.id]}
                            </button>
                        ))}
                    </div>
                    {!task && <p className="geo-line-text"><b>{line.name}.</b> {line.text}</p>}
                </div>

                {task ? (
                    <div className="panel geo-card geo-task">
                        <div className="panel-title">🎯 Найдите точку · {STARS(Math.min(3, Math.round(score.rounds ? score.stars / score.rounds : 0)))} {score.rounds ? `(${score.rounds})` : ''}</div>
                        <div className="geo-coords">{latInt(task.target.lat)}<br />{lonInt(task.target.lon)}</div>
                        {!task.answer ? (
                            <p className="geo-muted">Нажмите на глобус там, где, по-вашему, находится эта точка. Мышью или рукой.</p>
                        ) : (
                            <>
                                <p className="geo-result">
                                    <b>{task.target.name}</b> — вы промахнулись на <b>{Math.round(task.answer.km).toLocaleString('ru-RU')} км</b>. <span className="geo-stars">{STARS(task.answer.stars)}</span>
                                </p>
                                <p className="geo-muted geo-info">{task.target.info}</p>
                            </>
                        )}
                    </div>
                ) : city ? (
                    <div className="panel geo-card" key={city.id}>
                        <h2>{city.name}</h2>
                        <div className="geo-coords small">{latText(city.lat)}<br />{lonText(city.lon)}</div>
                        <p className="geo-muted">{city.info}</p>
                    </div>
                ) : (
                    <div className="panel geo-card">
                        <h2>Координаты</h2>
                        <p className="geo-muted">
                            <b>Широта</b> — расстояние от экватора в градусах (от 0° до 90° на север или на юг).
                            <br /><b>Долгота</b> — расстояние от нулевого меридиана (от 0° до 180° на восток или на запад).
                        </p>
                        <p className="geo-muted geo-extra">Наведите курсор или ладонь на глобус — внизу появятся координаты.</p>
                    </div>
                )}
            </aside>

            <div className="geo-hud empty" ref={el => { hud.current.el = el; }} />

            <nav className="lab-bottom geo-bar" aria-label="Действия">
                <button className="btn btn-icon geo-zoom" onClick={() => { zoom.current = Math.min(1.5, zoom.current * 1.18); }} aria-label="Отдалить">−</button>
                <button className="btn btn-icon geo-zoom" onClick={() => { zoom.current = Math.max(0.55, zoom.current * 0.85); }} aria-label="Приблизить">+</button>
                {!task && <button className="btn btn-primary" onClick={newTask}>🎯 Найди точку</button>}
                {task && !task.answer && task.hints < 2 && (
                    <button className="btn" onClick={() => setTask(t => ({ ...t, hints: t.hints + 1 }))}>
                        Подсказка: {task.hints === 0 ? 'параллель' : 'меридиан'}
                    </button>
                )}
                {task?.answer && <button className="btn btn-primary" onClick={newTask}>Следующая точка →</button>}
                {task && <button className="btn btn-ghost" onClick={endTask}>Завершить</button>}
            </nav>
        </>
    );
}

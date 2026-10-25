// Right-hand panels: info card for the selected body, intro and the "real scale" explainer.
import React from 'react';
import { ballScale, formatKm, formatMkm } from './bodies';

function Row({ label, value, sub }) {
    return (
        <div className="cosmos-row">
            <div className="cosmos-row-label">{label}</div>
            <div className="cosmos-row-value">
                {value}
                {sub && <span className="cosmos-row-sub">{sub}</span>}
            </div>
        </div>
    );
}

function moonsText(b) {
    if (b.moons === 0) return 'нет';
    if (b.moonNames) return `${b.moons} — ${b.moonNames}`;
    return String(b.moons);
}

export function InfoCard({ body, onClose, onSelect }) {
    const isPlanet = body.kind === 'planet';
    return (
        <div className="panel cosmos-card" style={{ '--body-color': body.color }}>
            <div className="cosmos-card-head">
                <div className="cosmos-card-dot" />
                <div>
                    <h2>{body.name}</h2>
                    <div className="cosmos-card-type">{body.type}</div>
                </div>
                <button className="btn btn-icon btn-ghost cosmos-card-close" onClick={onClose} aria-label="Закрыть">✕</button>
            </div>

            <Row label="Диаметр" value={formatKm(body.diameter)}
                sub={body.id === 'earth' ? 'экваториальный' : `${body.xEarth} × Земля`} />
            {isPlanet && <Row label="Расстояние от Солнца" value={formatMkm(body.aMkm)} sub={`${body.au} а.е.`} />}
            {body.kind === 'moon' && <Row label="Расстояние от Земли" value={formatKm(body.distKm)} />}
            {body.period && <Row label={body.kind === 'moon' ? 'Период обращения' : 'Год (оборот вокруг Солнца)'} value={body.period} />}
            <Row label="Сутки (оборот вокруг оси)" value={body.day} />
            {isPlanet && <Row label="Спутники" value={moonsText(body)} sub={body.moons > 2 ? 'по данным на 2025 г.' : null} />}
            <Row label={isPlanet ? 'Средняя температура' : 'Температура'} value={body.temp} />
            {body.extra?.map(([l, v]) => <Row key={l} label={l} value={v} />)}
            {body.kind !== 'star' && <Row label="Если Солнце — мяч 30 см" value={ballScale(body)} />}

            <div className="cosmos-fact">
                <span aria-hidden="true">💡</span>
                <p>{body.fact}</p>
            </div>

            {body.id === 'earth' && (
                <button className="btn cosmos-card-link" onClick={() => onSelect('moon')}>🌙 Луна — спутник Земли</button>
            )}
            {body.id === 'moon' && (
                <button className="btn cosmos-card-link" onClick={() => onSelect('earth')}>← Вернуться к Земле</button>
            )}
        </div>
    );
}

export function IntroCard({ handPresent }) {
    return (
        <div className="panel cosmos-card">
            <h2>Солнечная система</h2>
            <p className="cosmos-lead">Солнце и восемь планет. Положение планет на орбитах — примерно как сегодня.</p>
            <ul className="cosmos-hints">
                {handPresent ? (
                    <>
                        <li><b>Наведите ладонь</b> на планету и задержите — откроется рассказ о ней.</li>
                        <li><b>Сожмите кулак</b> в пустом месте и ведите рукой — поворот камеры.</li>
                    </>
                ) : (
                    <>
                        <li><b>Нажмите</b> на планету или выберите её внизу.</li>
                        <li><b>Тяните мышью</b> — поворот, <b>колесо</b> — приближение.</li>
                    </>
                )}
            </ul>
            <p className="cosmos-note">Размеры планет и расстояния здесь сжаты, иначе всё не поместилось бы на экран. Включите «Реальный масштаб», чтобы увидеть, как на самом деле.</p>
        </div>
    );
}

export function RealScaleCard() {
    return (
        <div className="panel cosmos-card">
            <h2>Реальный масштаб</h2>
            <p className="cosmos-lead">Теперь размеры и расстояния показаны в одном масштабе. Планеты превратились в точки: Солнечная система почти пустая!</p>
            <div className="panel-title" style={{ marginTop: '0.9rem' }}>Если Солнце — мяч диаметром 30 см:</div>
            <ul className="cosmos-scale-list">
                <li><b>Меркурий</b> — крупинка 1 мм в 12 м</li>
                <li><b>Земля</b> — горошина 2,7 мм в 32 м</li>
                <li><b>Луна</b> — пылинка 0,7 мм в 8 см от «Земли»</li>
                <li><b>Юпитер</b> — орех 3 см в 168 м</li>
                <li><b>Нептун</b> — бусина 1 см почти в километре (970 м)</li>
                <li><b>Ближайшая звезда</b> — за 8 700 км!</li>
            </ul>
        </div>
    );
}

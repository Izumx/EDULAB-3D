// Right-hand panels: info card for the selected body, intro and the "real scale" explainer.
import React from 'react';
import { ArrowLeft, Lightbulb, Moon, X } from 'lucide-react';
import { ballScale, formatKm, formatMkm } from './bodies';

// One fact as a compact tile; the card shows them in two columns so it fits a 768 px tall projector screen
function Stat({ label, value, sub, wide }) {
    return (
        <div className={`cosmos-stat${wide ? ' wide' : ''}`}>
            <div className="cosmos-stat-label">{label}</div>
            <div className="cosmos-stat-value">{value}</div>
            {sub && <div className="cosmos-stat-sub">{sub}</div>}
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
                <button className="btn btn-icon btn-ghost cosmos-card-close" onClick={onClose} aria-label="Закрыть"><X /></button>
            </div>

            <div className="cosmos-stats">
                <Stat label="Диаметр" value={formatKm(body.diameter)}
                    sub={body.id === 'earth' ? 'экваториальный' : `${body.xEarth} × Земля`} />
                {isPlanet && <Stat label="От Солнца" value={formatMkm(body.aMkm)} sub={`${body.au} а.е.`} />}
                {body.kind === 'moon' && <Stat label="От Земли" value={formatKm(body.distKm)} />}
                {body.period && <Stat label={body.kind === 'moon' ? 'Оборот вокруг Земли' : 'Год'} value={body.period} />}
                <Stat label="Сутки" value={body.day} />
                {isPlanet && <Stat label="Спутники" value={moonsText(body)} sub={body.moons > 2 ? 'данные 2025 г.' : null} />}
                <Stat label={isPlanet ? 'Температура (средняя)' : 'Температура'} value={body.temp} />
                {body.extra?.map(([l, v]) => <Stat key={l} label={l} value={v} />)}
                {body.kind !== 'star' && <Stat wide label="Если Солнце — мяч 30 см" value={ballScale(body)} />}
            </div>

            <p className="cosmos-fact"><Lightbulb className="ico" aria-hidden="true" /> {body.fact}</p>

            {body.id === 'earth' && (
                <button className="btn cosmos-card-link" onClick={() => onSelect('moon')}><Moon /> Луна — спутник Земли</button>
            )}
            {body.id === 'moon' && (
                <button className="btn cosmos-card-link" onClick={() => onSelect('earth')}><ArrowLeft /> Вернуться к Земле</button>
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

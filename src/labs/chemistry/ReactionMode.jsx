// «Реакции» mode: pick a reaction, balance the equation with coefficient steppers, then run it in 3D.
import React, { useCallback, useMemo, useState } from 'react';
import { ArrowRight, Check, CircleCheck, Play, RotateCcw, X } from 'lucide-react';
import { LabCanvas } from '../../ui/three';
import { ELEMENTS } from './elements';
import { BY_ID, formulaParts } from './match';
import { MAX_COEF, REACTIONS, balanceRows, isBalanced } from './reactions';
import ReactionScene from './ReactionScene';

const CAMERA = { position: [0, 1.2, 14], fov: 45, near: 0.1, far: 150 };

function Formula({ text }) {
    return formulaParts(text).map((p, i) => (p.sub ? <sub key={i}>{p.t}</sub> : <span key={i}>{p.t}</span>));
}

// "2H₂ + O₂ → 2H₂O" with the current coefficients
function Equation({ reaction, left, right }) {
    const side = (list, coefs) => list.map(([id], i) => (
        <React.Fragment key={id}>
            {i > 0 && <span className="rx-op">+</span>}
            <span className="rx-term">
                {coefs[i] > 1 && <b className="rx-coef">{coefs[i]}</b>}
                <Formula text={BY_ID.get(id).formula} />
            </span>
        </React.Fragment>
    ));
    return (
        <div className="rx-equation">
            {side(reaction.left, left)}
            <span className="rx-op rx-arrow">→</span>
            {side(reaction.right, right)}
        </div>
    );
}

function Stepper({ id, value, onChange, disabled }) {
    const mol = BY_ID.get(id);
    return (
        <div className="rx-step">
            <button className="btn btn-icon" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label={`Меньше ${mol.formula}`}>−</button>
            <span className="rx-step-value">{value}</span>
            <button className="btn btn-icon" onClick={() => onChange(value + 1)} disabled={disabled || value >= MAX_COEF} aria-label={`Больше ${mol.formula}`}>+</button>
            <span className="rx-step-name">
                <b><Formula text={mol.formula} /></b>
                <small>{mol.name.toLowerCase()}</small>
            </span>
        </div>
    );
}

export default function ReactionMode({ labels, zoom }) {
    const [rid, setRid] = useState(REACTIONS[0].id);
    const reaction = REACTIONS.find(r => r.id === rid);
    const [left, setLeft] = useState(() => reaction.left.map(() => 1));
    const [right, setRight] = useState(() => reaction.right.map(() => 1));
    const [runKey, setRunKey] = useState(0);
    const [done, setDone] = useState(false);
    const [solvedIds, setSolvedIds] = useState(() => new Set());

    const rows = useMemo(() => balanceRows(reaction, left, right), [reaction, left, right]);
    const balanced = isBalanced(rows);
    const running = runKey > 0 && !done;

    const pick = id => {
        const r = REACTIONS.find(x => x.id === id);
        setRid(id);
        setLeft(r.left.map(() => 1));
        setRight(r.right.map(() => 1));
        setRunKey(0);
        setDone(false);
    };

    const change = (side, i, v) => {
        const set = side === 'left' ? setLeft : setRight;
        set(list => list.map((x, k) => (k === i ? Math.max(1, Math.min(MAX_COEF, v)) : x)));
        setRunKey(0);
        setDone(false);
    };

    const run = () => {
        setDone(false);
        setRunKey(k => k + 1);
    };

    const reveal = () => {
        setLeft(reaction.left.map(x => x[1]));
        setRight(reaction.right.map(x => x[1]));
        setRunKey(0);
        setDone(false);
    };

    const onDone = useCallback(() => {
        setDone(true);
        setSolvedIds(s => new Set(s).add(rid));
    }, [rid]);

    return (
        <>
            <LabCanvas camera={CAMERA}>
                <ReactionScene reaction={reaction} leftCoefs={left} rightCoefs={right} runKey={runKey} onDone={onDone} labels={labels} zoom={zoom} />
            </LabCanvas>

            <aside className="lab-left chem-left">
                <div className="panel">
                    <div className="panel-title">Реакции · проведено {solvedIds.size} из {REACTIONS.length}</div>
                    <div className="rx-list">
                        {REACTIONS.map(r => (
                            <button key={r.id} className={`btn rx-item${r.id === rid ? ' active' : ''}`} onClick={() => pick(r.id)}>
                                {solvedIds.has(r.id) && <CircleCheck className="rx-check" aria-label="проведена" />}
                                {r.name}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            <aside className="lab-right chem-right">
                <div className="panel chem-card rx-panel">
                    <div className="panel-title">{done ? 'Реакция прошла' : 'Уравняйте реакцию'}</div>
                    {!done ? (
                        <>
                            <div className="rx-group-title">Исходные вещества</div>
                            {reaction.left.map(([id], i) => (
                                <Stepper key={id} id={id} value={left[i]} onChange={v => change('left', i, v)} disabled={running} />
                            ))}
                            <div className="rx-group-title">Продукты</div>
                            {reaction.right.map(([id], i) => (
                                <Stepper key={id} id={id} value={right[i]} onChange={v => change('right', i, v)} disabled={running} />
                            ))}
                            <table className="rx-balance">
                                <thead><tr><th>Атомы</th><th>слева</th><th>справа</th><th /></tr></thead>
                                <tbody>
                                    {rows.map(r => (
                                        <tr key={r.el} className={r.left === r.right ? 'ok' : 'bad'}>
                                            <td><i style={{ background: ELEMENTS[r.el].color }} />{r.el}</td>
                                            <td>{r.left}</td>
                                            <td>{r.right}</td>
                                            <td>{r.left === r.right ? <Check className="ico rx-ok" aria-label="да" /> : <X className="ico rx-bad" aria-label="нет" />}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className={`rx-status${balanced ? ' ok' : ''}`}>
                                {balanced
                                    ? 'Атомов каждого элемента поровну слева и справа. Можно проводить реакцию!'
                                    : 'Атомы не появляются и не исчезают: меняйте коэффициенты, пока числа слева и справа не сравняются.'}
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="rx-name">{reaction.name}</h2>
                            <div className="chem-tags"><span className="chip">{reaction.type}</span><span className="chip">{reaction.heat}</span></div>
                            <p className="rx-text">{reaction.text}</p>
                            <p className="chem-note">{reaction.fact}</p>
                        </>
                    )}
                </div>
            </aside>

            <div className="lab-toast rx-toast"><Equation reaction={reaction} left={left} right={right} /></div>

            <nav className="lab-bottom chem-bar" aria-label="Действия">
                {done ? (
                    <button className="btn" onClick={() => { setRunKey(0); setDone(false); }}><RotateCcw /> Ещё раз</button>
                ) : (
                    <button className="btn" onClick={reveal} disabled={running}>Подсказка</button>
                )}
                <button className="btn btn-primary chem-main" onClick={run} disabled={!balanced || running}>
                    {running ? 'Идёт реакция…' : <><Play /> Провести реакцию</>}
                </button>
                {done && (
                    <button className="btn" onClick={() => pick(REACTIONS[(REACTIONS.indexOf(reaction) + 1) % REACTIONS.length].id)}>Следующая <ArrowRight /></button>
                )}
            </nav>
        </>
    );
}

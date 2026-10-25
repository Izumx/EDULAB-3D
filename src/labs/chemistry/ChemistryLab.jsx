// Chemistry lab: a molecule constructor. Pick elements, watch the atoms float in the flask, press «Соединить».
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import { LabCanvas } from '../../ui/three';
import { useHandStatus } from '../../hand/handStore';
import { CATEGORIES, ELEMENTS } from './elements';
import {
    BY_ID, MAX_ATOMS, TASKS, atomTotal, compText, countAtoms, findExact, formatNumber, formulaParts, hillFormula, missingFor, molarMass,
    suggestions,
} from './match';
import ChemScene from './ChemScene';
import './chemistry.css';

const CAMERA = { position: [0, 0.4, 12], fov: 45, near: 0.1, far: 120 };
const SYMBOLS = Object.keys(ELEMENTS);

function Formula({ text }) {
    return (
        <>
            {formulaParts(text).map((p, i) => (p.sub ? <sub key={i}>{p.t}</sub> : <span key={i}>{p.t}</span>))}
        </>
    );
}

// Name of the element under the hand cursor: the hand only toggles a class, so watch for it
function useHandHoverSymbol(ref) {
    const [sym, setSym] = useState(null);
    useEffect(() => {
        const root = ref.current;
        if (!root) return undefined;
        const read = () => setSym(root.querySelector('.hand-hover')?.dataset.sym ?? null);
        const obs = new MutationObserver(read);
        obs.observe(root, { attributes: true, attributeFilter: ['class'], subtree: true });
        return () => obs.disconnect();
    }, [ref]);
    return sym;
}

function Palette({ onAdd, picked, disabledHint }) {
    const grid = useRef(null);
    const [mouseSym, setMouseSym] = useState(null);
    const handSym = useHandHoverSymbol(grid);
    const shown = handSym ?? mouseSym ?? picked;
    const el = shown ? ELEMENTS[shown] : null;

    return (
        <div className="panel chem-palette">
            <div className="panel-title">Элементы</div>
            <div className="chem-grid" ref={grid} onMouseLeave={() => setMouseSym(null)}>
                {SYMBOLS.map(sym => {
                    const e = ELEMENTS[sym];
                    const cat = CATEGORIES[e.cat];
                    return (
                        <button key={sym} className="chem-tile" data-sym={sym} onClick={() => onAdd(sym)} onMouseEnter={() => setMouseSym(sym)}
                            style={{ gridRow: e.row, gridColumn: e.col, '--atom': e.color, '--cat': cat.color }} aria-label={`${e.name}, добавить атом`}>
                            <span className="chem-tile-sym">{sym}</span>
                        </button>
                    );
                })}
            </div>
            <div className="chem-element">
                {el ? (
                    <>
                        <div className="chem-element-name"><b>{el.name}</b> <span className="muted">({shown}), №{el.z}</span></div>
                        <div className="chem-element-meta">
                            Ar = {formatNumber(el.ar)} · {CATEGORIES[el.cat].one}{el.en ? ` · ЭО ${formatNumber(el.en, 2)}` : ''}
                        </div>
                    </>
                ) : (
                    <div className="muted">{disabledHint}</div>
                )}
            </div>
            <div className="chem-legend">
                {Object.values(CATEGORIES).map(c => (
                    <span key={c.label} className="chem-legend-item"><i style={{ background: c.color }} />{c.label}</span>
                ))}
            </div>
        </div>
    );
}

function FlaskCard({ atoms, exact, message }) {
    const comp = countAtoms(atoms.map(a => a.el));
    const entries = Object.entries(comp);
    return (
        <div className="panel chem-card">
            <div className="panel-title">В колбе{atoms.length ? ` · ${atoms.length} из ${MAX_ATOMS}` : ''}</div>
            {atoms.length === 0 ? (
                <p className="chem-empty">Колба пуста. Нажимайте на элементы слева — атомы появятся в колбе. Потом нажмите «Соединить».</p>
            ) : (
                <>
                    <div className="chem-formula"><Formula text={exact ? exact.formula : hillFormula(comp)} /></div>
                    <div className="chem-counts">
                        {entries.map(([el, n]) => (
                            <span key={el} className="chem-count" style={{ '--atom': ELEMENTS[el].color }}>
                                <i />{el} × {n}
                            </span>
                        ))}
                    </div>
                    <p className={`chem-status${exact ? ' ok' : ''}`}>
                        {exact ? 'Из таких атомов можно получить вещество. Нажмите «Соединить»!' : 'Соберите набор атомов и нажмите «Соединить».'}
                    </p>
                </>
            )}
            {message && <p className="chem-message">{message}</p>}
        </div>
    );
}

function HintCard({ items, empty, onAdd, onClose }) {
    return (
        <div className="panel chem-card chem-hints">
            <div className="chem-card-top">
                <div className="panel-title">{empty ? 'Попробуйте собрать' : 'Что можно получить'}</div>
                <button className="btn btn-icon chem-close" onClick={onClose} aria-label="Закрыть подсказку">✕</button>
            </div>
            {items.length === 0 && <p className="muted">Подходящих веществ нет. Уберите последний атом или очистите колбу.</p>}
            {items.map(({ mol, add, exact }) => (
                <div key={mol.id} className="chem-hint">
                    <div className="chem-hint-main">
                        <div className="chem-hint-name"><b><Formula text={mol.formula} /></b> — {mol.name.toLowerCase()}</div>
                        <div className="chem-hint-need">
                            {exact ? 'Все атомы на месте!' : add ? (empty ? compText(mol.comp) : `не хватает: ${compText(add)}`) : `состав: ${compText(mol.comp)}`}
                        </div>
                    </div>
                    {add && !exact && <button className="btn btn-small" onClick={() => onAdd(add)}>Добавить</button>}
                </div>
            ))}
        </div>
    );
}

// «Задание» mode: the teacher gets a substance by name; «Подсказка» reveals the formula and the missing atoms
function TaskCard({ task, solved, comp, onAdd, onNext, onEnd }) {
    const need = task.revealed ? missingFor(task.mol.comp, comp) : null;
    return (
        <div className="panel chem-card chem-task">
            <div className="chem-card-top">
                <div className="panel-title">🎯 Задание</div>
                <span className="chip">Решено: {solved}</span>
            </div>
            <div className="chem-task-name">Соберите: <b>{task.mol.name.toLowerCase()}</b></div>
            {task.revealed && (
                <div className="chem-task-hint">
                    <span className="chem-task-formula"><Formula text={task.mol.formula} /></span>
                    <span className="muted">
                        {need === null ? 'в колбе есть лишние атомы' : atomTotal(need) ? `не хватает: ${compText(need)}` : 'все атомы на месте!'}
                    </span>
                    {need && atomTotal(need) > 0 && <button className="btn btn-small" onClick={() => onAdd(need)}>Добавить</button>}
                </div>
            )}
            <div className="chem-task-actions">
                <button className="btn btn-small" onClick={onNext}>Другое задание</button>
                <button className="btn btn-small btn-ghost" onClick={onEnd}>Завершить</button>
            </div>
        </div>
    );
}

function MoleculeCard({ mol, onClose }) {
    const mass = molarMass(mol.comp);
    const ionic = mol.bond === 'ионная';
    const rows = [
        ['Связь', mol.bond],
        ['Геометрия', mol.shape],
    ];
    return (
        <div className="panel chem-card chem-mol" key={mol.id}>
            <div className="chem-card-top">
                <div className="chem-mol-formula"><Formula text={mol.formula} /></div>
                <button className="btn btn-icon chem-close" onClick={onClose} aria-label="Закрыть">✕</button>
            </div>
            <h2>{mol.name}</h2>
            {mol.alt && <div className="muted chem-alt">{mol.alt}</div>}
            <div className="chem-tags">
                <span className="chip">{mol.cls}</span>
                <span className={`chip${ionic ? ' chem-ionic' : ''}`}>{mol.lattice} решётка</span>
                <span className="chip chem-mass" title="Молярная масса">M = {formatNumber(mass)} г/моль</span>
            </div>
            <dl className="chem-rows">
                {rows.map(([k, v]) => (
                    <div key={k} className="chem-row"><dt>{k}</dt><dd>{v}</dd></div>
                ))}
                {mol.ions && <div className="chem-row"><dt>Ионы</dt><dd>{mol.ions}</dd></div>}
            </dl>
            {mol.note && <p className="chem-note">{mol.note}</p>}
            <ul className="chem-facts">
                {mol.facts.map(f => <li key={f}>{f}</li>)}
            </ul>
        </div>
    );
}

export default function ChemistryLab({ onBack }) {
    const [atoms, setAtoms] = useState([]);
    const [mol, setMol] = useState(null);
    const [formKey, setFormKey] = useState(0);
    const [shakeKey, setShakeKey] = useState(0);
    const [picked, setPicked] = useState(null);
    const [labels, setLabels] = useState(true);
    const [hints, setHints] = useState(false);
    const [message, setMessage] = useState('');
    const [task, setTask] = useState(null); // { mol, revealed, done }
    const [solved, setSolved] = useState(0);
    const [toast, setToast] = useState(null); // { text, ok }
    const idRef = useRef(1);
    const zoom = useRef(1);
    const { present } = useHandStatus();

    const comp = useMemo(() => countAtoms(atoms.map(a => a.el)), [atoms]);
    const exact = useMemo(() => (atoms.length ? findExact(comp) : null), [atoms.length, comp]);
    const hintItems = useMemo(() => (hints ? suggestions(comp) : []), [hints, comp]);

    // Adding an atom after a molecule was formed starts a fresh flask
    const addAtoms = useCallback((symbols, base) => {
        const list = base ?? [];
        const room = MAX_ATOMS - list.length;
        if (room <= 0) {
            setMessage(`Колба полна: не больше ${MAX_ATOMS} атомов.`);
            return;
        }
        const fresh = symbols.slice(0, room).map(el => ({ id: `a${idRef.current++}`, el }));
        setAtoms([...list, ...fresh]);
        setMessage(symbols.length > room ? `В колбу поместилось только ${room} атомов.` : '');
    }, []);

    const addOne = useCallback(el => {
        setPicked(el);
        if (mol) {
            setMol(null);
            addAtoms([el], []);
        } else {
            addAtoms([el], atoms);
        }
    }, [addAtoms, atoms, mol]);

    const addMissing = useCallback(add => {
        const symbols = Object.entries(add).flatMap(([el, n]) => Array(n).fill(el));
        if (mol) setMol(null);
        addAtoms(symbols, mol ? [] : atoms);
    }, [addAtoms, atoms, mol]);

    const clear = () => {
        setAtoms([]);
        setMol(null);
        setHints(false);
        setMessage('');
        zoom.current = 1;
    };

    const undo = () => {
        setAtoms(list => list.slice(0, -1));
        setMessage('');
    };

    const connect = () => {
        if (!exact) {
            setShakeKey(k => k + 1);
            setMessage(atoms.length < 2 ? 'Нужно хотя бы два атома.' : 'Из этих атомов вещество из каталога не получается. Нажмите «Подсказка».');
            return;
        }
        setMol(exact);
        setFormKey(k => k + 1);
        setHints(false);
        setMessage('');
        if (task && !task.done) {
            if (exact === task.mol) {
                setSolved(n => n + 1);
                setTask(t => ({ ...t, done: true }));
                setToast({ ok: true, text: `🎉 Верно! ${exact.name} — `, formula: exact.formula });
            } else {
                setToast({ ok: false, text: `Получилось другое вещество: ${exact.name.toLowerCase()}. А нужно: ${task.mol.name.toLowerCase()}` });
            }
        }
    };

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 4500);
        return () => clearTimeout(t);
    }, [toast]);

    const nextTask = () => {
        const pool = TASKS.filter(id => id !== task?.mol.id);
        setTask({ mol: BY_ID.get(pool[Math.floor(Math.random() * pool.length)]), revealed: false, done: false });
        setAtoms([]);
        setMol(null);
        setHints(false);
        setMessage('');
        setToast(null);
    };

    const toggleHint = () => {
        if (task) setTask(t => ({ ...t, revealed: !t.revealed }));
        else setHints(v => !v);
    };

    const zoomBy = k => {
        zoom.current = Math.max(0.55, Math.min(1.6, zoom.current * k));
    };

    const formed = !!mol;
    const total = atomTotal(comp);

    const viewControls = (
        <div className="chem-view">
            <button className={`btn${task ? ' active' : ''}`} onClick={nextTask}>🎯 Задание</button>
            <button className={`btn${labels ? ' active' : ''}`} aria-pressed={labels} onClick={() => setLabels(v => !v)}>Подписи</button>
            <button className="btn btn-icon chem-zoom" onClick={() => zoomBy(1.18)} aria-label="Отдалить">−</button>
            <button className="btn btn-icon chem-zoom" onClick={() => zoomBy(0.85)} aria-label="Приблизить">+</button>
        </div>
    );

    return (
        <LabShell title="Химия" subtitle="Конструктор молекул" icon="🧪" accent="var(--chem)" onBack={onBack} actions={viewControls}>
            <LabCanvas camera={CAMERA}>
                <ChemScene atoms={atoms} mol={mol} formKey={formKey} labels={labels} picked={picked} onPick={setPicked} zoom={zoom} shakeKey={shakeKey} />
            </LabCanvas>

            <aside className="lab-left chem-left">
                <Palette onAdd={addOne} picked={picked}
                    disabledHint={present ? 'Задержите руку на элементе — атом появится в колбе.' : 'Нажмите на элемент — атом появится в колбе.'} />
            </aside>

            <aside className="lab-right chem-right">
                {formed
                    ? <MoleculeCard mol={mol} onClose={() => setMol(null)} />
                    : (
                        <>
                            {task && (
                                <TaskCard task={task} solved={solved} comp={comp} onAdd={addMissing} onNext={nextTask}
                                    onEnd={() => setTask(null)} />
                            )}
                            <FlaskCard atoms={atoms} exact={exact} message={message} />
                            {hints && !task && <HintCard items={hintItems} empty={total === 0} onAdd={addMissing} onClose={() => setHints(false)} />}
                        </>
                    )}
            </aside>

            {toast && (
                <div className={`lab-toast chem-toast${toast.ok ? ' ok' : ''}`} role="status">
                    {toast.text}{toast.formula && <Formula text={toast.formula} />}
                </div>
            )}

            <nav className="lab-bottom chem-bar" aria-label="Действия">
                {formed ? (
                    <>
                        <button className="btn" onClick={() => setMol(null)}>Разобрать на атомы</button>
                        {task
                            ? <button className="btn btn-primary chem-main" onClick={task.done ? nextTask : () => setMol(null)}>
                                {task.done ? '🎯 Следующее задание' : 'Попробовать ещё'}
                            </button>
                            : <button className="btn btn-primary chem-main" onClick={clear}>Новая колба</button>}
                    </>
                ) : (
                    <>
                        <button className="btn" onClick={undo} disabled={atoms.length === 0}>Убрать последний</button>
                        <button className="btn" onClick={clear} disabled={atoms.length === 0}>Очистить</button>
                        <button className="btn btn-primary chem-main" onClick={connect} disabled={atoms.length === 0}>Соединить</button>
                        <button className={`btn${(task ? task.revealed : hints) ? ' active' : ''}`} aria-pressed={task ? task.revealed : hints} onClick={toggleHint}>Подсказка</button>
                    </>
                )}
            </nav>
        </LabShell>
    );
}


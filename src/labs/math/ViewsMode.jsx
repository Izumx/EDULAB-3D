// «Виды» mode: build a figure from cubes and compare its three views; in task mode rebuild a figure from its views.
import React, { useEffect, useRef, useState } from 'react';
import { Dices, PartyPopper, Target } from 'lucide-react';
import { LabCanvas } from '../../ui/three';
import VoxelScene from './VoxelScene';
import { HeightGrid, ViewTriple } from './ViewsPanels';
import { MAX_H, allMatch, compareViews, cubeCount, emptyFigure, idx, randomFigure } from './voxels';
import { mulberry } from './geom';

const CAMERA = { position: [0, 4, 11.5], fov: 45, near: 0.1, far: 100 };

export default function ViewsMode() {
    const [heights, setHeights] = useState(emptyFigure);
    const [remove, setRemove] = useState(false);
    const [task, setTask] = useState(null); // { target, hint, done }
    const [solved, setSolved] = useState(0);
    const [toast, setToast] = useState(null);
    const zoom = useRef(1);

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    // Every change goes through here, so a finished task is noticed right away
    const apply = next => {
        setHeights(next);
        if (task && !task.done && cubeCount(next) > 0 && allMatch(compareViews(next, task.target))) {
            const identical = next.every((v, i) => v === task.target[i]);
            setTask(t => ({ ...t, done: true }));
            setSolved(n => n + 1);
            setToast({ ok: true, text: identical ? 'Верно! Все три вида совпали.' : 'Верно! Все три вида совпали. У этих видов бывает несколько разных фигур — вы нашли одну из них.' });
        }
    };

    // a tap in 3D: one cube more (or less)
    const tap = (x, z) => {
        const i = idx(x, z);
        const next = heights.slice();
        next[i] = remove ? Math.max(0, next[i] - 1) : Math.min(MAX_H, next[i] + 1);
        apply(next);
    };

    // a tap on the base grid: add cycles 0 → 4 → 0, remove steps down
    const cell = (x, z) => {
        const i = idx(x, z);
        const next = heights.slice();
        next[i] = remove ? Math.max(0, next[i] - 1) : (next[i] + 1) % (MAX_H + 1);
        apply(next);
    };

    const clear = () => apply(emptyFigure());
    const randomOne = () => { setTask(null); setHeights(randomFigure(mulberry((Math.random() * 1e9) | 0))); };
    const newTask = () => {
        setTask({ target: randomFigure(mulberry((Math.random() * 1e9) | 0)), hint: false, done: false });
        setHeights(emptyFigure());
        setToast(null);
    };

    const match = task ? compareViews(heights, task.target) : null;
    const tallest = task ? Math.max(...task.target) : 0;

    return (
        <>
            <LabCanvas camera={CAMERA}>
                <VoxelScene heights={heights} onTap={tap} remove={remove} zoom={zoom} />
            </LabCanvas>

            <aside className="lab-left math-left">
                <div className="panel math-list-panel">
                    <div className="panel-title">Основание 4 × 4 · высота башен</div>
                    <HeightGrid heights={heights} onCell={cell} remove={remove} />
                    <div className="views-mode">
                        <button className={`btn${!remove ? ' active' : ''}`} onClick={() => setRemove(false)}>Добавлять</button>
                        <button className={`btn${remove ? ' active' : ''}`} onClick={() => setRemove(true)}>Убирать</button>
                    </div>
                </div>
            </aside>

            <aside className="lab-right math-right">
                {task ? (
                    <div className="panel math-card views-card">
                        <div className="panel-title"><Target className="ico" aria-hidden="true" />Постройте фигуру · решено {solved}</div>
                        <div className="views-sub">Дано: три вида</div>
                        <ViewTriple heights={task.target} compact />
                        <div className="views-sub">Ваша фигура</div>
                        <ViewTriple heights={heights} match={match} compact />
                        {task.hint && <p className="views-hint">В фигуре <b>{cubeCount(task.target)}</b> кубиков, самая высокая башня — <b>{tallest}</b>.</p>}
                    </div>
                ) : (
                    <div className="panel math-card views-card">
                        <h2>Три вида фигуры</h2>
                        <ViewTriple heights={heights} showHeights />
                        <p className="math-note">
                            Ставьте кубики — виды меняются сразу. Число на виде сверху — высота башни. Сначала угадайте, как изменится вид слева,
                            потом добавьте кубик. А ещё попробуйте «Задание»: соберите фигуру по её видам.
                        </p>
                    </div>
                )}
            </aside>

            {toast && <div className={`lab-toast views-toast${toast.ok ? ' ok' : ''}`} role="status">{toast.ok && <PartyPopper aria-hidden="true" />}{toast.text}</div>}

            <nav className="lab-bottom math-bar" aria-label="Действия">
                <button className="btn btn-icon math-zoom" onClick={() => { zoom.current = Math.min(1.7, zoom.current * 1.18); }} aria-label="Отдалить">−</button>
                <button className="btn btn-icon math-zoom" onClick={() => { zoom.current = Math.max(0.55, zoom.current * 0.85); }} aria-label="Приблизить">+</button>
                <button className="btn" onClick={clear} disabled={cubeCount(heights) === 0}>Очистить</button>
                {!task && <button className="btn" onClick={randomOne}><Dices /> Случайная фигура</button>}
                <button className={`btn${task ? '' : ' btn-primary'}`} onClick={newTask}><Target />{task ? 'Новое задание' : 'Задание'}</button>
                {task && !task.hint && <button className="btn" onClick={() => setTask(t => ({ ...t, hint: true }))}>Подсказка</button>}
                {task && <button className="btn btn-ghost" onClick={() => { setTask(null); setToast(null); }}>Завершить</button>}
            </nav>
        </>
    );
}

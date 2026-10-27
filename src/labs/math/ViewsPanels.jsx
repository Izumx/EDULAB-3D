// Panels of the «Виды» mode: the three views drawn as small grids, the base grid for heights, the task card.
import React from 'react';
import { Check, X } from 'lucide-react';
import { MAX_H, N, cubeCount, idx, views } from './voxels';

const CELL = 12;
const VIEW_COLORS = { front: '#60a5fa', left: '#34d399', top: '#fbbf24' };
const VIEW_NAMES = { front: 'Вид спереди', left: 'Вид слева', top: 'Вид сверху' };
const SHORT_NAMES = { front: 'Спереди', left: 'Слева', top: 'Сверху' };

// One view as an SVG grid; `numbers` writes the number of cubes in each cell of the top view
export function ViewGrid({ kind, grid, ok, numbers, compact }) {
    const rows = grid.length;
    const color = VIEW_COLORS[kind];
    return (
        <figure className={`views-fig${ok === true ? ' ok' : ok === false ? ' bad' : ''}`}>
            <svg viewBox={`0 0 ${N * CELL} ${rows * CELL}`} aria-label={VIEW_NAMES[kind]}>
                {grid.map((row, r) => row.map((on, c) => (
                    <rect key={`${r}-${c}`} x={c * CELL + 0.5} y={r * CELL + 0.5} width={CELL - 1} height={CELL - 1} rx="1.5"
                        fill={on ? color : 'rgba(255,255,255,0.05)'} stroke={on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'} strokeWidth="0.5" />
                )))}
                {numbers && grid.map((row, r) => row.map((on, c) => on && numbers[idx(c, r)] > 0 && (
                    <text key={`t${r}-${c}`} x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 1.2} fontSize="6" fontWeight="700" textAnchor="middle" dominantBaseline="middle" fill="#04101f">
                        {numbers[idx(c, r)]}
                    </text>
                )))}
            </svg>
            <figcaption>{compact ? SHORT_NAMES[kind] : VIEW_NAMES[kind]}{ok === true ? <Check className="ico views-ok" aria-label="совпадает" /> : ok === false ? <X className="ico views-bad" aria-label="не совпадает" /> : null}</figcaption>
        </figure>
    );
}

// The three views arranged like in a drawing: front and left on top, top below the front view
export function ViewTriple({ heights, match, showHeights, compact }) {
    const v = views(heights);
    return (
        <div className={`views-triple${compact ? ' compact' : ''}`}>
            <ViewGrid kind="front" grid={v.front} ok={match?.front} compact={compact} />
            <ViewGrid kind="left" grid={v.left} ok={match?.left} compact={compact} />
            <ViewGrid kind="top" grid={v.top} ok={match?.top} numbers={showHeights ? heights : null} compact={compact} />
            <div className="views-count">
                <b>{cubeCount(heights)}</b>
                <span>кубиков</span>
            </div>
        </div>
    );
}

// Base 4×4: tap a cell to change the height of its column
export function HeightGrid({ heights, onCell, remove }) {
    return (
        <div className="views-base" role="group" aria-label="Основание">
            {Array.from({ length: N }, (_, z) => Array.from({ length: N }, (_, x) => {
                const h = heights[idx(x, z)];
                return (
                    <button key={`${x}-${z}`} className={`btn views-cell${h ? ' filled' : ''}`} onClick={() => onCell(x, z)}
                        style={{ '--lvl': h / MAX_H }} aria-label={`Клетка ${x + 1}, ${z + 1}: высота ${h}`}>
                        {h || ''}
                    </button>
                );
            }))}
            <div className="views-base-note">
                <span>сзади</span>
                <span>спереди</span>
            </div>
            {remove && <div className="views-remove-note">режим «Убирать»</div>}
        </div>
    );
}

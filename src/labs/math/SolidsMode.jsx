// «Тела» mode: pick a solid, change its size, read the formulas, unfold polyhedra into nets.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LabCanvas } from '../../ui/three';
import SolidScene from './SolidScene';
import { SolidBar, SolidCard, SolidList } from './SolidsPanels';
import { SOLID_BY_ID, buildPolyhedron, defaults } from './solids';

const CAMERA = { position: [0, 5, 10], fov: 45, near: 0.1, far: 200 };

export default function SolidsMode() {
    const [id, setId] = useState('cube');
    const solid = SOLID_BY_ID[id];
    const [params, setParams] = useState(() => defaults(solid));
    const [fold, setFold] = useState(1);
    const [goto, setGoto] = useState({ f: 1 });
    const [edges, setEdges] = useState(true);
    const [numbers, setNumbers] = useState(false);
    const zoom = useRef(1);

    const poly = useMemo(() => (solid.round ? null : buildPolyhedron(solid, params)), [solid, params]);

    const pick = useCallback(nextId => {
        const next = SOLID_BY_ID[nextId];
        setId(nextId);
        setParams(defaults(next));
        setFold(1);
        setGoto({ f: 1, reset: true });
        zoom.current = 1;
    }, []);

    const onParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

    return (
        <>
            <LabCanvas camera={CAMERA}>
                <SolidScene solid={solid} params={params} poly={poly} goto={goto} onProgress={setFold}
                    showEdges={edges} showNumbers={numbers} zoom={zoom} />
            </LabCanvas>

            <aside className="lab-left math-left">
                <SolidList solid={solid} onPick={pick} params={params} onParam={onParam} />
            </aside>

            <aside className="lab-right math-right">
                <SolidCard solid={solid} params={params} poly={poly} />
            </aside>

            <nav className="lab-bottom math-bar" aria-label="Развёртка">
                <SolidBar poly={poly} fold={fold} onFold={f => setGoto({ f })} onScrub={f => setGoto({ f, scrub: true })}
                    edges={edges} onEdges={() => setEdges(v => !v)} numbers={numbers} onNumbers={() => setNumbers(v => !v)}
                    onZoom={k => { zoom.current = Math.max(0.5, Math.min(1.8, zoom.current * k)); }} />
            </nav>
        </>
    );
}

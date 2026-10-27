import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AIChatbot } from './components/AIChatbot';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HandProvider } from './hand/HandProvider';

// Labs load on demand, so the menu opens fast on school laptops
const LABS = {
    chemistry: lazy(() => import('./labs/chemistry/ChemistryLab.jsx')),
    biology: lazy(() => import('./labs/biology/BiologyLab.jsx')),
    physics: lazy(() => import('./labs/physics/PhysicsLab.jsx')),
    cosmos: lazy(() => import('./labs/cosmos/CosmosLab.jsx')),
    math: lazy(() => import('./labs/math/MathLab.jsx')),
    geo: lazy(() => import('./labs/geo/GeoLab.jsx')),
    quiz: lazy(() => import('./labs/quiz/QuizLab.jsx')),
};

// The current lab lives in the URL hash (#chemistry), so refresh and the browser Back button work.
// A lab may add its mode after a slash (#chemistry/react); only the lab id picks the screen here
const readMode = () => {
    const mode = window.location.hash.slice(1).split('/')[0];
    return LABS[mode] ? mode : 'menu';
};

function App() {
    // `visit` grows on every hash change, so #geo/seasons typed over #geo/globe remounts the lab in the new mode
    const [route, setRoute] = useState(() => ({ mode: readMode(), visit: 0 }));
    const { mode, visit } = route;

    useEffect(() => {
        const onHash = () => setRoute(r => ({ mode: readMode(), visit: r.visit + 1 }));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    // the hashchange handler above does the switch
    const setMode = (next) => {
        window.location.hash = next === 'menu' ? '' : next;
    };

    const Lab = LABS[mode];

    return (
        // HandProvider stays mounted across labs, so the camera starts once per lesson
        <HandProvider>
            <ErrorBoundary key={`${mode}:${visit}`} onReset={() => setMode('menu')}>
                {Lab ? (
                    <Suspense fallback={<div className="loading-screen">Загружаю лабораторию…</div>}>
                        <Lab onBack={() => setMode('menu')} />
                    </Suspense>
                ) : (
                    <Dashboard onOpen={setMode} />
                )}
            </ErrorBoundary>
            <AIChatbot mode={mode} />
        </HandProvider>
    );
}

export default App;

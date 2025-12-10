import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Stars } from '@react-three/drei';
import { HandController } from './components/HandController';
import { CellModel } from './components/CellModel';
import { DNAStrand } from './components/DNAStrand';

const ORGANELLE_INFO = {
    'Nucleus': {
        title: 'The Nucleus',
        desc: 'The control center of the cell. It contains the cell\'s genetic material (DNA).',
        action: 'Inspect DNA'
    },
    'Mitochondria': {
        title: 'Mitochondria',
        desc: 'The powerhouse of the cell. It generates most of the chemical energy (ATP) needed to power the cell\'s biochemical reactions.',
        action: null
    }
};

export const BiologyApp = ({ onBack }) => {
    const [handState, setHandState] = useState({ x: 0, y: 0, isPinching: false, rotation: [0, 0, 0] });
    const [selectedOrganelle, setSelectedOrganelle] = useState(null);
    const [viewMode, setViewMode] = useState('cell'); // 'cell' or 'dna'

    const handleOrganelleClick = (name) => {
        if (ORGANELLE_INFO[name]) {
            setSelectedOrganelle(name);
        }
    };

    const handleActionClick = () => {
        if (selectedOrganelle === 'Nucleus') {
            setViewMode('dna');
            setSelectedOrganelle(null); // Clear overlay when entering mode
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#001' }}>
            <HandController onHandUpdate={setHandState} />

            <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />

                {viewMode === 'cell' ? (
                    <CellModel rotation={handState.rotation} onOrganelleClick={handleOrganelleClick} />
                ) : (
                    <DNAStrand handRotation={handState.rotation} />
                )}

                <ContactShadows position={[0, -5, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
                <Environment preset="forest" />
                <Stars />
                <OrbitControls enableZoom={true} />
            </Canvas>

            <header style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: 20, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => {
                        if (viewMode === 'dna') {
                            setViewMode('cell');
                        } else {
                            onBack();
                        }
                    }}
                    className="back-btn"
                >
                    {viewMode === 'dna' ? '← Back to Cell' : '← Back'}
                </button>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <h1>{viewMode === 'dna' ? 'DNA Analysis' : 'Biology Cell Viewer'}</h1>
                    <p style={{ color: '#aaa', marginTop: 5 }}>
                        {viewMode === 'dna' ? 'Examining Genetic Code' : 'Use your hand to rotate the animal cell.'}
                    </p>
                </div>
            </header>

            {/* Organelle Info Overlay */}
            {selectedOrganelle && viewMode === 'cell' && (
                <div style={{
                    position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                    width: 400, background: 'rgba(0,20,40,0.8)', border: '1px solid #00ff66',
                    borderRadius: 20, padding: 25, backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.3s'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h2 style={{ color: '#00ff66', margin: 0 }}>{ORGANELLE_INFO[selectedOrganelle].title}</h2>
                        <button onClick={() => setSelectedOrganelle(null)} style={{ background: 'none', border: 'none', color: '#00ff66', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    <p style={{ color: '#ddd', marginTop: 10 }}>{ORGANELLE_INFO[selectedOrganelle].desc}</p>

                    {ORGANELLE_INFO[selectedOrganelle].action && (
                        <button
                            onClick={handleActionClick}
                            style={{
                                marginTop: 15, width: '100%', padding: 12, background: '#00ff66',
                                border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer',
                                color: '#000', fontSize: '1rem'
                            }}
                        >
                            {ORGANELLE_INFO[selectedOrganelle].action} →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

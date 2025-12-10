import React, { useState, useEffect, useRef } from 'react';
import { Scene } from './components/Scene';
import { HandController } from './components/HandController';
import { ELEMENTS } from './data/elements';
import { RECIPES } from './data/recipes';
import './App.css';

import { useUser } from './context/UserContext';

export const ChemistryApp = ({ onBack }) => {
  const { addXP, awardBadge } = useUser();
  const [handState, setHandState] = useState({ x: 0, y: 0, isPinching: false, rotation: [0, 0, 0] });
  const [activeMolecule, setActiveMolecule] = useState(null);
  const [draggedElement, setDraggedElement] = useState(null);
  const [mixingZone, setMixingZone] = useState([]);
  const [message, setMessage] = useState("Pick elements and combine them!");
  const [successEffect, setSuccessEffect] = useState(false); // For visual flare

  const prevPinchRef = useRef(false);

  useEffect(() => {
    if (successEffect) {
      const timer = setTimeout(() => setSuccessEffect(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [successEffect]);

  useEffect(() => {
    const { x, y, isPinching } = handState;
    const wasPinching = prevPinchRef.current;

    if (isPinching && !wasPinching) {
      const paletteElements = document.querySelectorAll('.element-item');
      paletteElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          const symbol = el.getAttribute('data-symbol');
          setDraggedElement(symbol);
        }
      });
    }

    if (!isPinching && wasPinching) {
      if (draggedElement) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (x > width * 0.2 && x < width * 0.8 && y > height * 0.2 && y < height * 0.8) {
          addToMixingZone(draggedElement);
        }
        setDraggedElement(null);
      }
    }

    prevPinchRef.current = isPinching;
  }, [handState, draggedElement]);

  const addToMixingZone = (symbol) => {
    const newZone = [...mixingZone, symbol];
    setMixingZone(newZone);
    checkRecipes(newZone);
  };

  const checkRecipes = (currentElements) => {
    const sortedCurrent = [...currentElements].sort();
    for (const recipe of RECIPES) {
      const sortedInputs = [...recipe.inputs].sort();
      if (JSON.stringify(sortedCurrent) === JSON.stringify(sortedInputs)) {
        // --- SUCCESS! ---
        setActiveMolecule(recipe);
        setMixingZone([]);
        setMessage(`Created ${recipe.name}!`);
        setSuccessEffect(true);

        // Gamification
        addXP(50);
        awardBadge('chem_master', 'Alchemist', '⚗️');
        return;
      }
    }
    if (currentElements.length > 0) {
      setMessage("Mixing: " + currentElements.join(" + "));
    }
  };

  const reset = () => {
    setActiveMolecule(null);
    setMixingZone([]);
    setMessage("Start combining elements!");
    setSuccessEffect(false);
  };

  const ELEMENTS_MAP = React.useMemo(() => {
    return ELEMENTS.reduce((acc, el) => {
      acc[el.symbol] = el;
      return acc;
    }, {});
  }, []);

  return (
    <div className={`ChemistryApp ${successEffect ? 'success-mode' : ''}`} style={{ width: '100%', height: '100%' }}>
      <HandController onHandUpdate={setHandState} />

      <Scene
        rotation={handState.rotation}
        molecule={activeMolecule}
        draggedElement={draggedElement}
        handPos={{ x: handState.x, y: handState.y }}
      />

      <div style={{
        position: 'absolute',
        left: handState.x,
        top: handState.y,
        width: 20,
        height: 20,
        background: handState.isPinching ? 'lime' : 'red',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 0 10px white'
      }} />

      <div className="ui-layer">
        <header>
          <button onClick={onBack} className="back-btn">← Back</button>
          <h1>Chemistry Hand Lab</h1>
          {activeMolecule && <button onClick={reset} className="reset-btn">Reset</button>}
        </header>

        <div className="mixing-zone">
          {mixingZone.map((symbol, i) => (
            <div key={i} className="zone-atom" style={{ background: ELEMENTS_MAP[symbol]?.color || '#fff' }}>
              {symbol}
            </div>
          ))}
          {mixingZone.length === 0 && !activeMolecule && <div className="zone-hint">Drop Elements Here</div>}
        </div>
      </div>

      {/* Message Toast */}
      <div style={{
        position: 'absolute', top: 80, width: '100%', textAlign: 'center', pointerEvents: 'none'
      }}>
        <h3 style={{ textShadow: '0 0 10px var(--chem-color)', color: 'white' }}>{message}</h3>
      </div>

      {/* Sidebars */}
      <div className="sidebar left">
        <h4 className="sidebar-title">Metals & More</h4>
        <div className="sidebar-scroll">
          {ELEMENTS.slice(0, 10).map(el => (
            <div key={el.symbol} className="element-item" data-symbol={el.symbol} style={{ borderColor: el.color }}>
              <span style={{ color: el.color }}>{el.symbol}</span>
              <small>{el.name}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar right">
        <h4 className="sidebar-title">Non-Metals & Gas</h4>
        <div className="sidebar-scroll">
          {ELEMENTS.slice(10).map(el => (
            <div key={el.symbol} className="element-item" data-symbol={el.symbol} style={{ borderColor: el.color }}>
              <span style={{ color: el.color }}>{el.symbol}</span>
              <small>{el.name}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

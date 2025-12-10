export const RECIPES = [
    // Basics
    {
        inputs: ['H', 'H', 'O'], name: 'Water', formula: 'H2O', desc: 'Life-giving liquid.', atoms: [
            { element: 'O', position: [0, 0, 0] },
            { element: 'H', position: [0.8, -0.6, 0] },
            { element: 'H', position: [-0.8, -0.6, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['C', 'O', 'O'], name: 'Carbon Dioxide', formula: 'CO2', desc: 'Greenhouse gas.', atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'O', position: [1.2, 0, 0] },
            { element: 'O', position: [-1.2, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['C', 'H', 'H', 'H', 'H'], name: 'Methane', formula: 'CH4', desc: 'Natural gas.', atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'H', position: [0.63, 0.63, 0.63] },
            { element: 'H', position: [-0.63, -0.63, 0.63] },
            { element: 'H', position: [-0.63, 0.63, -0.63] },
            { element: 'H', position: [0.63, -0.63, -0.63] },
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 }
        ]
    },
    {
        inputs: ['Na', 'Cl'], name: 'Sodium Chloride', formula: 'NaCl', desc: 'Table salt.', atoms: [
            { element: 'Na', position: [-0.7, 0, 0] },
            { element: 'Cl', position: [0.7, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },

    // Previous Batch
    {
        inputs: ['O', 'O'], name: 'Oxygen Gas', formula: 'O2', desc: 'Breathable air.', atoms: [
            { element: 'O', position: [-0.6, 0, 0] },
            { element: 'O', position: [0.6, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['N', 'H', 'H', 'H'], name: 'Ammonia', formula: 'NH3', desc: 'Cleaning agent.', atoms: [
            { element: 'N', position: [0, 0, 0] },
            { element: 'H', position: [0, -0.9, 0] },
            { element: 'H', position: [0.8, -0.2, 0.5] },
            { element: 'H', position: [-0.8, -0.2, 0.5] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }]
    },
    {
        inputs: ['H', 'H', 'O', 'O'], name: 'Hydrogen Peroxide', formula: 'H2O2', desc: 'Antiseptic.', atoms: [
            { element: 'O', position: [-0.7, 0, 0.2] },
            { element: 'O', position: [0.7, 0, -0.2] },
            { element: 'H', position: [-1.2, 0.8, 0.2] },
            { element: 'H', position: [1.2, -0.8, -0.2] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 1, endIdx: 3 }]
    },
    {
        inputs: ['H', 'Cl'], name: 'Hydrochloric Acid', formula: 'HCl', desc: 'Stomach acid.', atoms: [
            { element: 'Cl', position: [0, 0, 0] },
            { element: 'H', position: [1.1, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },

    // New Batch (10 Elements)
    {
        inputs: ['N', 'N'], name: 'Nitrogen Gas', formula: 'N2', desc: 'Atmosphere gas (78%).', atoms: [
            { element: 'N', position: [-0.55, 0, 0] },
            { element: 'N', position: [0.55, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }] // Triple bond simplified
    },
    {
        inputs: ['C', 'O'], name: 'Carbon Monoxide', formula: 'CO', desc: 'Silent killer gas.', atoms: [
            { element: 'C', position: [-0.6, 0, 0] },
            { element: 'O', position: [0.6, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['S', 'O', 'O'], name: 'Sulfur Dioxide', formula: 'SO2', desc: 'Volcanic gas.', atoms: [
            { element: 'S', position: [0, 0, 0] },
            { element: 'O', position: [1.1, -0.5, 0] },
            { element: 'O', position: [-1.1, -0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['H', 'H', 'S'], name: 'Hydrogen Sulfide', formula: 'H2S', desc: 'Rotten egg smell.', atoms: [
            { element: 'S', position: [0, 0, 0] },
            { element: 'H', position: [0.9, 0.9, 0] }, // Bent shape approx
            { element: 'H', position: [-0.9, 0.9, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['C', 'H', 'H', 'H', 'O', 'H'], name: 'Methanol', formula: 'CH3OH', desc: 'Wood alcohol.', atoms: [
            { element: 'C', position: [-0.4, 0, 0] },
            { element: 'O', position: [0.6, 0, 0] },
            { element: 'H', position: [-0.4, 1.0, 0] },
            { element: 'H', position: [-1.2, -0.4, 0.7] }, // Tetrahedron approx
            { element: 'H', position: [-0.1, -0.4, -0.8] },
            { element: 'H', position: [1.3, 0.6, 0] }  // OH group H
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 },
            { startIdx: 1, endIdx: 5 }
        ]
    },
    {
        inputs: ['C', 'C', 'H', 'H', 'H', 'H'], name: 'Ethylene', formula: 'C2H4', desc: 'Fruit ripening gas.', atoms: [
            { element: 'C', position: [-0.6, 0, 0] },
            { element: 'C', position: [0.6, 0, 0] },
            { element: 'H', position: [-1.2, 0.9, 0] },
            { element: 'H', position: [-1.2, -0.9, 0] },
            { element: 'H', position: [1.2, 0.9, 0] },
            { element: 'H', position: [1.2, -0.9, 0] }
        ], bonds: [ // Double bond simplified
            { startIdx: 0, endIdx: 1 },
            { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 },
            { startIdx: 1, endIdx: 4 }, { startIdx: 1, endIdx: 5 }
        ]
    },
    {
        inputs: ['C', 'C', 'H', 'H'], name: 'Acetylene', formula: 'C2H2', desc: 'Welding fuel.', atoms: [
            { element: 'C', position: [-0.6, 0, 0] },
            { element: 'C', position: [0.6, 0, 0] },
            { element: 'H', position: [-1.6, 0, 0] },
            { element: 'H', position: [1.6, 0, 0] }
        ], bonds: [ // Triple bond linear
            { startIdx: 0, endIdx: 1 },
            { startIdx: 0, endIdx: 2 }, { startIdx: 1, endIdx: 3 }
        ]
    },
    {
        inputs: ['Si', 'O', 'O'], name: 'Silica', formula: 'SiO2', desc: 'Sand & Glass.', atoms: [
            { element: 'Si', position: [0, 0, 0] },
            { element: 'O', position: [1.0, 0.6, 0] },
            { element: 'O', position: [-1.0, -0.6, 0] } // Linear/Bent depending on crystal, simplified
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['P', 'H', 'H', 'H'], name: 'Phosphine', formula: 'PH3', desc: 'Toxic gas.', atoms: [
            { element: 'P', position: [0, 0, 0] },
            { element: 'H', position: [0, -1.0, 0] },
            { element: 'H', position: [0.9, 0.3, 0] },
            { element: 'H', position: [-0.9, 0.3, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }]
    },
    {
        inputs: ['C', 'Cl', 'Cl', 'Cl', 'Cl'], name: 'Carbon Tetrachloride', formula: 'CCl4', desc: 'Old cleaning solvent.', atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'Cl', position: [1.0, 1.0, 1.0] },
            { element: 'Cl', position: [-1.0, -1.0, 1.0] },
            { element: 'Cl', position: [-1.0, 1.0, -1.0] },
            { element: 'Cl', position: [1.0, -1.0, -1.0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 }
        ]
    },
    // --- ACIDS ---
    {
        inputs: ['H', 'H', 'S', 'O', 'O', 'O', 'O'], name: 'Sulfuric Acid', formula: 'H2SO4', desc: 'Battery acid.', atoms: [
            { element: 'S', position: [0, 0, 0] },
            { element: 'O', position: [1.2, 0, 0] },
            { element: 'O', position: [-1.2, 0, 0] },
            { element: 'O', position: [0, 1.2, 0] },
            { element: 'O', position: [0, -1.2, 0] },
            { element: 'H', position: [1.8, 0.8, 0] },
            { element: 'H', position: [-1.8, -0.8, 0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 },
            { startIdx: 1, endIdx: 5 }, { startIdx: 2, endIdx: 6 }
        ]
    },
    {
        inputs: ['H', 'N', 'O', 'O', 'O'], name: 'Nitric Acid', formula: 'HNO3', desc: 'Fertilizer production.', atoms: [
            { element: 'N', position: [0, 0, 0] },
            { element: 'O', position: [-1.0, 0.5, 0] },
            { element: 'O', position: [1.0, 0.5, 0] },
            { element: 'O', position: [0, -1.0, 0] },
            { element: 'H', position: [1.5, 0.8, 0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 },
            { startIdx: 2, endIdx: 4 }
        ]
    },
    {
        inputs: ['H', 'H', 'C', 'O', 'O', 'O'], name: 'Carbonic Acid', formula: 'H2CO3', desc: 'In soda water.', atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'O', position: [0, 1.2, 0] }, // Double bond O
            { element: 'O', position: [-1.0, -0.6, 0] },
            { element: 'O', position: [1.0, -0.6, 0] },
            { element: 'H', position: [-1.5, -0.9, 0] },
            { element: 'H', position: [1.5, -0.9, 0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 },
            { startIdx: 2, endIdx: 4 }, { startIdx: 3, endIdx: 5 }
        ]
    },

    // --- BASES ---
    {
        inputs: ['Na', 'O', 'H'], name: 'Sodium Hydroxide', formula: 'NaOH', desc: 'Drain cleaner (Lye).', atoms: [
            { element: 'Na', position: [-0.8, 0, 0] },
            { element: 'O', position: [0.8, 0, 0] },
            { element: 'H', position: [1.4, 0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 1, endIdx: 2 }]
    },
    {
        inputs: ['K', 'O', 'H'], name: 'Potassium Hydroxide', formula: 'KOH', desc: 'Soap making.', atoms: [
            { element: 'K', position: [-0.9, 0, 0] },
            { element: 'O', position: [0.9, 0, 0] },
            { element: 'H', position: [1.5, 0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 1, endIdx: 2 }]
    },
    {
        inputs: ['Ca', 'O', 'H', 'O', 'H'], name: 'Calcium Hydroxide', formula: 'Ca(OH)2', desc: 'Limewater.', atoms: [
            { element: 'Ca', position: [0, 0, 0] },
            { element: 'O', position: [1.0, 0, 0] },
            { element: 'O', position: [-1.0, 0, 0] },
            { element: 'H', position: [1.6, 0.5, 0] },
            { element: 'H', position: [-1.6, -0.5, 0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 1, endIdx: 3 }, { startIdx: 2, endIdx: 4 }
        ]
    },

    // --- SALTS ---
    {
        inputs: ['Mg', 'Cl', 'Cl'], name: 'Magnesium Chloride', formula: 'MgCl2', desc: 'Ice melt.', atoms: [
            { element: 'Mg', position: [0, 0, 0] },
            { element: 'Cl', position: [1.2, 0.5, 0] },
            { element: 'Cl', position: [-1.2, -0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['K', 'Cl'], name: 'Potassium Chloride', formula: 'KCl', desc: 'Salt substitute.', atoms: [
            { element: 'K', position: [-0.8, 0, 0] },
            { element: 'Cl', position: [0.8, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Ca', 'Cl', 'Cl'], name: 'Calcium Chloride', formula: 'CaCl2', desc: 'Desiccant.', atoms: [
            { element: 'Ca', position: [0, 0, 0] },
            { element: 'Cl', position: [1.2, 0, 0] },
            { element: 'Cl', position: [-1.2, 0, 0] } // Linear
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['Na', 'F'], name: 'Sodium Fluoride', formula: 'NaF', desc: 'Toothpaste ingredient.', atoms: [
            { element: 'Na', position: [-0.7, 0, 0] },
            { element: 'F', position: [0.7, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },

    // --- ORGANICS ---
    {
        inputs: ['C', 'C', 'H', 'H', 'H', 'H', 'H', 'H'], name: 'Ethane', formula: 'C2H6', desc: 'Natural gas component.', atoms: [
            { element: 'C', position: [-0.5, 0, 0] },
            { element: 'C', position: [0.5, 0, 0] },
            { element: 'H', position: [-1.0, 0.8, 0] },
            { element: 'H', position: [-1.0, -0.8, 0] },
            { element: 'H', position: [-1.2, 0, 0.8] },
            { element: 'H', position: [1.0, 0.8, 0] },
            { element: 'H', position: [1.0, -0.8, 0] },
            { element: 'H', position: [1.2, 0, -0.8] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 },
            { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 },
            { startIdx: 1, endIdx: 5 }, { startIdx: 1, endIdx: 6 }, { startIdx: 1, endIdx: 7 }
        ]
    },
    {
        inputs: ['C', 'C', 'H', 'H', 'H', 'H', 'H', 'O', 'H'], name: 'Ethanol', formula: 'C2H5OH', desc: 'Drinking alcohol.', atoms: [
            { element: 'C', position: [-0.8, 0, 0] },
            { element: 'C', position: [0.2, 0, 0] },
            { element: 'O', position: [1.0, 0.6, 0.5] },
            { element: 'H', position: [-1.3, 0.8, 0] },
            { element: 'H', position: [-1.3, -0.8, 0] },
            { element: 'H', position: [-1.3, 0, 0.8] },
            { element: 'H', position: [0.2, -1.0, 0] },
            { element: 'H', position: [0.2, 0, -1.0] },
            { element: 'H', position: [1.6, 0.4, 0] } // OH H
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 1, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 }, { startIdx: 0, endIdx: 5 },
            { startIdx: 1, endIdx: 6 }, { startIdx: 1, endIdx: 7 },
            { startIdx: 2, endIdx: 8 }
        ]
    },
    {
        inputs: ['C', 'H', 'O', 'O', 'H'], name: 'Formic Acid', formula: 'HCOOH', desc: 'Ant venom.', atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'O', position: [0, 1.2, 0] }, // Double bond
            { element: 'O', position: [1.0, -0.5, 0] },
            { element: 'H', position: [-1.0, 0, 0] }, // C-H
            { element: 'H', position: [1.6, 0, 0] }   // O-H
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 },
            { startIdx: 2, endIdx: 4 }
        ]
    },

    // --- OTHER ---
    {
        inputs: ['O', 'O', 'O'], name: 'Ozone', formula: 'O3', desc: 'Protects from UV.', atoms: [
            { element: 'O', position: [0, 0.5, 0] },
            { element: 'O', position: [-0.9, -0.5, 0] },
            { element: 'O', position: [0.9, -0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['S', 'F', 'F', 'F', 'F', 'F', 'F'], name: 'Sulfur Hexafluoride', formula: 'SF6', desc: 'Heavy gas.', atoms: [
            { element: 'S', position: [0, 0, 0] },
            { element: 'F', position: [1.0, 0, 0] },
            { element: 'F', position: [-1.0, 0, 0] },
            { element: 'F', position: [0, 1.0, 0] },
            { element: 'F', position: [0, -1.0, 0] },
            { element: 'F', position: [0, 0, 1.0] },
            { element: 'F', position: [0, 0, -1.0] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 },
            { startIdx: 0, endIdx: 4 }, { startIdx: 0, endIdx: 5 }, { startIdx: 0, endIdx: 6 }
        ]
    },
    // --- OXIDES ---
    {
        inputs: ['Mg', 'O'], name: 'Magnesium Oxide', formula: 'MgO', desc: 'White powder, refractory.', atoms: [
            { element: 'Mg', position: [-0.6, 0, 0] },
            { element: 'O', position: [0.6, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Ca', 'O'], name: 'Calcium Oxide', formula: 'CaO', desc: 'Quicklime.', atoms: [
            { element: 'Ca', position: [-0.7, 0, 0] },
            { element: 'O', position: [0.7, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Li', 'Li', 'O'], name: 'Lithium Oxide', formula: 'Li2O', desc: 'Glass ceramic component.', atoms: [
            { element: 'O', position: [0, 0, 0] },
            { element: 'Li', position: [1.2, 0, 0] },
            { element: 'Li', position: [-1.2, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['N', 'O', 'O'], name: 'Nitrogen Dioxide', formula: 'NO2', desc: 'Brown smog gas.', atoms: [
            { element: 'N', position: [0, 0.2, 0] },
            { element: 'O', position: [1.1, -0.5, 0] },
            { element: 'O', position: [-1.1, -0.5, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['N', 'N', 'O'], name: 'Nitrous Oxide', formula: 'N2O', desc: 'Laughing gas.', atoms: [
            { element: 'N', position: [-1.2, 0, 0] },
            { element: 'N', position: [0, 0, 0] },
            { element: 'O', position: [1.2, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 1, endIdx: 2 }] // Linear N-N-O
    },
    {
        inputs: ['S', 'O', 'O', 'O'], name: 'Sulfur Trioxide', formula: 'SO3', desc: 'Precursor to sulfuric acid.', atoms: [
            { element: 'S', position: [0, 0, 0] },
            { element: 'O', position: [0, 1.4, 0] },
            { element: 'O', position: [1.2, -0.7, 0] },
            { element: 'O', position: [-1.2, -0.7, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }] // Trigonal planar
    },

    // --- FLUORIDES ---
    {
        inputs: ['H', 'F'], name: 'Hydrofluoric Acid', formula: 'HF', desc: 'Etches glass.', atoms: [
            { element: 'F', position: [0, 0, 0] },
            { element: 'H', position: [0.9, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Ca', 'F', 'F'], name: 'Calcium Fluoride', formula: 'CaF2', desc: 'Fluorite mineral.', atoms: [
            { element: 'Ca', position: [0, 0, 0] },
            { element: 'F', position: [1.2, 0, 0] },
            { element: 'F', position: [-1.2, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['B', 'F', 'F', 'F'], name: 'Boron Trifluoride', formula: 'BF3', desc: 'Lewis acid catalyst.', atoms: [
            { element: 'B', position: [0, 0, 0] },
            { element: 'F', position: [0, 1.4, 0] },
            { element: 'F', position: [1.2, -0.7, 0] },
            { element: 'F', position: [-1.2, -0.7, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }]
    },
    {
        inputs: ['Li', 'F'], name: 'Lithium Fluoride', formula: 'LiF', desc: 'UV transparent crystal.', atoms: [
            { element: 'Li', position: [-0.6, 0, 0] },
            { element: 'F', position: [0.6, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },

    // --- CHLORIDES ---
    {
        inputs: ['Li', 'Cl'], name: 'Lithium Chloride', formula: 'LiCl', desc: 'Red flame colorant.', atoms: [
            { element: 'Li', position: [-0.8, 0, 0] },
            { element: 'Cl', position: [0.8, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Be', 'Cl', 'Cl'], name: 'Beryllium Chloride', formula: 'BeCl2', desc: 'Linear molecule.', atoms: [
            { element: 'Be', position: [0, 0, 0] },
            { element: 'Cl', position: [1.4, 0, 0] },
            { element: 'Cl', position: [-1.4, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }]
    },
    {
        inputs: ['Al', 'Cl', 'Cl', 'Cl'], name: 'Aluminium Chloride', formula: 'AlCl3', desc: 'Deodorant ingredient.', atoms: [
            { element: 'Al', position: [0, 0, 0] },
            { element: 'Cl', position: [0, 1.6, 0] },
            { element: 'Cl', position: [1.4, -0.8, 0] },
            { element: 'Cl', position: [-1.4, -0.8, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 }, { startIdx: 0, endIdx: 3 }]
    },

    // --- HYDRIDES & OTHERS ---
    {
        inputs: ['Si', 'H', 'H', 'H', 'H'], name: 'Silane', formula: 'SiH4', desc: 'Pyrophoric gas.', atoms: [
            { element: 'Si', position: [0, 0, 0] },
            { element: 'H', position: [0.8, 0.8, 0.8] },
            { element: 'H', position: [-0.8, -0.8, 0.8] },
            { element: 'H', position: [-0.8, 0.8, -0.8] },
            { element: 'H', position: [0.8, -0.8, -0.8] }
        ], bonds: [
            { startIdx: 0, endIdx: 1 }, { startIdx: 0, endIdx: 2 },
            { startIdx: 0, endIdx: 3 }, { startIdx: 0, endIdx: 4 }
        ]
    },
    {
        inputs: ['Al', 'N'], name: 'Aluminium Nitride', formula: 'AlN', desc: 'Ceramic heatsink.', atoms: [
            { element: 'Al', position: [-0.7, 0, 0] },
            { element: 'N', position: [0.7, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['B', 'N'], name: 'Boron Nitride', formula: 'BN', desc: 'Lubricant.', atoms: [
            { element: 'B', position: [-0.65, 0, 0] },
            { element: 'N', position: [0.65, 0, 0] }
        ], bonds: [{ startIdx: 0, endIdx: 1 }]
    },
    {
        inputs: ['Ca', 'C', 'C'], name: 'Calcium Carbide', formula: 'CaC2', desc: 'Produces acetylene.', atoms: [
            { element: 'Ca', position: [0, 1.0, 0] },
            { element: 'C', position: [0, -0.5, 0] },
            { element: 'C', position: [0, -1.5, 0] }
        ], bonds: [{ startIdx: 1, endIdx: 2 }] // Ionic attraction between Ca and C2 group not drawn as covalent
    }
];

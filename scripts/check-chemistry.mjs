// Sanity check for the molecule constructor: every recipe must be buildable by adding its atoms one by one
// and pressing "Соединить", and the catalog must have consistent geometry data.
// Run: node scripts/check-chemistry.mjs
import { MOLECULES } from '../src/labs/chemistry/molecules.js';
import { ELEMENTS } from '../src/labs/chemistry/elements.js';
import { MAX_ATOMS, atomTotal, countAtoms, findExact, hillFormula, molarMass, suggestions } from '../src/labs/chemistry/match.js';

let problems = 0;
const fail = msg => {
    problems++;
    console.error('✗', msg);
};

const ids = new Set();
for (const m of MOLECULES) {
    if (ids.has(m.id)) fail(`duplicate id ${m.id}`);
    ids.add(m.id);

    // build it exactly like the teacher does: one atom at a time, in a shuffled order
    const symbols = Object.entries(m.comp).flatMap(([el, n]) => Array(n).fill(el)).reverse();
    if (symbols.length > MAX_ATOMS) fail(`${m.id}: ${symbols.length} atoms do not fit into the flask (max ${MAX_ATOMS})`);
    const hit = findExact(countAtoms(symbols));
    if (hit !== m) fail(`${m.id}: pressing "Соединить" with its atoms gives ${hit ? hit.id : 'nothing'}`);

    // every prefix of the build must still offer this molecule as a hint
    for (let k = 1; k < symbols.length; k++) {
        if (!suggestions(countAtoms(symbols.slice(0, k)), 200).some(s => s.mol === m)) fail(`${m.id}: not suggested after ${k} atoms`);
    }

    for (const a of m.atoms) if (!ELEMENTS[a.el]) fail(`${m.id}: unknown element ${a.el}`);
    for (const [i, j] of m.bonds) if (!m.atoms[i] || !m.atoms[j]) fail(`${m.id}: bond ${i}-${j} points to a missing atom`);
    for (const a of m.atoms) if (a.p.some(v => !Number.isFinite(v))) fail(`${m.id}: bad coordinates`);
    if (atomTotal(m.comp) !== m.atoms.filter(a => !a.x).length) fail(`${m.id}: composition does not match its atoms`);
    if (!m.facts?.length || !m.shape || !m.bond || !m.cls) fail(`${m.id}: missing text fields`);
}

console.log(`${MOLECULES.length} recipes checked.`);
console.log('Examples:', ['H2O', 'CO2', 'SO3', 'O3'].map(id => {
    const m = MOLECULES.find(x => x.id === id);
    return `${id} = ${hillFormula(m.comp)} (${molarMass(m.comp)} г/моль)`;
}).join('; '));
if (problems) {
    console.error(`${problems} problem(s) found`);
    process.exit(1);
}
console.log('OK: every recipe is reachable.');

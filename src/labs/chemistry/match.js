// Pure helpers for the molecule constructor: matching atoms to a recipe, hints, molar mass, formula formatting.
// Explicit .js extensions keep this module importable from plain Node (scripts/check-chemistry.mjs).
import { ELEMENTS } from './elements.js';
import { MOLECULES } from './molecules.js';

export const MAX_ATOMS = 16;

// Simple, well-known substances offered as a starting point when the flask is empty
export const EASY = ['H2O', 'CO2', 'NH3', 'CH4', 'NaCl', 'O2', 'HCl', 'C2H5OH'];

export const compKey = comp => Object.keys(comp).sort().map(k => `${k}${comp[k]}`).join(' ');
export const BY_KEY = new Map(MOLECULES.map(m => [compKey(m.comp), m]));
export const BY_ID = new Map(MOLECULES.map(m => [m.id, m]));

export function countAtoms(symbols) {
    const comp = {};
    for (const el of symbols) comp[el] = (comp[el] || 0) + 1;
    return comp;
}

export const findExact = comp => BY_KEY.get(compKey(comp)) ?? null;

export const atomTotal = comp => Object.values(comp).reduce((a, b) => a + b, 0);

export function molarMass(comp) {
    return Object.entries(comp).reduce((sum, [el, n]) => sum + ELEMENTS[el].ar * n, 0);
}

// Russian number format: comma as the decimal separator
export const formatNumber = (x, digits = 1) => {
    const s = Number.isInteger(x) ? String(x) : x.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
};

// Hill system: C first, then H, then the rest alphabetically (without carbon, everything is alphabetical)
export function hillFormula(comp) {
    const els = Object.keys(comp);
    const rest = els.filter(e => e !== 'C' && e !== 'H').sort();
    const order = comp.C ? ['C', ...(comp.H ? ['H'] : []), ...rest] : els.sort();
    return order.map(e => e + (comp[e] > 1 ? comp[e] : '')).join('');
}

// Splits "Ca(OH)2" into text and subscript parts: digits after a letter or ")" become subscripts
export function formulaParts(formula) {
    const parts = [];
    for (const m of formula.matchAll(/(\d+)|([^\d]+)/g)) {
        const prev = parts.length ? parts[parts.length - 1].t.slice(-1) : '';
        const sub = m[1] !== undefined && /[A-Za-z)]/.test(prev);
        parts.push({ t: m[0], sub });
    }
    return parts;
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻' };
// "2+" -> "²⁺", "-" -> "⁻"
export const chargeSup = q => (q ? [...String(q)].map(c => SUP[c] ?? c).join('') : '');

// Atoms still needed to build `target` from `have`, or null when `have` already contains something `target` lacks
export function missingFor(target, have) {
    const need = {};
    for (const el of Object.keys(have)) if (have[el] > (target[el] || 0)) return null;
    for (const el of Object.keys(target)) {
        const n = target[el] - (have[el] || 0);
        if (n > 0) need[el] = n;
    }
    return need;
}

// Molecules that can still be built from the current atoms, closest first; if there are none, the nearest ones
export function suggestions(have, limit = 6) {
    const total = atomTotal(have);
    if (total === 0) {
        return EASY.map(id => BY_ID.get(id)).filter(Boolean).slice(0, limit).map(mol => ({ mol, add: { ...mol.comp }, exact: false }));
    }
    const fits = [];
    for (const mol of MOLECULES) {
        const add = missingFor(mol.comp, have);
        if (add) fits.push({ mol, add, exact: atomTotal(add) === 0 });
    }
    if (fits.length) {
        fits.sort((a, b) => atomTotal(a.add) - atomTotal(b.add) || a.mol.name.localeCompare(b.mol.name, 'ru'));
        return fits.slice(0, limit);
    }
    // Nothing contains all of these atoms: show the molecules that share the most
    const near = MOLECULES.map(mol => {
        let shared = 0;
        for (const el of Object.keys(have)) shared += Math.min(have[el], mol.comp[el] || 0);
        return { mol, shared, add: null, exact: false };
    }).filter(x => x.shared > 0);
    near.sort((a, b) => b.shared - a.shared || atomTotal(a.mol.comp) - atomTotal(b.mol.comp));
    return near.slice(0, limit);
}

export const compText = comp => Object.entries(comp).map(([el, n]) => `${n > 1 ? `${n} ` : ''}${el}`).join(' + ');

// Elements available in the molecule constructor.
// row/col place them in the short-form (8-group) periodic table used in Russian schools:
// period 4 and 5 take two rows each (K Ca … Fe / Cu … Br), so I sits under Br.
// ar: relative atomic mass rounded as in school problems; r: covalent radius, Å; ionR: ionic radius, Å;
// color: CPK (Jmol) colors; en: Pauling electronegativity.
export const ELEMENTS = {
    H: { z: 1, name: 'Водород', ar: 1, color: '#ffffff', r: 0.31, en: 2.2, cat: 'nonmetal', row: 1, col: 1 },
    He: { z: 2, name: 'Гелий', ar: 4, color: '#d9ffff', r: 0.28, en: 0, cat: 'noble', row: 1, col: 8 },
    Li: { z: 3, name: 'Литий', ar: 7, color: '#cc80ff', r: 1.28, ionR: 0.76, en: 0.98, cat: 'metal', row: 2, col: 1 },
    Be: { z: 4, name: 'Бериллий', ar: 9, color: '#c2ff00', r: 0.96, ionR: 0.45, en: 1.57, cat: 'metal', row: 2, col: 2 },
    B: { z: 5, name: 'Бор', ar: 11, color: '#ffb5b5', r: 0.84, en: 2.04, cat: 'nonmetal', row: 2, col: 3 },
    C: { z: 6, name: 'Углерод', ar: 12, color: '#909090', r: 0.76, en: 2.55, cat: 'nonmetal', row: 2, col: 4 },
    N: { z: 7, name: 'Азот', ar: 14, color: '#3050f8', r: 0.71, ionR: 1.46, en: 3.04, cat: 'nonmetal', row: 2, col: 5 },
    O: { z: 8, name: 'Кислород', ar: 16, color: '#ff0d0d', r: 0.66, ionR: 1.4, en: 3.44, cat: 'nonmetal', row: 2, col: 6 },
    F: { z: 9, name: 'Фтор', ar: 19, color: '#90e050', r: 0.57, ionR: 1.33, en: 3.98, cat: 'nonmetal', row: 2, col: 7 },
    Ne: { z: 10, name: 'Неон', ar: 20, color: '#b3e3f5', r: 0.58, en: 0, cat: 'noble', row: 2, col: 8 },
    Na: { z: 11, name: 'Натрий', ar: 23, color: '#ab5cf2', r: 1.66, ionR: 1.02, en: 0.93, cat: 'metal', row: 3, col: 1 },
    Mg: { z: 12, name: 'Магний', ar: 24, color: '#8aff00', r: 1.41, ionR: 0.72, en: 1.31, cat: 'metal', row: 3, col: 2 },
    Al: { z: 13, name: 'Алюминий', ar: 27, color: '#bfa6a6', r: 1.21, ionR: 0.535, en: 1.61, cat: 'metal', row: 3, col: 3 },
    Si: { z: 14, name: 'Кремний', ar: 28, color: '#f0c8a0', r: 1.11, en: 1.9, cat: 'nonmetal', row: 3, col: 4 },
    P: { z: 15, name: 'Фосфор', ar: 31, color: '#ff8000', r: 1.07, en: 2.19, cat: 'nonmetal', row: 3, col: 5 },
    S: { z: 16, name: 'Сера', ar: 32, color: '#ffff30', r: 1.05, ionR: 1.84, en: 2.58, cat: 'nonmetal', row: 3, col: 6 },
    Cl: { z: 17, name: 'Хлор', ar: 35.5, color: '#1ff01f', r: 1.02, ionR: 1.81, en: 3.16, cat: 'nonmetal', row: 3, col: 7 },
    Ar: { z: 18, name: 'Аргон', ar: 40, color: '#80d1e3', r: 1.06, en: 0, cat: 'noble', row: 3, col: 8 },
    K: { z: 19, name: 'Калий', ar: 39, color: '#8f40d4', r: 2.03, ionR: 1.38, en: 0.82, cat: 'metal', row: 4, col: 1 },
    Ca: { z: 20, name: 'Кальций', ar: 40, color: '#3dff00', r: 1.76, ionR: 1.0, en: 1.0, cat: 'metal', row: 4, col: 2 },
    Fe: { z: 26, name: 'Железо', ar: 56, color: '#e06633', r: 1.32, ionR: 0.7, en: 1.83, cat: 'metal', row: 4, col: 8 },
    Cu: { z: 29, name: 'Медь', ar: 64, color: '#c88033', r: 1.32, ionR: 0.73, en: 1.9, cat: 'metal', row: 5, col: 1 },
    Br: { z: 35, name: 'Бром', ar: 80, color: '#a62929', r: 1.2, ionR: 1.96, en: 2.96, cat: 'nonmetal', row: 5, col: 7 },
    I: { z: 53, name: 'Иод', ar: 127, color: '#940094', r: 1.39, ionR: 2.2, en: 2.66, cat: 'nonmetal', row: 6, col: 7 },
};

export const CATEGORIES = {
    metal: { label: 'металлы', one: 'металл', color: '#f59e0b' },
    nonmetal: { label: 'неметаллы', one: 'неметалл', color: '#22d3ee' },
    noble: { label: 'благородные газы', one: 'благородный газ', color: '#a78bfa' },
};

export const GROUPS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

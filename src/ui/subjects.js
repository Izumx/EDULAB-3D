// The laboratories shown in the menu: colour, emblem id, grades, and the modes a card can open directly (#lab/mode).
export const SUBJECTS = [
    {
        id: 'chemistry', title: 'Химия', color: 'var(--chem)', hex: '#22d3ee', grades: '8–11 класс',
        desc: 'Собирайте молекулы из атомов и проводите реакции',
        modes: [{ id: 'build', label: 'Конструктор молекул' }, { id: 'react', label: 'Реакции' }],
    },
    {
        id: 'biology', title: 'Биология', color: 'var(--bio)', hex: '#4ade80', grades: '5–10 класс',
        desc: 'Клетка изнутри, ДНК и деление клетки',
        modes: [{ id: 'animal', label: 'Клетка' }, { id: 'dna', label: 'ДНК' }, { id: 'mitosis', label: 'Митоз' }],
    },
    {
        id: 'physics', title: 'Физика', color: 'var(--phys)', hex: '#fbbf24', grades: '7–9 класс',
        desc: 'Сила тяжести на разных планетах и опыт Галилея',
        tags: ['Падение тел', 'Опыт Галилея'],
    },
    {
        id: 'cosmos', title: 'Космос', color: 'var(--cosmos)', hex: '#a78bfa', grades: '5–11 класс',
        desc: 'Солнечная система и фазы Луны',
        modes: [{ id: 'visual', label: 'Планеты' }, { id: 'real', label: 'Масштаб' }, { id: 'moon', label: 'Фазы Луны' }],
    },
    {
        id: 'math', title: 'Математика', color: 'var(--math)', hex: '#60a5fa', grades: '5–11 класс',
        desc: 'Объёмные тела, развёртки и чертежи',
        modes: [{ id: 'solids', label: 'Тела и развёртки' }, { id: 'views', label: 'Виды' }],
    },
    {
        id: 'geo', title: 'География', color: 'var(--geo)', hex: '#fb923c', grades: '5–8 класс',
        desc: 'Глобус, координаты и смена времён года',
        modes: [{ id: 'globe', label: 'Глобус' }, { id: 'seasons', label: 'Времена года' }],
    },
    {
        id: 'quiz', title: 'Викторина', color: 'var(--quiz)', hex: '#f472b6', grades: 'Весь класс',
        desc: 'Командная игра с вопросами по всем предметам',
        tags: ['6 тем', 'Команды', 'Таймер'],
    },
];

export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

// Round building and scoring helpers for the class quiz.
import { QUESTIONS, TOPICS, MIXED } from './questions.js';

export const LETTERS = ['А', 'Б', 'В', 'Г'];
export const TIMER_SECONDS = 20;
export const TEAMS = [
    { id: 'red', label: 'Красные', color: '#f87171' },
    { id: 'blue', label: 'Синие', color: '#60a5fa' },
];

export const topicById = (id) => TOPICS.find(t => t.id === id) || MIXED;

export function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Questions already asked this session: a new round prefers fresh ones
const seen = new Set();

function pickFresh(pool, count) {
    const fresh = shuffle(pool.filter(q => !seen.has(q)));
    const old = shuffle(pool.filter(q => seen.has(q)));
    if (fresh.length < count) pool.forEach(q => seen.delete(q));
    return [...fresh, ...old].slice(0, count);
}

// Shuffle the answer options, keeping track of where the correct one ends up
function shuffleOptions(item, topicId) {
    const order = shuffle([0, 1, 2, 3]);
    return {
        q: item.q,
        explain: item.explain,
        topic: topicId,
        options: order.map(i => item.options[i]),
        correct: order.indexOf(item.correct),
    };
}

export function buildRound(topicId, count) {
    let picked;
    if (topicId === MIXED.id) {
        // Even spread across topics: take round-robin from each topic's fresh questions
        const each = Math.ceil(count / TOPICS.length);
        const per = TOPICS.map(t => pickFresh(QUESTIONS[t.id], each).map(item => ({ item, topic: t.id })));
        const mixed = [];
        for (let i = 0; mixed.length < count && i < count; i++) {
            per.forEach(list => { if (list[i] && mixed.length < count) mixed.push(list[i]); });
        }
        picked = shuffle(mixed);
    } else {
        picked = pickFresh(QUESTIONS[topicId], count).map(item => ({ item, topic: topicId }));
    }
    picked.forEach(p => seen.add(p.item));
    return picked.map(p => shuffleOptions(p.item, p.topic));
}

export function resultTitle(correct, total) {
    const pct = total ? correct / total : 0;
    if (pct === 1) return { icon: 'brain', title: 'Гении науки!', note: 'Ни одной ошибки — блестяще!' };
    if (pct >= 0.8) return { icon: 'trophy', title: 'Настоящие знатоки!', note: 'Почти идеально.' };
    if (pct >= 0.6) return { icon: 'rocket', title: 'Отличный полёт!', note: 'Хороший результат, так держать.' };
    if (pct >= 0.4) return { icon: 'telescope', title: 'Юные исследователи', note: 'Неплохо! Есть что повторить.' };
    return { icon: 'flask', title: 'Опыты продолжаются!', note: 'Загляните в лаборатории и попробуйте ещё раз.' };
}

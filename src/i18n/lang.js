// Interface language: Russian (default) or Kazakh. Strings stay written in Russian in the code;
// tr('Меню') looks the phrase up in the Kazakh dictionary when Kazakh is on, and falls back to Russian.
import { useCallback, useSyncExternalStore } from 'react';
import { KK } from './kk';

const KEY = 'edulab_lang_v1';
export const LANGS = [
    { id: 'ru', label: 'РУС' },
    { id: 'kk', label: 'ҚАЗ' },
];

function load() {
    try {
        return localStorage.getItem(KEY) === 'kk' ? 'kk' : 'ru';
    } catch {
        return 'ru';
    }
}

let lang = load();
const listeners = new Set();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;

export function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: keep it for this visit only */ }
    document.documentElement.lang = next;
    listeners.forEach(l => l());
}

const subscribe = l => {
    listeners.add(l);
    return () => listeners.delete(l);
};

export const useLang = () => useSyncExternalStore(subscribe, getLang);

// Translate one phrase for a language. "Known phrase: details" keeps the details as they are (error messages).
export function trFor(l, ru) {
    if (l !== 'kk' || typeof ru !== 'string') return ru;
    if (KK[ru]) return KK[ru];
    const cut = ru.indexOf(': ');
    return cut > 0 && KK[ru.slice(0, cut)] ? `${KK[ru.slice(0, cut)]}${ru.slice(cut)}` : ru;
}

// In components: const tr = useTr(); tr('Меню')
export function useTr() {
    const l = useLang();
    return useCallback(ru => trFor(l, ru), [l]);
}

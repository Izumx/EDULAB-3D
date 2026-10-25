// Teacher-adjustable hand control settings, persisted per browser.
import { useSyncExternalStore } from 'react';

const KEY = 'edulab_hand_settings_v1';

const DEFAULTS = {
    cameraEnabled: false, // remembered so the camera starts automatically next lesson
    sensitivity: 'medium', // how much of the camera frame maps to the whole screen
    dwellMs: 1000,         // hold the cursor on a button this long to press it (0 = off)
    showPreview: true,
};

// Central part of the camera frame that maps to the full screen. Smaller box = less arm movement needed.
export const SENSITIVITY_REGIONS = {
    low: { x0: 0.12, x1: 0.88, y0: 0.08, y1: 0.85 },
    medium: { x0: 0.22, x1: 0.78, y0: 0.15, y1: 0.72 },
    high: { x0: 0.3, x1: 0.7, y0: 0.22, y1: 0.62 },
};

function load() {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
        return { ...DEFAULTS };
    }
}

let current = load();
const subs = new Set();

export function getHandSettings() {
    return current;
}

export function setHandSettings(patch) {
    current = { ...current, ...patch };
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        // storage blocked: settings just won't persist
    }
    subs.forEach(fn => fn());
}

export function useHandSettings() {
    return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn); }, getHandSettings);
}

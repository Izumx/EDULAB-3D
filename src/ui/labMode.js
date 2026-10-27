// The current mode of a lab lives after a slash in the URL hash (#chemistry/react), so a menu card can open a mode
// directly and a page refresh keeps it. replaceState does not fire 'hashchange', so the lab is not remounted.
export function initialLabMode(fallback, allowed) {
    const part = window.location.hash.slice(1).split('/')[1];
    return allowed.includes(part) ? part : fallback;
}

export function rememberLabMode(mode) {
    const lab = window.location.hash.slice(1).split('/')[0];
    if (lab) window.history.replaceState(null, '', `#${lab}/${mode}`);
}

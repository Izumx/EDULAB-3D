// Subject emblems and the EduLab logo, drawn as inline SVG (crisp on a projector, no image files, works offline).
// Each emblem is a rounded tile in the subject colour with a white, two-tone pictogram.
import React, { useId } from 'react';
import { SUBJECT_BY_ID } from './subjects';

const W = '#ffffff';
const SOFT = 'rgba(255,255,255,0.55)';

function Chemistry({ dark }) {
    return (
        <>
            {/* liquid, then the flask outline over it */}
            <path d="M21.6 38 L17.4 45.2 a4.4 4.4 0 0 0 3.8 6.6 h21.6 a4.4 4.4 0 0 0 3.8 -6.6 L42.4 38 Z" fill={W} />
            <circle cx="28" cy="45" r="2.2" fill={dark} />
            <circle cx="35.5" cy="42.5" r="1.6" fill={dark} />
            <circle cx="33" cy="33" r="1.8" fill={SOFT} />
            <circle cx="30" cy="27" r="1.2" fill={SOFT} />
            <path d="M28 13.5 V26 L17.4 45.2 a4.4 4.4 0 0 0 3.8 6.6 h21.6 a4.4 4.4 0 0 0 3.8 -6.6 L36 26 V13.5" fill="none" stroke={W} strokeWidth="3.4" strokeLinejoin="round" />
            <path d="M24.5 13 H39.5" stroke={W} strokeWidth="3.4" strokeLinecap="round" />
        </>
    );
}

function Biology() {
    return (
        <>
            <path d="M24 17 H40 M26 22.5 H38 M26 41.5 H38 M24 47 H40" stroke={SOFT} strokeWidth="3" strokeLinecap="round" />
            <path d="M42 12 C42 22 22 22 22 32 S42 42 42 52" fill="none" stroke={SOFT} strokeWidth="3.6" strokeLinecap="round" />
            <path d="M22 12 C22 22 42 22 42 32 S22 42 22 52" fill="none" stroke={W} strokeWidth="3.6" strokeLinecap="round" />
        </>
    );
}

function Physics() {
    return (
        <>
            {/* a falling apple and the arrow of gravity */}
            <path d="M28 22 c-4 -3 -13 -3 -15 6 c-2 9 4 20 10 20 c2 0 3 -1 5 -1 s3 1 5 1 c6 0 12 -11 10 -20 c-2 -9 -11 -9 -15 -6 z" fill={W} />
            <path d="M28 22 q0.5 -5 3.5 -8" fill="none" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M30 17.5 q5 -6 11 -3.5 q-5 6 -11 3.5 z" fill={SOFT} />
            <path d="M51.5 23 V46 M46 40.5 L51.5 46.5 L57 40.5" fill="none" stroke={W} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
    );
}

function Cosmos({ dark }) {
    return (
        <>
            <g transform="rotate(-20 31 35)">
                <path d="M9.5 35 A21.5 6.8 0 0 1 52.5 35" fill="none" stroke={SOFT} strokeWidth="3" />
            </g>
            <circle cx="31" cy="35" r="12" fill={W} />
            <path d="M20 31.5 q11 3 22 0" fill="none" stroke={dark} strokeOpacity="0.35" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M19.6 37.5 q11.4 3 22.8 0" fill="none" stroke={dark} strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
            <g transform="rotate(-20 31 35)">
                <path d="M9.5 35 A21.5 6.8 0 0 0 52.5 35" fill="none" stroke={W} strokeWidth="3" />
            </g>
            <path d="M49 8.5 L50.6 13.4 L55.5 15 L50.6 16.6 L49 21.5 L47.4 16.6 L42.5 15 L47.4 13.4 Z" fill={W} />
            <circle cx="15" cy="15" r="1.7" fill={SOFT} />
        </>
    );
}

function Math_({ dark }) {
    return (
        <>
            {/* an isometric cube: three shaded faces */}
            <path d="M32 12 L50 22.5 L32 33 L14 22.5 Z" fill={W} />
            <path d="M14 22.5 L32 33 V54 L14 43.5 Z" fill={SOFT} />
            <path d="M50 22.5 L32 33 V54 L50 43.5 Z" fill="rgba(255,255,255,0.8)" />
            <path d="M32 12 L50 22.5 V43.5 L32 54 L14 43.5 V22.5 Z M14 22.5 L32 33 L50 22.5 M32 33 V54" fill="none" stroke={dark} strokeOpacity="0.55" strokeWidth="1.6" strokeLinejoin="round" />
        </>
    );
}

function Geo({ dark }) {
    return (
        <>
            <circle cx="32" cy="32" r="19" fill={W} />
            <path d="M24 20 c4 2 6 6 3 9 c-3 3 -8 1 -10 4 c-1 -5 1 -10 7 -13 z M36 33 c5 -1 9 2 9 6 c0 4 -4 8 -8 7 c-3 -1 -1 -4 -3 -7 c-1 -2 -1 -5 2 -6 z" fill={dark} fillOpacity="0.32" />
            <ellipse cx="32" cy="32" rx="8" ry="19" fill="none" stroke={dark} strokeOpacity="0.5" strokeWidth="1.8" />
            <path d="M13 32 H51 M16 22.5 H48 M16 41.5 H48 M32 13 V51" stroke={dark} strokeOpacity="0.45" strokeWidth="1.8" />
            <circle cx="32" cy="32" r="19" fill="none" stroke={W} strokeWidth="2.4" />
        </>
    );
}

function Quiz({ dark }) {
    return (
        <>
            <path d="M22 17 H17 a5.5 5.5 0 0 0 5.5 9.5 M42 17 H47 a5.5 5.5 0 0 1 -5.5 9.5" fill="none" stroke={SOFT} strokeWidth="3" strokeLinecap="round" />
            <path d="M21.5 13 H42.5 V24 a10.5 10.5 0 0 1 -21 0 Z" fill={W} />
            <rect x="29.6" y="34" width="4.8" height="8" fill={W} />
            <rect x="22.5" y="42" width="19" height="6" rx="2.2" fill={W} />
            <path d="M32 17.6 L33.6 21 L37.2 21.4 L34.5 23.8 L35.3 27.4 L32 25.6 L28.7 27.4 L29.5 23.8 L26.8 21.4 L30.4 21 Z" fill={dark} fillOpacity="0.6" />
        </>
    );
}

const GLYPHS = { chemistry: Chemistry, biology: Biology, physics: Physics, cosmos: Cosmos, math: Math_, geo: Geo, quiz: Quiz };

// darker shade of a hex colour (for the tile gradient and pictogram details)
function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.round(c * k).toString(16).padStart(2, '0');
    return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** Subject emblem: <Emblem id="chemistry" />. Size follows the font size unless `size` is given. */
export function Emblem({ id, size, title }) {
    const uid = useId().replace(/:/g, '');
    const subject = SUBJECT_BY_ID[id];
    const Glyph = GLYPHS[id];
    if (!subject || !Glyph) return null;
    const base = subject.hex;
    const dark = shade(base, 0.42);
    return (
        <svg viewBox="0 0 64 64" width={size ?? '1em'} height={size ?? '1em'} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
            {title && <title>{title}</title>}
            <defs>
                <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={base} />
                    <stop offset="1" stopColor={shade(base, 0.62)} />
                </linearGradient>
            </defs>
            <rect x="1" y="1" width="62" height="62" rx="17" fill={`url(#g${uid})`} />
            <rect x="1" y="1" width="62" height="31" rx="17" fill="#ffffff" fillOpacity="0.1" />
            <Glyph dark={dark} />
        </svg>
    );
}

/** EduLab logo: an isometric cube in three subject colours with an electron orbit around it. */
export function Logo({ size = 44 }) {
    return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
            <path d="M32 9 L51 20 L32 31 L13 20 Z" fill="#22d3ee" />
            <path d="M13 20 L32 31 V53 L13 42 Z" fill="#a78bfa" />
            <path d="M51 20 L32 31 V53 L51 42 Z" fill="#4ade80" />
            <path d="M32 9 L51 20 V42 L32 53 L13 42 V20 Z M13 20 L32 31 L51 20 M32 31 V53" fill="none" stroke="#0b1426" strokeWidth="1.6" strokeLinejoin="round" />
            <ellipse cx="32" cy="32" rx="29" ry="10" fill="none" stroke="#fbbf24" strokeWidth="2.6" transform="rotate(-24 32 32)" strokeDasharray="70 8" />
            <circle cx="56" cy="21.5" r="3.4" fill="#fbbf24" />
        </svg>
    );
}

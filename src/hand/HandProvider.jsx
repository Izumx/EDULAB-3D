// App-wide hand control: starts the tracker, draws the cursor, and turns hand gestures into clicks.
//   - Hold the cursor on any button for `dwellMs` -> click (a progress ring fills up).
//   - Grab (pinch or fist) on a button -> instant click.
//   - Grab on a slider and move -> drags the slider.
//   - 3D objects registered with <HandPointer/> (userData.handTarget) behave like buttons too.
import React, { useEffect, useRef } from 'react';
import { hand, onHand, useHandStatus, emitHand } from './handStore';
import { startTracker, stopTracker, getVideoStream } from './tracker';
import { useHandSettings, getHandSettings } from './settings';
import './hand.css';

const CLICKABLE = 'button:not(:disabled), a[href], [role="button"], [data-hand-click], input[type="range"]';
const RING = 2 * Math.PI * 30;
const UNLOCK_DISTANCE = 60; // px the cursor must move after a click before dwell can click again

function findTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const dom = el.closest(CLICKABLE);
    if (dom) return { key: dom, el: dom, label: null };
    if (el.tagName === 'CANVAS' && hand.hover3d) {
        return { key: hand.hover3d.id, three: hand.hover3d, label: hand.hover3d.label };
    }
    return null;
}

function activate(target) {
    if (target.three) target.three.onSelect?.();
    else if (target.el.tagName !== 'INPUT') target.el.click();
    emitHand('click', target);
}

// React tracks input values through a patched setter, so set the native value then fire 'input'.
function setRangeFromX(input, x) {
    const rect = input.getBoundingClientRect();
    const min = Number(input.min || 0), max = Number(input.max || 100), step = Number(input.step || 1);
    const t = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
    const value = Math.round((min + t * (max - min)) / step) * step;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function HandCursor() {
    const cursorRef = useRef(null);
    const ringRef = useRef(null);
    const labelRef = useRef(null);

    useEffect(() => {
        let raf;
        let hovered = null;      // current target
        let dwellStart = 0;
        // After a click, dwell is locked until the cursor moves away. Otherwise a button that is
        // re-rendered/re-enabled (or a new one appearing in the same spot) would get clicked again.
        let lockedAt = null;
        let dragRange = null;

        const setHovered = (t) => {
            if (hovered?.el) hovered.el.classList.remove('hand-hover');
            hovered = t;
            if (t?.el) t.el.classList.add('hand-hover');
            dwellStart = performance.now();
        };

        const fire = (t) => {
            activate(t);
            lockedAt = { x: hand.x, y: hand.y };
            cursorRef.current?.classList.add('pulse');
            setTimeout(() => cursorRef.current?.classList.remove('pulse'), 300);
        };

        const offGrab = onHand('grabstart', () => {
            const t = findTarget(hand.x, hand.y);
            if (!t) return;
            if (t.el?.matches('input[type="range"]')) {
                dragRange = t.el;
                return;
            }
            fire(t); // a grab is deliberate, so it clicks even while dwell is locked
        });
        const offRelease = onHand('grabend', () => { dragRange = null; });

        const loop = () => {
            raf = requestAnimationFrame(loop);
            const cursor = cursorRef.current;
            if (!cursor) return;

            if (!hand.present) {
                cursor.classList.add('hidden');
                if (hovered) setHovered(null);
                lockedAt = null;
                return;
            }
            if (lockedAt && Math.hypot(hand.x - lockedAt.x, hand.y - lockedAt.y) > UNLOCK_DISTANCE) {
                lockedAt = null;
                dwellStart = performance.now();
            }
            cursor.classList.remove('hidden');
            cursor.style.transform = `translate(${hand.x}px, ${hand.y}px)`;
            cursor.classList.toggle('grabbing', hand.grabbing);

            if (dragRange) setRangeFromX(dragRange, hand.x);

            const t = findTarget(hand.x, hand.y);
            if ((t?.key ?? null) !== (hovered?.key ?? null)) setHovered(t);
            cursor.classList.toggle('over-target', !!t);
            labelRef.current.textContent = t?.label || '';

            const { dwellMs } = getHandSettings();
            const canDwell = t && dwellMs > 0 && !lockedAt && !hand.grabbing
                && !t.el?.matches('input[type="range"], [data-hand-nodwell]');
            const progress = canDwell ? Math.min(1, (performance.now() - dwellStart) / dwellMs) : 0;
            ringRef.current.style.strokeDashoffset = String(RING * (1 - progress));
            if (canDwell && progress >= 1) fire(t);
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            offGrab();
            offRelease();
            if (hovered?.el) hovered.el.classList.remove('hand-hover');
        };
    }, []);

    return (
        <div ref={cursorRef} className="hand-cursor hidden" aria-hidden="true">
            <svg width="72" height="72" viewBox="0 0 72 72">
                <circle className="hand-cursor-track" cx="36" cy="36" r="30" />
                <circle ref={ringRef} className="hand-cursor-progress" cx="36" cy="36" r="30"
                    strokeDasharray={RING} strokeDashoffset={RING} />
            </svg>
            <div className="hand-cursor-dot" />
            <div ref={labelRef} className="hand-cursor-label" />
        </div>
    );
}

const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

function CameraPreview() {
    const { status, error, present } = useHandStatus();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (status !== 'ready' || !videoRef.current) return;
        videoRef.current.srcObject = getVideoStream();
        let raf;
        const draw = () => {
            raf = requestAnimationFrame(draw);
            const c = canvasRef.current;
            if (!c) return;
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, c.width, c.height);
            const lm = hand.landmarks;
            if (!lm) return;
            ctx.strokeStyle = hand.grabbing ? '#fbbf24' : '#22d3ee';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (const [a, b] of BONES) {
                ctx.moveTo((1 - lm[a].x) * c.width, lm[a].y * c.height);
                ctx.lineTo((1 - lm[b].x) * c.width, lm[b].y * c.height);
            }
            ctx.stroke();
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [status]);

    if (status === 'off') return null;

    return (
        <div className={`camera-preview hand-ui ${status}`}>
            {status === 'ready' && (
                <div className="camera-preview-video">
                    <video ref={videoRef} autoPlay muted playsInline />
                    <canvas ref={canvasRef} width={320} height={180} />
                </div>
            )}
            <div className="camera-preview-status">
                {status === 'loading' && <>⏳ Запускаю камеру…</>}
                {status === 'ready' && (present
                    ? <><span className="dot ok" /> Рука найдена</>
                    : <><span className="dot wait" /> Покажите ладонь камере</>)}
                {status === 'error' && <>⚠️ {error}</>}
            </div>
            {status === 'error' && (
                <button className="btn btn-small" onClick={() => startTracker()}>Повторить</button>
            )}
        </div>
    );
}

export function HandProvider({ children }) {
    const { cameraEnabled, showPreview } = useHandSettings();

    useEffect(() => {
        if (!cameraEnabled) return;
        startTracker();
        return () => stopTracker();
    }, [cameraEnabled]);

    return (
        <>
            {children}
            <HandCursor />
            {cameraEnabled && showPreview && <CameraPreview />}
        </>
    );
}


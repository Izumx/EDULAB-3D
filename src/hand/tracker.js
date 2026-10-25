// Single app-wide webcam + MediaPipe Gesture Recognizer.
// Everything (WASM + model) is served from this app, so it works on school networks that block CDNs.
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import { hand, emitHand } from './handStore';
import { OneEuroFilter } from './oneEuro';
import { getHandSettings, SENSITIVITY_REGIONS } from './settings';

const MODEL_URL = `${import.meta.env.BASE_URL}models/gesture_recognizer.task`;

// Pinch = thumb tip to index tip, divided by palm size so it works at any distance from the camera.
// Hysteresis (different on/off thresholds) stops flicker at the boundary.
const PINCH_ON = 0.32;
const PINCH_OFF = 0.48;
const FIST_SCORE = 0.6;
const STABLE_FRAMES = 2;      // frames a grab state must hold before it switches
const LOST_GRACE_MS = 250;    // keep the cursor this long after the hand disappears

let video = null;
let stream = null;
let recognizer = null;
let recognizerPromise = null;
let generation = 0;
let running = false;
let lastVideoTime = -1;
let lastSeen = 0;
let grabCandidate = false;
let grabFrames = 0;
let lastX = 0, lastY = 0, lastT = 0;

const fx = new OneEuroFilter({ minCutoff: 1.2, beta: 0.01 });
const fy = new OneEuroFilter({ minCutoff: 1.2, beta: 0.01 });

function setStatus(status, error = null) {
    hand.status = status;
    hand.error = error;
    emitHand('status', status);
}

export function getVideoStream() {
    return stream;
}

async function createRecognizer(delegate) {
    // Loaded on demand: the menu opens faster, and the library is only needed once the camera is switched on
    const { GestureRecognizer } = await import('@mediapipe/tasks-vision');
    // Self-hosted fileset (bundled by Vite, version-locked to the JS package) instead of FilesetResolver's CDN default
    const fileset = { wasmLoaderPath, wasmBinaryPath };
    return GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        // Lower detection confidence helps when the teacher stands 2-3 m away and the hand is small in frame
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
    });
}

function cameraErrorMessage(err) {
    if (!navigator.mediaDevices?.getUserMedia) return 'Браузер не даёт доступ к камере. Откройте приложение через https или localhost.';
    if (err?.name === 'NotAllowedError') return 'Доступ к камере запрещён. Разрешите камеру в адресной строке браузера.';
    if (err?.name === 'NotFoundError') return 'Камера не найдена. Подключите веб-камеру.';
    if (err?.name === 'NotReadableError') return 'Камера занята другой программой (Zoom, Teams…). Закройте её и попробуйте снова.';
    return `Не удалось запустить распознавание руки: ${err?.message || err}`;
}

export async function startTracker() {
    if (running || hand.status === 'loading') return;
    const myGen = ++generation; // a stopTracker() during the awaits below cancels this start
    setStatus('loading');
    try {
        recognizerPromise ??= createRecognizer('GPU').catch(() => createRecognizer('CPU'));
        recognizer = await recognizerPromise;
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false,
        });
        if (myGen !== generation) {
            newStream.getTracks().forEach(t => t.stop());
            return;
        }
        stream = newStream;
        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        if (myGen !== generation) return;
        running = true;
        setStatus('ready');
        scheduleNext();
    } catch (err) {
        if (myGen !== generation) return;
        console.error('Hand tracker failed to start:', err);
        recognizerPromise = recognizer ? recognizerPromise : null; // allow retrying a failed model load
        stopTracker();
        setStatus('error', cameraErrorMessage(err));
    }
}

export function stopTracker() {
    generation++;
    running = false;
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    video = null;
    markLost();
    if (hand.status !== 'error') setStatus('off');
}

function scheduleNext() {
    if (!running || !video) return;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick);
    else requestAnimationFrame(tick);
}

function markLost() {
    if (hand.grabbing) setGrab(false);
    if (hand.present) {
        hand.present = false;
        hand.landmarks = null;
        hand.hover3d = null;
        hand.vx = hand.vy = 0;
        fx.reset();
        fy.reset();
        emitHand('presence', false);
    }
}

function setGrab(value) {
    hand.grabbing = value;
    if (value) {
        hand.grabOverUI = isOverUI(hand.x, hand.y);
        emitHand('grabstart', { x: hand.x, y: hand.y, overUI: hand.grabOverUI });
    } else {
        emitHand('grabend', { x: hand.x, y: hand.y, vx: hand.vx, vy: hand.vy, overUI: hand.grabOverUI });
        hand.grabOverUI = false;
    }
}

function isOverUI(x, y) {
    const el = document.elementFromPoint(x, y);
    return !!el && el.tagName !== 'CANVAS' && !!el.closest('button, a, input, [data-hand], .panel, .hand-ui');
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);
const clamp01 = v => Math.min(1, Math.max(0, v));

function tick() {
    if (!running || !video) return;
    const now = performance.now();

    if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        let result = null;
        try {
            result = recognizer.recognizeForVideo(video, now);
        } catch (err) {
            console.warn('Gesture recognition frame failed:', err);
        }

        const lm = result?.landmarks?.[0];
        if (lm) {
            lastSeen = now;
            update(lm, result.gestures?.[0]?.[0], now);
        } else if (hand.present && now - lastSeen > LOST_GRACE_MS) {
            markLost();
        }
    }
    scheduleNext();
}

function update(lm, topGesture, now) {
    const region = SENSITIVITY_REGIONS[getHandSettings().sensitivity] || SENSITIVITY_REGIONS.medium;

    // Anchor on the index + middle knuckles: they stay still while the fingers pinch, unlike the fingertip.
    const ax = (lm[5].x + lm[9].x) / 2;
    const ay = (lm[5].y + lm[9].y) / 2;
    const mx = 1 - clamp01((ax - region.x0) / (region.x1 - region.x0)); // mirror: camera is a selfie view
    const my = clamp01((ay - region.y0) / (region.y1 - region.y0));

    const w = window.innerWidth, h = window.innerHeight;
    const x = fx.filter(mx * w, now);
    const y = fy.filter(my * h, now);

    const dt = Math.max((now - lastT) / 1000, 1e-3);
    if (hand.present) {
        hand.vx = hand.vx * 0.6 + ((x - lastX) / dt) * 0.4;
        hand.vy = hand.vy * 0.6 + ((y - lastY) / dt) * 0.4;
    }
    lastX = x; lastY = y; lastT = now;

    hand.x = x;
    hand.y = y;
    hand.nx = (x / w) * 2 - 1;
    hand.ny = -(y / h) * 2 + 1;
    hand.landmarks = lm;
    hand.gesture = topGesture?.categoryName || 'None';

    if (!hand.present) {
        hand.present = true;
        emitHand('presence', true);
    }

    // Grab = pinch OR closed fist (a fist is easier to see from the back of the room)
    const palm = dist(lm[0], lm[9]) || 1e-3;
    const pinch = dist(lm[4], lm[8]) / palm;
    const fist = topGesture?.categoryName === 'Closed_Fist' && topGesture.score > FIST_SCORE;
    const wantGrab = fist || (hand.grabbing ? pinch < PINCH_OFF : pinch < PINCH_ON);

    if (wantGrab !== hand.grabbing) {
        grabFrames = wantGrab === grabCandidate ? grabFrames + 1 : 1;
        grabCandidate = wantGrab;
        if (grabFrames >= STABLE_FRAMES) {
            grabFrames = 0;
            setGrab(wantGrab);
        }
    } else {
        grabFrames = 0;
    }
}

// 3D solar system: Sun, 8 planets, the Moon, orbits, starfield and a camera rig with smooth flights.
// Everything per-frame lives in one useFrame (positions, scale morph, camera, labels) for coherence and speed.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { hand, onHand } from '../../hand/handStore';
import { BODIES, BODY_BY_ID, J2000_MS, lerpScale } from './bodies';
import { getTexture, getGlowTexture, getHaloTexture } from './textures';

const ACCENT = '#a78bfa';
const DEG = Math.PI / 180;
const ORBIT_CAP = (Math.PI * 2) / 0.8;   // never faster than one orbit per 0.8 s (avoids strobing)
const OVERVIEW_ELEV = 28 * DEG;
const SUN = BODY_BY_ID.sun;
const NEPTUNE = BODY_BY_ID.neptune;

// ---------- shared geometry / materials ----------
const SPHERE = new THREE.SphereGeometry(1, 64, 48);
const PROXY_GEO = new THREE.SphereGeometry(1, 16, 12);
const PROXY_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

const CIRCLE = (() => {
    const pts = [];
    for (let i = 0; i < 360; i++) {
        const a = (i / 360) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
})();

// Saturn's rings: radial UVs so the 1D ring texture maps from inner to outer edge (in planet radii)
const RING_INNER = 1.176, RING_OUTER = 2.34;
const RING_GEO = (() => {
    const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, 160, 1);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - RING_INNER) / (RING_OUTER - RING_INNER), 0.5);
    }
    return g;
})();

const ATMO_VERT = /* glsl */`
    varying float vRim;
    varying float vLit;
    void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vRim = dot(n, normalize(-mv.xyz));
        vec3 sunView = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vLit = dot(n, normalize(sunView - mv.xyz));
        gl_Position = projectionMatrix * mv;
    }`;
const ATMO_FRAG = /* glsl */`
    uniform vec3 uColor;
    uniform float uIntensity;
    varying float vRim;
    varying float vLit;
    void main() {
        float t = clamp(-vRim / 0.33, 0.0, 1.0);
        float a = pow(t, 1.6) * smoothstep(-0.35, 0.5, vLit) * uIntensity;
        gl_FragColor = vec4(uColor * a, a);
    }`;

const STAR_VERT = /* glsl */`
    attribute float size;
    attribute float phase;
    attribute vec3 color;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    void main() {
        vColor = color * (0.78 + 0.22 * sin(uTime * 1.3 + phase));
        vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        p.z = p.w * 0.9999999; // pin to the far plane: everything else occludes the stars
        gl_Position = p;
        gl_PointSize = size * uPixelRatio;
    }`;
const STAR_FRAG = /* glsl */`
    varying vec3 vColor;
    void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * a, a);
    }`;

function makeStars(count = 2600) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const size = new Float32Array(count), phase = new Float32Array(count);
    let s = 12345;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.8], [1, 0.8, 0.7]];
    for (let i = 0; i < count; i++) {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u);
        pos.set([q * Math.cos(a), u, q * Math.sin(a)], i * 3);
        const b = Math.pow(r(), 3);
        const t = tints[Math.floor(r() * tints.length)];
        const k = 0.35 + 0.65 * b;
        col.set([t[0] * k, t[1] * k, t[2] * k], i * 3);
        size[i] = 1.2 + b * 3.2;
        phase[i] = r() * 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    return g;
}

function getSky() {
    const t = getTexture('stars.jpg');
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
}

// ---------- helpers ----------
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const radiusAt = (b, k) => lerpScale(b.visual.r, b.real.r, k);
const distAt = (b, k) => lerpScale(b.visual.d, b.real.d, k);
const systemSize = k => distAt(NEPTUNE, k) * 1.05;
const refSize = (id, k) => (id ? radiusAt(BODY_BY_ID[id], k) : systemSize(k));
function viewDist(id, k) {
    if (!id) return systemSize(k) * 1.2;
    const r = radiusAt(BODY_BY_ID[id], k);
    if (id === 'sun') return r * 3.6;
    if (id === 'saturn') return r * 5.4;
    return r * 3.3;
}
const minDist = (id, k) => (id ? radiusAt(BODY_BY_ID[id], k) * (id === 'saturn' ? 2.6 : 1.3) : radiusAt(SUN, k) * 3);
// Illustrative spin speed (rad/s): faster for short days, compressed so nothing becomes a blur
const spinRate = b => (b.spinHours ? 0.35 * Math.pow(24 / b.spinHours, 0.35) : 0);

const LABEL_PRIORITY = ['sun', 'jupiter', 'saturn', 'earth', 'uranus', 'neptune', 'mars', 'venus', 'mercury', 'moon'];

// ---------- components ----------
function Atmosphere({ color, intensity, scale = 1.06 }) {
    const mat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
    }), [color, intensity]);
    return <mesh geometry={SPHERE} material={mat} scale={scale} />;
}

function Body({ body, selected, hovered, selectable, onSelect, onHover, register, children }) {
    const isSun = body.kind === 'star';
    const map = getTexture(body.texture);
    const target = selectable && !selected
        ? { id: `cosmos-${body.id}`, label: body.name, onSelect: () => onSelect(body.id) }
        : undefined;

    return (
        <group ref={o => register(body.id, 'pos', o)}>
            <group ref={o => register(body.id, 'size', o)}>
                <group rotation={[-body.tilt * DEG, 0, 0]}>
                    <mesh ref={o => register(body.id, 'spin', o)} geometry={SPHERE}>
                        {isSun
                            ? <meshBasicMaterial map={map} color={[1.55, 1.3, 1.05]} toneMapped={false} />
                            : <meshStandardMaterial map={map} roughness={0.95} metalness={0} />}
                    </mesh>
                    {body.clouds && (
                        <mesh ref={o => register(body.id, 'clouds', o)} geometry={SPHERE} scale={1.012}>
                            <meshStandardMaterial alphaMap={getTexture(body.clouds, { color: false })}
                                color="#ffffff" transparent depthWrite={false} roughness={1} />
                        </mesh>
                    )}
                    {body.ring && (
                        <mesh geometry={RING_GEO} rotation={[-Math.PI / 2, 0, 0]}>
                            <meshBasicMaterial map={getTexture(body.ring)} color="#e9e2d2" side={THREE.DoubleSide}
                                transparent depthWrite={false} />
                        </mesh>
                    )}
                    {body.atmosphere && <Atmosphere {...body.atmosphere} scale={body.id === 'earth' ? 1.07 : 1.06} />}
                </group>
                <group position={[0, body.ring ? 1.15 : 1.25, 0]}>
                    <Html pointerEvents="none" zIndexRange={[5, 0]}>
                        <div ref={el => register(body.id, 'label', el)} className="cosmos-tag" style={{ opacity: 0 }}>
                            <span className="cosmos-tag-name" style={{ '--tag-color': body.color }}>{body.name}</span>
                            <span className="cosmos-tag-stem" />
                        </div>
                    </Html>
                </group>
            </group>
            {target && (
                <mesh ref={o => register(body.id, 'proxy', o)} geometry={PROXY_GEO} material={PROXY_MAT}
                    userData={{ handTarget: target }}
                    onClick={e => { e.stopPropagation(); if (e.delta < 8) onSelect(body.id); }}
                    onPointerOver={e => { e.stopPropagation(); onHover(body.id, true); }}
                    onPointerOut={() => onHover(body.id, false)} />
            )}
            {isSun && (
                <>
                    <sprite ref={o => register(body.id, 'glow1', o)}>
                        <spriteMaterial map={getGlowTexture()} color="#ffd9a0" blending={THREE.AdditiveBlending}
                            transparent depthWrite={false} toneMapped={false} />
                    </sprite>
                    <sprite ref={o => register(body.id, 'glow2', o)}>
                        <spriteMaterial map={getGlowTexture()} color="#ff9a40" opacity={0.45}
                            blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
                    </sprite>
                </>
            )}
            <sprite ref={o => register(body.id, 'halo', o)} visible={!!(hovered && target)}>
                <spriteMaterial map={getHaloTexture()} color={ACCENT} transparent depthWrite={false} toneMapped={false} />
            </sprite>
            {children}
        </group>
    );
}

function OrbitLine({ id, highlighted, register, visible = true }) {
    return (
        <lineLoop ref={o => register(id, 'orbit', o)} geometry={CIRCLE} visible={visible}>
            <lineBasicMaterial color={highlighted ? ACCENT : '#9fb3d9'} transparent
                opacity={highlighted ? 0.85 : 0.22} depthWrite={false} />
        </lineLoop>
    );
}

function Starfield({ register }) {
    const geo = useMemo(() => makeStars(), []);
    const mat = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
    }), []);
    return <points ref={o => register('stars', 'points', o)} geometry={geo} material={mat} frustumCulled={false} />;
}

/**
 * props: selectedId (null = overview), flyKey (changes -> fly to selection), speedDays (sim days per second),
 * realScale (bool), onSelect(id), rig (ref: { zoomSeq, zoomDir }), hud (ref: { date: HTMLElement })
 */
export default function SolarScene({ selectedId, flyKey, speedDays, realScale, onSelect, rig, hud }) {
    const [hoverId, setHoverId] = useState(null);
    const nodes = useRef({});
    const st = useRef(null);

    const register = useCallback((id, part, obj) => {
        (nodes.current[id] ??= {})[part] = obj;
    }, []);

    const onHover = useCallback((id, on) => {
        setHoverId(cur => (on ? id : cur === id ? null : cur));
        document.body.style.cursor = on ? 'pointer' : '';
    }, []);

    // Hand hover highlight + "grab in empty space orbits the camera"
    useEffect(() => {
        const offHover = onHand('hover3d', t => {
            setHoverId(t?.id?.startsWith('cosmos-') ? t.id.slice(7) : null);
        });
        const offStart = onHand('grabstart', () => {
            const s = st.current;
            if (!s || hand.grabOverUI || hand.hover3d) return;
            s.handActive = true;
            s.lastX = hand.x;
            s.lastY = hand.y;
        });
        const offEnd = onHand('grabend', () => { if (st.current) st.current.handActive = false; });
        return () => {
            offHover(); offStart(); offEnd();
            document.body.style.cursor = '';
        };
    }, []);

    useEffect(() => {
        if (st.current) st.current.pendingFly = { id: selectedId };
    }, [selectedId, flyKey]);

    useFrame((state, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const { camera, controls, scene } = state;
        const N = nodes.current;
        if (!controls) return;

        // ---- one-time init ----
        if (!st.current) {
            const days = (Date.now() - J2000_MS) / 864e5;
            const angle = {}, spin = {};
            for (const b of BODIES) {
                angle[b.id] = b.periodDays ? (b.L0 * DEG + (2 * Math.PI * days) / b.periodDays) % (Math.PI * 2) : 0;
                spin[b.id] = Math.random() * Math.PI * 2;
            }
            st.current = {
                days, angle, spin, kLin: realScale ? 1 : 0, k: realScale ? 1 : 0,
                targetId: null, flight: null, zoomGoal: null, zoomSeq: rig.current.zoomSeq,
                prevRef: null, vel: new THREE.Vector2(), handActive: false, lastX: 0, lastY: 0,
                hudT: 0, labelT: 0, time: 0,
                pendingFly: { id: selectedId, instant: true },
            };
            scene.backgroundIntensity = 0.42;
            scene.backgroundRotation.set(1.05, 0, 0.35);
        }
        const s = st.current;
        s.time += dt;

        // ---- scale morph (visual <-> real) ----
        s.kLin = clamp(s.kLin + (realScale ? dt : -dt) / 2.4, 0, 1);
        const k = smoother(s.kLin);
        s.k = k;

        // ---- simulation time ----
        s.days += speedDays * dt;
        const spinBoost = speedDays === 0 ? 0 : 1 + Math.log10(speedDays / 2) * 0.6;
        for (const b of BODIES) {
            if (b.periodDays) s.angle[b.id] += Math.min((2 * Math.PI / b.periodDays) * speedDays, ORBIT_CAP) * dt;
            s.spin[b.id] += spinRate(b) * spinBoost * dt;
        }

        // ---- place bodies ----
        for (const b of BODIES) {
            const n = N[b.id];
            if (!n?.pos) continue;
            const r = radiusAt(b, k);
            if (b.kind !== 'star') {
                const d = distAt(b, k), a = s.angle[b.id];
                n.pos.position.set(Math.cos(a) * d, 0, -Math.sin(a) * d);
                n.orbit?.scale.setScalar(d);
            }
            n.size.scale.setScalar(r);
            if (b.kind === 'moon') n.spin.rotation.y = s.angle[b.id] + Math.PI; // tidally locked
            else n.spin.rotation.y = s.spin[b.id];
            if (n.clouds) n.clouds.rotation.y = s.spin[b.id] * 1.15;
        }

        // ---- camera ----
        const controlsTarget = controls.target;
        if (s.pendingFly) {
            const { id, instant } = s.pendingFly;
            s.pendingFly = null;
            const dest = worldPos(N, id, new THREE.Vector3());
            const fromDir = camera.position.clone().sub(controlsTarget);
            const fromDist = fromDir.length() || 1;
            fromDir.normalize();
            let toDir;
            if (!id || id === 'sun') {
                const az = Math.atan2(fromDir.x, fromDir.z);
                const elev = id ? 18 * DEG : OVERVIEW_ELEV;
                toDir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
                if (instant) toDir.set(Math.sin(-0.5) * Math.cos(elev), Math.sin(elev), Math.cos(-0.5) * Math.cos(elev));
            } else {
                const sunward = dest.clone().negate().setY(0).normalize();
                if (BODY_BY_ID[id].kind === 'moon') sunward.copy(worldPos(N, 'earth', new THREE.Vector3()).negate().setY(0).normalize());
                toDir = sunward.applyAxisAngle(THREE.Object3D.DEFAULT_UP, 38 * DEG).add(new THREE.Vector3(0, 0.24, 0)).normalize();
            }
            if (instant) {
                controlsTarget.copy(dest);
                camera.position.copy(dest).addScaledVector(toDir, viewDist(id, k));
                s.targetId = id;
                s.prevRef = refSize(id, k);
            } else {
                const travel = controlsTarget.distanceTo(dest);
                const ratio = Math.abs(Math.log10(fromDist / viewDist(id, k)));
                s.flight = {
                    id, t: 0,
                    dur: clamp(1.4 + 0.35 * ratio + 0.25 * Math.log10(1 + travel / Math.max(fromDist, 1e-6)), 1.4, 4.2),
                    fromTarget: controlsTarget.clone(), fromDir, fromDist, toDir, travel,
                    q: new THREE.Quaternion().setFromUnitVectors(fromDir, toDir),
                };
                controls.enabled = false;
            }
            s.zoomGoal = null;
            s.vel.set(0, 0);
        }

        const look = TMP.look;
        if (s.flight) {
            const f = s.flight;
            f.t += dt;
            const e = Math.min(1, f.t / f.dur);
            const dest = worldPos(N, f.id, TMP.dest);
            look.lerpVectors(f.fromTarget, dest, easeOut(Math.min(1, e * 1.5)));
            const eD = smoother(e);
            const toDist = viewDist(f.id, k);
            const dist = Math.exp(Math.log(f.fromDist) * (1 - eD) + Math.log(toDist) * eD)
                + Math.pow(Math.sin(Math.PI * e), 1.3) * f.travel * 0.35;
            TMP.q.identity().slerp(f.q, eD);
            TMP.dir.copy(f.fromDir).applyQuaternion(TMP.q);
            camera.position.copy(look).addScaledVector(TMP.dir, dist);
            controlsTarget.copy(look);
            if (e >= 1) {
                s.flight = null;
                s.targetId = f.id;
                s.prevRef = refSize(f.id, k);
                controls.enabled = true;
            }
        } else {
            worldPos(N, s.targetId, look);
            const off = TMP.off.copy(camera.position).sub(controlsTarget);
            // keep the framing while the scale morphs
            const ref = refSize(s.targetId, k);
            if (s.prevRef) off.multiplyScalar(ref / s.prevRef);
            s.prevRef = ref;

            // hand orbit: grab in empty space + move
            if (s.handActive && hand.present && hand.grabbing) {
                s.vel.set((hand.x - s.lastX) * 0.006, (hand.y - s.lastY) * 0.006);
                s.lastX = hand.x;
                s.lastY = hand.y;
            } else {
                if (!hand.grabbing) s.handActive = false;
                s.vel.multiplyScalar(Math.pow(0.04, dt));
            }
            if (s.vel.lengthSq() > 1e-10) {
                TMP.sph.setFromVector3(off);
                TMP.sph.theta -= s.vel.x;
                TMP.sph.phi = clamp(TMP.sph.phi - s.vel.y, 0.08, Math.PI - 0.08);
                off.setFromSpherical(TMP.sph);
            }

            // zoom buttons
            const lo = minDist(s.targetId, k), hi = systemSize(k) * 3;
            const r = rig.current;
            if (r.zoomSeq !== s.zoomSeq) {
                s.zoomSeq = r.zoomSeq;
                s.zoomGoal = clamp((s.zoomGoal ?? off.length()) * (r.zoomDir > 0 ? 0.6 : 1 / 0.6), lo, hi);
            }
            if (s.zoomGoal) {
                const len = off.length();
                off.setLength(len + (s.zoomGoal - len) * (1 - Math.exp(-dt * 6)));
                if (Math.abs(s.zoomGoal - len) / s.zoomGoal < 0.003) s.zoomGoal = null;
            }
            controls.minDistance = lo;
            controls.maxDistance = hi;
            controlsTarget.copy(look);
            camera.position.copy(look).add(off);
        }
        camera.lookAt(controlsTarget);

        // dynamic clipping planes: the real scale spans ~6 orders of magnitude
        const camDist = camera.position.distanceTo(controlsTarget);
        const near = clamp(camDist * 0.01, 0.003, 5000);
        const far = camDist + systemSize(k) * 3;
        if (Math.abs(camera.near - near) / near > 0.01 || Math.abs(camera.far - far) / far > 0.01) {
            camera.near = near;
            camera.far = far;
            camera.updateProjectionMatrix();
        }

        // ---- per-body screen-size helpers: hit proxies, halos, sun glow ----
        for (const b of BODIES) {
            const n = N[b.id];
            if (!n?.pos) continue;
            const p = n.pos.getWorldPosition(TMP.p);
            const d = p.distanceTo(camera.position);
            const r = radiusAt(b, k);
            const pick = Math.max(r * 1.15, d * 0.035);
            n.proxy?.scale.setScalar(pick);
            n.halo?.scale.setScalar(pick * 2.6);
            if (b.kind === 'star') {
                n.glow1.scale.setScalar(Math.max(r * 3.2, d * 0.03));
                n.glow2.scale.setScalar(Math.max(r * 9, d * 0.09));
            }
        }

        // ---- labels (declutter every few frames) ----
        s.labelT -= dt;
        if (s.labelT <= 0) {
            s.labelT = 0.08;
            updateLabels(N, s, k, camera, state.size);
        }

        // ---- stars + HUD ----
        const stars = N.stars?.points;
        if (stars) {
            stars.material.uniforms.uTime.value = s.time;
            stars.material.uniforms.uPixelRatio.value = state.viewport.dpr;
        }
        s.hudT -= dt;
        if (s.hudT <= 0 && hud.current?.date) {
            s.hudT = 0.1;
            hud.current.date.textContent = new Date(J2000_MS + s.days * 864e5)
                .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    });

    const sky = getSky();
    const earthFocus = selectedId === 'earth' || selectedId === 'moon';

    return (
        <>
            <primitive attach="background" object={sky} />
            <Starfield register={register} />
            <ambientLight intensity={0.14} />
            <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} distance={0} />
            <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08}
                rotateSpeed={0.6} zoomSpeed={0.9} />

            {BODIES.filter(b => b.kind === 'planet').map(b => (
                <OrbitLine key={b.id} id={b.id} register={register} highlighted={selectedId === b.id} />
            ))}

            {BODIES.filter(b => b.kind !== 'moon').map(b => (
                <Body key={b.id} body={b} register={register} onSelect={onSelect} onHover={onHover}
                    selected={selectedId === b.id} hovered={hoverId === b.id} selectable>
                    {b.id === 'earth' && (
                        <>
                            <OrbitLine id="moon" register={register} visible={earthFocus} highlighted={selectedId === 'moon'} />
                            <Body body={BODY_BY_ID.moon} register={register} onSelect={onSelect} onHover={onHover}
                                selected={selectedId === 'moon'} hovered={hoverId === 'moon'} selectable={earthFocus} />
                        </>
                    )}
                </Body>
            ))}
        </>
    );
}

const TMP = {
    look: new THREE.Vector3(), dest: new THREE.Vector3(), off: new THREE.Vector3(), dir: new THREE.Vector3(),
    p: new THREE.Vector3(), q: new THREE.Quaternion(), sph: new THREE.Spherical(),
};

function worldPos(N, id, out) {
    const g = id && N[id]?.pos;
    if (!g) return out.set(0, 0, 0);
    return g.getWorldPosition(out);
}

const placed = [];
function updateLabels(N, s, k, camera, size) {
    placed.length = 0;
    const flying = !!s.flight;
    const real = k > 0.5;
    for (const id of LABEL_PRIORITY) {
        const n = N[id];
        const el = n?.label;
        if (!el) continue;
        let show = !flying && id !== s.targetId;
        if (id === 'moon') show = show && (s.targetId === 'earth' || s.targetId === 'moon');
        if (show) {
            const v = n.size.getWorldPosition(TMP.p);
            v.y += radiusAt(BODY_BY_ID[id], k) * 1.25;
            v.project(camera);
            if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) show = false;
            else {
                const x = (v.x + 1) * 0.5 * size.width, y = (1 - v.y) * 0.5 * size.height;
                for (const q of placed) {
                    if (Math.abs(q[0] - x) < 105 && Math.abs(q[1] - y) < 36) { show = false; break; }
                }
                if (show) placed.push([x, y]);
            }
        }
        el.style.opacity = show ? '1' : '0';
        el.classList.toggle('is-real', real);
    }
}

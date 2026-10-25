import React, { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useHandStatus } from '../hand/handStore';
import { useHandSettings, setHandSettings } from '../hand/settings';
import { startTracker } from '../hand/tracker';
import './Dashboard.css';

const MODULES = [
    { id: 'chemistry', title: 'Химия', icon: '🧪', desc: 'Собирайте молекулы из атомов', color: 'var(--chem)' },
    { id: 'biology', title: 'Биология', icon: '🧬', desc: 'Клетка, органоиды и ДНК', color: 'var(--bio)' },
    { id: 'physics', title: 'Физика', icon: '🍎', desc: 'Гравитация и движение тел', color: 'var(--phys)' },
    { id: 'cosmos', title: 'Космос', icon: '🪐', desc: 'Путешествие по Солнечной системе', color: 'var(--cosmos)' },
    { id: 'quiz', title: 'Викторина', icon: '🏆', desc: 'Проверка знаний всем классом', color: 'var(--quiz)' },
];

const SENSITIVITY = [['low', 'Низкая'], ['medium', 'Средняя'], ['high', 'Высокая']];
const DWELL = [[0, 'Выкл'], [700, '0,7 с'], [1000, '1 с'], [1500, '1,5 с']];

function SlowStars() {
    const ref = React.useRef();
    useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.01; });
    return <group ref={ref}><Stars radius={80} depth={60} count={4000} factor={4} fade speed={0.6} /></group>;
}

function CameraControl() {
    const settings = useHandSettings();
    const { status, error, present } = useHandStatus();
    const [open, setOpen] = useState(false);

    const label = !settings.cameraEnabled ? 'Управление руками выключено'
        : status === 'loading' ? 'Запускаю камеру…'
            : status === 'error' ? 'Ошибка камеры'
                : present ? 'Рука найдена' : 'Покажите ладонь камере';

    return (
        <div className="camera-control">
            <div className={`camera-state ${settings.cameraEnabled ? status : 'off'} ${present ? 'present' : ''}`}>
                <span className="dot" />
                {label}
            </div>
            {settings.cameraEnabled ? (
                <button className="btn" onClick={() => setHandSettings({ cameraEnabled: false })}>Выключить камеру</button>
            ) : (
                <button className="btn btn-primary" onClick={() => setHandSettings({ cameraEnabled: true })}>✋ Включить управление руками</button>
            )}
            <button className={`btn btn-icon ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)} title="Настройки" aria-label="Настройки">⚙️</button>

            {open && (
                <div className="settings-panel panel">
                    <div className="panel-title">Чувствительность</div>
                    <p className="muted small">Чем выше, тем меньше нужно двигать рукой. Высокая — если стоите далеко.</p>
                    <div className="segmented">
                        {SENSITIVITY.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.sensitivity === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ sensitivity: value })}>{text}</button>
                        ))}
                    </div>
                    <div className="panel-title">Нажатие задержкой руки</div>
                    <div className="segmented">
                        {DWELL.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.dwellMs === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ dwellMs: value })}>{text}</button>
                        ))}
                    </div>
                    <div className="panel-title">Окно камеры</div>
                    <div className="segmented">
                        <button className={`btn btn-small ${settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: true })}>Показывать</button>
                        <button className={`btn btn-small ${!settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: false })}>Скрыть</button>
                    </div>
                    {status === 'error' && (
                        <div className="settings-error">
                            <p>{error}</p>
                            <button className="btn btn-small" onClick={() => startTracker()}>Повторить</button>
                        </div>
                    )}
                    <p className="muted small privacy">
                        Видео с камеры обрабатывается только на этом компьютере и никуда не отправляется.
                        Библиотека MediaPipe (Google) может отправлять обезличенную статистику работы.
                    </p>
                </div>
            )}
        </div>
    );
}

export const Dashboard = ({ onOpen }) => (
    <div className="dashboard">
        <div className="dashboard-bg">
            <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 1.5]}>
                <SlowStars />
            </Canvas>
        </div>

        <header className="dashboard-top">
            <div className="brand">
                <img src="/favicon.svg" alt="" width="44" height="44" />
                <span>EduLab <b>3D</b></span>
            </div>
            <CameraControl />
        </header>

        <main className="dashboard-main">
            <h1 className="dashboard-heading">Выберите лабораторию</h1>
            <div className="module-grid">
                {MODULES.map(m => (
                    <button key={m.id} className="module-card" style={{ '--accent': m.color }} onClick={() => onOpen(m.id)}>
                        <span className="module-icon" aria-hidden="true">{m.icon}</span>
                        <span className="module-title">{m.title}</span>
                        <span className="module-desc">{m.desc}</span>
                    </button>
                ))}
                <div className="module-card help-card">
                    <span className="module-title">Как управлять руками</span>
                    <ul>
                        <li><span>🖐️</span> Ведите ладонью — двигается курсор</li>
                        <li><span>⏱️</span> Задержите курсор на кнопке — она нажмётся</li>
                        <li><span>🤏</span> Щипок или <span>✊</span> кулак — схватить, вращать, нажать сразу</li>
                    </ul>
                </div>
            </div>
        </main>
    </div>
);

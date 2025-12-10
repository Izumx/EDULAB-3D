import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Float, PerspectiveCamera, Environment } from '@react-three/drei';
import { useUser } from '../context/UserContext';
import './Dashboard.css';

// Background 3D Scene
const DashboardScene = () => {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 20]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#4400ff" />
            <pointLight position={[-10, -10, 10]} intensity={1} color="#00ffff" />

            <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="city" />

            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* Abstract floating shapes for depth */}
                <mesh position={[-15, 5, -10]} rotation={[0, 0.5, 0]}>
                    <icosahedronGeometry args={[2, 0]} />
                    <meshStandardMaterial color="#00ffff" wireframe opacity={0.1} transparent />
                </mesh>
                <mesh position={[15, -5, -15]} rotation={[0.5, 0, 0]}>
                    <torusKnotGeometry args={[2, 0.5, 100, 16]} />
                    <meshStandardMaterial color="#ff00ff" wireframe opacity={0.1} transparent />
                </mesh>
            </Float>
        </>
    );
};

export const Dashboard = ({ setMode }) => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('overview'); // overview, social, profile

    const MODULES = [
        { id: 'chemistry', title: 'Chemistry Lab', icon: '🧪', desc: 'Build 3D Molecules', color: 'var(--chem-color)' },
        { id: 'biology', title: 'Biology Lab', icon: '🧬', desc: 'Explore Life & Cells', color: 'var(--bio-color)' },
        { id: 'physics', title: 'Physics Lab', icon: '🍎', desc: 'Gravity & Motion', color: '#ffaa00' },
        { id: 'cosmos', title: 'Cosmos Lab', icon: '🪐', desc: 'Solar System Tour', color: 'var(--cosmos-color)' },
        { id: 'quiz', title: 'Knowledge Quiz', icon: '🧠', desc: 'Test Your Skills', color: 'var(--quiz-color)' }
    ];

    const BADGES = [
        { id: 'first_login', icon: '🚀', name: 'Explorer', desc: 'Started the journey' },
        { id: 'chem_master', icon: '⚗️', name: 'Alchemist', desc: 'Created 5 molecules' },
        { id: 'quiz_ace', icon: '🏆', name: 'Quiz Master', desc: 'Scored 100%' }
    ];

    return (
        <div className="dashboard-container">
            {/* 3D Background Layer */}
            <div className="dashboard-bg">
                <Canvas>
                    <Suspense fallback={null}>
                        <DashboardScene />
                    </Suspense>
                </Canvas>
            </div>

            {/* Content Layer */}
            <div className="dashboard-content">

                {/* SIDEBAR */}
                <aside className="dash-sidebar">
                    <div className="logo-container">
                        <div className="logo-icon">💠</div>
                        <div className="logo-text">EduLab <span>3D</span></div>
                    </div>

                    <nav>
                        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                            <span className="icon">🏠</span> <span className="label">Overview</span>
                        </button>
                        <button className={activeTab === 'social' ? 'active' : ''} onClick={() => setActiveTab('social')}>
                            <span className="icon">👥</span> <span className="label">Social</span>
                        </button>
                        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
                            <span className="icon">👤</span> <span className="label">Profile</span>
                        </button>
                    </nav>

                    <div className="user-profile-widget">
                        <div className="avatar-ring">
                            <div className="avatar">👤</div>
                        </div>
                        <div className="user-info">
                            <h4>{user.name}</h4>
                            <div className="xp-bar">
                                <div className="fill" style={{ width: `${(user.xp % 100)}%` }}></div>
                            </div>
                            <small>Lvl {user.level} • {user.xp} XP</small>
                        </div>
                    </div>
                </aside>

                {/* MAIN AREA */}
                <main className="dash-main">
                    <header className="dash-header">
                        <div className="welcome-text">
                            <h1>Hello, {user.name}</h1>
                            <p>Ready to explore science today?</p>
                        </div>
                        <div className="streak-widget">
                            <span className="fire">🔥</span>
                            <div className="streak-info">
                                <strong>{user.streak} Days</strong>
                                <small>Streak</small>
                            </div>
                        </div>
                    </header>

                    <div className="dash-scroll-area">
                        {activeTab === 'overview' && (
                            <div className="overview-view">
                                <section className="modules-section">
                                    <h2>Learning Modules</h2>
                                    <div className="modules-grid-premium">
                                        {MODULES.map((mod, index) => (
                                            <div
                                                key={mod.id}
                                                className="module-card-premium"
                                                style={{ '--accent-color': mod.color, animationDelay: `${index * 0.1}s` }}
                                                onClick={() => setMode(mod.id)}
                                            >
                                                <div className="card-bg-glow"></div>
                                                <div className="mod-icon-large">{mod.icon}</div>
                                                <div className="mod-details">
                                                    <h3>{mod.title}</h3>
                                                    <p>{mod.desc}</p>
                                                    <div className="mod-action">Enter Lab →</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="stats-section">
                                    <h2>Quick Stats</h2>
                                    <div className="stats-grid-mini">
                                        <div className="stat-box">
                                            <div className="label">Total XP</div>
                                            <div className="val">{user.xp}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="label">Badges</div>
                                            <div className="val">{user.badges.length}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="label">Rank</div>
                                            <div className="val">#4</div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="profile-view">
                                <div className="profile-header-card">
                                    <div className="ph-avatar">👤</div>
                                    <div className="ph-info">
                                        <h2>{user.name}</h2>
                                        <p>Science Enthusiast</p>
                                        <div className="ph-badges-row">
                                            {user.badges.map(b => <span key={b.id} title={b.name}>{b.icon}</span>)}
                                        </div>
                                    </div>
                                </div>

                                <h3>Achievements Checklist</h3>
                                <div className="badges-grid-premium">
                                    {BADGES.map((badge, i) => {
                                        const isUnlocked = user.badges.some(b => b.id === badge.id) || i === 0;
                                        return (
                                            <div key={badge.id} className={`badge-card-premium ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                                <div className="badge-icon-large">{badge.icon}</div>
                                                <div className="badge-meta">
                                                    <h4>{badge.name}</h4>
                                                    <p>{badge.desc}</p>
                                                </div>
                                                {isUnlocked ? <div className="status-icon">✓</div> : <div className="status-icon">🔒</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === 'social' && (
                            <div className="social-view">
                                <h3>Global Leaderboard</h3>
                                <div className="leaderboard-premium">
                                    {[
                                        { rank: 1, name: 'Alice', xp: 2500, avatar: '👩‍🔬' },
                                        { rank: 2, name: 'Bob', xp: 2100, avatar: '👨‍🚀' },
                                        { rank: 3, name: 'Charlie', xp: 1800, avatar: '👨‍🔬' },
                                        { rank: 4, name: `${user.name} (You)`, xp: user.xp, avatar: '👤', isMe: true },
                                        { rank: 5, name: 'Diana', xp: 900, avatar: '👩‍🚀' }
                                    ].map((player) => (
                                        <div key={player.rank} className={`lb-row ${player.rank <= 3 ? 'top-rank' : ''} ${player.isMe ? 'me' : ''}`}>
                                            <div className="lb-rank">{player.rank}</div>
                                            <div className="lb-avatar">{player.avatar}</div>
                                            <div className="lb-name">{player.name}</div>
                                            <div className="lb-xp">{player.xp} XP</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

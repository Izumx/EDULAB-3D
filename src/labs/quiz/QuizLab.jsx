// Class quiz for the projector: the teacher picks a topic, points at answer tiles with the hand
// (dwell or grab), the app reveals the answer with an explanation. Optional timer and two-team mode.
import React, { useEffect, useRef, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import Confetti from './Confetti';
import { TOPICS, MIXED } from './questions';
import { LETTERS, TEAMS, TIMER_SECONDS, buildRound, resultTitle, topicById } from './quizLogic';
import './quiz.css';

const SETTINGS_KEY = 'edulab_quiz_settings_v1';
const COUNTS = [5, 10, 15];
const TILE_COLORS = ['#a78bfa', '#22d3ee', '#fbbf24', '#f472b6'];
// Buttons ignore the hand for a moment after each screen change, so a hand resting where
// the previous button was doesn't dwell-click the new one
const LOCK_MS = 800;
const BG_SYMBOLS = ['⚛', '🧬', '🪐', '⚗️', '🍎', '🔬', '☀️', '🌙', '💡', '🧪'];

function loadSettings() {
    const defaults = { count: 10, timer: false, teams: false };
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
        return defaults;
    }
}

function Background() {
    return (
        <div className="quiz-bg" aria-hidden="true">
            <span className="quiz-orb o1" />
            <span className="quiz-orb o2" />
            <span className="quiz-orb o3" />
            {BG_SYMBOLS.map((s, i) => (
                <span key={i} className="quiz-float" style={{
                    left: `${(i * 97) % 100}%`,
                    animationDelay: `${-i * 2.7}s`,
                    animationDuration: `${22 + (i % 4) * 5}s`,
                    fontSize: `${2 + (i % 3) * 0.9}rem`,
                }}>{s}</span>
            ))}
        </div>
    );
}

function TimerRing({ left }) {
    const r = 42;
    const c = 2 * Math.PI * r;
    const urgent = left <= 5;
    return (
        <div className={`quiz-timer${urgent ? ' urgent' : ''}`}>
            <svg viewBox="0 0 100 100">
                <circle className="quiz-timer-track" cx="50" cy="50" r={r} />
                <circle className="quiz-timer-bar" cx="50" cy="50" r={r}
                    strokeDasharray={c} strokeDashoffset={c * (1 - left / TIMER_SECONDS)} />
            </svg>
            <span key={left} className="quiz-timer-num">{left}</span>
        </div>
    );
}

function SetupScreen({ settings, onChange, onStart, locked }) {
    return (
        <div className="quiz-setup">
            <div className="quiz-hero">
                <div className="quiz-hero-icon">🏆</div>
                <div>
                    <h2>Научная викторина</h2>
                    <p className="muted">Настройте игру и выберите тему — вопросы начнутся сразу</p>
                </div>
            </div>

            <div className="quiz-options">
                <div className="quiz-option-group">
                    <span className="quiz-option-label">Вопросов:</span>
                    {COUNTS.map(n => (
                        <button key={n} className={`btn quiz-count${settings.count === n ? ' active' : ''}`}
                            disabled={locked} onClick={() => onChange({ count: n })}>{n}</button>
                    ))}
                </div>
                <button className={`btn quiz-toggle${settings.timer ? ' active' : ''}`} disabled={locked}
                    onClick={() => onChange({ timer: !settings.timer })}>
                    ⏱ Таймер {TIMER_SECONDS} с: <b>{settings.timer ? 'вкл' : 'выкл'}</b>
                </button>
                <button className={`btn quiz-toggle${settings.teams ? ' active' : ''}`} disabled={locked}
                    onClick={() => onChange({ teams: !settings.teams })}>
                    👥 Команды: <b>{settings.teams ? 'вкл' : 'выкл'}</b>
                </button>
            </div>

            <div className="quiz-topics">
                {[...TOPICS, MIXED].map((t, i) => (
                    <button key={t.id} className={`quiz-topic${t.id === MIXED.id ? ' is-mixed' : ''}`}
                        style={{ '--topic': t.color, animationDelay: `${i * 70}ms` }}
                        disabled={locked} onClick={() => onStart(t.id)}>
                        <span className="quiz-topic-icon">{t.icon}</span>
                        <span className="quiz-topic-label">{t.label}</span>
                        <span className="quiz-topic-hint">{t.hint}</span>
                    </button>
                ))}
            </div>
            {settings.teams && (
                <p className="quiz-setup-note">
                    Команды <b style={{ color: TEAMS[0].color }}>{TEAMS[0].label}</b> и{' '}
                    <b style={{ color: TEAMS[1].color }}>{TEAMS[1].label}</b> отвечают по очереди
                </p>
            )}
        </div>
    );
}

function ProgressDots({ total, results, index }) {
    return (
        <div className="quiz-dots">
            {Array.from({ length: total }, (_, i) => {
                const state = i < results.length ? (results[i] ? 'ok' : 'bad') : i === index ? 'now' : '';
                return <span key={i} className={`quiz-dot ${state}`} />;
            })}
        </div>
    );
}

function QuestionScreen({ question, index, total, results, chosen, team, timeLeft, timerOn, locked, onAnswer, onNext, onSkipTimer }) {
    const topic = topicById(question.topic);
    const answered = chosen !== null;
    const waiting = !answered && timerOn && timeLeft > 0;
    const isLast = index + 1 >= total;
    const ok = answered && chosen === question.correct;

    return (
        <div className="quiz-play" key={index}>
            <div className="quiz-progress">
                <span className="quiz-topic-chip" style={{ '--topic': topic.color }}>{topic.icon} {topic.label}</span>
                <span className="quiz-counter">Вопрос <b>{index + 1}</b> из {total}</span>
                <ProgressDots total={total} results={results} index={index} />
            </div>

            {team && (
                <div className="quiz-turn" style={{ '--team': team.color }}>
                    Отвечает команда: <b>{team.icon} {team.label}</b>
                </div>
            )}

            <h2 className="quiz-question">{question.q}</h2>

            <div className={`quiz-grid${waiting ? ' is-waiting' : ''}${answered ? ' is-answered' : ''}`}>
                {question.options.map((opt, i) => {
                    let state = '';
                    if (answered) {
                        if (i === question.correct) state = ' is-correct';
                        else if (i === chosen) state = ' is-wrong';
                        else state = ' is-dim';
                    }
                    return (
                        <button key={i} data-index={i} className={`quiz-tile${state}`}
                            style={{ '--tile': TILE_COLORS[i], animationDelay: `${120 + i * 70}ms` }}
                            disabled={answered || waiting || locked}
                            onClick={(e) => onAnswer(i, e.currentTarget)}>
                            <span className="quiz-tile-letter">{LETTERS[i]}</span>
                            <span className="quiz-tile-text">{opt}</span>
                            {state === ' is-correct' && <span className="quiz-tile-mark">✔</span>}
                            {state === ' is-wrong' && <span className="quiz-tile-mark">✘</span>}
                        </button>
                    );
                })}
            </div>

            <div className="quiz-footer">
                {answered ? (
                    <div className={`quiz-feedback ${ok ? 'good' : 'bad'}`}>
                        <div className="quiz-feedback-text">
                            <div className="quiz-verdict">
                                {ok ? '✔ Верно!' : `✘ Неверно. Правильный ответ: ${LETTERS[question.correct]}`}
                                {team && ok && <span className="quiz-verdict-team" style={{ color: team.color }}> +1 {team.label}</span>}
                            </div>
                            <p className="quiz-explain">{question.explain}</p>
                        </div>
                        <button className="btn btn-primary quiz-next" disabled={locked} onClick={onNext}>
                            {isLast ? 'Итоги 🏁' : 'Дальше →'}
                        </button>
                    </div>
                ) : timerOn ? (
                    <div className="quiz-wait">
                        <TimerRing left={timeLeft} />
                        {waiting ? (
                            <>
                                <p className="quiz-wait-text">Думаем! Голосуйте поднятой рукой: <b>А, Б, В или Г?</b></p>
                                <button className="btn" disabled={locked} onClick={onSkipTimer}>Отвечать сейчас</button>
                            </>
                        ) : (
                            <p className="quiz-wait-text time-up">Время вышло! Выберите ответ</p>
                        )}
                    </div>
                ) : (
                    <p className="quiz-hint">Наведите руку на ответ и задержите — или сожмите кулак</p>
                )}
            </div>
        </div>
    );
}

function ResultsScreen({ results, total, teams, locked, onAgain, onSetup, onMenu }) {
    const correct = results.filter(Boolean).length;
    const { emoji, title, note } = resultTitle(correct, total);
    const teamScores = TEAMS.map((_, t) => results.filter((r, i) => r && i % 2 === t).length);
    const teamAsked = TEAMS.map((_, t) => results.filter((_, i) => i % 2 === t).length);
    const winner = teamScores[0] === teamScores[1] ? null : teamScores[0] > teamScores[1] ? 0 : 1;

    return (
        <div className="quiz-results">
            <div className="quiz-results-emoji">{teams ? (winner === null ? '🤝' : '👑') : emoji}</div>
            {teams ? (
                <>
                    <h2 className="quiz-results-title">
                        {winner === null ? 'Ничья!' : <>Победили <span style={{ color: TEAMS[winner].color }}>{TEAMS[winner].label}</span>!</>}
                    </h2>
                    <div className="quiz-team-final">
                        {TEAMS.map((t, i) => (
                            <div key={t.id} className={`quiz-team-card${winner === i ? ' winner' : ''}`} style={{ '--team': t.color }}>
                                <span className="quiz-team-name">{t.icon} {t.label}</span>
                                <span className="quiz-team-score">{teamScores[i]}</span>
                                <span className="muted">из {teamAsked[i]}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <h2 className="quiz-results-title">{title}</h2>
                    <div className="quiz-score-big"><b>{correct}</b> из {total}</div>
                    <p className="quiz-results-note">правильных ответов · {note}</p>
                </>
            )}
            <div className="quiz-dots large">
                {results.map((r, i) => <span key={i} className={`quiz-dot ${r ? 'ok' : 'bad'}`} />)}
            </div>
            <div className="quiz-results-actions">
                <button className="btn btn-primary" disabled={locked} onClick={onAgain}>↻ Ещё раз</button>
                <button className="btn" disabled={locked} onClick={onSetup}>Сменить тему</button>
                <button className="btn btn-ghost" disabled={locked} onClick={onMenu}>← Меню</button>
            </div>
        </div>
    );
}

export default function QuizLab({ onBack }) {
    const [settings, setSettings] = useState(loadSettings);
    const [phase, setPhase] = useState('setup'); // setup | play | results
    const [round, setRound] = useState({ topic: null, questions: [], teams: false, timer: false });
    const [index, setIndex] = useState(0);
    const [chosen, setChosen] = useState(null);
    const [results, setResults] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [locked, setLocked] = useState(true);
    const confettiRef = useRef(null);

    const question = round.questions[index];
    const team = round.teams ? TEAMS[index % 2] : null;
    const waiting = phase === 'play' && chosen === null && round.timer && timeLeft > 0;

    useEffect(() => {
        if (!locked) return;
        const id = setTimeout(() => setLocked(false), LOCK_MS);
        return () => clearTimeout(id);
    }, [locked]);

    useEffect(() => {
        if (!waiting) return;
        const id = setTimeout(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearTimeout(id);
    }, [waiting, timeLeft]);

    const updateSettings = (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        } catch {
            // storage blocked: settings just won't persist
        }
    };

    const start = (topicId) => {
        setRound({ topic: topicId, questions: buildRound(topicId, settings.count), teams: settings.teams, timer: settings.timer });
        setIndex(0);
        setChosen(null);
        setResults([]);
        setTimeLeft(settings.timer ? TIMER_SECONDS : 0);
        setPhase('play');
        setLocked(true);
    };

    const toSetup = () => {
        setPhase('setup');
        setLocked(true);
    };

    const answer = (i, el) => {
        if (chosen !== null || !question) return;
        const ok = i === question.correct;
        setChosen(i);
        setResults(r => [...r, ok]);
        setLocked(true);
        if (ok && el) {
            const rect = el.getBoundingClientRect();
            confettiRef.current?.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 60);
        }
    };

    const next = () => {
        if (index + 1 >= round.questions.length) {
            setPhase('results');
            setLocked(true);
            const correct = results.filter(Boolean).length;
            if (round.teams || correct / results.length >= 0.5) confettiRef.current?.rain(260);
            else if (correct > 0) confettiRef.current?.rain(80);
            return;
        }
        setIndex(index + 1);
        setChosen(null);
        setTimeLeft(round.timer ? TIMER_SECONDS : 0);
        setLocked(true);
    };

    // Keyboard shortcuts for a presenter remote or laptop: 1–4 / А–Г answer, Enter / → next
    useEffect(() => {
        if (phase !== 'play') return;
        const onKey = (e) => {
            if (e.target.closest?.('input, textarea')) return;
            if (chosen === null && !waiting && !locked) {
                const k = e.key.toLowerCase();
                let i = ['1', '2', '3', '4'].indexOf(k);
                if (i < 0) i = ['а', 'б', 'в', 'г'].indexOf(k);
                if (i < 0) i = ['a', 'b', 'c', 'd'].indexOf(k);
                if (i >= 0) answer(i, document.querySelector(`.quiz-tile[data-index="${i}"]`));
            } else if (chosen !== null && !locked && (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target.closest?.('button')))) {
                next();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const correctCount = results.filter(Boolean).length;
    const actions = phase === 'play' ? (
        <>
            {round.teams ? (
                <div className="quiz-scoreboard">
                    {TEAMS.map((t, ti) => {
                        const score = results.filter((r, i) => r && i % 2 === ti).length;
                        return (
                            <div key={t.id} className={`quiz-score-pill${team?.id === t.id ? ' active' : ''}`} style={{ '--team': t.color }}>
                                <span>{t.icon} {t.label}</span>
                                <b key={score} className="quiz-score-num">{score}</b>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="quiz-score-pill solo">
                    <span>Правильно</span>
                    <b key={correctCount} className="quiz-score-num">{correctCount}</b>
                    <span className="muted">из {results.length}</span>
                </div>
            )}
            <button className="btn btn-small btn-ghost" onClick={toSetup}>✕ Завершить</button>
        </>
    ) : null;

    const subtitle = phase === 'setup' ? 'Игра для всего класса' : topicById(round.topic).label;

    return (
        <LabShell title="Викторина" subtitle={subtitle} icon="🏆" accent="var(--quiz)" onBack={onBack} actions={actions}>
            <Background />
            <main className={`quiz-stage${locked ? ' is-locked' : ''}`}>
                {phase === 'setup' && (
                    <SetupScreen settings={settings} onChange={updateSettings} onStart={start} locked={locked} />
                )}
                {phase === 'play' && question && (
                    <QuestionScreen question={question} index={index} total={round.questions.length} results={results}
                        chosen={chosen} team={team} timeLeft={timeLeft} timerOn={round.timer} locked={locked}
                        onAnswer={answer} onNext={next} onSkipTimer={() => setTimeLeft(0)} />
                )}
                {phase === 'results' && (
                    <ResultsScreen results={results} total={round.questions.length} teams={round.teams} locked={locked}
                        onAgain={() => start(round.topic)} onSetup={toSetup} onMenu={onBack} />
                )}
            </main>
            <Confetti ref={confettiRef} />
        </LabShell>
    );
}

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Environment, Text3D } from '@react-three/drei';
import { generateQuestion } from './utils/QuestionGenerator';

import './QuizApp.css';

const QuizCard = ({ question, onAnswer }) => {
    return (
        <div className="quiz-card">
            <div className="quiz-subject">
                {question.subject}
            </div>
            <h2 className="quiz-question">
                {question.question}
            </h2>

            <div className="quiz-answers-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {question.answers.map((ans, i) => (
                    <button
                        key={i}
                        onClick={() => onAnswer(ans)}
                        className="quiz-answer-btn"
                    >
                        {ans}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const QuizApp = ({ onBack }) => {
    const [gameState, setGameState] = useState('start'); // start, playing, result
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(0);
    const [feedback, setFeedback] = useState(null); // 'correct', 'wrong'

    const MAX_QUESTIONS = 10;

    const startGame = () => {
        setScore(0);
        setTotal(0);
        setFeedback(null); // Ensure feedback is clear
        setCurrentQuestion(generateQuestion());
        setGameState('playing');
    };

    const nextQuestion = () => {
        setFeedback(null);
        setCurrentQuestion(generateQuestion());
    };

    const handleAnswer = (ans) => {
        const isCorrect = ans === currentQuestion.correct;

        if (isCorrect) {
            setScore(s => s + 1);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
        }

        // Wait a bit before next logic
        setTimeout(() => {
            const nextTotal = total + 1;
            setTotal(nextTotal);

            if (nextTotal >= MAX_QUESTIONS) {
                setGameState('result');
            } else {
                nextQuestion();
            }
        }, 1500);
    };

    return (
        <div className="quiz-container">
            <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <Stars radius={100} count={5000} factor={4} fade speed={1} />
                <Environment preset="city" />

                {/* Floating Background Objects */}
                <Float speed={4} rotationIntensity={1} floatIntensity={2}>
                    <mesh position={[-4, -2, -5]} rotation={[0, 0.5, 0]}>
                        <torusKnotGeometry args={[1, 0.4, 100, 16]} />
                        <meshStandardMaterial color="#00ffaa" wireframe opacity={0.3} transparent />
                    </mesh>
                </Float>
                <Float speed={5} rotationIntensity={2} floatIntensity={1}>
                    <mesh position={[4, 3, -8]}>
                        <icosahedronGeometry args={[1.5, 0]} />
                        <meshStandardMaterial color="#aa00ff" wireframe opacity={0.3} transparent />
                    </mesh>
                </Float>
            </Canvas>

            {/* UI Layer */}
            <div className="quiz-ui-layer">
                {gameState !== 'result' && (
                    <header className="quiz-header">
                        <button onClick={onBack} className="back-btn">← Back</button>
                        <div className="quiz-score">
                            Question: {total + 1} / {MAX_QUESTIONS} | Score: {score}
                        </div>
                    </header>
                )}

                {gameState === 'start' && (
                    <div className="quiz-start-screen">
                        <h1 className="quiz-title">EduLab Quiz</h1>
                        <p className="quiz-subtitle">Test your knowledge across Chemistry, Biology, and Cosmos.</p>
                        <button
                            onClick={startGame}
                            className="start-btn"
                        >
                            <h2>START QUIZ</h2>
                        </button>
                    </div>
                )}

                {gameState === 'playing' && currentQuestion && (
                    <div style={{ position: 'relative' }}>
                        {feedback && (
                            <div className={`quiz-feedback ${feedback === 'correct' ? 'feedback-correct' : 'feedback-wrong'}`}>
                                {feedback === 'correct' ? 'CORRECT!' : 'WRONG!'}
                            </div>
                        )}
                        <QuizCard question={currentQuestion} onAnswer={feedback ? () => { } : handleAnswer} />
                    </div>
                )}

                {gameState === 'result' && (
                    <div className="quiz-start-screen">
                        <h1 className="quiz-title">Quiz Completed!</h1>
                        <div style={{ fontSize: '3rem', margin: '20px 0', textShadow: '0 0 20px white' }}>
                            Score: {score} / {MAX_QUESTIONS}
                        </div>
                        <p className="quiz-subtitle">
                            {score === MAX_QUESTIONS ? "Perfect Score! You are a genius! 🌟" :
                                score > 7 ? "Great job! Keep it up! 👍" :
                                    "Good effort! Try again to improve. 💪"}
                        </p>
                        <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
                            <button onClick={startGame} className="start-btn" style={{ width: 'auto', padding: '15px 40px' }}>
                                Play Again
                            </button>
                            <button onClick={onBack} className="back-btn" style={{ position: 'static', width: 'auto', padding: '15px 40px', background: 'rgba(255,255,255,0.1)' }}>
                                Main Menu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

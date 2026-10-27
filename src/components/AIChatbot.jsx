import React, { useState, useEffect, useRef } from 'react';
import { Bot, BotMessageSquare, Mic, SendHorizontal, Volume2, X } from 'lucide-react';
import './AIChatbot.css';

// Requests go through the Vite dev-server proxy (vite.config.js), which adds the xkiro key server-side
const AI_ENDPOINT = '/api/ai/chat/completions';
const AI_MODEL = 'qwen/qwen3.7-flash:free';
const HISTORY_LIMIT = 10;

const MODE_NAMES = {
    menu: 'Главное меню',
    chemistry: 'Химия',
    biology: 'Биология',
    physics: 'Физика',
    cosmos: 'Космос',
    math: 'Математика',
    geo: 'География',
    quiz: 'Викторина',
};

// One-tap questions, so the teacher can ask from the board without a keyboard
const QUICK_QUESTIONS = {
    menu: ['Что умеет EduLab 3D?', 'Как управлять руками?', 'Придумай интересный вопрос для класса'],
    chemistry: ['Что такое ковалентная связь?', 'Почему вода — полярная молекула?', 'Чем ионная связь отличается от ковалентной?'],
    biology: ['Зачем клетке митохондрии?', 'Чем растительная клетка отличается от животной?', 'Как устроена ДНК?'],
    physics: ['Почему перо падает медленнее шара?', 'Что такое ускорение свободного падения?', 'Почему на Луне всё легче?'],
    cosmos: ['Почему у Венеры такая жара?', 'Почему Луна меняет фазы?', 'Почему Плутон больше не планета?'],
    math: ['Что такое развёртка многогранника?', 'Почему объём пирамиды в 3 раза меньше призмы?', 'Что такое формула Эйлера?'],
    geo: ['Чем широта отличается от долготы?', 'Почему бывает полярная ночь?', 'Почему времена года меняются?'],
    quiz: ['Объясни последний ответ подробнее', 'Дай подсказку, не называя ответ', 'Придумай похожий вопрос'],
};

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Minimal safe formatting for model replies: **bold** and line breaks, nothing else is interpreted
function renderText(text) {
    return text.split('\n').filter(Boolean).map((line, i) => (
        <p key={i}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part.replace(/^#+\s*/, '').replace(/^[-*]\s+/, '• '))}
        </p>
    ));
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    utterance.lang = 'ru-RU';
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ru'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

export const AIChatbot = ({ mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: 'Привет! Я EduBot — помощник на уроке. Нажмите на готовый вопрос, скажите его голосом или напишите.', sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [readAloud, setReadAloud] = useState(false);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => () => {
        recognitionRef.current?.abort();
        window.speechSynthesis?.cancel();
    }, []);

    const ask = async (question) => {
        const userMsg = question.trim();
        if (!userMsg || isLoading) return;
        const history = [...messages, { text: userMsg, sender: 'user' }];
        setMessages(history);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(AI_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are EduBot, a friendly science teaching assistant inside EduLab 3D, a 3D science app used in school lessons on a projector.
The teacher is currently in the "${MODE_NAMES[mode] || mode}" section. The app has labs: Chemistry (build molecules, balance reactions), Biology (cell organelles, DNA, mitosis), Physics (gravity, free fall, air resistance), Cosmos (Solar System, Moon phases), Math (solids, nets, views of a figure), Geography (globe, coordinates, seasons and day length), and a class Quiz. Users control it with hand gestures through the webcam.
Answer for school students (grades 7–10): accurate, short (2–5 sentences), clear, with a simple example when helpful. Answer in the same language the user writes in (usually Russian).`
                        },
                        ...history.slice(-HISTORY_LIMIT).map(m => ({
                            role: m.sender === 'user' ? 'user' : 'assistant',
                            content: m.text
                        }))
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error?.message || `HTTP ${response.status}`);
            }

            const aiText = data.choices?.[0]?.message?.content?.trim() || 'Не получилось сформулировать ответ. Попробуйте спросить иначе.';
            setMessages(prev => [...prev, { text: aiText, sender: 'bot' }]);
            if (readAloud) speak(aiText);
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { text: 'Нет связи с ИИ. Проверьте интернет и попробуйте ещё раз.', sender: 'bot', error: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleListening = () => {
        if (listening) {
            recognitionRef.current?.stop();
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = true;
        let finalText = '';
        recognition.onresult = (e) => {
            finalText = Array.from(e.results).map(r => r[0].transcript).join('');
            setInput(finalText);
        };
        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') {
                setMessages(prev => [...prev, { text: 'Нет доступа к микрофону. Разрешите его в адресной строке браузера.', sender: 'bot', error: true }]);
            }
        };
        recognition.onend = () => {
            setListening(false);
            if (finalText) ask(finalText);
        };
        recognitionRef.current = recognition;
        setListening(true);
        recognition.start();
    };

    const quick = QUICK_QUESTIONS[mode] || QUICK_QUESTIONS.menu;

    return (
        <div className={`ai-chatbot ${isOpen ? 'open' : ''}`}>
            {!isOpen && (
                <button className="ai-fab" onClick={() => setIsOpen(true)} aria-label="Открыть EduBot">
                    <BotMessageSquare className="ai-fab-icon" aria-hidden="true" />
                    <span className="ai-fab-text">Спросить</span>
                </button>
            )}

            {isOpen && (
                <div className="ai-window panel">
                    <header className="ai-header">
                        <div className="ai-avatar"><Bot aria-hidden="true" /></div>
                        <div className="ai-header-text">
                            <h3>EduBot</h3>
                            <span>Раздел: {MODE_NAMES[mode] || mode}</span>
                        </div>
                        <button className={`btn btn-icon btn-small ${readAloud ? 'active' : ''}`}
                            onClick={() => { setReadAloud(r => !r); window.speechSynthesis?.cancel(); }}
                            title="Читать ответы вслух" aria-label="Читать ответы вслух"><Volume2 /></button>
                        <button className="btn btn-icon btn-small" onClick={() => setIsOpen(false)} aria-label="Закрыть"><X /></button>
                    </header>

                    <div className="ai-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.sender} ${msg.error ? 'error' : ''}`}>
                                <div className="bubble">{msg.sender === 'bot' ? renderText(msg.text) : msg.text}</div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message bot">
                                <div className="bubble thinking"><span /><span /><span /></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="ai-quick">
                        {quick.map(q => (
                            <button key={q} className="ai-chip" onClick={() => ask(q)} disabled={isLoading}>{q}</button>
                        ))}
                    </div>

                    <form className="ai-input-area" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
                        {SpeechRecognition && (
                            <button type="button" className={`btn btn-icon ${listening ? 'listening' : ''}`} onClick={toggleListening}
                                aria-label={listening ? 'Остановить запись' : 'Спросить голосом'} title="Спросить голосом"><Mic /></button>
                        )}
                        <input
                            type="text"
                            placeholder={listening ? 'Говорите…' : 'Ваш вопрос…'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()} aria-label="Отправить"><SendHorizontal /></button>
                    </form>
                </div>
            )}
        </div>
    );
};

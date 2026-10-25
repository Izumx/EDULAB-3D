import React, { useState, useEffect, useRef } from 'react';
import './AIChatbot.css';

const MOCK_KNOWLEDGE = {
    default: [
        "I can help you with Chemistry, Biology, Physics, or Astronomy!",
        "Ask me about atoms, cells, gravity, or planets.",
        "Try asking: 'What is an atom?' or 'How does gravity work?'"
    ],
    chemistry: [
        "In Chemistry, you can build molecules!",
        "Tip: H + H + O makes Water (H2O).",
        "Atoms are the building blocks of matter.",
        "Try mixing Na + Cl to make Salt!"
    ],
    biology: [
        "The Mitochondria is the powerhouse of the cell!",
        "Nucleus holds the DNA instructions.",
        "Cells are the basic units of life.",
        "Try exploring the detailed cell model."
    ],
    physics: [
        "Gravity pulls objects towards each other.",
        "Try using the slider to change gravity!",
        "Newton's laws explain how things move.",
        "In this lab, you can grab and throw objects!"
    ],
    cosmos: [
        "The Sun contains 99.8% of the solar system's mass.",
        "Jupiter is the largest planet.",
        "Try pinching carefully to zoom in on planets!",
        "Earth is the only known planet with life."
    ]
};

const KEYWORDS = {
    "atom": "Atoms consist of protons, neutrons, and electrons.",
    "molecule": "Molecules are groups of atoms bonded together.",
    "cell": "Cells are the smallest unit of life. They have organelles like the nucleus.",
    "gravity": "Gravity is a force of attraction. On Earth, it's 9.8 m/s².",
    "planet": "Planes orbit stars. We have 8 in our solar system.",
    "star": "Stars are giant balls of hot plasma, like our Sun.",
    "water": "Water is H2O. Two hydrogen atoms and one oxygen.",
    "dna": "DNA carries genetic instructions for development and functioning."
};

// Requests go through the Vite dev-server proxy (vite.config.js), which adds the xkiro key server-side
const AI_ENDPOINT = '/api/ai/chat/completions';
const AI_MODEL = 'qwen/qwen3.7-flash:free';
const HISTORY_LIMIT = 10;

export const AIChatbot = ({ mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! I'm your AI Lab Assistant. How can I help?", sender: 'bot' }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Context-aware greeting on mode switch
    useEffect(() => {
        if (mode && mode !== 'menu') {
            const contextMsg = `Welcome to the ${mode.charAt(0).toUpperCase() + mode.slice(1)} Lab!`;
            setMessages(prev => [...prev, { text: contextMsg, sender: 'bot' }]);
        }
    }, [mode]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        const history = [...messages, { text: userMsg, sender: 'user' }];
        setMessages(history);
        setInput("");
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
                            content: `You are EduBot, an intelligent and helpful AI assistant in a 3D Science Education App called EduLab 3D.
The user is currently in the "${mode}" module.
If asked about the app, explain that it allows exploring Chemistry (molecules), Biology (cells), Physics (gravity), and Cosmos (planets).
Keep answers concise, educational, and friendly. Answer in the same language the user writes in.`
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

            const aiText = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
            setMessages(prev => [...prev, { text: aiText, sender: 'bot' }]);

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { text: "Error connecting to AI. Is the dev server running with XKIRO_API_KEY in .env?", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`ai-chatbot ${isOpen ? 'open' : 'closed'}`}>
            {/* Floating Action Button */}
            {!isOpen && (
                <button className="ai-fab" onClick={() => setIsOpen(true)}>
                    🤖
                    <span className="ai-tooltip">Ask AI!</span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="ai-window">
                    <header className="ai-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="ai-avatar">🤖</div>
                            <div>
                                <h3>EduBot</h3>
                                <span>Online</span>
                            </div>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </header>

                    <>
                            <div className="ai-messages">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`message ${msg.sender}`}>
                                        <div className="bubble">
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="message bot">
                                        <div className="bubble thinking">...</div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="ai-input-area" onSubmit={handleSend}>
                                <input
                                    type="text"
                                    placeholder="Ask anything..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button type="submit" disabled={isLoading}>{isLoading ? '...' : 'Send'}</button>
                            </form>
                    </>
                </div>
            )}
        </div>
    );
};

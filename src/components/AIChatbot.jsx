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

// User provided shared key
const DEFAULT_API_KEY = "AIzaSyCISYhVqu2HkgLJk4cMwWXq9tqoa7SUVcA";

export const AIChatbot = ({ mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! I'm your AI Lab Assistant. How can I help?", sender: 'bot' }
    ]);
    const [input, setInput] = useState("");
    // Use stored key or the default shared key
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Save API Key
    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        setShowSettings(false);
        setMessages(prev => [...prev, { text: "API Key saved! I'm ready to answer any question.", sender: 'bot' }]);
    };

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
        setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
        setInput("");
        setIsLoading(true);

        if (!apiKey) {
            setTimeout(() => {
                setMessages(prev => [...prev, { text: "Please enter your Gemini API Key in settings to enable real AI features.", sender: 'bot' }]);
                setShowSettings(true);
                setIsLoading(false);
            }, 500);
            return;
        }

        try {
            // Call Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are EduBot, an intelligent and helpful AI assistant in a 3D Science Education App called EduLab 3D. 
                            The user is currently in the "${mode}" module. 
                            If asked about the app, explain that it allows exploring Chemistry (molecules), Biology (cells), Physics (gravity), and Cosmos (planets).
                            Keep answers concise, educational, and friendly.
                            User Question: ${userMsg}`
                        }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || "API Error");
            }

            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
            setMessages(prev => [...prev, { text: aiText, sender: 'bot' }]);

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { text: "Error connecting to AI. Please check your API Key.", sender: 'bot' }]);
            setShowSettings(true);
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
                                <span>{apiKey ? 'Online' : 'Setup Required'}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">⚙️</button>
                            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                        </div>
                    </header>

                    {showSettings ? (
                        <div className="ai-settings">
                            <h3>⚙️ AI Settings</h3>
                            <p>Enter your Google Gemini API Key to enable the full AI experience.</p>
                            <input
                                type="password"
                                placeholder="Paste API Key here..."
                                defaultValue={apiKey}
                                onBlur={(e) => saveApiKey(e.target.value)}
                            />
                            <p className="hint">Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a></p>
                            <button onClick={() => setShowSettings(false)} className="save-btn">Back to Chat</button>
                        </div>
                    ) : (
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
                                    placeholder={apiKey ? "Ask anything..." : "Setup required..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button type="submit" disabled={isLoading}>{isLoading ? '...' : 'Send'}</button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

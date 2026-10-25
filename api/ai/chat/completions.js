// Vercel serverless function: production twin of the Vite dev proxy in vite.config.js.
// Same path (/api/ai/chat/completions), so the chatbot code works unchanged after deploy.
// Set XKIRO_API_KEY in the Vercel project's environment variables.
const UPSTREAM = 'https://api.xkiro.com/v1/chat/completions';
const MODEL = 'qwen/qwen3.7-flash:free';
const MAX_MESSAGES = 12;
const MAX_CHARS = 4000;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: { message: 'Method not allowed' } });
    }
    if (!process.env.XKIRO_API_KEY) {
        return res.status(500).json({ error: { message: 'XKIRO_API_KEY is not configured' } });
    }

    // Only forward chat messages, with a fixed model and size limits, so the key can't be used for anything else
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-MAX_MESSAGES) : [];
    const clean = messages
        .filter(m => ['system', 'user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
        .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    if (!clean.length) {
        return res.status(400).json({ error: { message: 'No messages' } });
    }

    try {
        const upstream = await fetch(UPSTREAM, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.XKIRO_API_KEY}`,
            },
            body: JSON.stringify({ model: MODEL, messages: clean }),
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (err) {
        return res.status(502).json({ error: { message: `Upstream error: ${err.message}` } });
    }
}

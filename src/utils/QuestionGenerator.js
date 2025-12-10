import { PLANETS } from '../data/planets';

// Mock Data for Chemistry (small internal set for the generator)
const ELEMENTS = [
    { name: 'Hydrogen', symbol: 'H', number: 1, category: 'nonmetal' },
    { name: 'Helium', symbol: 'He', number: 2, category: 'noble-gas' },
    { name: 'Lithium', symbol: 'Li', number: 3, category: 'alkali-metal' },
    { name: 'Carbon', symbol: 'C', number: 6, category: 'nonmetal' },
    { name: 'Oxygen', symbol: 'O', number: 8, category: 'nonmetal' },
    { name: 'Sodium', symbol: 'Na', number: 11, category: 'alkali-metal' },
    { name: 'Chlorine', symbol: 'Cl', number: 17, category: 'halogen' },
    { name: 'Gold', symbol: 'Au', number: 79, category: 'transition-metal' },
    { name: 'Uranium', symbol: 'U', number: 92, category: 'actinide' }
];

const BIOLOGY_FACTS = [
    { subject: 'Mitochondria', fact: 'Powerhouse of the cell' },
    { subject: 'Nucleus', fact: 'Contains DNA' },
    { subject: 'Ribosome', fact: 'Protein synthesis' },
    { subject: 'Chloroplast', fact: 'Photosynthesis' }
];

const TEMPLATES = [
    {
        type: 'chem-symbol',
        generate: () => {
            const boxes = shuffle(ELEMENTS);
            const target = boxes[0];
            return {
                question: `What is the chemical symbol for ${target.name}?`,
                correct: target.symbol,
                answers: shuffle([target.symbol, boxes[1].symbol, boxes[2].symbol, boxes[3].symbol]),
                subject: 'Chemistry'
            };
        }
    },
    {
        type: 'chem-number',
        generate: () => {
            const boxes = shuffle(ELEMENTS);
            const target = boxes[0];
            return {
                question: `What is the atomic number of ${target.name}?`,
                correct: target.number.toString(),
                answers: shuffle([target.number, boxes[1].number, boxes[2].number, boxes[3].number].map(String)),
                subject: 'Chemistry'
            };
        }
    },
    {
        type: 'bio-function',
        generate: () => {
            const boxes = shuffle(BIOLOGY_FACTS);
            const target = boxes[0];
            return {
                question: `Which organelle is known as the "${target.fact}"?`,
                correct: target.subject,
                answers: shuffle([target.subject, boxes[1].subject, boxes[2].subject, boxes[3].subject]),
                subject: 'Biology'
            };
        }
    },
    {
        type: 'cosmos-planet',
        generate: () => {
            if (!PLANETS || PLANETS.length < 4) return null;
            const boxes = shuffle([...PLANETS]);
            const target = boxes[0];
            const prop = Math.random() > 0.5 ? 'distance' : 'radius';

            if (prop === 'distance') {
                return {
                    question: `Which planet is ${target.distance} AU from the Sun?`,
                    correct: target.name,
                    answers: shuffle(boxes.slice(0, 4).map(p => p.name)),
                    subject: 'Astronomy'
                };
            } else {
                return {
                    question: `Which planet has a radius ${target.radius}x that of Earth?`,
                    correct: target.name,
                    answers: shuffle(boxes.slice(0, 4).map(p => p.name)),
                    subject: 'Astronomy'
                };
            }
        }
    },
    {
        type: 'physics-concept',
        generate: () => {
            const facts = [
                { q: "What is the approximate gravity on Earth?", a: "9.8 m/s²", wrong: ["1.6 m/s²", "3.7 m/s²", "24.7 m/s²"] },
                { q: "Newton's Second Law is expressed as...", a: "F = ma", wrong: ["E = mc²", "F = GmM/r²", "p = mv"] },
                { q: "What force opposes motion between surfaces?", a: "Friction", wrong: ["Gravity", "Tension", "Lift"] },
                { q: "Kinetic energy is energy of...", a: "Motion", wrong: ["Position", "Heat", "Light"] }
            ];
            const item = facts[Math.floor(Math.random() * facts.length)];
            return {
                question: item.q,
                correct: item.a,
                answers: shuffle([item.a, ...item.wrong]),
                subject: 'Physics'
            };
        }
    }
];

// Fisher-Yates Shuffle
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export const generateQuestion = () => {
    // Basic retry loop
    for (let i = 0; i < 5; i++) {
        const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
        const q = template.generate();
        if (q) return q;
    }
    // Fallback if something fails
    return {
        question: "Select the correct element.",
        correct: "Hydrogen",
        answers: ["Hydrogen", "Helium", "Lithium", "Carbon"],
        subject: "Chemistry"
    }
};

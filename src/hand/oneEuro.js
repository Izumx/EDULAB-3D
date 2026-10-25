// One Euro filter (Casiez et al., CHI '12): low jitter when the hand is still, low lag when it moves fast.
// https://gery.casiez.net/1euro/
const alpha = (cutoff, dt) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
};

export class OneEuroFilter {
    constructor({ minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 } = {}) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.reset();
    }

    reset() {
        this.x = null;
        this.dx = 0;
        this.t = null;
    }

    filter(value, timeMs) {
        if (this.x === null) {
            this.x = value;
            this.t = timeMs;
            return value;
        }
        const dt = Math.max((timeMs - this.t) / 1000, 1e-3);
        this.t = timeMs;

        const rawDx = (value - this.x) / dt;
        this.dx += alpha(this.dCutoff, dt) * (rawDx - this.dx);

        const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
        this.x += alpha(cutoff, dt) * (value - this.x);
        return this.x;
    }
}

// Motor de audio: sintetizador tipo piano + planificador con lookahead.
// El planificador avanza en "segmentos" (tiempo real -> posición musical),
// así los bucles y los cambios de tempo no descuadran el cursor visual.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.2;  // segundos
const STEP_QUARTERS = 0.25;  // granularidad de planificación

class Player {
  constructor() {
    this.ctx = null;
    this.quarterBpm = 100;
    this.rate = 1;
    this.metronome = false;
    this.beatsPerBar = 4;
    this.gains = { rh: 1, lh: 1 };
    this.loop = null;            // {start, end} en negras
    this.onPosition = () => {};
    this.onStop = () => {};
    this.playing = false;
    this.segments = [];          // {tStart, tEnd, qStart}
  }

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get secondsPerQuarter() { return 60 / (this.quarterBpm * this.rate); }

  voice(midi, when, durQuarters, gain) {
    const ctx = this.ctx;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const dur = Math.max(0.2, durQuarters * this.secondsPerQuarter);
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(9000, freq * 9), when);
    filter.connect(out);
    out.connect(ctx.destination);

    const peak = Math.max(0.0002, gain * 0.2);
    out.gain.setValueAtTime(0.0001, when);
    out.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    out.gain.exponentialRampToValueAtTime(peak * 0.3, when + Math.min(0.6, dur * 0.6));
    out.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.3);

    for (const [mult, amp] of [[1, 1], [2, 0.3], [3, 0.12], [4, 0.05]]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = mult === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * mult, when);
      g.gain.setValueAtTime(amp, when);
      osc.connect(g); g.connect(filter);
      osc.start(when);
      osc.stop(when + dur + 0.35);
    }
  }

  click(when, strong) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(strong ? 1600 : 1100, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(strong ? 0.1 : 0.05, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.08);
  }

  start(timeline, fromQuarter = 0, countInBeats = 0) {
    this.init();
    this.timeline = timeline;
    this.playing = true;
    this.segments = [];
    this.schedQuarter = fromQuarter;
    this.nextBeat = Math.ceil(fromQuarter - 1e-9);
    this.schedTime = this.ctx.currentTime + 0.12 + countInBeats * this.secondsPerQuarter;

    for (let i = 0; i < countInBeats; i++) {
      this.click(this.ctx.currentTime + 0.12 + i * this.secondsPerQuarter, i % this.beatsPerBar === 0);
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop() {
    if (!this.playing && !this.timer) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    this.segments = [];
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
    this.onPosition(null);
    this.onStop();
  }

  endQuarter() { return this.loop ? this.loop.end : this.timeline.quarters; }

  tick() {
    const ctx = this.ctx;
    if (!ctx) return;

    while (this.playing && this.schedTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const end = this.endQuarter();
      const from = this.schedQuarter;
      const to = Math.min(from + STEP_QUARTERS, end);
      const spq = this.secondsPerQuarter;

      for (const n of this.timeline.notes) {
        if (n.start >= from && n.start < to) {
          const g = this.gains[n.hand];
          if (g > 0) this.voice(n.midi, this.schedTime + (n.start - from) * spq, n.dur, g);
        }
      }
      if (this.metronome) {
        while (this.nextBeat < to - 1e-9) {
          if (this.nextBeat >= from) {
            this.click(this.schedTime + (this.nextBeat - from) * spq, this.nextBeat % this.beatsPerBar === 0);
          }
          this.nextBeat += 1;
        }
      }

      this.segments.push({ tStart: this.schedTime, tEnd: this.schedTime + (to - from) * spq, qStart: from });
      this.schedTime += (to - from) * spq;
      this.schedQuarter = to;

      if (to >= end - 1e-9) {
        if (this.loop) {
          this.schedQuarter = this.loop.start;
          this.nextBeat = Math.ceil(this.loop.start - 1e-9);
        } else {
          const tail = this.schedTime - ctx.currentTime + 0.5;
          this.playing = false;
          setTimeout(() => this.stop(), Math.max(0, tail * 1000));
        }
      }
    }

    // posición visual: busca el segmento que contiene el instante actual
    const now = ctx.currentTime;
    while (this.segments.length > 1 && this.segments[0].tEnd < now) this.segments.shift();
    const seg = this.segments[0];
    if (seg && now >= seg.tStart) {
      this.onPosition(seg.qStart + (now - seg.tStart) / this.secondsPerQuarter);
    } else if (seg) {
      this.onPosition(seg.qStart, true); // cuenta atrás: aún no ha empezado
    }
  }
}

window.Player = Player;

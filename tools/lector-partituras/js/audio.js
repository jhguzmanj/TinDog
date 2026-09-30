// Motor de audio: voz tipo piano + planificador con lookahead.
// El planificador avanza en "segmentos" (tiempo real -> posición musical),
// así los bucles y los cambios de tempo no descuadran el cursor visual.
//
// buildVoice recibe el contexto por parámetro a propósito: la misma voz se usa
// en vivo y dentro de un OfflineAudioContext para renderizar el clip del móvil.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.2;  // segundos
const STEP_QUARTERS = 0.25;  // granularidad de planificación

// Onda periódica con los armónicos ya dentro (triangular + parciales 2, 3 y
// 4). Se comparte entre los dos osciladores de cada voz -createPeriodicWave
// es cara, la voz no lo es- así que sigue siendo barata de renderizar.
const WAVES = new WeakMap();
function pianoWave(ctx) {
  if (!WAVES.has(ctx)) {
    const imag = [0, 0.81, 0.3, 0.21, 0.05, 0.032, 0, 0.017, 0, 0.01];
    WAVES.set(ctx, ctx.createPeriodicWave(new Float32Array(imag.length), Float32Array.from(imag),
      { disableNormalization: false }));
  }
  return WAVES.get(ctx);
}

// Cuánto tarda en apagarse del todo una nota sostenida, según el registro:
// las cuerdas graves de un piano real vibran mucho más tiempo que las
// agudas. Acotado (0.5-2.7s) para no ensuciar de resonancia un pasaje
// rápido: es un lector de partituras, no el sintetizador del entrenador.
function noteLife(midi) {
  const t = Math.max(0, Math.min(1, (96 - midi) / 72));
  return 0.5 + t * 2.2;
}

// Cuatro cosas distinguen una cuerda de piano de un tono puro de sintetizador:
// decae con vida propia según el registro (noteLife), el golpe de martillo
// suena brillante y se apaga hacia un timbre más oscuro (filtro dinámico), y
// el fundamental nunca es una sola frecuencia limpia sino dos cuerdas
// ligeramente desafinadas entre sí -eso es lo que "late" y da la sensación
// de cuerda real en vez de onda de sintetizador.
function buildVoice(ctx, dest, midi, when, durSec, gain) {
  // Con el piano de muestras listo, esa es la voz; el sintetizador de abajo es el respaldo.
  if (window.PianoSamples && PianoSamples.voice(ctx, dest, midi, when, durSec, gain)) return;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const dur = Math.max(0.2, durSec);
  const life = noteLife(midi);
  const tail = Math.min(life, dur * 0.7 + 0.15);
  const end = dur + tail;

  const out = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.6;
  filter.connect(out);
  out.connect(dest);

  const bright = Math.min(10000, freq * 10);
  const dark = Math.max(300, Math.min(2400, freq * 3.2));
  filter.frequency.setValueAtTime(bright, when);
  filter.frequency.exponentialRampToValueAtTime(dark, when + end);

  const peak = Math.max(0.0002, gain * 0.22);
  const mid = Math.min(dur * 0.6, life * 0.5);
  out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(peak, when + 0.008);
  out.gain.exponentialRampToValueAtTime(peak * 0.32, when + mid);
  out.gain.exponentialRampToValueAtTime(0.0001, when + end);

  for (const cents of [-4, 4]) {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(pianoWave(ctx));
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime(cents, when);
    osc.connect(filter);
    osc.start(when);
    osc.stop(when + end + 0.3);
  }
}

function buildClick(ctx, dest, when, strong) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(strong ? 1600 : 1100, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(strong ? 0.1 : 0.05, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(g); g.connect(dest);
  osc.start(when); osc.stop(when + 0.08);
}

// WebKit no despierta la salida solo con resume(): hay que tocar un buffer real
// dentro del mismo gesto del usuario. Lo aprendimos en el entrenador.
function unlockIOS(ctx) {
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* si no se puede, el camino de clip sigue disponible */ }
}

class Player {
  constructor() {
    this.ctx = null;
    this.quarterBpm = 100;
    this.rate = 1;
    this.metronome = false;
    this.beatsPerBar = 4;
    this.gains = { rh: 1, lh: 1 };
    this.loop = null;            // {start, end} en negras
    this.midi = null;            // MidiOut cuando la salida es el piano
    this.onPosition = () => {};
    this.onStop = () => {};
    this.playing = false;
    this.segments = [];          // {tStart, tEnd, qStart}
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      unlockIOS(this.ctx);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get secondsPerQuarter() { return 60 / (this.quarterBpm * this.rate); }

  note(midi, when, durQuarters, gain, hand) {
    if (this.midi) this.midi.note(midi, when, durQuarters * this.secondsPerQuarter, hand, this.ctx);
    else buildVoice(this.ctx, this.ctx.destination, midi, when, durQuarters * this.secondsPerQuarter, gain);
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
      buildClick(this.ctx, this.ctx.destination,
        this.ctx.currentTime + 0.12 + i * this.secondsPerQuarter, i % this.beatsPerBar === 0);
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
    if (this.midi) this.midi.allNotesOff();
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
          if (g > 0) this.note(n.midi, this.schedTime + (n.start - from) * spq, n.dur, g, n.hand);
        }
      }
      if (this.metronome) {
        while (this.nextBeat < to - 1e-9) {
          if (this.nextBeat >= from) {
            buildClick(ctx, ctx.destination, this.schedTime + (this.nextBeat - from) * spq,
              this.nextBeat % this.beatsPerBar === 0);
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

// ---- Clip pre-renderizado (para móviles donde Web Audio en vivo no suena) ----

function wavBlob(buf) {
  const chans = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const blockAlign = chans * 2, dataSize = len * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(out);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + dataSize, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, chans, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * blockAlign, true); dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, dataSize, true);
  const data = [];
  for (let c = 0; c < chans; c++) data.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < chans; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

// Renderiza el tramo entero a un WAV. Es lento de pedir (segundos) pero después
// suena por un <audio> normal, que es el único camino que funciona en el iPhone
// de Jorge, y de paso el tiempo sale perfecto: ya no depende de ningún reloj.
async function renderClip({ notes, from, to, secondsPerQuarter, gains, metronome, beatsPerBar, countIn = 0 }) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return null;
  // Mono y 22 kHz a propósito: las voces no tienen panorama y el armónico más
  // agudo de la pieza no pasa de ~3.5 kHz, así que estéreo a 44.1 kHz era
  // cuatro veces el trabajo para el mismo sonido. En un teléfono eso se nota:
  // la pieza entera pasó de ~23 s de render a unos pocos.
  // Con muestras de piano (grabaciones estéreo) se renderiza estéreo a 32 kHz: 16 kHz de ancho de
  // banda sobran para piano y cuesta ~30 % menos que 44,1 kHz (medido: Cannon entero 5,6 s contra
  // 7,9 s). El estéreo no cuesta nada extra; a 22 kHz se perdería el brillo.
  const real = window.PianoSamples && await PianoSamples.prepare(notes.filter(n => n.start >= from - 1e-9 && n.start < to - 1e-9));
  const sr = real ? 32000 : 22050;
  const lead = countIn * secondsPerQuarter;   // la cuenta de entrada va dentro del clip
  const seconds = lead + (to - from) * secondsPerQuarter + (real ? 2.5 : 1.2);
  const ctx = new OAC(real ? 2 : 1, Math.ceil(seconds * sr), sr);

  for (let i = 0; i < countIn; i++) {
    buildClick(ctx, ctx.destination, i * secondsPerQuarter, i % beatsPerBar === 0);
  }
  for (const n of notes) {
    if (n.start < from - 1e-9 || n.start >= to - 1e-9) continue;
    const g = gains[n.hand];
    if (g > 0) {
      buildVoice(ctx, ctx.destination, n.midi, lead + (n.start - from) * secondsPerQuarter,
        n.dur * secondsPerQuarter, g);
    }
  }
  if (metronome) {
    for (let b = Math.ceil(from - 1e-9); b < to - 1e-9; b++) {
      buildClick(ctx, ctx.destination, lead + (b - from) * secondsPerQuarter, b % beatsPerBar === 0);
    }
  }
  return wavBlob(await ctx.startRendering());
}

// WAV mudo de un frame: sirve para "despertar" el <audio> dentro del gesto del
// usuario, antes de que el render (que tarda segundos) tenga el clip listo.
function silentWav() {
  return wavBlob({ numberOfChannels: 1, length: 1, sampleRate: 8000, getChannelData: () => new Float32Array(1) });
}

window.Player = Player;
window.AudioRender = { renderClip, buildVoice, silentWav };

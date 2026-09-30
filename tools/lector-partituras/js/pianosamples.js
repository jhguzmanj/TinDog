// Piano de muestras (Salamander Grand Piano V3, CC BY 3.0 - ver samples/piano.js).
//
// Suena a piano de verdad porque ES un piano de verdad: cada nota es una grabación que se
// estira un poco (como máximo 1,5 semitonos, hay una muestra cada tercera menor). El
// sintetizador de audio.js queda como respaldo si las muestras no cargan.
//
// Las muestras se descargan y decodifican solo cuando hacen falta (~4 MB, una vez): se cargan
// como <script> (samples/piano.js) y no con fetch, para que funcione también abriendo el HTML
// como archivo local. Solo se decodifican las que la pieza usa.

const PianoSamples = (() => {
  const SRC = 'samples/piano.js';
  const MAX_SECONDS = 8;                 // una nota de piano se apaga sola mucho antes
  const bufs = new Map();                // midi base -> AudioBuffer
  const masters = new WeakMap();
  let loadPromise = null, failed = null, enabled = true, ready = false, bases = [];

  const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const nameToMidi = n => { const m = /^([A-G]#?)(-?\d)$/.exec(n); return 12 * (+m[2] + 1) + PC[m[1]]; };

  function loadData() {
    if (window.PIANO_SAMPLES) return Promise.resolve();
    if (!loadPromise) {
      loadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SRC;
        s.onload = () => (window.PIANO_SAMPLES ? resolve() : reject(new Error('archivo vacío')));
        s.onerror = () => reject(new Error(`no se pudo descargar ${SRC}`));
        document.head.appendChild(s);
      }).catch(e => { loadPromise = null; throw e; });
    }
    return loadPromise;
  }

  function nearestBase(midi) {
    let best = bases[0];
    for (const b of bases) if (Math.abs(b - midi) < Math.abs(best - midi)) best = b;
    return best;
  }

  function b64ToBuffer(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }

  // decodeAudioData con callbacks: es lo único que entienden los WebKit viejos.
  const decode = (ctx, ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));

  // Recorta a MAX_SECONDS con un fundido al final (así no chasquea) y se queda con lo que hace falta.
  function trimmed(ctx, buf) {
    const max = Math.floor(MAX_SECONDS * buf.sampleRate);
    if (buf.length <= max) return buf;
    const out = ctx.createBuffer(buf.numberOfChannels, max, buf.sampleRate);
    const fade = Math.floor(0.6 * buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const src = buf.getChannelData(c), dst = out.getChannelData(c);
      for (let i = 0; i < max; i++) {
        const k = max - i;
        dst[i] = k < fade ? src[i] * (k / fade) : src[i];
      }
    }
    return out;
  }

  // Descarga (una vez) y decodifica las muestras que usan estas notas. Devuelve true si el piano
  // real quedó listo; si algo falla devuelve false y el llamador sigue con el sintetizador.
  async function prepare(notes) {
    if (!enabled) return false;
    try {
      await loadData();
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) throw new Error('este navegador no puede decodificar audio');
      bases = Object.keys(window.PIANO_SAMPLES).map(nameToMidi).sort((a, b) => a - b);
      const names = Object.fromEntries(Object.keys(window.PIANO_SAMPLES).map(n => [nameToMidi(n), n]));
      const need = new Set((notes || []).map(n => nearestBase(n.midi)));
      const dctx = new OAC(2, 1, 44100);
      for (const base of need) {
        if (bufs.has(base)) continue;
        bufs.set(base, trimmed(dctx, await decode(dctx, b64ToBuffer(window.PIANO_SAMPLES[names[base]]))));
      }
      failed = null; ready = true;
      return true;
    } catch (e) {
      failed = e; ready = false;
      return false;
    }
  }

  // Compresor suave antes de la salida: un acorde de cuatro notas más el bajo no debe saturar.
  function master(ctx) {
    if (!masters.has(ctx)) {
      const gain = ctx.createGain();
      gain.gain.value = 1.35;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3;
      comp.attack.value = 0.004; comp.release.value = 0.25;
      gain.connect(comp); comp.connect(ctx.destination);
      masters.set(ctx, gain);
    }
    return masters.get(ctx);
  }

  // Misma firma que buildVoice. Devuelve false si no hay muestra (el llamador usa el sintetizador).
  function voice(ctx, dest, midi, when, durSec, gain) {
    if (!enabled || !ready || !bases.length) return false;
    const base = nearestBase(midi);
    const buf = bufs.get(base);
    if (!buf) return false;

    const dur = Math.max(0.12, durSec);
    const rel = Math.min(0.32, 0.1 + dur * 0.4);          // el apagador cae al soltar la tecla
    const peak = Math.max(0.0002, gain * 0.9);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - base) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, when);
    g.gain.setValueAtTime(peak, when + dur);
    g.gain.setTargetAtTime(0.0001, when + dur, rel / 3);
    src.connect(g);
    g.connect(dest === ctx.destination ? master(ctx) : dest);
    src.start(when);
    src.stop(when + dur + rel * 2);
    return true;
  }

  return {
    prepare, voice,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    get failed() { return failed; },
    get loaded() { return bufs.size > 0; },
  };
})();

window.PianoSamples = PianoSamples;

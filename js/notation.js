// Parser del formato de texto de partituras -> eventos con tiempo en negras.

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function pitchToMidi(token) {
  const m = /^([A-Ga-g])([b#]*)(-?\d)$/.exec(token.trim());
  if (!m) return null;
  let semis = STEP[m[1].toUpperCase()];
  for (const acc of m[2]) semis += acc === 'b' ? -1 : 1;
  return 12 * (parseInt(m[3], 10) + 1) + semis;
}

function midiToName(midi) {
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

// "8" -> 0.5 negras, "4." -> 1.5, "1" -> 4
function durationToQuarters(token) {
  const m = /^(\d+)(\.*)$/.exec(token);
  if (!m) return null;
  const base = 4 / parseInt(m[1], 10);
  let total = base, add = base;
  for (let i = 0; i < m[2].length; i++) { add /= 2; total += add; }
  return total;
}

// Una mano: "Eb5/8 Bb4/8 | [F3 Bb3]/1~ | r/4"
function parseHand(text, meterQuarters, label) {
  const events = [], errors = [];
  let t = 0, barStart = 0, barNo = 1;
  const tokens = (text || '').trim().split(/\s+/).filter(Boolean);

  const closeBar = () => {
    const len = t - barStart;
    if (Math.abs(len - meterQuarters) > 1e-6) {
      errors.push(`${label} c.${barNo}: ${len} negras (deberían ser ${meterQuarters})`);
    }
    barStart = t; barNo++;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '|') { closeBar(); continue; }

    const tie = tok.endsWith('~');
    const body = tie ? tok.slice(0, -1) : tok;
    const slash = body.lastIndexOf('/');
    if (slash < 0) { errors.push(`${label} c.${barNo}: falta duración en "${tok}"`); continue; }

    const dur = durationToQuarters(body.slice(slash + 1));
    if (dur === null) { errors.push(`${label} c.${barNo}: duración inválida en "${tok}"`); continue; }

    const head = body.slice(0, slash);
    if (head === 'r' || head === 'R') { t += dur; continue; }

    const raw = head.startsWith('[') ? head.slice(1, -1).split(',') : [head];
    const pitches = [];
    for (const p of raw) {
      const midi = pitchToMidi(p);
      if (midi === null) errors.push(`${label} c.${barNo}: nota desconocida "${p}"`);
      else pitches.push(midi);
    }
    if (pitches.length) events.push({ start: t, dur, pitches, tie, bar: barNo });
    t += dur;
  }
  if (t > barStart + 1e-6) closeBar();
  return { events, errors, quarters: t };
}

function parseSong(text) {
  const song = { meta: {}, sections: [], order: [], errors: [] };
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;  // '#' no vale: es sostenido

    const sec = /^\[(\w+)\]\s*(.*)$/.exec(line);
    if (sec) {
      current = { id: sec[1], name: sec[2] || sec[1], rh: '', lh: '' };
      song.sections.push(current);
      continue;
    }
    const kv = /^(\w+)\s*:\s*(.*)$/.exec(line);
    if (!kv) { song.errors.push(`Línea no reconocida: "${line}"`); continue; }

    const key = kv[1].toLowerCase(), value = kv[2];
    if (current && (key === 'rh' || key === 'lh')) current[key] += ' ' + value;
    else if (key === 'order') song.order = value.split(/\s+/).filter(Boolean);
    else song.meta[key] = value;
  }

  const meter = /^(\d+)\/(\d+)$/.exec(song.meta.meter || '4/4') || [null, '4', '4'];
  song.beatsPerBar = parseInt(meter[1], 10);
  song.beatUnit = parseInt(meter[2], 10);
  song.meterQuarters = song.beatsPerBar * (4 / song.beatUnit);

  // tempo: "80 dotted-quarter" -> pulso de negra equivalente
  const tempo = (song.meta.tempo || '100 quarter').trim().split(/\s+/);
  song.tempoValue = parseFloat(tempo[0]) || 100;
  song.tempoUnit = (tempo[1] || 'quarter').toLowerCase();
  const unitQuarters = { quarter: 1, 'dotted-quarter': 1.5, half: 2, eighth: 0.5 }[song.tempoUnit] || 1;
  song.quarterBpm = song.tempoValue * unitQuarters;

  for (const s of song.sections) {
    const rh = parseHand(s.rh, song.meterQuarters, `MD [${s.id}]`);
    const lh = parseHand(s.lh, song.meterQuarters, `MI [${s.id}]`);
    s.parsed = { rh, lh };
    s.quarters = Math.max(rh.quarters, lh.quarters);
    s.bars = Math.round(s.quarters / song.meterQuarters);
    song.errors.push(...rh.errors, ...lh.errors);
  }
  if (!song.order.length) song.order = song.sections.map(s => s.id);
  for (const id of song.order) {
    if (!song.sections.some(s => s.id === id)) song.errors.push(`El orden menciona "${id}", que no existe`);
  }
  return song;
}

// Expande el orden a una línea de tiempo plana y une las ligaduras.
function buildTimeline(song) {
  const notes = [], blocks = [];
  let t = 0, barOffset = 0;

  for (const id of song.order) {
    const section = song.sections.find(s => s.id === id);
    if (!section) continue;
    const block = { id, name: section.name, start: t, quarters: section.quarters, firstBar: barOffset + 1 };

    for (const hand of ['rh', 'lh']) {
      for (const ev of section.parsed[hand].events) {
        for (const midi of ev.pitches) {
          const prev = notes.find(n => n.hand === hand && n.midi === midi && n.open &&
                                       Math.abs(n.start + n.dur - (t + ev.start)) < 1e-6);
          if (prev) { prev.dur += ev.dur; prev.open = ev.tie; continue; }
          notes.push({ midi, hand, start: t + ev.start, dur: ev.dur, open: ev.tie,
                       bar: barOffset + ev.bar, block: blocks.length });
        }
      }
    }
    t += section.quarters;
    barOffset += section.bars;
    block.end = t;
    blocks.push(block);
  }
  notes.forEach(n => delete n.open);
  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { notes, blocks, quarters: t, bars: barOffset };
}

window.Notation = { parseSong, buildTimeline, pitchToMidi, midiToName, durationToQuarters };

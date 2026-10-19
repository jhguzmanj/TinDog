#!/usr/bin/env node
// Exporta a MusicXML (partwise 4.0, un piano con 2 pentagramas) las piezas ORIGINALES
// de la app, las que hicimos Jorge y Claude (no las transcritas de una hoja ajena).
//   node tools/export-musicxml.js [carpeta de salida]      (por defecto export/musicxml)
// Lee SONGS del HTML real con jsdom, igual que las pruebas. Ver CLAUDE.md, "Exportar a MusicXML".
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'export', 'musicxml'));

// ---- Qué se exporta y cómo se deletrea (la app guarda todo con sostenidos: A# por Si♭) ----
// fifths: armadura (sostenidos > 0, bemoles < 0). `byBar`: armadura por compás (1-based),
// para la pieza que pasa por 12 tonalidades. `flatsWhenDown`: negras con bemol si la melodía baja.
const MAJOR_FIFTHS = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, Ab: -4, Eb: -3, Bb: -2, F: -1 };
const SPECS = {
  'amanecer': { fifths: 0 },
  'camino-intervalos': { fifths: 0 },
  'dia-de-lluvia': { fifths: 0, mode: 'minor' },
  'suspiro': { fifths: 0, mode: 'minor' },
  'tarea-intervalos': { fifths: 0 },
  'tarea-cromatica': { fifths: 0, flatsWhenDown: true },
  'tarea-inversiones': { fifths: 0 },
  // Un compás por tonalidad en el orden del profe: C G D A E B F# C# G# D# A# F (+ Do final).
  // G#, D# y A# mayor son teóricas (suenan como La♭, Mi♭, Si♭): se escriben con la armadura real.
  'tarea-quintas': { fifths: 0, byBar: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F', 'C'].map(k => MAJOR_FIFTHS[k]) },
  'tarea-pentatonica': { fifths: 0 },
  'penta-acordes': { fifths: 0 },
  'final-perfecta': { fifths: 0 },
  'final-amen': { fifths: 0 },
  'final-picardia': { fifths: 0, mode: 'minor' },
  'final-epico': { fifths: 0 },
  'final-balada': { fifths: -1 },
  'pedal-1': { fifths: 0 }, 'pedal-2': { fifths: 0 }, 'pedal-3': { fifths: 0 },
  'pedal-4': { fifths: 0 }, 'pedal-5': { fifths: 0 }, 'pedal-6': { fifths: 0 },
};
const CREDIT = 'Original de Jorge y Claude (app Piano MIDI Trainer)';

// ---- Teoría mínima ----
const DIV = 12;                       // divisiones por negra: cubre corcheas, semicorcheas y tresillos
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
function keyAlter(fifths){
  const a = {}; LETTERS.forEach(l => a[l] = 0);
  if(fifths > 0) SHARP_ORDER.slice(0, fifths).forEach(l => a[l] = 1);
  if(fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach(l => a[l] = -1);
  return a;
}
// Devuelve { step, alter, octave } para una nota MIDI en una armadura. `flat` fuerza bemol en las alteradas.
function spell(midi, fifths, flat){
  const pc = midi % 12, ka = keyAlter(fifths);
  let step = null, alter = 0;
  for(const l of LETTERS){ if(((NAT_PC[l] + ka[l]) % 12 + 12) % 12 === pc){ step = l; alter = ka[l]; break; } }
  if(step === null){
    const useFlat = flat !== undefined ? flat : fifths < 0;
    for(const l of LETTERS){
      if(useFlat && NAT_PC[l] - 1 === pc){ step = l; alter = -1; break; }
      if(!useFlat && NAT_PC[l] + 1 === pc){ step = l; alter = 1; break; }
      if(NAT_PC[l] === pc){ step = l; alter = 0; break; }
    }
  }
  // octava del nombre de la letra (Si♯3 = Do4 en sonido, no se da en estas piezas)
  const octave = Math.floor((midi - alter) / 12) - 1;
  return { step, alter, octave };
}

// ---- Duraciones en divisiones -> figuras (con puntillo) ----
const FIGURES = [[48, 'whole', 0], [36, 'half', 1], [24, 'half', 0], [18, 'quarter', 1], [12, 'quarter', 0],
  [9, 'eighth', 1], [6, 'eighth', 0], [4.5, '16th', 1], [3, '16th', 0]];
function figures(d){            // descompone d en figuras estándar, mayor primero
  const out = [];
  while(d > 1e-9){
    const f = FIGURES.find(x => x[0] <= d + 1e-9);
    if(!f) throw new Error('duración no representable: ' + d);
    out.push(f); d -= f[0];
  }
  return out;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- Línea de tiempo por mano ----
// lh: sostenida hasta que la izquierda vuelve a cambiar (así suena en la app).
// rh: dura `rhDur` si lo trae, si no su paso; nunca pasa de la siguiente entrada de la derecha.
function timeline(steps){
  const onsets = []; let t = 0;
  steps.forEach(s => { onsets.push(t); t += s.dur * DIV; });
  const total = Math.round(t);
  const lh = [], rh = [];
  steps.forEach((s, i) => {
    const at = Math.round(onsets[i]);
    if(s.lh && s.lh.length) lh.push({ at, notes: s.lh.slice(), fingers: (s.lhF || []).slice() });
    if(s.rh && s.rh.length) rh.push({ at, notes: s.rh.slice(), fingers: (s.rhF || []).slice(), len: Math.round((s.rhDur && s.rhDur > s.dur ? s.rhDur : s.dur) * DIV) });
  });
  lh.forEach((e, i) => { e.end = i + 1 < lh.length ? lh[i + 1].at : total; });
  rh.forEach((e, i) => { e.end = Math.min(e.at + e.len, i + 1 < rh.length ? rh[i + 1].at : total); });
  return { lh, rh, total, onsets: onsets.map(Math.round) };
}

// Parte una mano en eventos por compás (notas con ligadura al cruzar la barra) y rellena con silencios.
function layoutHand(events, measures){     // measures: [{start, len}]
  const bars = measures.map(m => []);
  const place = (m, at, dur, ev, tieIn, tieOut) => bars[m].push({ at, dur, ev, tieIn, tieOut });
  events.forEach(ev => {
    let at = ev.at;
    while(at < ev.end){
      const m = measures.findIndex(x => at >= x.start && at < x.start + x.len);
      const stop = Math.min(ev.end, measures[m].start + measures[m].len);
      place(m, at, stop - at, ev, at > ev.at, stop < ev.end);
      at = stop;
    }
  });
  return bars.map((list, m) => {
    list.sort((a, b) => a.at - b.at);
    const out = []; let pos = measures[m].start; const endM = measures[m].start + measures[m].len;
    list.forEach(x => { if(x.at > pos) out.push({ rest: true, at: pos, dur: x.at - pos }); out.push(x); pos = x.at + x.dur; });
    if(pos < endM) out.push({ rest: true, at: pos, dur: endM - pos });
    return out;
  });
}

// ---- Escritura ----
function build(song, spec){
  const steps = song.steps;
  const meter = song.meter || 4, pickup = song.pickup || 0;
  const tl = timeline(steps);
  // compases: anacrusa opcional + compases de `meter` negras
  const measures = [];
  let pos = 0;
  if(pickup){ measures.push({ start: 0, len: pickup * DIV, implicit: true }); pos = pickup * DIV; }
  while(pos < tl.total){ measures.push({ start: pos, len: meter * DIV }); pos += meter * DIV; }
  const over = measures[measures.length - 1].start + measures[measures.length - 1].len - tl.total;
  if(over !== 0) throw new Error(song.id + ': la pieza no llena compases exactos (sobran ' + over / DIV + ' tiempos)');

  const barKey = mi => { const i = mi - (pickup ? 1 : 0); return (spec.byBar && spec.byBar[i] !== undefined) ? spec.byBar[i] : spec.fifths; };
  const handBars = { 1: layoutHand(tl.rh, measures), 2: layoutHand(tl.lh, measures) };
  // marcas (rótulos) y pedal, por tiempo absoluto
  const marks = [];
  steps.forEach((s, i) => {
    if(s.label) marks.push({ at: tl.onsets[i], kind: 'words', staff: 1, text: s.label });
    if(s.ped) marks.push({ at: tl.onsets[i], kind: 'pedal', staff: 2, ped: s.ped });
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
    '<score-partwise version="4.0">\n' +
    '  <work><work-title>' + esc(song.name) + '</work-title></work>\n' +
    '  <identification><creator type="composer">' + esc(CREDIT) + '</creator>' +
    '<encoding><software>Piano MIDI Trainer · tools/export-musicxml.js</software></encoding></identification>\n' +
    '  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>\n  <part id="P1">\n';

  let prevFifths = null, flatDownPrev = null;
  measures.forEach((M, mi) => {
    const num = pickup ? mi : mi + 1;
    const fifths = barKey(mi);
    xml += '    <measure number="' + num + '"' + (M.implicit ? ' implicit="yes"' : '') + '>\n';
    if(mi === 0 || fifths !== prevFifths){
      xml += '      <attributes>' + (mi === 0 ? '<divisions>' + DIV + '</divisions>' : '') +
        '<key><fifths>' + fifths + '</fifths><mode>' + (spec.mode || 'major') + '</mode></key>' +
        (mi === 0 ? '<time><beats>' + meter + '</beats><beat-type>4</beat-type></time><staves>2</staves>' +
        '<clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>' : '') +
        '</attributes>\n';
      if(mi === 0) xml += '      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>' + song.tempo + '</per-minute></metronome></direction-type><sound tempo="' + song.tempo + '"/></direction>\n';
    }
    prevFifths = fifths;
    const accState = {};                       // alteración vigente por pentagrama + letra + octava en este compás
    for(const staff of [1, 2]){
      if(staff === 2) xml += '      <backup><duration>' + M.len + '</duration></backup>\n';
      handBars[staff][mi].forEach(x => {
        if(x.rest){
          figures(x.dur).forEach(f => {
            xml += '      <note><rest/><duration>' + f[0] + '</duration><voice>' + staff + '</voice><type>' + f[1] + '</type>' + '<dot/>'.repeat(f[2]) + '<staff>' + staff + '</staff></note>\n';
          });
          return;
        }
        // varias figuras si la duración no cabe en una sola (se ligan entre sí)
        const figs = figures(x.dur);
        figs.forEach((f, fi) => {
          const tieStart = x.tieIn || fi > 0;               // llega ligada de algo anterior
          const tieStop = x.tieOut || fi < figs.length - 1;  // sigue ligada a lo siguiente
          x.ev.notes.forEach((midi, ni) => {
            const down = spec.flatsWhenDown ? (flatDownPrev === null ? false : midi < flatDownPrev) : undefined;
            const sp = spell(midi, fifths, down === undefined ? undefined : down);
            const key = staff + sp.step + sp.octave;
            const effective = key in accState ? accState[key] : keyAlter(fifths)[sp.step];
            let acc = '';
            if(effective !== sp.alter){
              acc = sp.alter === 1 ? 'sharp' : sp.alter === -1 ? 'flat' : sp.alter === 0 ? 'natural' : '';
              accState[key] = sp.alter;
            }
            const fing = x.ev.fingers[ni];
            xml += '      <note>' + (ni > 0 ? '<chord/>' : '') +
              '<pitch><step>' + sp.step + '</step>' + (sp.alter ? '<alter>' + sp.alter + '</alter>' : '') + '<octave>' + sp.octave + '</octave></pitch>' +
              '<duration>' + f[0] + '</duration>' +
              (tieStart ? '<tie type="stop"/>' : '') + (tieStop ? '<tie type="start"/>' : '') +
              '<voice>' + staff + '</voice><type>' + f[1] + '</type>' + '<dot/>'.repeat(f[2]) +
              (acc ? '<accidental>' + acc + '</accidental>' : '') + '<staff>' + staff + '</staff>' +
              ((tieStart || tieStop || fing) ? '<notations>' + (tieStart ? '<tied type="stop"/>' : '') + (tieStop ? '<tied type="start"/>' : '') +
                (fing && !tieStart ? '<technical><fingering>' + fing + '</fingering></technical>' : '') + '</notations>' : '') +
              '</note>\n';
          });
        });
        if(staff === 1 && spec.flatsWhenDown) flatDownPrev = x.ev.notes[x.ev.notes.length - 1];
      });
    }
    // Rótulos y pedal: voz 3 en el pentagrama 1, sin notas, solo `forward` para llegar al tiempo exacto
    const here = marks.filter(k => k.at >= M.start && k.at < M.start + M.len).sort((a, b) => a.at - b.at);
    if(here.length){
      xml += '      <backup><duration>' + M.len + '</duration></backup>\n';
      let cur = M.start;
      here.forEach(k => {
        if(k.at > cur){ xml += '      <forward><duration>' + (k.at - cur) + '</duration><voice>3</voice><staff>1</staff></forward>\n'; cur = k.at; }
        if(k.kind === 'words') xml += '      <direction placement="above"><direction-type><words>' + esc(k.text) + '</words></direction-type><voice>3</voice><staff>1</staff></direction>\n';
        else xml += '      <direction placement="below"><direction-type><pedal type="' + (k.ped === 'on' ? 'start' : k.ped === 'off' ? 'stop' : 'change') + '" line="yes"/></direction-type><voice>3</voice><staff>2</staff></direction>\n';
      });
    }
    xml += '    </measure>\n';
  });
  xml += '  </part>\n</score-partwise>\n';
  return { xml, total: tl.total, measures: measures.length, tl };
}

// ---- Programa ----
function main(){
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'piano-midi-trainer.html'), 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const songs = JSON.parse(dom.window.eval('JSON.stringify(SONGS.filter(s => !s.guide))'));
  fs.mkdirSync(OUT, { recursive: true });
  const index = [];
  for(const id of Object.keys(SPECS)){
    const song = songs.find(s => s.id === id);
    if(!song){ console.error('NO ESTÁ en SONGS: ' + id); process.exitCode = 1; continue; }
    const r = build(song, SPECS[id]);
    fs.writeFileSync(path.join(OUT, id + '.musicxml'), r.xml);
    index.push({ id, name: song.name, tempo: song.tempo, meter: song.meter || 4, measures: r.measures, beats: r.total / DIV });
    console.log(id.padEnd(20), String(r.measures).padStart(3) + ' compases', String(r.total / DIV).padStart(4) + ' tiempos');
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  dom.window.close();
  process.exit(process.exitCode || 0);
}
if(require.main === module) main();
module.exports = { build, spell, SPECS, DIV };

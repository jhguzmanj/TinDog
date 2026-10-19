#!/usr/bin/env node
// Vuelve a LEER los .musicxml exportados y los compara con los datos de la app:
// notas (altura), manos, ritmo (con ligaduras unidas), dedos, pedal, rótulos, compás y tempo.
// Si el exportador se equivoca de una nota o de un tiempo, esto lo dice con el compás.
//   node tools/verify-musicxml.js [carpeta]     (usa export/musicxml)
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { SPECS, DIV } = require('./export-musicxml');

const NAT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function readXml(win, file){
  const doc = new win.DOMParser().parseFromString(fs.readFileSync(file, 'utf8'), 'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('XML mal formado: ' + file);
  return doc;
}
const kids = (el, tag) => [...el.children].filter(c => c.tagName === tag);
const txt = (el, tag) => { const c = kids(el, tag)[0]; return c ? c.textContent : null; };

// Reconstruye, por pentagrama, las notas con su inicio absoluto (en divisiones) y su duración con ligaduras unidas.
function readPiece(doc){
  const part = doc.getElementsByTagName('part')[0];
  const staffNotes = { 1: [], 2: [] };      // [{at, end, midi, finger}]
  const pedal = [], words = [], measureLens = [], keys = [];
  let measureStart = 0, tempo = null, meterBeats = null, curKey = null;
  const open = {};                           // ligaduras abiertas por pentagrama+midi
  for(const m of kids(part, 'measure')){
    let cursor = 0, maxCursor = 0, lastChordAt = 0;
    for(const el of m.children){
      if(el.tagName === 'attributes'){
        const k = kids(el, 'key')[0]; if(k) curKey = +txt(k, 'fifths');
        const t = kids(el, 'time')[0]; if(t) meterBeats = +txt(t, 'beats');
      } else if(el.tagName === 'direction'){
        const snd = kids(el, 'sound')[0]; if(snd && snd.getAttribute('tempo')) tempo = +snd.getAttribute('tempo');
        const dt = kids(el, 'direction-type')[0];
        const ped = dt && kids(dt, 'pedal')[0]; const w = dt && kids(dt, 'words')[0];
        if(ped) pedal.push({ at: measureStart + cursor, type: ped.getAttribute('type') });
        if(w) words.push({ at: measureStart + cursor, text: w.textContent });
      } else if(el.tagName === 'backup'){ cursor -= +txt(el, 'duration'); }
      else if(el.tagName === 'forward'){ cursor += +txt(el, 'duration'); maxCursor = Math.max(maxCursor, cursor); }
      else if(el.tagName === 'note'){
        const dur = +txt(el, 'duration'), isChord = kids(el, 'chord').length > 0;
        const at = isChord ? lastChordAt : cursor;
        if(!isChord){ lastChordAt = at; cursor += dur; maxCursor = Math.max(maxCursor, cursor); }
        if(kids(el, 'rest').length) continue;
        const staff = +txt(el, 'staff'), p = kids(el, 'pitch')[0];
        const midi = NAT_PC[txt(p, 'step')] + (+(txt(p, 'alter') || 0)) + (+txt(p, 'octave') + 1) * 12;
        const ties = kids(el, 'tie').map(t => t.getAttribute('type'));
        const fing = el.getElementsByTagName('fingering')[0];
        const abs = measureStart + at, key = staff + ':' + midi;
        if(ties.includes('stop') && open[key]){ open[key].end = abs + dur; if(!ties.includes('start')) delete open[key]; }
        else {
          const n = { at: abs, end: abs + dur, midi, finger: fing ? +fing.textContent : null };
          staffNotes[staff].push(n);
          if(ties.includes('start')) open[key] = n;
        }
      }
    }
    // longitud real del compás = lo que avanzó el cursor del pentagrama 1 (voz 1)
    measureLens.push(maxCursor);
    keys.push(curKey);
    measureStart += maxCursor;
  }
  return { staffNotes, pedal, words, measureLens, keys, tempo, meterBeats, total: measureStart };
}

function expectedFrom(song){
  const exp = { 1: [], 2: [] }, ped = [], words = [];
  let t = 0; const on = [];
  song.steps.forEach(s => { on.push(Math.round(t)); t += s.dur * DIV; });
  const total = Math.round(t);
  const lh = [], rh = [];
  song.steps.forEach((s, i) => {
    if(s.lh && s.lh.length) lh.push({ at: on[i], notes: s.lh, f: s.lhF || [] });
    if(s.rh && s.rh.length) rh.push({ at: on[i], notes: s.rh, f: s.rhF || [], len: Math.round((s.rhDur && s.rhDur > s.dur ? s.rhDur : s.dur) * DIV) });
    if(s.ped) ped.push({ at: on[i], type: s.ped === 'on' ? 'start' : s.ped === 'off' ? 'stop' : 'change' });
    if(s.label) words.push({ at: on[i], text: s.label });
  });
  lh.forEach((e, i) => { e.end = i + 1 < lh.length ? lh[i + 1].at : total; });
  rh.forEach((e, i) => { e.end = Math.min(e.at + e.len, i + 1 < rh.length ? rh[i + 1].at : total); });
  rh.forEach(e => e.notes.forEach((n, k) => exp[1].push({ at: e.at, end: e.end, midi: n, finger: e.f[k] || null })));
  lh.forEach(e => e.notes.forEach((n, k) => exp[2].push({ at: e.at, end: e.end, midi: n, finger: e.f[k] || null })));
  return { exp, ped, words, total };
}

function verify(dir, songs){
  const win = new JSDOM('', { virtualConsole: new VirtualConsole() }).window;
  const problems = [], summary = [];
  for(const id of Object.keys(SPECS)){
    const song = songs.find(s => s.id === id);
    const file = path.join(dir, id + '.musicxml');
    if(!song || !fs.existsSync(file)){ problems.push(id + ': falta el archivo o la pieza'); continue; }
    const got = readPiece(readXml(win, file)), want = expectedFrom(song);
    const P = msg => problems.push(id + ': ' + msg);
    const meter = song.meter || 4;
    if(got.tempo !== song.tempo) P('tempo ' + got.tempo + ' ≠ ' + song.tempo);
    if(got.meterBeats !== meter) P('compás ' + got.meterBeats + ' ≠ ' + meter);
    if(got.total !== want.total) P('largo total ' + got.total / DIV + ' ≠ ' + want.total / DIV + ' tiempos');
    got.measureLens.forEach((l, i) => { if(l !== meter * DIV && !(i === 0 && song.pickup)) P('compás ' + (i + 1) + ' mide ' + l / DIV + ' tiempos'); });
    for(const staff of [1, 2]){
      const norm = a => a.map(n => [n.at, n.end, n.midi, n.finger].join(',')).sort();
      const g = norm(got.staffNotes[staff]), w = norm(want.exp[staff]);
      if(g.length !== w.length) P('pentagrama ' + staff + ': ' + g.length + ' notas ≠ ' + w.length);
      const wset = new Set(w), gset = new Set(g);
      const missing = w.filter(x => !gset.has(x)), extra = g.filter(x => !wset.has(x));
      missing.slice(0, 3).forEach(x => P('pentagrama ' + staff + ' falta (inicio,fin,midi,dedo) ' + x));
      extra.slice(0, 3).forEach(x => P('pentagrama ' + staff + ' sobra ' + x));
    }
    const sig = a => a.map(x => x.at + ':' + (x.type || x.text)).join('|');
    if(sig(got.pedal) !== sig(want.ped)) P('pedal distinto');
    if(sig(got.words) !== sig(want.words)) P('rótulos distintos');
    const spec = SPECS[id];
    const wantKeys = got.keys.map((_, i) => spec.byBar && spec.byBar[i] !== undefined ? spec.byBar[i] : spec.fifths);
    if(got.keys.join() !== wantKeys.join()) P('armaduras por compás ' + got.keys.join() + ' ≠ ' + wantKeys.join());
    summary.push({ id, notes: got.staffNotes[1].length + got.staffNotes[2].length, measures: got.measureLens.length });
  }
  win.close();
  return { problems, summary };
}

if(require.main === module){
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'export', 'musicxml'));
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '..', 'piano-midi-trainer.html'), 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const songs = JSON.parse(dom.window.eval('JSON.stringify(SONGS)'));
  const { problems, summary } = verify(dir, songs);
  summary.forEach(s => console.log('✓', s.id.padEnd(20), s.notes + ' notas', s.measures + ' compases'));
  problems.forEach(p => console.log('✗', p));
  console.log(problems.length ? problems.length + ' problemas' : 'Todo coincide con los datos de la app.');
  process.exit(problems.length ? 1 : 0);
}
module.exports = { verify, readPiece, expectedFrom };

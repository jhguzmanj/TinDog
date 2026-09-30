#!/usr/bin/env node
// Los pasajes idénticos de una misma mano deben llevar los mismos dedos.
//
// Qué cuenta como "pasaje idéntico": compases con las mismas notas, en el mismo lugar y con la
// misma duración, Y con el mismo compás anterior y siguiente dentro de la sección. Sin ese
// contexto, una redonda suelta "se repite" en cien sitios y forzarle el mismo dedo en todos
// empeora la digitación (probado en Cannon fácil: 5 → 15 casos de "mismo dedo en dos teclas
// seguidas"). Los compases iguales se extienden a la tirada completa (todos los compases
// consecutivos que también coinciden) y se comparan como pasaje.
//
// Qué se hace cuando dos apariciones llevan dedos distintos:
//   - los dedos impresos en la partitura (sin '?') NUNCA se tocan; si dos impresos difieren, se
//     lista y se respeta;
//   - los propuestos ('?') se igualan copiando la aparición que tenga MENOS problemas de
//     digitación según `costo()` (no "la primera"): la primera puede traer un defecto y
//     copiarlo a todas partes lo propaga. En empate gana la aparición más temprana.
//
//   node scripts/unificar-dedos.js                 -> solo informa
//   node scripts/unificar-dedos.js --write         -> reescribe songs/*.js
//   node scripts/unificar-dedos.js --write --also /ruta/otro.html   -> y también esa copia

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const also = args.flatMap((a, i) => (a === '--also' ? [args[i + 1]] : []));

global.window = { SONGS: [] };
const run = f => (0, eval)(fs.readFileSync(f, 'utf8').replace(/^const (\w+) =/m, 'var $1 ='));
run(path.join(root, 'js/notation.js'));
const Notation = window.Notation;

// ---------- lectura del texto: una "ranura" por nota escrita ----------

function slotsOf(text) {
  const song = Notation.parseSong(text);
  const lines = text.split('\n');
  const slots = [];
  const offsets = [];
  song.sections.reduce((acc, s, i) => { offsets[i] = acc; return acc + s.bars; }, 0);
  let sec = -1, barOffset = 0;

  lines.forEach((raw, li) => {
    const line = raw.trim();
    if (/^\[(\w+)\]/.test(line)) { sec++; barOffset = offsets[sec]; return; }
    const kv = /^(rh|lh)\s*:\s*(.*)$/i.exec(line);
    if (!kv || sec < 0) return;
    const hand = kv[1].toLowerCase();
    const tokens = kv[2].trim().split(/\s+/).filter(Boolean);
    let t = 0, barStart = 0, barNo = 1, open = new Set();
    tokens.forEach((tok, ti) => {
      if (tok === '|') { barStart = t; barNo++; return; }
      const tie = tok.endsWith('~');
      const body = tie ? tok.slice(0, -1) : tok;
      const slash = body.lastIndexOf('/');
      const [durPart, fingerPart] = body.slice(slash + 1).split(':');
      const dur = Notation.durationToQuarters(durPart);
      const head = body.slice(0, slash);
      if (head === 'r' || head === 'R') { t += dur; open = new Set(); return; }
      const raws = head.startsWith('[') ? head.slice(1, -1).split(',') : [head];
      const fl = fingerPart ? fingerPart.split(',') : [];
      const next = new Set();
      raws.forEach((p, j) => {
        const midi = Notation.pitchToMidi(p);
        const f = fl[j] || '';
        const slot = {
          line: li, tok: ti, j, hand, midi, dur, tie, cont: open.has(midi),
          bar: barOffset + barNo, sec, start: +(t - barStart).toFixed(4),
          finger: parseInt(f, 10), sug: f.endsWith('?'), name: p,
        };
        slot.orig = slot.finger;
        slots.push(slot);
        if (tie) next.add(midi);
      });
      open = next;
      t += dur;
    });
  });
  return { song, lines, slots };
}

// ---------- criterio de digitación (el mismo espíritu que las reglas del proponedor) ----------

// Penaliza lo que un profesor corregiría. Devuelve 0 si no hay nada raro.
function costo(slots, hand) {
  const ss = slots.filter(s => s.hand === hand && !s.cont)
    .sort((a, b) => a.bar - b.bar || a.start - b.start || a.midi - b.midi);
  const onsets = [];
  for (const s of ss) {
    const last = onsets[onsets.length - 1];
    if (last && last[0].bar === s.bar && last[0].start === s.start) last.push(s); else onsets.push([s]);
  }
  let c = 0;
  for (const g of onsets) {                       // acordes: dedos distintos y en el orden de la mano
    for (let i = 1; i < g.length; i++) {
      if (g[i].finger === g[i - 1].finger) c += 5;
      else if (hand === 'rh' ? g[i].finger < g[i - 1].finger : g[i].finger > g[i - 1].finger) c += 3;
    }
  }
  const rep = g => (hand === 'rh' ? g[g.length - 1] : g[0]);   // voz que se lleva la línea
  for (let i = 1; i < onsets.length; i++) {
    const a = rep(onsets[i - 1]), b = rep(onsets[i]);
    const dm = b.midi - a.midi, df = b.finger - a.finger;
    if (dm === 0) { if (df !== 0) c += 1; continue; }
    if (df === 0) { c += 3; continue; }
    const natural = hand === 'rh' ? Math.sign(dm) === Math.sign(df) : Math.sign(dm) === -Math.sign(df);
    if (!natural) {
      const cruce = hand === 'rh'
        ? (dm > 0 && b.finger === 1) || (dm < 0 && a.finger === 1)
        : (dm > 0 && a.finger === 1) || (dm < 0 && b.finger === 1);
      if (!cruce) c += 2;
    }
    if (Math.abs(dm) <= 2 && Math.abs(df) >= 3) c += 1;
  }
  return c;
}

// Mismo dedo en dos teclas distintas seguidas (una mano, notas sueltas): el defecto más claro.
function saltosMismoDedo(slots) {
  let n = 0;
  for (const hand of ['rh', 'lh']) {
    const seq = slots.filter(s => s.hand === hand && !s.cont)
      .sort((a, b) => a.bar - b.bar || a.start - b.start || a.midi - b.midi);
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1], b = seq[i];
      if (a.bar === b.bar && a.start === b.start) continue;
      if (a.finger === b.finger && a.midi !== b.midi) n++;
    }
  }
  return n;
}

// ---------- pasajes idénticos ----------

function unify(text) {
  const { lines, slots } = slotsOf(text);
  const changes = [], printedDiffs = [];

  for (const hand of ['rh', 'lh']) {
    const byBar = {};
    for (const s of slots) if (s.hand === hand) (byBar[s.bar] = byBar[s.bar] || []).push(s);
    for (const ss of Object.values(byBar)) ss.sort((a, b) => a.start - b.start || a.midi - b.midi);
    const bars = Object.keys(byBar).map(Number).sort((a, b) => a - b);
    const sigOf = ss => ss.map(s => `${s.midi}@${s.start}x${s.dur}${s.tie ? '~' : ''}${s.cont ? 'c' : ''}`).join(' ');
    const sigAt = (bar, sec) => (byBar[bar] && byBar[bar][0].sec === sec ? sigOf(byBar[bar]) : null);
    const keyOf = bar => `${sigAt(bar - 1, byBar[bar][0].sec)}<${sigOf(byBar[bar])}>${sigAt(bar + 1, byBar[bar][0].sec)}`;

    // tiradas alineadas: pares de compases con la misma clave, extendidos a todo lo que coincide
    const runs = new Map();
    for (const a of bars) for (const b of bars) {
      if (b <= a || keyOf(a) !== keyOf(b)) continue;
      const sa = byBar[a][0].sec, sb = byBar[b][0].sec;
      let p = 0, q = 0;
      while (sigAt(a - p - 1, sa) !== null && sigAt(a - p - 1, sa) === sigAt(b - p - 1, sb)) p++;
      while (sigAt(a + q + 1, sa) !== null && sigAt(a + q + 1, sa) === sigAt(b + q + 1, sb)) q++;
      const A = a - p, B = b - p, len = p + q + 1;
      if (B <= A + len - 1) continue;              // tiradas que se pisan: no es una repetición
      runs.set(`${A}-${B}-${len}`, { A, B, len });
    }
    const ordered = [...runs.values()].sort((x, y) => x.A - y.A || x.B - y.B);

    const flat = (start, len) => {
      const out = [];
      for (let b = start; b < start + len; b++) for (const s of byBar[b] || []) if (!s.cont) out.push(s);
      return out;
    };

    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const { A, B, len } of ordered) {
        const SA = flat(A, len), SB = flat(B, len);
        if (SA.length !== SB.length) continue;
        const mism = SA.map((s, i) => [s, SB[i]]).filter(([x, y]) => x.finger !== y.finger);
        if (!mism.length) continue;

        // opción 1: A manda (B copia a A) · opción 2: B manda. Válida si no queda ningún propuesto distinto.
        const opciones = [];
        for (const [de, a, quien] of [[SA, SB, 'A→B'], [SB, SA, 'B→A']]) {
          const cambios = [];
          let valida = true;
          de.forEach((src, i) => {
            const dst = a[i];
            if (src.finger === dst.finger) return;
            if (dst.sug) cambios.push([dst, src.finger]);
            else if (src.sug) valida = false;        // el impreso no se puede copiar sobre un impreso
          });
          if (valida) opciones.push({ quien, cambios });
        }
        const viables = opciones.filter(o => o.cambios.length);
        if (!viables.length) continue;
        let mejor = null;
        for (const o of viables) {
          const guardado = o.cambios.map(([s]) => s.finger);
          o.cambios.forEach(([s, f]) => { s.finger = f; });
          o.costo = costo(slots, hand);
          o.cambios.forEach(([s], k) => { s.finger = guardado[k]; });
          if (!mejor || o.costo < mejor.costo) mejor = o;          // empate: la primera (A→B, la aparición más temprana manda)
        }
        mejor.cambios.forEach(([s, f]) => { s.finger = f; });
        moved = true;
      }
      if (!moved) break;
    }

    for (const { A, B, len } of ordered) {
      const SA = flat(A, len), SB = flat(B, len);
      SA.forEach((s, i) => { if (SB[i] && !s.sug && !SB[i].sug && s.finger !== SB[i].finger) {
        printedDiffs.push(`${hand} ${s.name}: c.${s.bar}=${s.finger} c.${SB[i].bar}=${SB[i].finger}`);
      } });
    }
  }

  for (const s of slots) if (s.finger !== s.orig) changes.push(`c.${s.bar} ${s.hand} ${s.name}: ${s.orig}? → ${s.finger}?`);

  // reescribe los tokens cambiados
  const byLine = {};
  for (const s of slots) if (s.finger !== s.orig) (byLine[s.line] = byLine[s.line] || []).push(s);
  const out = lines.slice();
  for (const [li, ss] of Object.entries(byLine)) {
    const m = /^(\s*(?:rh|lh)\s*:\s*)(.*)$/i.exec(lines[li]);
    const tokens = m[2].trim().split(/\s+/).filter(Boolean);
    for (const s of ss) {
      const tok = tokens[s.tok];
      const tie = tok.endsWith('~');
      const body = tie ? tok.slice(0, -1) : tok;
      const slash = body.lastIndexOf('/');
      const [durPart, fingerPart] = body.slice(slash + 1).split(':');
      const fl = fingerPart.split(',');
      fl[s.j] = `${s.finger}?`;
      tokens[s.tok] = `${body.slice(0, slash)}/${durPart}:${fl.join(',')}${tie ? '~' : ''}`;
    }
    out[li] = m[1] + tokens.join(' ');
  }
  return { text: out.join('\n'), changes, printedDiffs, slots };
}

for (const f of fs.readdirSync(path.join(root, 'songs')).sort()) {
  const file = path.join(root, 'songs', f);
  const before = window.SONGS.length;
  run(file);
  for (const entry of window.SONGS.slice(before)) {
    const antes = slotsOf(entry.text).slots;
    const r = unify(entry.text);
    const c0 = ['rh', 'lh'].map(h => costo(antes, h)), c1 = ['rh', 'lh'].map(h => costo(r.slots, h));
    console.log(`\n${entry.id}: ${r.changes.length} dedo(s) igualados` +
      ` · mismo dedo en otra tecla: ${saltosMismoDedo(antes)} → ${saltosMismoDedo(r.slots)}` +
      ` · costo de digitación der ${c0[0]} → ${c1[0]}, izq ${c0[1]} → ${c1[1]}`);
    r.changes.slice(0, 40).forEach(c => console.log('  ' + c));
    if (r.changes.length > 40) console.log(`  … y ${r.changes.length - 40} más`);
    if (r.printedDiffs.length) {
      console.log('  impresos distintos en pasajes idénticos (se respetan):');
      r.printedDiffs.forEach(c => console.log('    ' + c));
    }
    if (WRITE && r.changes.length) {
      for (const target of [file, ...also]) {
        const src = fs.readFileSync(target, 'utf8');
        if (!src.includes(entry.text)) { console.log(`  (aviso) ${target} no contiene el texto de ${entry.id}, no se reescribió`); continue; }
        fs.writeFileSync(target, src.replace(entry.text, () => r.text));
      }
    }
  }
}

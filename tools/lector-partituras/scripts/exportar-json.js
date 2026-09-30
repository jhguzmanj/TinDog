#!/usr/bin/env node
// Regenera piezas-json/*.json con el MISMO exportador que usa el botón «JSON para la app».
// Así el archivo y lo que se copia desde el lector no pueden diferir.
//   node scripts/exportar-json.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = { SONGS: [] };
const load = f => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8').replace(/^const (\w+) =/m, 'var $1 ='));
load('js/notation.js'); global.Notation = window.Notation;
load('js/specexport.js');
for (const f of fs.readdirSync(path.join(root, 'songs')).sort()) load('songs/' + f);
let bad = 0;
for (const entry of window.SONGS) {
  const r = window.SpecExport.build(Notation.parseSong(entry.text), entry);
  if (!r.ok) { console.log(`${entry.id}: NO exportada\n  ` + r.errors.join('\n  ')); bad++; continue; }
  fs.writeFileSync(path.join(root, 'piezas-json', entry.id + '.json'), window.SpecExport.format(r.doc));
  console.log(`${entry.id}: ${r.doc.notes.length} notas, ${r.doc.warnings.length} aviso(s)`);
}
process.exit(bad ? 1 : 0);

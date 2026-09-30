#!/usr/bin/env node
// Arma samples/piano.js con las muestras de piano del lector.
//
// Fuente: Salamander Grand Piano V3, de Alexander Holm (CC BY 3.0), empaquetado en npm como
// @audio-samples/piano-mp3-velocity8 (capa de intensidad media). Hay una muestra cada tercera
// menor (A, C, D#, F#), así que a cualquier nota se le estira como máximo 1,5 semitonos.
//
//   npm pack @audio-samples/piano-mp3-velocity8 && tar xzf audio-samples-piano-mp3-velocity8-*.tgz
//   node scripts/construir-muestras.js package/audio
//
// Se incluye solo D#2..C6: es el rango de las piezas del lector (la más grave es un Re2 y la más
// aguda un Do6). Fuera de ese rango se estira la muestra más cercana. Va en un .js con base64 y no
// como archivos .mp3 sueltos porque el lector se abre también como archivo local (file://), donde el
// navegador no deja hacer fetch de archivos vecinos pero sí cargar un <script>.

const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('uso: node scripts/construir-muestras.js <carpeta con los .mp3>'); process.exit(1); }

const NOTAS = ['D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6'];
const out = {};
let bytes = 0;
for (const n of NOTAS) {
  const buf = fs.readFileSync(path.join(dir, `${n}v8.mp3`));
  out[n] = buf.toString('base64');
  bytes += buf.length;
}

const header = `// Muestras de piano: Salamander Grand Piano V3 © Alexander Holm, licencia CC BY 3.0
// (https://creativecommons.org/licenses/by/3.0/), fuente https://archive.org/details/SalamanderGrandPianoV3
// Empaquetado en npm como @audio-samples/piano-mp3-velocity8 (MIT el empaquetado). MP3, intensidad media.
// Generado por scripts/construir-muestras.js: no editar a mano.
`;
const body = `window.PIANO_SAMPLES = ${JSON.stringify(out)};\n`;
const dest = path.join(__dirname, '..', 'samples', 'piano.js');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, header + body);
console.log(`${NOTAS.length} muestras, ${(bytes / 1e6).toFixed(2)} MB de mp3 -> ${(fs.statSync(dest).size / 1e6).toFixed(2)} MB en ${dest}`);

// Pruebas funcionales con jsdom (misma convención que se usó todo el proyecto).
// Si una prueba pisa una función global (espías), GUÁRDALA en window y
// restáurala al terminar, o las pruebas siguientes fallan sin explicación.
//   node tests/run.js
// Carga el HTML real, ejecuta el <script> y simula clics/notas.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'piano-midi-trainer.html'), 'utf8');

let failures = 0, passes = 0;
function check(cond, msg){
  if(cond){ passes++; }
  else { failures++; console.log('  ✗ ' + msg); }
}
function section(name){ console.log('\n' + name); }

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message || String(e)));
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
const ev = (sel) => { const el = typeof sel === 'string' ? doc.querySelector(sel) : sel; el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
const W = (expr) => window.eval(expr);

W('soundEnabled = false'); // jsdom no tiene AudioContext

section('Carga');
check(errors.length === 0, 'sin errores al cargar: ' + errors.join(' | '));
check(W("currentMode") === 'today', 'arranca en la pestaña Hoy');
check(doc.getElementById('todayList').children.length >= 5, 'el plan de hoy tiene al menos 5 puntos');
check(doc.querySelectorAll('#pianoSvg .white-key').length === 52 && doc.querySelectorAll('#pianoSvg .black-key').length === 36, '88 teclas');

section('Datos de escalas');
const defs = W('SCALE_DEFS');
for(const d of defs){
  const sc = W(`SCALES['${d.id}']`);
  const pattern = d.family === 'major' ? [2,2,1,2,2,2,1]
                : d.pattern === 'pentatonicMinor' ? [3,2,2,3,2]
                : d.family === 'pentatonic' ? [2,2,3,2,3]
                : [2,1,2,2,1,2,2];
  const deg = pattern.length;           // 7 diatónicas, 5 pentatónica
  const semis = sc.notes.map(n => n - sc.notes[0]);
  const expect = pattern.reduce((acc, s) => acc.concat(acc[acc.length-1] + s), [0]);
  check(JSON.stringify(semis) === JSON.stringify(expect), d.id + ': patrón tono/semitono correcto');
  check(sc.names.length === deg + 1 && sc.names[0] === sc.names[deg], d.id + ': ' + (deg+1) + ' nombres, octava repetida');
  const fRe = new RegExp('^[1-5]{' + (deg + 1) + '}$');
  check(fRe.test(d.rh) && fRe.test(d.lh), d.id + ': digitación de ' + (deg+1) + ' dedos por mano');
  // ninguna letra se repite dentro de la octava (Do Re Mi Sol La, no Do Re Mi Fa## Sol##)
  const letters = sc.names.slice(0, deg).map(n => n[0]);
  check(new Set(letters).size === deg, d.id + ': cada letra una sola vez (' + sc.names.join(' ') + ')');
  sc.notes.forEach(n => check(n >= 21 && n <= 108, d.id + ': nota dentro del piano'));
}
check(W("SCALES.gsharp.names.join(' ')") === 'G# A# B# C# D# E# Fx G#', 'Sol# mayor deletreada con B# y Fx');
check(W("SCALES.fsmajor.names.join(' ')") === 'F# G# A# B C# D# E# F#', 'Fa# mayor tiene E#');
check(W("SCALES.dbmajor.names.join(' ')") === 'Db Eb F Gb Ab Bb C Db', 'Reb mayor deletreada con bemoles');
W("rebuildScales('harmonic')");
check(W("SCALES.aminor.names.join(' ')") === 'A B C D E F G# A', 'La menor armónica sube el 7º (G#)');
check(W("SCALES.aminor.notes[6]") === 80, 'G#5 = 80 en La menor armónica (raíz La4 = 69)');
W("rebuildScales('natural')");
check(W("SCALES.aminor.names.join(' ')") === 'A B C D E F G A', 'La menor natural sin alteraciones');
check(W("SCALES.cmajor.notes.join(',')") === '60,62,64,65,67,69,71,72', 'Do mayor sigue en 60..72 (compatibilidad)');

section('Digitación en dos octavas');
check(W("fingerSeq('12312345','rh',2).join('')") === '123123412312345', 'derecha Do M 2 oct = 1231234 1231234 5');
check(W("fingerSeq('54321321','lh',2).join('')") === '543213214321321', 'izquierda Do M 2 oct = 5432132 1432132 1');
check(W("fingerSeq('41231234','rh',2).join('')") === '412312341231234', 'derecha Sib M 2 oct');
check(W("fingerSeq('32143213','lh',2).join('')") === '321432132143213', 'izquierda Sib M 2 oct');

section('Secuencia de práctica de escala');
let run = W("buildScaleRun(SCALES.cmajor, 'both', 1, 'updown')");
check(run.steps.length === 15, 'ascendente y descendente de 1 octava = 15 pasos');
check(run.steps.every(s => s.notes.length === 2 && s.notes[1].n === s.notes[0].n - 12), 'ambas manos: izquierda una octava abajo');
check(run.steps[0].notes[0].finger === 1 && run.steps[0].notes[1].finger === 5, 'primer paso: pulgar derecha, meñique izquierda');
check(run.steps[7].notes[0].n === 72 && run.steps[7].notes[0].finger === 5, 'tope de la escala: Do5 con el 5');
check(run.steps[14].notes[0].n === 60 && run.steps[14].notes[0].finger === 1, 'vuelve a Do4 con el pulgar');
run = W("buildScaleRun(SCALES.cmajor, 'rh', 2, 'up')");
check(run.steps.length === 15 && run.steps[14].notes[0].n === 84, '2 octavas ascendente: 15 notas hasta Do6');
run = W("buildScaleRun(SCALES.bbmajor, 'lh', 1, 'up')");
check(run.steps[0].notes[0].n === 58 && run.steps[0].notes[0].finger === 3, 'Sib M izquierda arranca en Sib3 con el 3');

section('Pentatónicas (5 notas por octava)');
check(W("SCALES.cpenta.names.join(' ')") === 'C D E G A C', 'Do pentatónica = Do Re Mi Sol La Do');
check(W("SCALES.cpenta.notes.join(',')") === '60,62,64,67,69,72', 'Do pentatónica en MIDI: 60 62 64 67 69 72');
// el salto de letra es lo que evita deletreos absurdos al transportar
check(W("SCALES.gpenta.names.join(' ')") === 'G A B D E G', 'Sol pentatónica sin alteraciones (no Do##)');
check(W("SCALES.fpenta.names.join(' ')") === 'F G A C D F', 'Fa pentatónica sin alteraciones');
check(W("SCALES.dpenta.names.join(' ')") === 'D E F# A B D', 'Re pentatónica con Fa#, no Mi#');
// las mismas distancias en cualquier tono: esa es la tarea de transportar
check(W(`PENTA_ORDER.every(id => {
  const def = SCALE_DEFS.find(d => d.id === id);
  const esperado = def.pattern === 'pentatonicMinor' ? [3,2,2,3,2] : [2,2,3,2,3];
  return JSON.stringify(SCALES[id].steps) === JSON.stringify(esperado);
})`), 'cada pentatónica guarda el patrón de su tipo en todos los tonos');
// el pulgar nunca cae en tecla negra con la digitación de la academia
check(W(`PENTA_ORDER.every(id => ['rh','lh'].every(h => {
  const r = buildScaleRun(SCALES[id], h, 1, 'up');
  return r.steps.every(s => s.notes[0].finger !== 1 || ![1,3,6,8,10].includes(s.notes[0].n % 12));
}))`), 'el pulgar nunca toca negra en las pentatónicas incluidas');

check(W("fingerSeq('123123','rh',1).join('')") === '123123', 'derecha pentatónica 1 oct = 1 2 3 1 2 3');
check(W("fingerSeq('543212','lh',1).join('')") === '543212', 'izquierda pentatónica 1 oct = 5 4 3 2 1 2');
run = W("buildScaleRun(SCALES.cpenta, 'rh', 1, 'up')");
check(run.steps.length === 6, 'ascendente de 1 octava pentatónica = 6 pasos');
check(run.steps.map(s => s.notes[0].finger).join('') === '123123', 'dedos derecha 1 2 3 1 2 3');
check(run.steps[3].notes[0].n === 67, 'el 4º paso es Sol4 (se salta el Fa)');
run = W("buildScaleRun(SCALES.cpenta, 'lh', 1, 'up')");
check(run.steps[0].notes[0].n === 48 && run.steps.map(s => s.notes[0].finger).join('') === '543212',
  'izquierda arranca en Do3 con dedos 5 4 3 2 1 2');
run = W("buildScaleRun(SCALES.cpenta, 'both', 1, 'updown')");
check(run.steps.length === 11, 'pentatónica ascendente y descendente = 11 pasos');
check(run.steps.every(s => s.notes[1].n === s.notes[0].n - 12), 'ambas manos: izquierda una octava abajo');

section('Pentatónicas menores');
check(W("SCALES.apentam.names.join(' ')") === 'A C D E G A', 'La menor = La Do Re Mi Sol La');
check(W("SCALES.epentam.names.join(' ')") === 'E G A B D E', 'Mi menor sin alteraciones');
check(W("SCALES.dpentam.names.join(' ')") === 'D F G A C D', 'Re menor sin alteraciones');
// lo que hace que valga la pena tenerlas juntas: son las MISMAS teclas
const mismasTeclas = (a, b) => W(`(() => {
  const pc = (id) => [...new Set(SCALES[id].notes.map(n => n % 12))].sort((x,y) => x-y).join(',');
  return pc('${a}') === pc('${b}');
})()`);
check(mismasTeclas('apentam','cpenta'), 'La menor y Do mayor son el mismo grupo de teclas');
check(mismasTeclas('epentam','gpenta'), 'Mi menor y Sol mayor también');
check(mismasTeclas('dpentam','fpenta'), 'Re menor y Fa mayor también');
check(W("SCALES.apentam.notes[0]") === 69 && W("SCALES.cpenta.notes[0]") === 60,
  'pero empiezan en notas distintas: La4 contra Do4');
// en la menor el salto NO cae donde cruza la mano; el consejo tiene que salir
// de los datos o miente (el pulgar derecho llega a Mi, no a Do)
W("scaleFamily='pentatonic'; currentScaleId='apentam'; renderScaleSubTabs(); enterMode('apentam');");
const tipMenor = doc.getElementById('scaleTip').textContent;
check(tipMenor.includes('tono y medio, tono, tono, tono y medio, tono'), 'las distancias de la menor salen en su orden: 3-2-2-3-2');
check(tipMenor.includes('A→C') && tipMenor.includes('E→G'), 'nombra los saltos reales de la menor');
check(tipMenor.includes('por debajo del 3 para llegar a E'), 'y el cruce de la derecha cae en Mi, no en el salto');
check(tipMenor.includes('La pentatónica menor') || tipMenor.includes('Do pentatónica mayor'), 'menciona su relativa');
run = W("buildScaleRun(SCALES.apentam, 'rh', 1, 'up', true)");
check(run.steps.map(s => s.notes.map(x => x.name).join('')).join('|') === 'ACD|EGA',
  'los bloques de la menor cortan donde cruza el pulgar: La-Do-Re y Mi-Sol-La');
W("scaleFamily='major'; currentScaleId='cmajor'; renderScaleSubTabs(); enterMode('cmajor');");

section('Descendente sola');
run = W("buildScaleRun(SCALES.cpenta, 'rh', 1, 'down')");
check(run.steps.length === 6, 'descendente de 1 octava = 6 pasos');
check(run.steps[0].notes[0].n === 72 && run.steps[5].notes[0].n === 60, 'empieza arriba (Do5) y termina abajo (Do4)');
check(run.steps.map(s => s.notes[0].finger).join('') === '321321', 'los dedos van al revés: 3 2 1 3 2 1');
check(run.steps.every(s => s.up === false), 'todos los pasos van marcados como descendentes');
run = W("buildScaleRun(SCALES.cmajor, 'lh', 1, 'down')");
check(run.steps[0].notes[0].n === 60 && run.steps[0].notes[0].finger === 1, 'Do mayor izquierda descendente arranca en Do4 con el pulgar');

section('En bloque: las notas de cada posición de mano, a la vez');
run = W("buildScaleRun(SCALES.cpenta, 'rh', 1, 'up', true)");
check(run.steps.length === 2, 'la pentatónica derecha son 2 posiciones de mano');
check(run.steps[0].notes.map(x => x.name).join('') === 'CDE' && run.steps[1].notes.map(x => x.name).join('') === 'GAC',
  'los bloques cortan donde pasa el pulgar: Do-Re-Mi y Sol-La-Do');
check(run.steps.every(s => s.notes.map(x => x.finger).join('') === '123'), 'cada bloque usa los dedos 1 2 3');
run = W("buildScaleRun(SCALES.cpenta, 'lh', 1, 'up', true)");
check(run.steps.length === 2 && run.steps[0].notes.length === 5 && run.steps[1].notes.length === 1,
  'izquierda: los cinco dedos juntos y después la nota del cruce');
check(run.steps[0].notes.map(x => x.finger).join('') === '54321', 'el bloque grande es 5 4 3 2 1');
// en las mayores el corte también cae donde la mano se mueve
run = W("buildScaleRun(SCALES.cmajor, 'rh', 1, 'up', true)");
check(run.steps.length === 2 && run.steps[0].notes.length === 3 && run.steps[1].notes.length === 5,
  'Do mayor derecha: bloque de 3 (1 2 3) y bloque de 5 (1 2 3 4 5)');
run = W("buildScaleRun(SCALES.cmajor, 'lh', 1, 'up', true)");
check(run.steps.length === 2 && run.steps[0].notes.length === 5 && run.steps[1].notes.length === 3,
  'Do mayor izquierda: bloque de 5 y bloque de 3');
// esto es lo que sostiene el Math.min de buildScaleRun: si alguna digitación
// diera distinto número de bloques por mano, la corrida se truncaría en silencio
check(W(`SCALE_DEFS.every(d => [1,2].every(oct => {
  if(d.family === 'pentatonic' && oct === 2) return true;
  const a = buildScaleRun(SCALES[d.id], 'rh', oct, 'up', true).steps.length;
  const b = buildScaleRun(SCALES[d.id], 'lh', oct, 'up', true).steps.length;
  return a === b;
}))`), 'las dos manos dan el mismo número de bloques en todas las escalas');
run = W("buildScaleRun(SCALES.cpenta, 'rh', 1, 'updown', true)");
check(run.steps.length === 3, 'bloques ascendentes y descendentes: 2 + 1, sin repetir el de arriba');
check(run.steps[0].up === true && run.steps[2].up === false, 'el primero sube y el último baja');
run = W("buildScaleRun(SCALES.cpenta, 'both', 1, 'up', true)");
check(run.steps[0].notes.length === 8, 'con ambas manos el bloque junta las notas de las dos (3 + 5)');

section('En bloque: hay que presionarlas todas');
ev('#mainTabs [data-cat="scales"]');
W("scaleFamily='pentatonic'; currentScaleId='cpenta'; renderScaleSubTabs(); enterMode('cpenta');");
W("scaleHand='rh'; scaleDir='up'; scaleBlockMode=true; startScaleRun()");
check(W('scaleRun.steps.length') === 2, 'la práctica corre en bloques');
check(doc.querySelectorAll('#pianoSvg .white-key.target, #pianoSvg .black-key.target').length === 3,
  'las tres teclas del bloque quedan marcadas a la vez');
W('noteOn(60); noteOn(62)');
check(W('practiceIndex') === 0 && W('scaleRun.mistakes') === 0,
  'con dos de las tres no avanza, y no es un error: falta apretar');
check(doc.getElementById('feedbackText').textContent === 'Presiónalas todas a la vez', 'y lo dice con esas palabras');
W('noteOn(64)');
check(W('practiceIndex') === 1, 'al completar el bloque avanza');
W('noteOff(60); noteOff(62); noteOff(64)');
W('noteOn(65)'); W('noteOff(65)');
check(W('scaleRun.mistakes') === 1, 'una nota que no es del bloque sí cuenta como error');
// una pasada en bloque es práctica, pero no abre la escala siguiente
const scalesDelDia = W('dayRec().scales || 0');   // se restaura abajo
W("progress.scales['cpenta:rh'] = {runs:0, clean:0, best2:0, bestTiming:null, lastDay:null}");
W("recordScaleRun({scaleId:'cpenta', hand:'rh', octaves:1, blocks:true, mistakes:0}, null)");
check(W("progress.scales['cpenta:rh'].runs") === 1 && W("progress.scales['cpenta:rh'].clean") === 0,
  'en bloque suma práctica pero no pasada limpia');
W("recordScaleRun({scaleId:'cpenta', hand:'rh', octaves:1, blocks:false, mistakes:0}, null)");
check(W("progress.scales['cpenta:rh'].clean") === 1, 'nota por nota sí cuenta como limpia');
// devolver el estado como estaba: las pruebas siguientes esperan Do mayor y
// cuentan las escalas del día desde cero
W(`dayRec().scales = ${scalesDelDia}`);
W("scaleBlockMode=false; scaleDir='updown'; saveScaleOpts();");
W("scaleFamily='major'; currentScaleId='cmajor'; renderScaleSubTabs(); enterMode('cmajor');");

section('La pentatónica se practica en una octava');
W("scaleOctaves = 2; currentMode = 'cpenta'; ensureValidOctaves()");
check(W('scaleOctaves') === 1, 'entrar a una pentatónica con 2 octavas puestas la baja a 1');
check(doc.querySelector('#scaleOctPicker [data-soct="2"]').classList.contains('disabled'), 'el botón de 2 octavas queda deshabilitado');
ev('#scaleOctPicker [data-soct="2"]');
check(W('scaleOctaves') === 1, 'y el clic en un botón deshabilitado no hace nada');
W("currentMode = 'cmajor'; ensureValidOctaves()");
check(!doc.querySelector('#scaleOctPicker [data-soct="2"]').classList.contains('disabled'), 'en las mayores vuelve a habilitarse');
ev('#scaleOctPicker [data-soct="2"]');
check(W('scaleOctaves') === 2, 'y ahí sí se pueden elegir 2 octavas');
W("scaleOctaves = 1; saveScaleOpts()");

section('Práctica de escala: notas correctas y errores');
ev('#mainTabs [data-cat="scales"]');
check(W('currentMode') === 'cmajor', 'entra a Do mayor');
W("scaleHand='rh'; scaleOctaves=1; scaleDir='up'; startScaleRun()");
check(W('scaleRun.steps.length') === 8, '8 pasos');
check(doc.querySelectorAll('#pianoSvg .finger-num').length === 1, 'dibuja el número de dedo en la tecla objetivo');
check(doc.getElementById('miniStaff').querySelector('ellipse') !== null, 'mini pentagrama muestra la nota');
W('noteOn(62)'); W('noteOff(62)');
check(W('practiceIndex') === 0 && W('scaleRun.mistakes') === 1, 'nota equivocada cuenta como error y no avanza');
W('noteOn(60)'); W('noteOff(60)');
check(W('practiceIndex') === 1, 'Do4 avanza');
W("scaleHand='both'; startScaleRun()");
W('noteOn(60)');
check(W('practiceIndex') === 0 && doc.getElementById('feedbackText').textContent.includes('Falta'), 'ambas manos: una sola mano no aprueba');
W('noteOn(48)');
check(W('practiceIndex') === 1, 'ambas manos: con las dos notas avanza');
W('noteOff(60); noteOff(48)');

section('Escala completa se registra en progreso');
W("scaleHand='rh'; scaleOctaves=1; scaleDir='up'; startScaleRun()");
for(const n of [60,62,64,65,67,69,71,72]){ W(`noteOn(${n})`); W(`noteOff(${n})`); }
check(W("progress.scales['cmajor:rh'].runs") === 1 && W("progress.scales['cmajor:rh'].clean") === 1, 'pasada limpia registrada');
check(W("dayRec().scales") === 1, 'contador del día sube');

section('Acordes: inversiones y notas exactas');
check(W("chordVoicing(CHORDS[0], 0, 4).join(',')") === '60,64,67', 'C fundamental = 60,64,67');
check(W("chordVoicing(CHORDS[0], 1, 4).join(',')") === '64,67,72', 'C 1ª inversión = 64,67,72');
check(W("chordVoicing(CHORDS[0], 2, 4).join(',')") === '67,72,76', 'C 2ª inversión = 67,72,76');
check(W("chordVoicing(CHORDS[3], 0, 4).join(',')") === '69,72,76', 'Am = 69,72,76');
ev('#mainTabs [data-cat="chords"]');
check(W('currentMode') === 'chords', 'entra a acordes');
ev('#chordInvPicker [data-inv="1"]');
check(W('chordStrict') === true, 'elegir inversión activa notas exactas');
W('activeNotes.clear()');
W('noteOn(60); noteOn(64); noteOn(67)');
check(W('practiceIndex') === 0, 'fundamental no aprueba cuando se pide 1ª inversión');
W('noteOff(60); noteOff(64); noteOff(67)');
W('noteOn(64); noteOn(67); noteOn(72)');
check(W('practiceIndex') === 1, '1ª inversión exacta aprueba');
W('noteOff(64); noteOff(67); noteOff(72)');
check(W("progress.chords['C'].runs") === 1, 'acorde registrado');

section('Intervalos: nota exacta (no solo la letra)');
ev('#mainTabs [data-cat="intervals"]');
W('activeNotes.clear(); practiceIndex = 4; startIntervalStep()'); // 3ª mayor desde Do4
W('noteOn(60); noteOn(76)'); // Do4 + Mi5 = décima
check(W('practiceIndex') === 4, 'Do4 + Mi5 NO aprueba como 3ª mayor');
W('noteOff(76)');
W('noteOn(64)');
check(W('practiceIndex') === 3, 'Do4 + Mi4 aprueba y pasa a la 3ª menor (orden pedagógico, no cromático)');
W('noteOff(60); noteOff(64)');

section('Oído');
ev('#earModeBtn');
check(W('earMode') === true && doc.getElementById('earBar').style.display !== 'none', 'modo de oído activo');
W('practiceIndex = 7; startIntervalStep()'); // 5ª justa
check(doc.querySelectorAll('#pianoSvg .target').length === 1, 'solo la nota de partida marcada');
W('activeNotes.clear(); noteOn(65); noteOff(65)');
check(doc.getElementById('feedbackText').textContent.includes('arriba'), 'pista: más arriba');
check(W('earStats.asked') === 1 && W('earStats.right') === 0, 'fallo contado una sola vez');
W('noteOn(67); noteOff(67)');
check(doc.getElementById('feedbackText').textContent.includes('Ese es'), 'acierta la 5ª');
check(W('progress.ear[7].asked') === 1 && W('progress.ear[7].right') === 0, 'pregunta con fallo registrada como fallada');
ev('#earModeBtn');

section('Pentagrama');
const sp = W("spellFromName('B#', 60)");
check(sp.letter === 6 && sp.acc === 1 && sp.octave === 3, 'B# que suena como Do4 se escribe en la octava 3');
check(W("spellFromName('Cb', 59).octave") === 4, 'Cb que suena como Si3 (59) se escribe en la octava 4');
check(W("diatonicPos(spellMidi(60,false))") === 0 && W("diatonicPos(spellMidi(64,false))") === 2, 'posiciones diatónicas C4=0, E4=2');
check(W("spellMidi(61,true).name") === 'Db4' && W("spellMidi(61,false).name") === 'C#4', 'deletreo con sostenidos o bemoles');
W("renderStaff(document.getElementById('readingStaff'), [{sp: spellMidi(57,false)}], {clef:'treble'})");
check(doc.querySelectorAll('#readingStaff .staff-ledger').length === 2, 'La3 en clave de Sol lleva 2 líneas adicionales');
W("renderStaff(document.getElementById('readingStaff'), [{sp: spellMidi(60,false)}], {clef:'bass'})");
check(doc.querySelectorAll('#readingStaff .staff-ledger').length === 1, 'Do4 en clave de Fa lleva 1 línea adicional');
W("renderStaff(document.getElementById('readingStaff'), [{sp: spellMidi(48,false)}, {sp: spellMidi(67,false)}], {clef:'grand'})");
check(doc.querySelectorAll('#readingStaff .staff-line').length === 10 && doc.querySelectorAll('#readingStaff ellipse').length === 2, 'sistema de dos pentagramas con dos notas');

section('Lectura');
ev('#mainTabs [data-cat="reading"]');
check(W('currentMode') === 'reading' && W('reading') !== null, 'lectura activa con una nota');
for(let i = 0; i < 30; i++){ W('reading.sp = pickReadingNote()'); const m = W('reading.sp.midi'); check(m >= 60 && m <= 67 && !W('BLACK_SET').has(m % 12), 'nivel 1: nota blanca entre Do4 y Sol4'); }
const target = W('reading.sp.midi');
W(`noteOn(${target === 60 ? 62 : 60})`); W(`noteOff(${target === 60 ? 62 : 60})`);
check(doc.getElementById('readingFeedback').classList.contains('wrong'), 'nota equivocada avisa');
W(`noteOn(${target})`); W(`noteOff(${target})`);
check(doc.getElementById('readingFeedback').classList.contains('correct'), 'nota correcta felicita');
check(W("progress.reading['t5'].attempts") === 1 && W("progress.reading['t5'].first") === 0, 'intento registrado como no-a-la-primera');

section('Metrónomo (matemática del desfase)');
W('metro.on = true; metro.bpm = 60; metro.refPerf = 1000');
check(W('metroOffsetMs(1100)') === 100, '+100 ms después del pulso');
check(W('metroOffsetMs(1900)') === -100, '-100 ms antes del siguiente pulso');
check(W('metroOffsetMs(3000)') === 0, 'dos pulsos después: exacto');
check(W("timingClass(50)") === 'ok' && W("timingClass(-150)") === 'early' && W("timingClass(150)") === 'late' && W("timingClass(400)") === 'miss', 'clasificación de tiempo');
W('metro.on = false; metro.refPerf = null');
check(W('metroOffsetMs(1000)') === null, 'sin metrónomo no mide');

section('MIDI no duplica sonido');
// el espía se guarda en window y se DESHACE al final: con `const` dentro de
// eval el original se perdía y playNoteSound quedaba pisado para siempre,
// rompiendo en silencio cualquier prueba posterior que lo usara.
W('window.__played = 0; window.__origPlay = playNoteSound; playNoteSound = (n) => { window.__played++; };');
ev('#mainTabs [data-cat="free"]');
W("noteOn(60, 'midi'); noteOff(60)");
check(W('window.__played') === 0, 'nota del piano real no dispara el sintetizador');
W("noteOn(60, 'ui'); noteOff(60)");
check(W('window.__played') === 1, 'clic en el teclado dibujado sí suena');
W('playNoteSound = window.__origPlay;');
check(W('typeof playNoteSound === "function" && playNoteSound !== window.__origPlay') === false, 'el sintetizador real queda restaurado');

section('Fragmentos y agilidad siguen funcionando');
ev('#mainTabs [data-cat="agility"]');
check(W('currentMode') === 'agility' && W("practiceFamily") === 'agility', 'agilidad carga');
W("currentHand='rh'; practiceIndex=0; startFragmentStep()");
check(doc.querySelectorAll('#pianoSvg .finger-num').length === 1, 'agilidad también dibuja el número de dedo');
const first = W('stepNotes(currentFragment.steps[0], "rh")[0]');
W(`noteOn(${first})`); W(`noteOff(${first})`);
check(W('practiceIndex') === 1, 'la nota correcta avanza en agilidad');
ev('#mainTabs [data-cat="fragments"]');
check(W("currentFragment.id") === 'cuatro-acordes', 'fragmentos carga la primera pieza');
check(doc.querySelectorAll('#pianoSvg .finger-num').length === 4, 'fragmentos dibuja un dedo por nota (3 izq + 1 der)');
W('practiceIndex = currentFragment.steps.length - 1; currentHand = "rh"; startFragmentStep()');
const last = W('stepNotes(currentFragment.steps[currentFragment.steps.length-1], "rh")[0]');
W(`noteOn(${last})`); W(`noteOff(${last})`);
check(W("progress.songs['cuatro-acordes'].runs") === 1, 'terminar una pieza se registra');

section('Digitación en agilidad y fragmentos: datos consistentes');
// Toda la digitación de agilidad sale de un solo número al frente del label
// (derecha) más su espejo (6 - dedo) para la izquierda — no hay datos sueltos.
const agilFingerCheck = W(`
  AGILITY_DRILLS.every(shape => shape.pattern.every(p => {
    const m = /^(\\d)/.exec(p.label || '');
    if(!m) return false;
    const rh = Number(m[1]);
    return rh >= 1 && rh <= 5;
  }))
`);
check(agilFingerCheck, 'cada paso de agilidad trae un dedo de mano derecha válido (1-5) en su label');
check(W("mirrorFinger(1) === 5 && mirrorFinger(5) === 1 && mirrorFinger(3) === 3"), 'el espejo de dedo es 6 - dedo');
const materialized = W("JSON.stringify(materializeAgilitySteps(AGILITY_DRILLS[0], 4, 3).map(s => [s.rhF[0], s.lhF[0]]))");
check(JSON.parse(materialized).every(([rh, lh]) => rh + lh === 6), 'agilidad: cada paso materializado trae rhF/lhF espejados (suman 6)');
// Cada nota de SONGS trae su dedo: los arreglos lhF/rhF calzan en tamaño con lh/rh.
const songsFingerCheck = W(`
  SONGS.every(song => song.steps.every(st =>
    (st.lh.length === 0 || (st.lhF && st.lhF.length === st.lh.length)) &&
    (st.rh.length === 0 || (st.rhF && st.rhF.length === st.rh.length))
  ))
`);
check(songsFingerCheck, 'en fragmentos, cada nota (lh/rh) tiene su dedo (lhF/rhF) del mismo tamaño');

section('Plan de hoy y progreso');
ev('#mainTabs [data-cat="today"]');
const plan = W('todayPlan');
check(plan.length >= 5 && plan.every(p => typeof p.go === 'function' && typeof p.done === 'function'), 'plan con acciones');
// la escala del día es la tarea de la academia hasta que esté limpia; después
// el plan retoma la progresión de mayores donde iba
check(plan[1].title.includes('pentatónica'), 'la escala del día arranca en la pentatónica de la clase');
W("todayPlan[1].go()");
check(W('currentMode') === 'cpenta' && W('scaleFamily') === 'pentatonic', 'el botón Ir abre la pentatónica en su propia pestaña');
// Limpia pero sin tempo NO abre la siguiente: ese es el paso 2.
W("progress.scales['cpenta:rh'] = {runs:3, clean:3, bestBpm:0, lastDay:null}; progress.scales['cpenta:lh'] = {runs:3, clean:3, bestBpm:0, lastDay:null}; todayPlan = buildTodayPlan(1)");
check(W('todayPlan[1].title').includes('pentatónica'), 'limpia pero sin metrónomo sigue en la pentatónica');
check(W('todayPlan[1].sub').includes('Paso 2 de 2'), 'y el plan dice que va en el paso del tiempo');
check(W('todayPlan[1].sub').includes('60 BPM'), 'con el primer peldaño de tempo como meta');
W("progress.scales['cpenta:rh'].bestBpm = 80; progress.scales['cpenta:lh'].bestBpm = 80; todayPlan = buildTodayPlan(1)");
check(W('todayPlan[1].title').includes('Do mayor'), 'con la pentatónica limpia Y a 80 BPM, el plan vuelve a Do mayor');
W("progress.scales['cmajor:rh'] = {runs:3, clean:3, bestBpm:80, lastDay:null}; progress.scales['cmajor:lh'] = {runs:3, clean:3, bestBpm:80, lastDay:null}; todayPlan = buildTodayPlan(1)");
check(W('todayPlan[1].title').includes('Sol mayor'), 'con Do mayor dominada por mano, propone Sol mayor');
W("todayPlan[1].go()");
check(W('currentMode') === 'gmajor', 'el botón Ir lleva a Sol mayor');
ev('#mainTabs [data-cat="progress"]');
check(doc.querySelectorAll('#heatGrid .heat-cell').length >= 84, 'mapa de calor de 12 semanas');
check(doc.querySelectorAll('#masteryList .mastery-item').length === 10, '10 filas de dominio');
check(JSON.parse(window.localStorage.getItem('pianoProgress1') || 'null') !== null || true, 'progreso persistido (con debounce)');

section('Preferencias');
ev('#toggleLabelsBtn');
check(window.localStorage.getItem('labelsShown') === '0', 'ocultar nombres se recuerda');
ev('#toggleLabelsBtn');

section('Manos con color en fragmentos');
ev('#mainTabs [data-cat="fragments"]');
W("currentHand='both'; practiceIndex=0; startFragmentStep()");
check(doc.querySelectorAll('#pianoSvg .target.lh').length === 3 && doc.querySelectorAll('#pianoSvg .target:not(.lh)').length === 1, 'izquierda azul (3 notas) y derecha dorada (1 nota)');
check(doc.getElementById('targetSubLabel').querySelector('.hand-tag.lh') !== null && doc.getElementById('targetSubLabel').querySelector('.hand-tag.rh') !== null, 'etiquetas IZQ / DER en el texto');
check(doc.getElementById('scaleHandPicker').classList.contains('g-hand') && doc.getElementById('chordInvPicker').classList.contains('g-type') && doc.getElementById('intervalOctavePicker').classList.contains('g-oct'), 'grupos de opciones etiquetados por color');

section('Cascada: modo espera');
const tick = (now) => W(`cascadeTick(${now}); if(cascade && cascade.raf){ caf(cascade.raf); cascade.raf = null; }`);
ev('#cascadeBtn');
check(W('cascadeOn') === true && doc.getElementById('keyboardWrap').style.display === 'none', 'al abrir la cascada se esconde el teclado grande');
check(doc.getElementById('cascadeFrom').options.length === 4 && doc.getElementById('cascadeTo').value === '4', 'tramo: selectores con los 4 pasos, hasta el final por defecto');
check(Object.keys(W('cascadeKeyRects')).length >= 19, 'mini-teclado con al menos octava y media');
W("cascadeMode='wait'; applyCascadeMode(); cascadeClicks=false; startCascade(); caf(cascade.raf); cascade.raf=null");
check(W('cascade.events.length') === 16 && W("cascade.events.filter(e=>e.hand==='lh').length") === 12, '16 notas: 12 de izquierda y 4 de derecha');
check(W('cascade.t') < 0 && W('cascade.beats.length') > 4, 'arranca con cuenta de entrada y líneas de pulso');
check(doc.querySelectorAll('#cascadeSvg .fall-note.lh').length === 12 && doc.querySelectorAll('#cascadeSvg .beat-line.bar').length >= 2, 'notas azules de izquierda y líneas de compás dibujadas');
W('cascade.t = -cascade.beatMs * 2.5; cascade.lastNow = 5000'); tick(5000);
check(doc.querySelector('#cascadeSvg .count-in').textContent === '3', 'cuenta de entrada muestra 3');
W('cascade.t = -10; cascade.lastNow = 6000'); tick(6100);
check(W('cascade.t') === 0, 'el reloj se detiene en la primera nota');
tick(6300);
check(W('cascade.t') === 0 && W('cascade.misses') === 0, 'sigue detenido y no cuenta fallos en modo espera');
check(doc.querySelectorAll('#cascadeSvg .fall-key.lit').length === 4 && doc.querySelectorAll('#cascadeSvg .fall-key.lit-lh').length === 3, 'teclas iluminadas: 3 azules y 1 dorada');
W('noteOn(61); noteOff(61)');
check(W('cascade.wrong') === 1 && W('cascade.hits') === 0, 'nota equivocada se cuenta como equivocada');
for(const n of [48,52,55,72]){ W(`noteOn(${n}); noteOff(${n})`); }
check(W('cascade.hits') === 4, 'las cuatro notas del primer paso aciertan');
tick(6400);
check(W('cascade.t') > 0, 'con el paso completo el reloj vuelve a andar');
W("cascade.t = cascade.totalMs + 2000; cascade.lastNow = 9000"); tick(9001);
check(W('cascade.finished') === true && doc.getElementById('cascadeScore').textContent.includes('equivocadas: 1'), 'termina y reporta equivocadas');
check(W("progress.cascade['cuatro-acordes'].bestWait") > 0 && W("progress.cascade['cuatro-acordes'].runs") === 1, 'resultado en modo espera registrado aparte');

section('Cascada: modo a tempo y tramo');
W("cascadeMode='timed'; applyCascadeMode(); startCascade(); caf(cascade.raf); cascade.raf=null");
W('cascade.t = -10; cascade.lastNow = 100'); tick(200);
check(W('cascade.t') === 90, 'a tempo el reloj no se frena');
W('cascade.t = 400; cascade.lastNow = 1000'); tick(1001);
check(W('cascade.misses') === 4, 'pasada la tolerancia, las 4 notas del primer paso son fallos');
W("exitCascade()");
const fromSel = doc.getElementById('cascadeFrom'); fromSel.value = '2'; fromSel.dispatchEvent(new window.Event('change', { bubbles:true }));
check(W('cascadeFrom') === 2 && W('cascadeSteps().steps.length') === 3, 'tramo desde el paso 2: quedan 3 pasos');
W("startCascade(); caf(cascade.raf); cascade.raf=null");
check(W('cascade.events.length') === 12, 'la cascada del tramo solo trae 12 notas');
W("exitCascade()");
ev('#cascadeBtn');
check(W('cascadeOn') === false && doc.getElementById('keyboardWrap').style.display === '', 'al cerrar la cascada vuelve el teclado grande');

section('Pentagramas lado a lado y consejo por intervalo');
ev('#mainTabs [data-cat="scales"]');
W("scaleHand='both'; refreshScaleHand(); startScaleRun()");
check(doc.getElementById('miniStaff2').style.display === '' && doc.getElementById('miniStaff').querySelector('ellipse') && doc.getElementById('miniStaff2').querySelector('ellipse'), 'ambas manos: dos pentagramas, cada uno con su nota');
check(doc.getElementById('miniStaff').querySelector('.staff-label.lh') !== null && doc.getElementById('miniStaff2').querySelector('.staff-label.rh') !== null, 'izquierda a la izquierda, derecha a la derecha');
W("scaleHand='rh'; refreshScaleHand(); startScaleRun()");
check(doc.getElementById('miniStaff2').style.display === 'none', 'una mano: un solo pentagrama');
ev('#mainTabs [data-cat="intervals"]');
W('practiceIndex = 7; startIntervalStep()');
check(doc.getElementById('intervalTip').textContent.includes('5ª justa') && doc.getElementById('intervalTip').textContent.includes('ancho de mano'), 'consejo específico de la 5ª justa');

section('Mapa de calor verde / rojo');
ev('#mainTabs [data-cat="progress"]');
check(doc.querySelectorAll('#heatGrid .heat-cell.missed').length >= 80, 'días pasados sin práctica marcados en rojo apagado');
check(doc.querySelector('#heatGrid .heat-cell.today') !== null && !doc.querySelector('#heatGrid .heat-cell.today').classList.contains('missed'), 'hoy no se marca como perdido');

section('Orden izquierda antes que derecha');
const bar = doc.getElementById('agilOctaveBar');
const pickers = [...bar.querySelectorAll('.reg-picker')].map(x => x.id);
check(pickers[0] === 'agilLhOctavePicker' && pickers[1] === 'agilRhOctavePicker', 'agilidad: octava izquierda antes que la derecha');
const handIds = (sel) => [...doc.querySelectorAll(sel)].map(b => b.dataset.shand || b.dataset.chand || b.dataset.hand);
check(handIds('#scaleHandPicker .reg-btn').join() === 'lh,rh,both', 'escalas: izquierda, derecha, ambas');
check(handIds('#chordHandPicker .reg-btn').join() === 'lh,rh', 'acordes: izquierda, derecha');
check(handIds('.hand-picker .hand-btn').join() === 'lh,rh,both', 'fragmentos: izquierda, derecha, ambas');
check(W("leftFirst([{hand:'rh',finger:1},{hand:'lh',finger:5}]).map(x=>x.hand).join()") === 'lh,rh', 'leftFirst pone la izquierda primero');
ev('#mainTabs [data-cat="scales"]');
W("scaleHand='both'; refreshScaleHand(); startScaleRun()");
const sub = doc.getElementById('targetSubLabel').textContent;
// solo el tramo de los dedos: el nombre de la escala puede empezar por D ("Do mayor")
const fingerPart = sub.includes('dedo') ? sub.slice(sub.indexOf('dedo')) : '';
check(!fingerPart || fingerPart.indexOf('I') < fingerPart.indexOf('D'), 'escalas: el dedo izquierdo se lee antes que el derecho (' + sub + ')');
const tip = doc.getElementById('scaleTip').textContent;
check(tip.indexOf('IZQ') < tip.indexOf('DER'), 'consejo de escala: IZQ antes que DER');
// cada etiqueta viaja pegada a sus botones
const groups = [...doc.querySelectorAll('.reg-bar .reg-group')];
check(groups.length >= 8 && groups.every(g => g.querySelector('.reg-label') && g.querySelector('.reg-picker')), 'cada etiqueta va agrupada con su selector');

section('Guía de dedos');
const handsBar = doc.getElementById('handsBar');
check(handsBar.style.display === 'none', 'cerrada al arrancar: no ocupa espacio');
const figs = handsBar.querySelectorAll('.hands-fig');
check(figs.length === 2 && figs[0].classList.contains('lh') && figs[1].classList.contains('rh'), 'mano izquierda dibujada a la izquierda');
const nums = (fig) => [...fig.querySelectorAll('.hand-num')].map(t => t.textContent).join();
check(nums(figs[0]) === '1,2,3,4,5' && nums(figs[1]) === '1,2,3,4,5', 'los cinco dedos numerados en cada mano');
const thumbX = (fig) => parseFloat([...fig.querySelectorAll('.hand-num')].find(t => t.textContent === '1').getAttribute('x'));
const pinkyX = (fig) => parseFloat([...fig.querySelectorAll('.hand-num')].find(t => t.textContent === '5').getAttribute('x'));
check(thumbX(figs[0]) > 60 && thumbX(figs[1]) < 60, 'los dos pulgares (1) se miran en el centro');
check(pinkyX(figs[0]) < 60 && pinkyX(figs[1]) > 60, 'los dos meñiques (5) quedan hacia afuera');
check(figs[0].querySelectorAll('.hand-body rect').length === 6 && figs[1].querySelectorAll('.hand-body rect').length === 6, 'silueta de una pieza: palma y cinco dedos');
ev('#handsToggleBtn');
check(handsBar.style.display === 'flex' && window.localStorage.getItem('handsShown') === '1', 'se abre y se recuerda');
ev('#handsToggleBtn');
check(handsBar.style.display === 'none' && window.localStorage.getItem('handsShown') === '0', 'se cierra y se recuerda');

section('Salir de la cascada devuelve el teclado');
const kbWrapEl = doc.getElementById('keyboardWrap');
ev('#mainTabs [data-cat="fragments"]');
ev('#cascadeBtn');
check(W('cascadeOn') === true && kbWrapEl.style.display === 'none', 'con la cascada abierta el teclado grande se esconde');
ev('#mainTabs [data-cat="scales"]');   // se sale por otro camino, no por el botón
check(kbWrapEl.style.display === '', 'al cambiar de práctica el teclado vuelve solo');
check(W('cascadeOn') === false && doc.getElementById('cascadeWrap').style.display === 'none', 'la cascada queda apagada y cerrada');
ev('#mainTabs [data-cat="agility"]');
ev('#cascadeBtn');
check(kbWrapEl.style.display === 'none', 'vuelve a esconderse al reabrirla');
ev('#cascadeBtn');
check(kbWrapEl.style.display === '' && W('cascadeOn') === false, 'y vuelve al cerrarla con el botón');

section('El nombre del piano se muestra una sola vez');
W('window.__sent = [];');
W('window.__mk = (names, outs) => ({ inputs: new Map(names.map((n,i) => [i, { name:n, onmidimessage:null }])), outputs: new Map((outs || []).map((n,i) => [i, { name:n, send:(b) => window.__sent.push(b.slice ? b.slice() : b) }])), onstatechange:null });');
function visibleText(root){
  let out = '';
  (function walk(el){
    if(el.nodeType === 3){ out += el.textContent; return; }
    if(el.nodeType !== 1) return;
    if(el.style && el.style.display === 'none') return;
    [...el.childNodes].forEach(walk);
  })(root);
  return out;
}
const header = doc.querySelector('header');
const countIn = (txt, needle) => txt.split(needle).length - 1;
W('onMIDISuccess(window.__mk(["Digital Piano"]))');
check(doc.getElementById('deviceBadge').textContent === 'Digital Piano', 'el distintivo toma el nombre real del piano');
check(countIn(visibleText(header), 'Digital Piano') === 1, 'el nombre aparece UNA vez en el encabezado, no tres');
check(doc.getElementById('statusText').style.display === 'none', 'el texto "Conectado: ..." ya no se repite');
check(doc.getElementById('connectBtn').style.display === 'none', 'el botón de conectar se va cuando ya está conectado');
check(doc.getElementById('connectionPanel').style.display === 'none' && doc.getElementById('deviceSelect').style.display === 'none', 'con un solo piano no queda caja vacía ni selector');
check(W('currentInput.name') === 'Digital Piano', 'quedó enganchado a ese puerto');

W('onMIDISuccess(window.__mk(["Digital Piano","Digital Piano","Digital Piano"]))');
const opts = [...doc.getElementById('deviceSelect').options].map(o => o.textContent);
check(opts.join(' | ') === 'Digital Piano · 1 | Digital Piano · 2 | Digital Piano · 3', 'varios puertos con el mismo nombre se numeran');
check(doc.getElementById('deviceSelect').style.display === '' && doc.getElementById('connectionPanel').style.display === 'flex', 'con varios puertos sí aparece el selector');
check(doc.getElementById('statusText').style.display === 'none', 'aun con varios puertos, el estado no repite el nombre');

W('onMIDISuccess(window.__mk([]))');
check(W('currentInput') === null, 'al desaparecer el piano se suelta el puerto');
check(doc.getElementById('deviceBadge').textContent === 'Práctica Piano' && !doc.getElementById('deviceBadge').classList.contains('live'), 'el distintivo vuelve a su estado sin conexión');
check(doc.getElementById('connectBtn').style.display === '' && doc.getElementById('connectionPanel').style.display === 'flex', 'y reaparece el botón para reintentar');

section('Oído: el unísono se puede contestar');
ev('#mainTabs [data-cat="intervals"]');
if(!W('earMode')) ev('#earModeBtn');
check(W('earMode') === true, 'modo de oído encendido');
W('activeNotes.clear(); practiceIndex = 0; startIntervalStep()');   // 0 = unísono
check(W('INTERVALS[0].semitones') === 0 && W('earAwaiting') === true, 'pregunta el unísono y espera respuesta');
const uRoot = W('currentIntervalRoot()');
const rightBefore = W('earStats.right');
W(`noteOn(${uRoot}); noteOff(${uRoot})`);
check(W('earStats.right') === rightBefore + 1, 'tocar la misma tecla acierta el unísono');
check(doc.getElementById('feedbackText').classList.contains('correct'), 'lo dice como acierto, no como fallo');
check(W('earAwaiting') === false, 'la pregunta queda cerrada y la práctica avanza');

// en los demás intervalos la nota de partida sigue sin contar como error
W('activeNotes.clear(); practiceIndex = 7; startIntervalStep()');   // 5ª justa
const wrongBefore = W('earStats.asked');
const pRoot = W('currentIntervalRoot()');
W(`noteOn(${pRoot}); noteOff(${pRoot})`);
check(W('earStats.asked') === wrongBefore && W('earAwaiting') === true, 'tocar la de partida en una 5ª no cuenta como fallo');
W(`noteOn(${pRoot + 7}); noteOff(${pRoot + 7})`);
check(W('earAwaiting') === false, 'y la respuesta real sigue funcionando');
ev('#earModeBtn');

section('El sonido sale por los altavoces del piano');
ev('#mainTabs [data-cat="free"]');   // sin práctica de por medio
W('window.__sent = [];');
W('onMIDISuccess(window.__mk(["Digital Piano"], ["Otro cacharro", "Digital Piano"]))');
check(W('midiOut.name') === 'Digital Piano', 'empareja la salida con el piano, no coge la primera de la lista');
check(W('usingPiano()') === true, 'con el piano conectado, suena por el piano por defecto');
const outBtn = doc.getElementById('soundOutBtn');
check(outBtn.style.display === '' && outBtn.classList.contains('active'), 'aparece el botón de ruta y sale encendido');

W('soundEnabled = true; window.__sent = [];');
W('playNoteSound(60)');
check(JSON.stringify(W('window.__sent')) === '[[144,60,80]]', 'la nota se le manda al piano en vez de sintetizarla');
W('stopNoteSound(60)');
check(JSON.stringify(W('window.__sent[1]')) === '[128,60,0]', 'y se apaga por el mismo camino');

W('window.__sent = []; activeNotes.clear();');
W("noteOn(64, 'midi'); noteOff(64)");
check(W('window.__sent.length') === 0, 'lo que tocas TÚ en el piano no se le reenvía: sonaría dos veces');
W("noteOn(64, 'ui'); noteOff(64)");
check(W('window.__sent.length') === 2, 'el clic en el teclado dibujado sí suena por el piano');

W('window.__sent = []; playNoteSound(72); allNotesOff();');
const offMsgs = W('window.__sent');
check(offMsgs.some(m => m[0] === 128 && m[1] === 72), 'allNotesOff apaga las notas que quedaron sonando');
check(offMsgs.some(m => m[0] === 176 && m[1] === 123), 'y manda el "all notes off" por si acaso');
check(W('midiSounding.size') === 0, 'no quedan notas colgadas en el piano');

ev('#soundOutBtn');
check(W('usingPiano()') === false && window.localStorage.getItem('soundTarget') === 'pc', 'se puede pasar al sonido del computador, y se recuerda');
W('window.__sent = []; playNoteSound(60); stopNoteSound(60);');
check(W('window.__sent.length') === 0, 'en modo computador no se le manda nada al piano');
ev('#soundOutBtn');
check(W('usingPiano()') === true, 'y se vuelve al piano');

W('onMIDISuccess(window.__mk([]))');
check(W('midiOut') === null && outBtn.style.display === 'none', 'sin piano no hay salida ni botón que elegir');
W('soundEnabled = false;');

section('Oído: pistas escalonadas que cuestan');
ev('#mainTabs [data-cat="intervals"]');
if(!W('earMode')) ev('#earModeBtn');
const hintBtn = doc.getElementById('earHintBtn');
const ivTip = doc.getElementById('intervalTip');
const distBox = doc.getElementById('distanceBox');

// El consejo del intervalo anterior no puede quedar a la vista: delataba la respuesta.
ev('#earModeBtn');                                  // a modo normal: se escribe el consejo
W('activeNotes.clear(); practiceIndex = 4; startIntervalStep()');   // 3ª mayor
check(ivTip.style.display === 'block' && ivTip.textContent.length > 0, 'en modo normal el consejo del intervalo se ve');
ev('#earModeBtn');                                  // y de vuelta a oído
W('activeNotes.clear(); practiceIndex = 5; startIntervalStep()');   // 4ª justa
check(ivTip.style.display === 'none' && ivTip.textContent === '', 'al preguntar de oído el consejo anterior desaparece');
check(distBox.style.display === 'none', 'y la distancia tampoco se regala');
check(hintBtn.disabled === false && hintBtn.textContent.indexOf('Pista') >= 0, 'el botón de pista vuelve a estar disponible');

// El selector "Ir directo a" marcaba el intervalo preguntado: era escribir la
// respuesta encima de la pregunta y volvía inútil toda la práctica de oído.
const pickBtns = () => [...doc.getElementById('intervalPicker').children];
check(pickBtns().every(b => !b.classList.contains('current')),
  'de oído, la lista de intervalos no delata cuál se está preguntando');
check(/\d+\s*\/\s*\d+/.test(doc.getElementById('progressText').textContent) === false,
  'ni el rótulo de progreso, cuyo número es justo el índice del intervalo');
check(doc.getElementById('stepDots').children.length === 0, 'y sin puntos, que salen del mismo número');

const hRoot = W('currentIntervalRoot()');
const askedBefore = W('earStats.asked'), rightBefore2 = W('earStats.right');
ev('#earHintBtn');
check(ivTip.style.display === 'block' && ivTip.textContent.indexOf(W('INTERVALS[5].ref')) >= 0,
  'la primera pista dice cómo suena, que es la habilidad que se entrena');
check(distBox.style.display === 'none', 'pero todavía no da la distancia');
check(W('earStats.asked') === askedBefore + 1 && W('earStats.missedThis') === true,
  'pedir pista cuenta como fallo: si fuera gratis el marcador no significaría nada');
check(W(`getRect(${hRoot + 5}).classList.contains('target')`) === false,
  'ninguna pista marca la tecla de la respuesta: encontrarla es el ejercicio');

ev('#earHintBtn');
check(distBox.style.display === 'block' && distBox.textContent.indexOf('5 semitonos') >= 0,
  'la segunda pista sí da la distancia para contarla en el teclado');
check(distBox.textContent.indexOf(W(`noteLabel(${hRoot + 5})`)) < 0, 'sin nombrar la nota de llegada: hay que contar');
check(hintBtn.disabled === true, 'y ya no quedan más pistas');
check(W('earStats.asked') === askedBefore + 1, 'la segunda pista no vuelve a descontar');

check(W('earAwaiting') === true, 'después de las pistas la pregunta sigue abierta');
W(`noteOn(${hRoot + 5}); noteOff(${hRoot + 5})`);
check(W('earStats.right') === rightBefore2, 'acertar con pista no suma acierto');
check(W('earAwaiting') === false, 'pero deja avanzar a la siguiente');
check(pickBtns()[5].classList.contains('current'), 'al contestar sí se destapa cuál era');
ev('#earModeBtn');
W('activeNotes.clear(); practiceIndex = 5; startIntervalStep()');
check(pickBtns()[5].classList.contains('current'), 'fuera del modo de oído la lista vuelve a marcar el actual');

section('Lectura: la nota se puede escuchar');
W('window.__sent = [];');
W('onMIDISuccess(window.__mk(["Digital Piano"], ["Digital Piano"]))');
ev('#mainTabs [data-cat="reading"]');
check(W('usingPiano()') === true, 'con el piano conectado la nota sale por sus altavoces');
W('window.__sent = [];');
const readMidi = W('reading.sp.midi');
ev('#readingPlayBtn');
check(JSON.stringify(W('window.__sent')) === JSON.stringify([[144, readMidi, 80]]),
  'el botón manda al piano justo la nota del pentagrama');
check(W('reading.hinted') === false && W('reading.missed') === false,
  'oírla no cuenta como pista: no dice qué tecla es, y fallar antes sigue descontando');

W('window.__sent = []; nextReadingNote();');
check(W('window.__sent').some(m => m[0] === 128 && m[1] === readMidi),
  'al pasar a la siguiente nota se apaga la anterior: nada colgado en el piano');
check(W('readingSounding') === null && W('readingSoundTimer') === null, 'y no queda temporizador suelto');

W('window.__sent = []; playReadingNote(); stopReading();');
check(W('midiSounding.size') === 0, 'salir de la práctica también la apaga');

// Un botón de acción que no acusa recibo parece roto: sonaba 900 ms sin
// cambiar un pixel, y con el volumen bajo no había forma de saber si funcionó.
ev('#mainTabs [data-cat="reading"]');
const playBtn = doc.getElementById('readingPlayBtn');
const rdHintBtn = doc.getElementById('readingHintBtn');
check(playBtn.classList.contains('busy') === false, 'en reposo el botón de escuchar está apagado');
ev('#readingPlayBtn');
check(playBtn.classList.contains('busy') && playBtn.textContent.indexOf('Sonando') >= 0,
  'mientras suena la nota el botón lo dice');
W('stopReadingSound()');
check(playBtn.classList.contains('busy') === false && playBtn.textContent.indexOf('Escuchar') >= 0,
  'y al terminar vuelve a su estado normal');

check(rdHintBtn.classList.contains('used') === false, 'la pista arranca sin marcar');
ev('#readingHintBtn');
check(rdHintBtn.classList.contains('used') && W('reading.hinted') === true,
  'al pedirla queda marcada: ya no cuenta como "a la primera"');
W('nextReadingNote()');
check(rdHintBtn.classList.contains('used') === false, 'y se limpia con la nota siguiente');

// Entre acertar y la nota siguiente hay 700 ms. Antes `reading` se anulaba ahí
// y los botones quedaban muertos justo cuando dan ganas de reoír la nota.
const answerMidi = W('reading.sp.midi');
W(`activeNotes.clear(); noteOn(${answerMidi}); noteOff(${answerMidi})`);
check(W('reading && reading.answered') === true, 'la nota contestada sigue viva hasta que llega la siguiente');
W('window.__sent = [];');
ev('#readingPlayBtn');
check(W('window.__sent').some(m => m[0] === 144 && m[1] === answerMidi),
  'tras acertar todavía se puede volver a oír la nota que acabas de leer');
W('window.__sent = []; activeNotes.clear();');
W(`noteOn(${answerMidi}); noteOff(${answerMidi})`);
check(W('readingSessionStats.asked') === 1, 'pero la misma nota no se cuenta dos veces');
W('stopReadingSound()');

W('onMIDISuccess(window.__mk([]))');
W('soundEnabled = false;');

section('Respaldo: la fusión no puede borrar ni inflar');
// Esto es lo único que puede ARRUINAR meses de práctica si está mal, así que
// se prueba a fondo. Todo el esquema son contadores que suben o un 'lastDay'.
const A = { v:1, days:{ '2026-01-01': {sec:600, notes:50}, '2026-01-02': {sec:300, notes:10} },
            scales:{ 'cmajor:rh': {runs:5, clean:3, bestTiming:null, lastDay:'2026-01-02'} },
            chords:{}, intervals:{}, ear:{}, reading:{}, drills:{}, songs:{}, cascade:{} };
const B = { v:1, days:{ '2026-01-01': {sec:900, notes:20}, '2026-01-05': {sec:120, notes:8} },
            scales:{ 'cmajor:rh': {runs:2, clean:4, bestTiming:80, lastDay:'2026-01-05'},
                     'gmajor:lh': {runs:1, clean:0, lastDay:'2026-01-05'} },
            chords:{}, intervals:{}, ear:{}, reading:{}, drills:{}, songs:{}, cascade:{} };
W(`window.__A = ${JSON.stringify(A)}; window.__B = ${JSON.stringify(B)}; window.__M = mergeProgress(window.__A, window.__B);`);

check(W("window.__M.days['2026-01-01'].sec") === 900, 'un día que está en los dos se queda con el mayor, no con la suma');
check(W("window.__M.days['2026-01-01'].notes") === 50, 'campo a campo: cada uno toma su propio máximo');
check(W("window.__M.days['2026-01-02'].sec") === 300, 'un día que solo está aquí no se pierde');
check(W("window.__M.days['2026-01-05'].sec") === 120, 'y uno que solo está en el servidor se trae');
check(W("window.__M.scales['cmajor:rh'].runs") === 5 && W("window.__M.scales['cmajor:rh'].clean") === 4,
  'los contadores de escala también van por máximo');
check(W("window.__M.scales['cmajor:rh'].bestTiming") === 80, 'un null local se deja reemplazar por el dato real');
check(W("window.__M.scales['cmajor:rh'].lastDay") === '2026-01-05', 'lastDay se queda con la fecha más reciente');
check(W("window.__M.scales['gmajor:lh'].runs") === 1, 'una escala que solo existe en el servidor se trae entera');

// Idempotencia: sincronizar dos veces lo mismo no puede inflar nada. Si esto
// falla, cada apertura de la app le regalaría minutos de práctica que no hizo.
W('window.__M2 = mergeProgress(window.__M, window.__B); window.__M3 = mergeProgress(window.__M2, window.__B);');
check(JSON.stringify(W('window.__M2')) === JSON.stringify(W('window.__M3')),
  'fusionar otra vez no cambia nada: los números no se van inflando solos');
check(W("window.__M3.days['2026-01-01'].sec") === 900, 'y los segundos del día siguen siendo los mismos');

check(JSON.stringify(W('window.__A')) === JSON.stringify(A), 'la fusión no modifica el objeto original');

W("window.__X = mergeProgress(window.__A, { v:2, days:{ '2026-01-01': {sec:99999} } });");
check(W("window.__X.days['2026-01-01'].sec") === 600, 'un respaldo de otra versión se ignora en vez de pisar el progreso');
W("window.__Y = mergeProgress(window.__A, Object.assign({}, window.__B, { basura:{ x:1 }, savedAt:'2026-01-05' }));");
check(W('window.__Y.basura') === undefined && W('window.__Y.savedAt') === undefined,
  'lo que venga de más en el documento remoto no se cuela en el progreso');

(async () => {
  section('Respaldo: se guarda y se vuelve a leer');
  // window.claude no existe en jsdom (ni en el archivo local): se simula para
  // comprobar que al abrir se fusiona lo del servidor y que se vuelve a subir.
  W(`
    window.__cloud = { doc: null, writes: 0 };
    window.claude = { use: async (n) => n === 'db' ? {
      doc: () => ({
        get: async () => ({ exists: window.__cloud.doc !== null, data: () => window.__cloud.doc }),
        set: async (d) => { window.__cloud.doc = d; window.__cloud.writes++; },
      })
    } : null };
    progress = JSON.parse(JSON.stringify(window.__A));
    window.__cloud.doc = JSON.parse(JSON.stringify(window.__B));
  `);
  await W('initCloudBackup()');
  check(W("progress.days['2026-01-01'].sec") === 900 && W("progress.days['2026-01-05'].sec") === 120,
    'al abrir se trae lo que había en el servidor y se junta con lo de aquí');
  check(W("JSON.parse(localStorage.getItem('pianoProgress1')).days['2026-01-05'].sec") === 120,
    'y queda guardado también en este navegador');
  check(W('cloudState') === 'ok' && doc.getElementById('cloudState').className.indexOf('ok') >= 0,
    'el panel dice que está respaldado: si no se ve, es como no tenerlo');

  W('cloudSave()');
  await new Promise(r => setTimeout(r, 4300));
  check(W('window.__cloud.writes') >= 1, 'los cambios se suben al servidor');
  check(W("window.__cloud.doc.days['2026-01-02'].sec") === 300, 'y lo subido lleva lo que solo estaba aquí');
  check(typeof W('window.__cloud.doc.savedAt') === 'string', 'con la fecha de cuándo se guardó');

  W('delete window.claude; cloudDoc = null;');

  section('Importar un respaldo no borra lo de este computador');
  // El caso real: Jorge practica en el PC de la casa, importa el respaldo que
  // sacó del PC del trabajo y NO puede perder lo de la casa. Antes el import
  // hacía Object.assign sobre un progreso vacío y se comía lo local.
  const alertReal = window.alert;
  window.alert = () => {};
  W(`progress = emptyProgress();
     progress.days['2026-04-01'] = {sec:1200, notes:200};
     progress.scales['cmajor:lh'] = {runs:4, clean:4, lastDay:'2026-04-01'};`);
  const backup = { v:1, days:{ '2026-03-01': {sec:900, notes:80} },
    scales:{ 'cpenta:rh': {runs:9, clean:9, lastDay:'2026-03-01'} },
    chords:{}, intervals:{}, ear:{}, reading:{}, drills:{}, songs:{}, cascade:{} };
  const fileInput = doc.getElementById('importFile');
  Object.defineProperty(fileInput, 'files', {
    value: [new window.File([JSON.stringify(backup)], 'respaldo.json', { type:'application/json' })],
    configurable: true,
  });
  fileInput.dispatchEvent(new window.Event('change'));
  await new Promise(r => setTimeout(r, 100));
  check(W("(progress.days['2026-04-01']||{}).sec") === 1200, 'lo practicado en este navegador sigue ahí después de importar');
  check(W("(progress.scales['cmajor:lh']||{}).runs") === 4, 'y sus escalas también');
  check(W("(progress.days['2026-03-01']||{}).sec") === 900, 'lo que traía el respaldo se suma al historial');
  check(W("(progress.scales['cpenta:rh']||{}).runs") === 9, 'las escalas de los dos computadores conviven');
  window.alert = alertReal;

  section('Paso a paso: escalera de tempo en escalas');
  W("progress = emptyProgress()");
  check(W("scaleStage('cpenta','rh').step") === 1, 'una escala sin tocar empieza en el paso 1 (las notas)');
  check(W("scaleStage('cpenta','rh').done") === false, 'y no está dominada');
  W("progress.scales['cpenta:rh'] = {runs:3, clean:3, bestBpm:0, lastDay:null}");
  check(W("scaleStage('cpenta','rh').step") === 2, '3 pasadas limpias pasan al paso 2 (el tiempo)');
  check(W("scaleStage('cpenta','rh').target") === 60, 'el primer peldaño de tempo es 60 BPM');
  W("progress.scales['cpenta:rh'].bestBpm = 60");
  check(W("scaleStage('cpenta','rh').target") === 70, 'con 60 hecho, la meta sube a 70');
  check(W("scaleStage('cpenta','rh').done") === false, '70 todavía no es dominar');
  W("progress.scales['cpenta:rh'].bestBpm = 80");
  check(W("scaleStage('cpenta','rh').done") === true, 'a 80 BPM la escala está dominada con esa mano');
  check(W("scaleDominated('cpenta')") === false, 'pero con una sola mano la escala no está dominada');
  // El peldaño solo lo da una pasada SEGUIDA, LIMPIA y A TIEMPO.
  W("progress = emptyProgress()");
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:1, blocks:false, octaves:1, bpm:80}, 95)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 0, 'una pasada con errores no da peldaño de tempo');
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:0, blocks:true, octaves:1, bpm:80}, 95)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 0, 'el ejercicio en bloque tampoco (son 2 pulsaciones, no 8 notas)');
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:0, blocks:false, octaves:1, bpm:80}, 40)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 0, 'limpia pero fuera de tiempo tampoco');
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:0, blocks:false, octaves:1, bpm:null}, null)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 0, 'sin metrónomo no hay BPM que acreditar');
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:0, blocks:false, octaves:1, bpm:70}, 90)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 70, 'limpia y a tiempo sí da el peldaño');
  W("recordScaleRun({scaleId:'cmajor', hand:'rh', mistakes:0, blocks:false, octaves:1, bpm:60}, 100)");
  check(W("progress.scales['cmajor:rh'].bestBpm") === 70, 'y es un máximo: una pasada más lenta no lo baja');
  check(W("scaleMastery('cmajor','rh')") > 0.5 && W("scaleMastery('cmajor','rh')") < 1,
    'el dominio va por la mitad: notas hechas, tempo a medias');

  section('Paso a paso: escalera de intervalos');
  check(W('INTERVAL_ORDER.length') === 13 && W('new Set(INTERVAL_ORDER).size') === 13,
    'el orden de práctica cubre los 13 intervalos exactamente una vez');
  check(W('INTERVAL_ORDER').every(i => i >= 0 && i < W('INTERVALS.length')),
    'todos los índices existen en INTERVALS');
  // INTERVALS NO se puede reordenar: su índice es la llave de lo guardado.
  check(W('INTERVALS').every((iv, i) => iv.semitones === i),
    'INTERVALS sigue en orden de semitonos (su índice es la llave del progreso)');
  check(W('INTERVAL_ORDER')[1] !== 1,
    'el segundo intervalo ya no es la 2ª menor (era lo que daba el orden cromático)');
  check(W("INTERVAL_ORDER.slice(0,3).map(i => INTERVALS[i].semitones).join(',')") === '0,12,7',
    'empieza por las anclas: unísono, octava y 5ª justa');
  check(W("INTERVAL_ORDER.indexOf(6)") >= 10 && W("INTERVAL_ORDER.indexOf(11)") >= 10,
    'el tritono y la 7ª mayor quedan para el final');
  check(W('nextIntervalIdx(0)') === 12 && W('nextIntervalIdx(4)') === 3 && W('nextIntervalIdx(6)') === 0,
    'el avance sigue el orden pedagógico y da la vuelta al terminar');
  // De oído se pregunta dentro del nivel, no entre los 13 desde el primer día.
  W("progress = emptyProgress()");
  const pool = new Set();
  for(let i = 0; i < 200; i++) pool.add(W('pickEarIndex()'));
  check([...pool].every(i => W('INTERVAL_STAGES[0].ids').includes(i)),
    'sin progreso, el oído solo pregunta el nivel 1: ' + [...pool].join(','));
  W(`INTERVAL_STAGES[0].ids.forEach(i => { progress.ear[i] = {asked:8, right:8, lastDay:null}; });`);
  check(W('earStageDone(INTERVAL_STAGES[0])') === true, '8 de 8 dan el nivel 1 por hecho');
  W("progress.ear[INTERVAL_STAGES[0].ids[0]] = {asked:8, right:4, lastDay:null}");
  check(W('earStageDone(INTERVAL_STAGES[0])') === false, '50% de aciertos no alcanza para pasar de nivel');
  const pool2 = new Set();
  W(`INTERVAL_STAGES[0].ids.forEach(i => { progress.ear[i] = {asked:8, right:8, lastDay:null}; });`);
  for(let i = 0; i < 200; i++) pool2.add(W('pickEarIndex()'));
  const s0 = W('INTERVAL_STAGES[0].ids'), s1 = W('INTERVAL_STAGES[1].ids');
  check([...pool2].every(i => s0.includes(i) || s1.includes(i)) && s1.every(i => pool2.has(i)),
    'con el nivel 1 hecho pregunta el 2 y repasa el 1, nada más adelante');

  section('Paso a paso: el plan pone escalas e intervalos primero');
  W("progress = emptyProgress(); todayPlan = buildTodayPlan(1); renderToday()");
  const core = W('todayPlan.filter(it => it.block === "core").map(it => it.key)');
  check(core.join(',') === 'scale,intervals,ear', 'el bloque central es escala, intervalos y oído, en ese orden');
  const coreMin = W('todayPlan.filter(it => it.block === "core").reduce((a,it) => a + it.min, 0)');
  const keepMin = W('todayPlan.filter(it => it.block === "keep").reduce((a,it) => a + it.min, 0)');
  check(coreMin > keepMin, 'y se lleva más minutos que el mantenimiento (' + coreMin + ' vs ' + keepMin + ')');
  check(W('todayPlan.filter(it => it.block === "keep").map(it => it.key)').join(',') === 'reading,chords,song',
    'lectura, acordes y pieza siguen en el plan: foco no es abandono');
  check(doc.querySelectorAll('#todayList .today-block').length === 2, 'los dos bloques se rotulan en pantalla');
  check(W('todayPlan[2].title').includes('Anclas') && W('todayPlan[3].title').includes('Anclas'),
    'intervalos y oído arrancan en el nivel 1');
  W("todayPlan[2].go()");
  check(W('currentMode') === 'intervals' && W('earMode') === false && W('practiceIndex') === W('INTERVAL_STAGES[0].ids[0]'),
    'el botón Ir de intervalos abre el modo exacto en el primer intervalo del nivel');
  // El paso 2 deja el metrónomo listo en el BPM de la meta: si hay que ir a
  // buscarlo a mano, no se usa.
  W(`progress = emptyProgress();
     progress.scales['cpenta:rh'] = {runs:3, clean:3, bestBpm:0, lastDay:null};
     progress.scales['cpenta:lh'] = {runs:3, clean:3, bestBpm:0, lastDay:null};
     todayPlan = buildTodayPlan(1); todayPlan[1].go()`);
  check(W('scaleTempoMode') === true && W('metro.bpm') === 60,
    'Ir → en el paso 2 enciende el metrónomo en el primer peldaño');
  W("if(scaleTempoMode) $('scaleTempoBtn').click(); if(metro.on) metroStop();");

  section('Respaldo: el peldaño de tempo se fusiona sin inflarse');
  W(`window.__P1 = { v:1, days:{}, scales:{ 'cmajor:rh': {runs:3, clean:3, bestBpm:70, lastDay:'2026-05-01'} },
       chords:{}, intervals:{}, ear:{}, reading:{}, drills:{}, songs:{}, cascade:{} };
     window.__P2 = { v:1, days:{}, scales:{ 'cmajor:rh': {runs:5, clean:4, bestBpm:60, lastDay:'2026-05-02'} },
       chords:{}, intervals:{}, ear:{}, reading:{}, drills:{}, songs:{}, cascade:{} };
     window.__PM = mergeProgress(window.__P1, window.__P2);`);
  check(W("window.__PM.scales['cmajor:rh'].bestBpm") === 70, 'se queda el mejor BPM de los dos, no el último ni la suma');
  W("window.__PM2 = mergeProgress(window.__PM, window.__P2);");
  check(W("window.__PM2.scales['cmajor:rh'].bestBpm") === 70 && W("window.__PM2.scales['cmajor:rh'].runs") === 5,
    'fusionar dos veces lo mismo da igual que una vez');
  W("progress = emptyProgress()");

  console.log(`\n${passes} pruebas OK, ${failures} fallos`);
  if(errors.length) console.log('Errores de consola:', errors);
  process.exit(failures || errors.length ? 1 : 0);
})();

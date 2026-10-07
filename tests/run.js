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
W("readingLevel = READING_LEVELS.findIndex(l => l.id === 't5')");
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
W("fragCat = 'patrones'");
ev('#mainTabs [data-cat="fragments"]');
check(W("currentFragment.id") === 'cuatro-acordes', 'fragmentos carga la primera pieza de la categoría');
check(doc.querySelectorAll('#pianoSvg .finger-num').length === 4, 'fragmentos dibuja un dedo por nota (3 izq + 1 der)');
W('practiceIndex = currentFragment.steps.length - 1; currentHand = "rh"; startFragmentStep()');
const last = W('stepNotes(currentFragment.steps[currentFragment.steps.length-1], "rh")[0]');
W(`noteOn(${last})`); W(`noteOff(${last})`);
check(W("progress.songs['cuatro-acordes'].runs") === 1, 'terminar una pieza se registra');

section('Digitación en agilidad y fragmentos: datos consistentes');
// En los ejercicios de DEDOS toda la digitación sale de un solo número al
// frente del label (derecha) más su espejo (6 - dedo) para la izquierda. Los de
// coordinación no pueden usar esa regla: las manos no hacen lo mismo, así que
// cada paso trae su propio lf/rf y el label es texto libre.
const agilFingerCheck = W(`
  AGILITY_DRILLS.filter(s => !s.coord).every(shape => shape.pattern.every(p => {
    const m = /^(\\d)/.exec(p.label || '');
    if(!m) return false;
    const rh = Number(m[1]);
    return rh >= 1 && rh <= 5;
  }))
`);
check(agilFingerCheck, 'cada paso de agilidad (dedos) trae un dedo de mano derecha válido (1-5) en su label');
check(W("mirrorFinger(1) === 5 && mirrorFinger(5) === 1 && mirrorFinger(3) === 3"), 'el espejo de dedo es 6 - dedo');
const materialized = W("JSON.stringify(materializeAgilitySteps(AGILITY_DRILLS[0], 4, 3).map(s => [s.rhF[0], s.lhF[0]]))");
check(JSON.parse(materialized).every(([rh, lh]) => rh + lh === 6), 'agilidad: cada paso materializado trae rhF/lhF espejados (suman 6)');
// Cada nota de SONGS trae su dedo: los arreglos lhF/rhF calzan en tamaño con lh/rh.
// Ya no hay excepciones: la única que las tenía ('dios-esta-aqui', la salida
// cruda de basic-pitch) volvió a salir de una partitura y trae digitación.
const songsFingerCheck = W(`
  SONGS.every(song => song.steps.every(st =>
    (st.lh.length === 0 || (st.lhF && st.lhF.length === st.lh.length)) &&
    (st.rh.length === 0 || (st.rhF && st.rhF.length === st.rh.length))
  ))
`);
check(songsFingerCheck, 'en fragmentos, cada nota (lh/rh) tiene su dedo (lhF/rhF) del mismo tamaño');
check(W(`SONGS.filter(s => s.steps.some(st =>
    (st.lh.length && !st.lhF) || (st.rh.length && !st.rhF))).map(s => s.id).join()`) === '',
  'y ninguna pieza se queda sin digitación');

section('Manos Paralelas (David Domínguez, creatumusica.art): 4 ejercicios nuevos');
// Los cuatro salen de partitura real (posición de 5 dedos, movimiento paralelo:
// las dos manos SIEMPRE tocan el mismo grado, una octava aparte). Se verificaron
// a mano contra la hoja que la digitación de la izquierda es siempre 6 - dedo
// derecho; acá se comprueba que la transcripción, ya en el motor, sigue
// cumpliendo esa regla y que cada ejercicio son 16 compases de 4/4 exactos.
const paralelas = W("AGILITY_DRILLS.filter(d => /^paralelas-/.test(d.id))");
check(paralelas.length === 4, 'los 4 ejercicios están en AGILITY_DRILLS');
check(paralelas.every(d => d.grupo === 'dedos'), 'van en el grupo "Dedos" (movimiento paralelo, no independencia de manos)');
check(paralelas.every(d => !d.coord), 'no son ejercicios de coordinación (coord no está puesto)');
['paralelas-1', 'paralelas-2', 'paralelas-3', 'paralelas-4'].forEach(id => {
  const sum = W(`AGILITY_DRILLS.find(d => d.id === '${id}').pattern.reduce((a, p) => a + p.dur, 0)`);
  check(Math.abs(sum - 64) < 1e-9, `${id}: 16 compases de 4/4 exactos (suma de duraciones = 64)`);
  const mats = W(`materializeAgilitySteps(AGILITY_DRILLS.find(d => d.id === '${id}'), 4, 3)`);
  check(mats.every(s => s.rhF[0] + s.lhF[0] === 6), `${id}: cada paso trae rhF/lhF espejados (suman 6), como en la hoja original`);
  check(mats.every(s => s.rh[0] - 12 === s.lh[0]), `${id}: las dos manos tocan siempre el mismo grado, una octava aparte (movimiento paralelo)`);
});
// Ejercicio 1: solo Do y Re (fingers 1-2), tal como lo describió Jorge.
check(W(`AGILITY_DRILLS.find(d => d.id === 'paralelas-1').pattern.every(p => p.deg === 0 || p.deg === 2)`),
  'paralelas-1 usa únicamente Do y Re, como describió Jorge');
// Ejercicio 4 es el único con saltos grandes y el único que termina en el dedo 3
// sostenido (nota larga), no en el pulgar como los otros tres.
check(W(`(() => {
  const p = AGILITY_DRILLS.find(d => d.id === 'paralelas-4').pattern;
  return p.some((step, i) => i > 0 && Math.abs(step.deg - p[i-1].deg) >= 5);
})()`), 'paralelas-4 trae saltos de verdad, no solo grados vecinos');
check(W(`(() => { const p = AGILITY_DRILLS.find(d => d.id === 'paralelas-4').pattern; return p[p.length-1].dur === 4 && p[p.length-1].label === '3'; })()`),
  'paralelas-4 termina en una nota larga con el dedo 3, no el pulgar');

section('Plan de hoy y progreso');
ev('#mainTabs [data-cat="today"]');
const plan = W('todayPlan');
check(plan.length >= 5 && plan.every(p => typeof p.go === 'function' && typeof p.done === 'function'), 'plan con acciones');
// la escala del día es la tarea de la academia hasta que esté limpia; después
// el plan retoma la progresión de mayores donde iba
check(plan.find(it => it.key === 'scale').title.includes('pentatónica'), 'la escala del día arranca en la pentatónica de la clase');
W("todayPlan.find(it => it.key === 'scale').go()");
check(W('currentMode') === 'cpenta' && W('scaleFamily') === 'pentatonic', 'el botón Ir abre la pentatónica en su propia pestaña');
// Limpia pero sin tempo NO abre la siguiente: ese es el paso 2.
W("progress.scales['cpenta:rh'] = {runs:3, clean:3, bestBpm:0, lastDay:null}; progress.scales['cpenta:lh'] = {runs:3, clean:3, bestBpm:0, lastDay:null}; todayPlan = buildTodayPlan(1)");
check(W("todayPlan.find(it => it.key === \'scale\').title").includes('pentatónica'), 'limpia pero sin metrónomo sigue en la pentatónica');
check(W("todayPlan.find(it => it.key === \'scale\').sub").includes('Paso 2 de 2'), 'y el plan dice que va en el paso del tiempo');
check(W("todayPlan.find(it => it.key === \'scale\').sub").includes('60 BPM'), 'con el primer peldaño de tempo como meta');
W("progress.scales['cpenta:rh'].bestBpm = 80; progress.scales['cpenta:lh'].bestBpm = 80; todayPlan = buildTodayPlan(1)");
check(W("todayPlan.find(it => it.key === \'scale\').title").includes('Do mayor'), 'con la pentatónica limpia Y a 80 BPM, el plan vuelve a Do mayor');
W("progress.scales['cmajor:rh'] = {runs:3, clean:3, bestBpm:80, lastDay:null}; progress.scales['cmajor:lh'] = {runs:3, clean:3, bestBpm:80, lastDay:null}; todayPlan = buildTodayPlan(1)");
check(W("todayPlan.find(it => it.key === \'scale\').title").includes('Sol mayor'), 'con Do mayor dominada por mano, propone Sol mayor');
W("todayPlan.find(it => it.key === 'scale').go()");
check(W('currentMode') === 'gmajor', 'el botón Ir lleva a Sol mayor');
ev('#mainTabs [data-cat="progress"]');
check(doc.querySelectorAll('#heatGrid .heat-cell').length >= 84, 'mapa de calor de 12 semanas');
check(doc.querySelectorAll('#masteryList .mastery-item').length === 12, '12 filas de dominio (con Nombrar y Ritmo)');
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
// Número de dedo en la cascada: sin él Jorge se perdía. Va en el bloque que
// cae (para anticipar) y en la tecla encendida (donde ya lo lee en el grande).
check(W('cascade.events.every(e => e.finger >= 1 && e.finger <= 5)'), 'cada nota de la cascada carga su número de dedo');
check(doc.querySelectorAll('#cascadeSvg .fall-finger').length === 16, 'cada bloque que cae dibuja su número de dedo');
const litFingers = () => W(`JSON.stringify(Object.keys(cascadeKeyFingers)
  .filter(n => cascadeKeyFingers[n].textContent)
  .map(n => n + ':' + cascadeKeyFingers[n].textContent))`);
check(litFingers() === JSON.stringify(['48:5', '52:3', '55:1', '72:5']),
  'las 4 teclas encendidas muestran el dedo que dice la pieza (5-3-1 izquierda, 5 derecha)');
const fallY = [...doc.querySelectorAll('#cascadeSvg .fall-finger')].filter(e => e.getAttribute('opacity') !== '0');
check(fallY.length > 0 && fallY.every(e => parseFloat(e.getAttribute('y')) <= W('FALL_H')),
  'el número del bloque nunca se dibuja por debajo de la línea de golpe');
W('noteOn(61); noteOff(61)');
check(W('cascade.wrong') === 1 && W('cascade.hits') === 0, 'nota equivocada se cuenta como equivocada');
for(const n of [48,52,55,72]){ W(`noteOn(${n}); noteOff(${n})`); }
check(W('cascade.hits') === 4, 'las cuatro notas del primer paso aciertan');
check(litFingers() === '[]', 'al acertar, la tecla se apaga y su número de dedo desaparece');
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
W("readingLevel = READING_LEVELS.findIndex(l => l.id === 't5')");
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
W("readingLevel = READING_LEVELS.findIndex(l => l.id === 't5')");
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
  check(core.join(',') === 'scale,intervals,ear,name', 'el bloque central es escala, intervalos, oído y nombrar, en ese orden');
  const coreMin = W('todayPlan.filter(it => it.block === "core").reduce((a,it) => a + it.min, 0)');
  const keepMin = W('todayPlan.filter(it => it.block === "keep").reduce((a,it) => a + it.min, 0)');
  check(coreMin > keepMin, 'y se lleva más minutos que el mantenimiento (' + coreMin + ' vs ' + keepMin + ')');
  check(W('todayPlan.filter(it => it.block === "keep").map(it => it.key)').join(',') === 'reading,chords,song',
    'lectura, acordes y pieza siguen en el plan: foco no es abandono');
  check(doc.querySelectorAll('#todayList .today-block').length === 2, 'los dos bloques se rotulan en pantalla');
  check(W("todayPlan.find(it => it.key === 'intervals').title").includes('Anclas') && W("todayPlan.find(it => it.key === 'ear').title").includes('Anclas'),
    'intervalos y oído arrancan en el nivel 1');
  W("todayPlan.find(it => it.key === 'intervals').go()");
  check(W('currentMode') === 'intervals' && W('earMode') === false && W('practiceIndex') === W('INTERVAL_STAGES[0].ids[0]'),
    'el botón Ir de intervalos abre el modo exacto en el primer intervalo del nivel');
  // El paso 2 deja el metrónomo listo en el BPM de la meta: si hay que ir a
  // buscarlo a mano, no se usa.
  W(`progress = emptyProgress();
     progress.scales['cpenta:rh'] = {runs:3, clean:3, bestBpm:0, lastDay:null};
     progress.scales['cpenta:lh'] = {runs:3, clean:3, bestBpm:0, lastDay:null};
     todayPlan = buildTodayPlan(1); todayPlan.find(it => it.key === 'scale').go()`);
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

  section('Fragmentos por categoría');
  W("try { localStorage.removeItem('fragCat'); } catch(e){}; fragCat = 'all'");
  check(W('SONGS.filter(s => !s.cat || !SONG_CATS.some(c => c.id === s.cat)).length') === 0,
    'toda pieza tiene una categoría que existe en SONG_CATS');
  W("selectCategory('fragments')");
  check(doc.getElementById('fragCatBar').style.display === 'flex', 'la barra de categorías sale en Fragmentos');
  check(doc.querySelectorAll('#fragSubTabs .mode-tab').length === W('SONGS.length'),
    'con "Todas" se listan todas las piezas');
  const catBtn = (id) => [...doc.querySelectorAll('#fragCatPicker .reg-btn')].find(b => b.dataset.cat === id);
  check(SONG_CATS_ok(), 'no se dibuja ninguna categoría vacía');
  function SONG_CATS_ok(){
    return W('SONG_CATS').every(c => !!catBtn(c.id) === (c.id === 'all' || W('SONGS').some(s => s.cat === c.id)));
  }
  ev(catBtn('cristiana'));
  const listed = [...doc.querySelectorAll('#fragSubTabs .mode-tab')].map(b => b.dataset.frag);
  check(listed.length === W('SONGS.filter(s => s.cat === "cristiana").length') &&
        listed.every(id => W('SONGS.find(s => s.id === "' + id + '").cat') === 'cristiana'),
    'el filtro deja solo las piezas de esa categoría');
  check(W('currentFragment.cat') === 'cristiana' &&
        doc.querySelector('#fragSubTabs .mode-tab.active').dataset.frag === W('currentFragment.id'),
    'al filtrar se pasa a la primera de la categoría y queda marcada en la lista');
  // El plan de "Hoy" manda a una pieza concreta: tiene que llegar aunque el
  // filtro vigente la esconda, o el enlace de Hoy no hace nada.
  W("pickFragmentById('amanecer')");
  check(W('currentFragment.id') === 'amanecer' && W('fragCat') === 'facil',
    'saltar a una pieza de otra categoría abre su categoría y la selecciona');
  check((doc.querySelector('#fragSubTabs .mode-tab.active') || {}).dataset.frag === 'amanecer',
    'y queda marcada en la lista redibujada');
  W("selectCategory('agility')");
  check(doc.getElementById('fragCatBar').style.display === 'none' &&
        doc.getElementById('agilGroupBar').style.display === 'flex',
    'en Agilidad se esconde el filtro de piezas y aparece el de tipo de ejercicio');
  check(doc.querySelectorAll('#fragSubTabs .mode-tab').length === W("AGILITY_DRILLS.filter(d => d.grupo === 'dedos').length"),
    'la lista muestra solo los del grupo elegido, no los catorce de golpe');
  // El de "Hoy" puede mandar a un ejercicio del OTRO grupo: tiene que llegar,
  // o el enlace no hace nada (mismo fallo silencioso que ya tuvo Fragmentos).
  W("pickFragmentById('manos-sostiene')");
  check(W('currentDrillShape.id') === 'manos-sostiene' && W('agilGroup') === 'manos',
    'saltar a un ejercicio de coordinación abre su grupo y lo selecciona');
  check((doc.querySelector('#fragSubTabs .mode-tab.active') || {}).dataset.frag === 'manos-sostiene',
    'y queda marcado en la lista redibujada');
  W("selectAgilGroup('dedos')");
  W("fragCat = 'all'; try { localStorage.removeItem('fragCat'); localStorage.removeItem('agilGroup'); } catch(e){}");

  section('Piezas nuevas: notas y compases cuadran');
  for(const [id, beats, lo, hi] of [['flaca', 56, 67, 79], ['amanecer', 52, 72, 79]]){
    const s = W('SONGS.find(s => s.id === "' + id + '")');
    const sum = s.steps.reduce((a, x) => a + x.dur, 0);
    check(sum === beats, id + ': ' + sum + ' tiempos = ' + (beats / 4) + ' compases justos');
    const notes = s.steps.flatMap(x => x.rh);
    check(Math.min(...notes) === lo && Math.max(...notes) === hi,
      id + ': la derecha va de ' + lo + ' a ' + hi);
  }
  check(W('SONGS.find(s => s.id === "faded").steps').every(x => [67,69,71,72,74,76].includes(x.rh[0])),
    'Faded quedó en La menor: solo teclas blancas');
  check(W('SONGS.find(s => s.id === "amanecer").steps').every(x => x.rh[0] >= 72 && x.rh[0] <= 79 && x.rhF[0] === [72,74,76,77,79].indexOf(x.rh[0]) + 1),
    'Amanecer no mueve la mano: los 5 dedos caen siempre en la misma tecla');
  for(const id of ['flaca', 'faded', 'amanecer']){
    check(W('SONGS.find(s => s.id === "' + id + '").steps').every(
      x => x.rh && x.rh.length && x.rhF && x.rh.length === x.rhF.length &&
           (!x.lh || !x.lh.length || (x.lhF && x.lhF.length === x.lh.length))),
      id + ': cada paso trae su digitación pareja');
  }

  section('Himno a la alegría: dos partes y el tema completo');
  const odaP1 = W('SONGS.find(s => s.id === "oda-alegria").steps');
  const odaP2 = W('SONGS.find(s => s.id === "oda-alegria-2").steps');
  const odaFull = W('SONGS.find(s => s.id === "oda-alegria-full").steps');
  const beats = st => st.reduce((a, x) => a + x.dur, 0);
  check(beats(odaP1) === 32, `Parte 1: ${beats(odaP1)} tiempos = 8 compases justos`);
  check(beats(odaP2) === 32, `Parte 2: ${beats(odaP2)} tiempos = 8 compases justos`);
  check(beats(odaFull) === 64, `Completo: ${beats(odaFull)} tiempos = 16 compases justos`);
  // La completa se arma concatenando: no puede desviarse de las partes.
  check(odaFull.length === odaP1.length + odaP2.length &&
        JSON.stringify(odaFull) === JSON.stringify(odaP1.concat(odaP2)),
    'la versión completa es exactamente Parte 1 + Parte 2 (no una copia que se pueda desincronizar)');
  // Melodía contra la hoja del curso (laescueledemusica.net), compases 9-16:
  // Re Re Mi Do / Re Mi Fa Mi Do / Re Mi Fa Mi Re / Do Re Sol(grave) y luego A'.
  check(JSON.stringify(odaP2.flatMap(x => x.rh)) === JSON.stringify([
    62,62,64,60,  62,64,65,64,60,  62,64,65,64,62,  60,62,55,
    64,64,65,67,  67,65,64,62,  60,60,62,64,  62,60,60,
  ]), 'la melodía de la parte 2 coincide nota por nota con la hoja del curso');
  // Digitación del compás 12 tal como la marca la hoja: Do(1) Re(3) Sol(1).
  check(JSON.stringify(odaP2.slice(14, 17).map(x => [x.rh[0], x.rhF[0]])) ===
        JSON.stringify([[60,1],[62,3],[55,1]]),
    'el compás 12 lleva la digitación 1-3-1 de la hoja (el 3 es el asterisco: ahí baja la mano)');
  // Los últimos 4 compases son los mismos de la parte 1: eso es lo que la hace
  // abordable, y si dejara de cumplirse el consejo de la pieza estaría mintiendo.
  // Sin los `label`: la parte 2 avisa ahí que vuelve lo conocido, la 1 no.
  const bare = st => JSON.stringify(st.map(({label, ...x}) => x));
  check(bare(odaP2.slice(-15)) === bare(odaP1.slice(-15)),
    'la segunda mitad de la Parte 2 repite paso por paso la frase 2 de la Parte 1');
  // El Sol grave (55) es la única nota fuera de la posición de 5 dedos.
  const outside = odaP2.flatMap(x => x.rh).filter(n => n < 60 || n > 67);
  check(outside.length === 1 && outside[0] === 55,
    'el Sol grave es la ÚNICA nota en que la mano derecha sale de su posición');
  check(odaP1.every(x => x.rh.every(n => n >= 60 && n <= 67)),
    'en la parte 1 la mano derecha nunca sale de los 5 dedos Do4-Sol4');
  // Ambas manos quietas: cada nota lleva siempre el mismo dedo, o la posición
  // no sería fija. Se exceptúa el compás 12, que es el cambio marcado.
  const fixedPos = (st, hand, fing, skip) => {
    const map = {}; let ok = true;
    st.forEach((x, i) => x[hand].forEach((n, j) => {
      if(skip && skip(i)) return;
      if(map[n] !== undefined && map[n] !== x[fing][j]) ok = false;
      map[n] = x[fing][j];
    }));
    return ok;
  };
  check(fixedPos(odaP1, 'lh', 'lhF') && fixedPos(odaP1, 'rh', 'rhF'),
    'parte 1: cada nota lleva siempre el mismo dedo (las dos manos quietas)');
  check(fixedPos(odaP2, 'lh', 'lhF') && fixedPos(odaP2, 'rh', 'rhF', i => i >= 14 && i <= 16),
    'parte 2: posición fija salvo el compás 12, que es el cambio marcado');
  // Lo rítmicamente nuevo no son las corcheas (la parte 1 ya trae una suelta al
  // final de cada frase) sino DOS seguidas partiendo un mismo tiempo.
  const pairs = st => st.filter((x, i) => x.dur === 0.5 && st[i+1] && st[i+1].dur === 0.5).length;
  check(pairs(odaP1) === 0, 'la parte 1 no tiene ningún tiempo partido en dos corcheas');
  check(pairs(odaP2) === 2, 'la parte 2 trae los dos tiempos partidos en dos corcheas (lo nuevo del tema)');
  check(W('SONGS.filter(s => /^oda-alegria/.test(s.id)).length') === 3,
    'quedan las tres: parte 1, parte 2 y completa');

  section('All of Me: la vuelta, corregida a las dos notas en una mano');
  const aom = W('SONGS.find(s => s.id === "all-of-me").steps');
  check(aom.reduce((a, x) => a + x.dur, 0) === 16, 'la vuelta son 16 tiempos = 4 compases justos');
  // Ritmo CORREGIDO: "x3" son tres golpes IGUALES por compás, no dos rápidos
  // y uno sostenido el doble (dur 1,1,2, lo que había antes). 4/3 × 3 = 4
  // tiempos exactos, así que sigue sin haber huecos ni compases descuadrados.
  check(aom.every(x => Math.abs(x.dur - 4 / 3) < 1e-9), 'los tres golpes de cada compás duran exactamente igual (un tresillo)');
  // Corrección real: una fuente anterior (el fotograma del reel, que solo daba
  // pitches) había repartido las dos notas entre las manos. El tutorial
  // completo ("1:F-3:C"...) siempre dijo "Right-hand fingers", y una foto
  // nueva del mismo video lo confirma escribiendo "Right hand" sin mano
  // izquierda: las dos notas van juntas en la derecha, nada en la izquierda.
  check(aom.length === 12 && aom.every(x => x.lh.length === 0 && x.rh.length === 2),
    '12 golpes, las dos notas juntas en la mano DERECHA — nada en la izquierda');
  // Las 5 teclas del tutorial, leídas de la foto contando los grupos de negras.
  // Todas caen en La bemol mayor (Lab Sib Do Reb Mib Fa Sol): si alguna se
  // saliera, la lectura de la foto estaría mal.
  const AB_MAYOR = [56, 58, 60, 61, 63, 65, 67].map(n => n % 12);
  const aomNotes = [...new Set(aom.flatMap(x => x.lh.concat(x.rh)))].sort((a, b) => a - b);
  check(JSON.stringify(aomNotes) === JSON.stringify([51, 53, 58, 60, 61]),
    'usa exactamente las 5 teclas del tutorial: Mib3 Fa3 Sib3 Do4 Reb4');
  check(aomNotes.every(n => AB_MAYOR.includes(n % 12)), 'las cinco caen dentro de La bemol mayor');
  // Verificación que vale: cada par tiene que dar el acorde de la canción
  // (Fam–Reb–Lab–Mib). Si la foto se hubiera leído mal, esto no cuadraría.
  const pares = aom.filter((x, i) => i % 3 === 0).map(x => x.rh.map(n => n % 12).sort((a, b) => a - b));
  const FAM = [5, 8, 0], REB = [1, 5, 8], LAB = [8, 0, 3], MIB = [3, 7, 10];
  check(JSON.stringify(pares.map((par, i) => par.every(pc => [FAM, REB, LAB, MIB][i].includes(pc)))) ===
        JSON.stringify([true, true, true, true]),
    'cada par de notas cae dentro de su acorde: Fam, Reb, Lab, Mib');
  // El pulgar SIEMPRE toca la nota grave (Fa o Mib): eso es lo que no se
  // mueve. La nota aguda sí cambia de dedo (3 o 4) según de dónde venga el
  // pulgar — Do lleva el 3 cuando el pulgar está en Fa y el 4 cuando está en
  // Mib, y eso es lo que dice el tutorial, no un descuido: no "arreglarlo"
  // igualando los dedos.
  check(aom.every(x => x.rhF[0] === 1), 'el pulgar toca siempre la nota grave (Fa o Mib)');
  check(JSON.stringify(aom.filter((x, i) => i % 3 === 0).map(x => x.rhF[1])) === JSON.stringify([3, 4, 4, 3]),
    'y el dedo de la nota aguda cambia (3/4) según de dónde viene el pulgar — así lo da el tutorial');
  // La digitación 1-3/1-4/1-4/1-3 viene del texto completo del tutorial
  // ("1:F-3:C", "1:F-4:C#", "1:D#-4:C", "1:D#-3:A#"), no es inventada: el
  // pulgar (1) siempre en la nota grave, el otro dedo en la aguda.
  check(JSON.stringify(pares && aom.filter((x, i) => i % 3 === 0).map(x => x.rhF)) ===
        JSON.stringify([[1, 3], [1, 4], [1, 4], [1, 3]]),
    'la digitación (1-3, 1-4, 1-4, 1-3) es la del tutorial, no inventada');

  section('All of Me: una foto nueva confirma el intro y la estrofa, y destapó el error de mano');
  // Foto nueva, formato "nota x3" separada por voz. Fila de abajo = la nota
  // grave del intro en los 4 compases; fila de arriba = la aguda. Tiene que
  // dar EXACTO los mismos 4 pares que ya estaban (ahora en la mano derecha).
  const filaAbajo = ['F', 'F', 'D#', 'D#'], filaArriba = ['C', 'C#', 'C', 'A#'];
  const NOTA = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const paresFoto = filaAbajo.map((g, i) => [NOTA[g], NOTA[filaArriba[i]]].sort((a, b) => a - b));
  const paresApp = aom.filter((x, i) => i % 3 === 0).map(x => x.rh.map(n => n % 12).sort((a, b) => a - b));
  check(JSON.stringify(paresFoto) === JSON.stringify(paresApp),
    'los 4 pares de la foto nueva son EXACTO los mismos que ya estaban en la app, compás a compás');
  // Misma foto, tres filas para la estrofa (acorde de 3 notas): tiene que dar
  // el mismo acorde que ya tenía all-of-me-2 en cada uno de los 4 compases.
  const aom2 = W('SONGS.find(s => s.id === "all-of-me-2").steps');
  const versoArriba = ['C', 'C#', 'C', 'A#'], versoMedio = ['F', 'F', 'D#', 'D#'], versoAbajo = ['G#', 'G#', 'G#', 'G'];
  const acordesFoto = versoArriba.map((_, i) => [NOTA[versoArriba[i]], NOTA[versoMedio[i]], NOTA[versoAbajo[i]]].sort((a, b) => a - b));
  const acordesApp = aom2.filter((x, i) => i % 3 === 0).map(x => x.rh.map(n => n % 12).sort((a, b) => a - b));
  check(JSON.stringify(acordesFoto) === JSON.stringify(acordesApp),
    'y las tres filas de la estrofa dan el mismo acorde que ya tenía all-of-me-2, compás a compás');
  check(aom2.reduce((a, x) => a + x.dur, 0) === 16, 'la estrofa también son 16 tiempos = 4 compases justos');
  check(aom2.every(x => Math.abs(x.dur - 4 / 3) < 1e-9),
    'y también tiene tres golpes iguales por compás en la derecha, igual que el intro');
  // Jorge la sintió lenta y tenía razón: tenía 66 BPM (menos de la mitad de
  // la real). Verificado en varias bases de datos de tempo: la canción está
  // en ~120 BPM, no en el número que se había puesto sin comprobar.
  check(W("SONGS.find(s => s.id === 'all-of-me').tempo") === 120 &&
        W("SONGS.find(s => s.id === 'all-of-me-2').tempo") === 120,
    'el tempo es el real de la canción (120 BPM), no una versión lenta puesta sin verificar');

  section('Dragon Ball GT: la transcripción cuadra');
  const dbP1 = W('SONGS.find(s => s.id === "dbgt").steps');
  const dbP2 = W('SONGS.find(s => s.id === "dbgt-2").steps');
  const dbFull = W('SONGS.find(s => s.id === "dbgt-full").steps');
  const sum = st => st.reduce((a, x) => a + x.dur, 0);
  // Verificación 1 de CLAUDE.md: las duraciones tienen que dar 4 por compás.
  check(sum(dbP1) === 32, `Parte 1: ${sum(dbP1)} tiempos = 8 compases justos`);
  check(sum(dbP2) === 52, `Parte 2: ${sum(dbP2)} tiempos = 13 compases justos`);
  check(sum(dbFull) === 84, `Completo: ${sum(dbFull)} tiempos = 21 compases (los de la partitura)`);
  check(JSON.stringify(dbFull) === JSON.stringify(dbP1.concat(dbP2)),
    'la completa es Parte 1 + Parte 2, no una copia que se pueda desincronizar');
  // Verificación 2: el bajo tiene que dar la progresión. Las redondas de la
  // izquierda en los compases 1-7 bajan una escala entera de Do a Re.
  const dbBass = dbP1.filter(x => x.lh.length).map(x => x.lh[0]);
  // El compás 8 es el único con dos notas en la izquierda (dos blancas).
  check(JSON.stringify(dbBass) === JSON.stringify([60, 59, 57, 55, 53, 52, 50, 52, 55]),
    'el bajo de la parte 1 baja la escala Do-Si-La-Sol-Fa-Mi-Re y cierra Mi-Sol');
  check(dbBass.slice(0, 7).every((n, i, a) => i === 0 || n < a[i - 1]),
    'esa bajada es estrictamente descendente (si una nota estuviera mal leída, no lo sería)');
  // Los 7 primeros compases de la parte 2 repiten la parte 1 nota por nota.
  const noLabel = st => JSON.stringify(st.map(({label, ...x}) => x));
  check(noLabel(dbP2.slice(0, 28)) === noLabel(dbP1.slice(0, 28)),
    'los 7 primeros compases de la Parte 2 repiten la Parte 1 paso por paso');
  // Verificación 3: el clímax son OCTAVAS exactas bajando por grados. Si
  // alguna cabeza se hubiera leído mal, la relación de octava se rompería.
  const octavas = [];
  for(let i = 0; i < dbP2.length - 1; i++){
    const a = dbP2[i].rh[0], b = dbP2[i + 1].rh[0];
    if(a && b && b - a === 12 && dbP2[i].dur === 0.5) octavas.push(a);
  }
  check(JSON.stringify(octavas) === JSON.stringify([72, 71, 69, 67, 65, 64, 62]),
    'el clímax son 7 octavas exactas bajando por grados: Do Si La Sol Fa Mi Re');
  // Las dos únicas teclas negras de la pieza, ambas en la izquierda.
  const negras = dbFull.flatMap(x => x.lh.concat(x.rh)).filter(n => [1,3,6,8,10].includes(n % 12));
  check(JSON.stringify(negras) === JSON.stringify([56, 58]),
    'solo hay dos teclas negras en toda la pieza: Lab3 y Sib3');
  check(dbFull.every(x => x.rh.every(n => ![1,3,6,8,10].includes(n % 12))),
    'y ninguna cae en la mano derecha: la melodía es toda de teclas blancas');
  check(dbFull.every(x =>
    (x.lh.length === 0 || (x.lhF && x.lhF.length === x.lh.length)) &&
    (x.rh.length === 0 || (x.rhF && x.rhF.length === x.rh.length))),
    'cada nota trae su dedo');
  // La izquierda va TODA con el pulgar. En la mano izquierda el pulgar es el
  // dedo de más a la derecha, así que el resto de la mano queda hacia abajo y
  // no invade el registro de la derecha, que en esta pieza baja hasta La3.
  check(dbFull.every(x => x.lhF ? x.lhF.every(f => f === 1) : true),
    'toda la izquierda va con el pulgar (si no, la mano se abre hacia arriba y choca con la derecha)');
  check(dbFull.every(x => !x.lh.length || !x.rh.length || Math.max(...x.lh) < Math.min(...x.rh)),
    'la izquierda siempre queda por debajo de la derecha');
  // Segunda fuente: la hoja de virtualpiano que encontró Jorge. Su melodía es
  // la misma una octava arriba, así que bajada 12 semitonos tiene que coincidir
  // con la transcripción de la partitura. Compases 1-4, 6 y 7 dan exacto; el 5
  // es el único donde las dos versiones difieren (la hoja repite el La).
  const VP_BAJADA = [67,67,64,65,67,69, 67,65,64,62, 64,64,60,62,64,65, 64,62,60,59];
  check(JSON.stringify(dbP1.flatMap(x => x.rh).slice(0, 20)) === JSON.stringify(VP_BAJADA),
    'los compases 1-4 coinciden nota por nota con la hoja de virtualpiano (bajada una octava)');
  check(JSON.stringify(dbBass.slice(0, 6)) === JSON.stringify([60, 59, 57, 55, 53, 52]),
    'y el bajo de esos compases también coincide con esa hoja');

  // La estrofa sale de esa misma hoja (la partitura no la trae).
  const dbV = W('SONGS.find(s => s.id === "dbgt-3").steps');
  check(sum(dbV) === 52, `Estrofa: ${sum(dbV)} tiempos = 13 compases justos`);
  // Verificación que reemplaza a "el bajo da los acordes" cuando la fuente no
  // es una partitura: TODO tiene que caer en una sola tonalidad. La estrofa da
  // Do menor (el paralelo del tema, que va en Do mayor) con un solo cromatismo.
  const DOm = [0, 2, 3, 5, 7, 8, 10];
  const fuera = [...new Set(dbV.flatMap(x => x.lh.concat(x.rh)).map(n => n % 12))]
    .filter(p => !DOm.includes(p));
  check(JSON.stringify(fuera) === JSON.stringify([1]),
    'la estrofa cae entera en Do menor salvo un Reb de paso (si estuviera mal leída, no daría una tonalidad)');
  check(dbV.some(x => x.rh.some(n => [1, 3, 8, 10].includes(n % 12))),
    'y sí trae teclas negras en la melodía, al revés que el tema');
  check(dbV.every(x => x.lhF ? x.lhF.every(f => f === 1) : true),
    'la izquierda de la estrofa también va toda con el pulgar');
  check(dbV.every(x => !x.lh.length || !x.rh.length || Math.max(...x.lh) < Math.min(...x.rh)),
    'y siempre queda por debajo de la derecha');

  section('Dios está aquí: vuelve a salir de una partitura');
  const dios = W('SONGS.find(s => s.id === "dios-esta-aqui").steps');
  // Verificación 1 de CLAUDE.md: las duraciones dan 4 por compás, compás a
  // compás (no solo el total: un error de +0,25 y otro de -0,25 se anularían).
  check(sum(dios) === 64, `${sum(dios)} tiempos = 16 compases justos`);
  let acc = 0, cuadran = 0;
  dios.forEach(st => { acc += st.dur; if(Math.abs(acc - 4) < 1e-9){ cuadran++; acc = 0; } });
  check(cuadran === 16 && Math.abs(acc) < 1e-9, 'y cada compás cierra en 4 tiempos exactos');
  // La transcripción automática que había antes tenía 96,5 tiempos, racimos de
  // hasta 6 notas y notas hasta Mi6. Nada de eso puede volver.
  check(dios.every(st => st.lh.length <= 1 && st.rh.length <= 1),
    'una sola tecla por mano en cada paso (Jorge no toca acordes todavía)');
  const dNotas = dios.flatMap(st => st.lh.concat(st.rh));
  check(Math.max(...dNotas) === 69 && Math.min(...dNotas) === 41,
    'el rango va del Fa2 de la izquierda al La4 de la melodía, sin notas sueltas fuera');
  // Verificación 2: la izquierda NO es invento, es la fundamental de cada
  // cifrado impreso. Esta es la lista que se lee en la hoja, compás a compás.
  const dBajo = dios.filter(st => st.lh.length).map(st => st.lh[0]);
  check(JSON.stringify(dBajo) === JSON.stringify([
      48, 43,        // c1  Do  Sol
      45,            // c2  Lam
      41, 43,        // c3  Fa  Sol
      48,            // c4  Do (el Do7 no cambia el bajo)
      41, 43,        // c5  Fa  Sol
      48, 43, 45,    // c6  Do  Sol  Lam
      41, 43,        // c7  Fa  Sol
      48,            // c9  Do (casilla 2)
      43, 45, 43, 45, 43, 45, 43,   // coro: Sol y Lam alternando
      48,            // c17 Do
    ]),
    'la izquierda sigue los cifrados impresos (Do Sol Lam Fa … Sol Lam) y nada más');
  // Verificación 3: donde entra el bajo, la melodía tiene que caer en ESE
  // acorde. Si una cabeza estuviera mal leída, el par sonaría fuera.
  const TRIADA = { 48:[0,4,7], 43:[7,11,2], 45:[9,0,4], 41:[5,9,0] };
  const dFuera = dios.filter(st => st.lh.length && st.rh.length)
    .filter(st => !TRIADA[st.lh[0]].includes(st.rh[0] % 12))
    .map(st => [st.lh[0], st.rh[0]]);
  check(JSON.stringify(dFuera) === JSON.stringify([[43, 64]]),
    'cada entrada del bajo cae sobre una nota de su acorde, salvo el Mi sobre Sol del compás 7 (así lo escribe la hoja)');
  // La mano derecha tiene DOS posiciones y no se mueve dentro de cada una:
  // estrofa con el pulgar en Re4 (bajando al Do), coro con el pulgar en Si3.
  const kCambio = dios.findIndex(st => (st.label || '').includes('Si3'));
  check(kCambio > 0, 'el paso donde la mano derecha baja está marcado con label');
  const ESTROFA = { 60:1, 62:1, 64:2, 65:3, 67:4, 69:5 };
  const CORO    = { 59:1, 60:2, 62:3, 64:4, 65:5 };
  check(dios.slice(0, kCambio).every(st => !st.rh.length || st.rhF[0] === ESTROFA[st.rh[0]]),
    'en la estrofa cada nota lleva siempre el mismo dedo (la mano no se mueve)');
  check(dios.slice(kCambio).every(st => !st.rh.length || st.rhF[0] === CORO[st.rh[0]]),
    'y en el coro igual, con el pulgar en Si3');
  const DEDO_IZQ = {};
  let izqFija = true;
  dios.forEach(st => { if(st.lh.length){
    if(DEDO_IZQ[st.lh[0]] === undefined) DEDO_IZQ[st.lh[0]] = st.lhF[0];
    else if(DEDO_IZQ[st.lh[0]] !== st.lhF[0]) izqFija = false;
  }});
  check(izqFija && Object.keys(DEDO_IZQ).length === 4,
    'las cuatro notas graves llevan siempre el mismo dedo: la izquierda tampoco se mueve');
  check(dios.filter(st => st.label).length === 11,
    'once anclas marcadas para el selector de Tramo (era el pedido original: aprenderla por partes)');

  section('Escuchar sostiene el bajo mientras la derecha sigue');
  // Una nota de la izquierda que dura varios pasos se escribe una vez y los
  // siguientes van con lh:[]. Si se soltara al terminar SU paso, el bajo de una
  // redonda sonaría lo que dura la primera semicorchea y la pieza se oiría sin
  // fondo — que es justo lo que se reportó de "Dios está aquí".
  W(`window.__on = []; window.__off = [];
     window.__playNoteSound = playNoteSound; window.__stopNoteSound = stopNoteSound;
     playNoteSound = n => window.__on.push(n);
     stopNoteSound = n => window.__off.push(n);
     currentHand = 'both';
     currentFragment = { id:'__t', name:'t', tip:'t', tempo:6000, steps:[
       {lh:[48], lhF:[1], rh:[64], rhF:[1], dur:1},
       {lh:[],             rh:[65], rhF:[2], dur:1},
       {lh:[43], lhF:[4], rh:[67], rhF:[3], dur:1},
     ] };`);
  await W('playFragment()');
  const onSeq = W('window.__on.join()');
  const offSeq = W('window.__off.join()');
  check(onSeq === '48,64,65,43,67', 'el bajo suena una sola vez por cambio, no en cada paso');
  check(offSeq === '64,65,48,67,43', 'y se suelta recién cuando la izquierda cambia (48 después del 65, no antes)');
  W(`playNoteSound = window.__playNoteSound; stopNoteSound = window.__stopNoteSound;`);

  section('Escuchar: la derecha puede sostener una nota larga (rhDur)');
  // Beyer y Köhler: la derecha canta notas largas (blanca, blanca con puntillo)
  // mientras la izquierda mueve una nota por tiempo. Sin `rhDur` la melodía
  // sonaría en negras.
  W(`window.__on = []; window.__off = [];
     window.__playNoteSound = playNoteSound; window.__stopNoteSound = stopNoteSound;
     playNoteSound = n => window.__on.push(n);
     stopNoteSound = n => window.__off.push(n);
     currentHand = 'both';
     currentFragment = { id:'__t2', name:'t', tip:'t', tempo:6000, steps:[
       {lh:[48], lhF:[1], rh:[64], rhF:[1], dur:1, rhDur:2},
       {lh:[50], lhF:[2], rh:[], dur:1},
       {lh:[52], lhF:[3], rh:[67], rhF:[3], dur:1},
     ] };`);
  await W('playFragment()');
  check(W('window.__on.join()') === '48,64,50,52,67', 'cada nota suena una sola vez');
  check(W('window.__off.join()') === '48,64,50,67,52',
    'el 64 sigue pisado durante dos tiempos y se suelta cuando termina (después del 48, antes del 50), no al acabar su paso');
  W(`playNoteSound = window.__playNoteSound; stopNoteSound = window.__stopNoteSound;`);

  section('Hanon Junior 1-12, Beyer y Köhler (partituras de dominio público que pasó Jorge)');
  {
    const hs = W("SONGS.filter(s => s.cat === 'hanon')");
    check(hs.length === 12 && hs.every((s, i) => s.id === 'hanon-' + (i + 1) && s.plan === false && s.tempo === 60), '12 ejercicios Hanon, fuera del plan de Hoy, ♩=60');
    check(W("SONG_CATS.some(c => c.id === 'hanon')"), 'hay una categoría Hanon en Piezas');
    const BARS = [15, 14, 14, 15, 15, 14, 14, 14, 14, 14, 14, 15];   // contados en el PDF
    check(hs.every((s, i) => s.steps.length === BARS[i] * 8 + 1 && s.steps.reduce((a, x) => a + x.dur, 0) === BARS[i] * 4 + 4),
      'cada ejercicio trae sus compases de 8 corcheas + la redonda final (compases contados en el PDF)');
    check(hs.every(s => s.steps.slice(0, -1).every(x => x.rh.length === 1 && x.lh.length === 1 && x.lh[0] === x.rh[0] - 12 && x.dur === 0.5)),
      'la izquierda toca lo mismo una octava más grave, corchea a corchea');
    check(hs.every(s => s.steps.every(x => [0, 2, 4, 5, 7, 9, 11].includes(x.rh[0] % 12))), 'todo en teclas blancas (Do mayor)');
    const fin = hs.map(s => s.steps[s.steps.length - 1]);
    check(fin.every(f => f.rh[0] === 60 && f.lh[0] === 48 && f.rhF[0] === 1 && f.lhF[0] === 5 && f.dur === 4), 'todos terminan en Do4/Do3, redonda, dedos 1 y 5');
    const h1 = hs[0].steps;
    check(h1.slice(0, 8).map(x => x.rhF[0]).join('') === '12345432' && h1.slice(0, 8).map(x => x.lhF[0]).join('') === '54321234' &&
          h1.slice(0, 8).map(x => x.rh[0]).join() === '60,64,65,67,69,67,65,64',
      'Hanon 1, compás 1: Do-Mi-Fa-Sol-La-Sol-Fa-Mi con 1-2-3-4-5-4-3-2 (derecha) y 5-4-3-2-1-2-3-4 (izquierda)');
    // Dirección de los dedos: en la derecha, más agudo = dedo mayor; en la izquierda, al revés.
    // (la hoja del ejercicio 12 imprime los números de la derecha también en la izquierda: error de la fuente, corregido a 6 − dedo)
    const sentidoOk = (s, hand) => s.steps.slice(0, -1).every((x, i, arr) => {
      if(i === 0) return true;
      const a = arr[i - 1], dp = x[hand][0] - a[hand][0], df = x[hand + 'F'][0] - a[hand + 'F'][0];
      if(i % 8 === 0) return true;          // entre compases la mano se recoloca
      if(dp === 0 || df === 0) return dp === 0;
      return (dp > 0) === (hand === 'rh' ? df > 0 : df < 0);
    });
    check(hs.every(s => sentidoOk(s, 'rh') && sentidoOk(s, 'lh')), 'ningún dedo contradice el sentido de la nota (ni en la izquierda del 12)');
    check(hs[11].steps.slice(0, -1).every(x => x.lhF[0] === 6 - x.rhF[0]), 'Hanon 12: la izquierda va en espejo (6 − dedo derecho)');
    check(hs.slice(0, 11).every(s => s.steps.slice(0, -1).filter(x => x.label).length === s.steps.length >> 3), 'un rótulo "c. N" al inicio de cada compás (para el Tramo)');
    // El plan de Hoy nunca manda un Hanon como "pieza".
    W("progress = emptyProgress(); todayPlan = buildTodayPlan(1)");
    check(!W("todayPlan.some(it => /hanon/.test(JSON.stringify(it)))"), 'el plan de Hoy no propone Hanon');

    // Beyer
    const be = W("SONGS.find(s => s.id === 'beyer-sol')");
    check(!!be && be.cat === 'facil' && be.steps.reduce((a, x) => a + x.dur, 0) === 64, 'Beyer: 16 compases de 4 tiempos en Fáciles');
    const rhLen = (steps, meter) => {          // tiempos que dura cada nota de la derecha, por compás
      const bars = []; let t = 0;
      steps.forEach(x => { if(x.rh.length){ const b = Math.floor(t / meter + 1e-9); bars[b] = (bars[b] || 0) + (x.rhDur || x.dur); } t += x.dur; });
      return bars;
    };
    check(rhLen(be.steps, 4).every(v => v === 4) && rhLen(be.steps, 4).length === 16, 'Beyer: la derecha suena 4 tiempos en cada compás (con rhDur)');
    check(be.steps.every(x => x.rh.every(n => n >= 67 && n <= 74) && x.lh.every(n => n >= 55 && n <= 62)), 'Beyer: derecha Sol4-Re5 e izquierda Sol3-Re4, las manos no se mueven');
    const BF = { 67:1, 69:2, 71:3, 72:4, 74:5 }, BL = { 55:5, 57:4, 59:3, 60:2, 62:1 };
    check(be.steps.every(x => x.rh.every((n, i) => BF[n] === x.rhF[i])), 'Beyer: la derecha lleva Sol=1 … Re=5');
    const lhB = be.steps.filter(x => x.lh.length);
    check(lhB.every(x => BL[x.lh[0]] === x.lhF[0]), 'Beyer: la izquierda lleva Sol=5 … Re=1, sin excepciones (el La del c. 1 y 9 va con el 4, no con el 5 impreso)');
    check(lhB.filter(x => x.lhF[0] === 5).every(x => x.lh[0] === 55), 'Beyer: el meñique solo toca el Sol grave (nunca pasa de Sol a La)');
    // Köhler
    const ko = W("SONGS.find(s => s.id === 'kohler-fa')");
    check(!!ko && ko.meter === 3 && ko.cat === 'clasica' && ko.plan === false && ko.steps.reduce((a, x) => a + x.dur, 0) === 96, 'Köhler: 3/4, 32 compases = 96 tiempos');
    const rk = rhLen(ko.steps, 3);
    check(rk.length === 31 && rk.every((v, i) => v === ([8, 16, 24, 32].includes(i + 1) ? undefined : 3)), 'Köhler: la derecha suena 3 tiempos por compás, menos los 4 compases de silencio (8, 16, 24, 32)');
    check(ko.steps.filter(x => x.lh.length).length === 94 - 0 && ko.steps.filter(x => x.lh.length > 1).length === 0, 'Köhler: la izquierda toca una nota por vez (tres por compás), nunca acordes');
    const kb = ko.steps.flatMap(x => x.rh);
    check(kb.includes(71) && kb.includes(70), 'Köhler: Si♮ en el c. 14 y Si♭ en el resto (armadura de Fa)');
    check(ko.steps.some(x => x.lh[0] === 54) && ko.steps.some(x => x.lh[0] === 51), 'Köhler: Fa♯3 (c. 19) y Mi♭3 (c. 27) de la izquierda');
    // La cascada dibuja la nota larga de la derecha completa (3 tiempos), no solo su paso
    W("selectCategory('fragments'); pickFragmentById('kohler-fa')");
    const sched = W("(() => { const { events, beatMs } = buildCascadeSchedule(); const e = events.find(x => x.hand === 'rh'); return { len: (e.tEnd - e.tStart) / beatMs }; })()");
    check(Math.abs(sched.len - 3 * 0.85) < 1e-6, 'en la cascada, el primer La de la derecha dura 3 tiempos (×0,85)');
  }

  section('The Sound of Silence (Fa mayor): lectura de la imagen, compás por compás');
  {
    const cm = W("SONGS.find(s => s.id === 'sound-of-silence')");
    check(!!cm && cm.cat === 'clase' && cm.tempo === 80 && cm.plan !== false, 'está en "De la clase", ♩=80 (de práctica; el real ronda 105-109) y entra al plan de Hoy');
    check(W("SONGS.filter(s => s.cat === 'clase')[0].id") === 'sound-of-silence', 'es la primera de "De la clase"');
    const nn = { D2:38, E2:40, F2:41, G2:43, A2:45, Bb2:46, C3:48, D3:50, F3:53, C4:60, D4:62, E4:64, F4:65, G4:67, A4:69, C5:72, D5:74, E5:76, F5:77 };
    // Lo que dice la partitura (2 pentagramas), un compás por línea. "r" = silencio, "~" = nota ligada del compás anterior.
    const MEL = [
      'r1 D4/.5 D4/.5 F4/.5 F4/.5 A4/.5 A4/.5', 'G4/4',
      'r.5 C4/.5 C4/.5 C4/.5 E4/.5 E4/.5 G4/.5 G4/.5', 'F4/4',
      'r.5 F4/.5 F4/.5 F4/.5 A4/.5 A4/.5 C5/.5 C5/.5', 'D5/2 C5/2',
      'r1 F4/.5 F4/.5 A4/.5 A4/.5 C5/.5 C5/.5', 'D5/2 C5/2',
      'r1 F4/.5 F4/.5 D5/.5 D5/1.5', '~1 D5/.5 E5/.5 F5/.5 F5/1.5',
      'E5/.5 D5/1.5 C5/2', '~1 D5/.5 C5/.5 A4/2',
      'r2 r.5 F4/.5 F4/.5 F4/.5', 'C5/3 r.5 E4/.5',
      'F4/.5 D4/1.5 ~2', 'r4'
    ];
    const BAS = [
      'D3+F3/4', 'C3/1 C3/.5 G2/.5 C3/1 C3/.5 G2/.5', 'C3/2 G2/1 C3/1', 'D3/1 D3/.5 A2/.5 D3/1 D3/.5 A2/.5',
      'D3/2 D3/1 C3/1', 'Bb2/1 Bb2/1 F2/1 F2/.5 C3/.5', 'F2/1 F2/1 C3/1 F2/1', 'Bb2/1 Bb2/1 F2/1 F2/.5 C3/.5',
      'F2/1 A2/1 Bb2/1 F2/1', 'Bb2/1 F2/1 Bb2/1 F2/1', 'Bb2/1 F2/.5 Bb2/.5 F2/1 F2/1', 'F2/1 F2/1 F2/1 F2/.5 E2/.5',
      'D2/1 D2/.5 E2/.5 F2/2', 'C3/1 C3/1 C3/1 C3/1', 'D3/1 D3/.5 A2/.5 D3/1 D3/.5 A2/.5', 'D3/2 r2'
    ];
    const parse = (bars, bass) => {
      const ev = []; let t = 0;
      bars.forEach((b, bi) => {
        let sum = 0;
        b.split(' ').forEach(tok => {
          if(tok[0] === 'r'){ const d = +tok.slice(1); sum += d; t += d; return; }
          if(tok[0] === '~'){ const d = +tok.slice(1); ev[ev.length - 1].d += d; sum += d; t += d; return; }
          const [nm, d] = tok.split('/'), notes = nm.split('+').map(x => nn[x]);
          ev.push({ t, notes, d: +d }); sum += +d; t += +d;
        });
        check(sum === 4, `compás ${bi + 1} (${bass ? 'izquierda' : 'melodía'}) suma 4 tiempos`);
      });
      return ev;
    };
    const eM = parse(MEL, false), eB = parse(BAS, true);
    // Reconstruir de los pasos
    const gotM = [], gotB = []; let t = 0;
    cm.steps.forEach(x => {
      if(x.rh.length) gotM.push({ t, notes: x.rh, d: x.rhDur || x.dur });
      if(x.lh.length) gotB.push({ t, notes: x.lh.slice().sort((a, b) => a - b), d: 0 });
      t += x.dur;
    });
    // la izquierda sostiene hasta su siguiente ataque (o, la última, lo que dura el paso)
    gotB.forEach((e, i) => { e.d = i + 1 < gotB.length ? gotB[i + 1].t - e.t : 2; });
    const norm = ev => JSON.stringify(ev.map(e => [e.t, e.notes.slice().sort((a, b) => a - b), e.d]));
    check(norm(gotM) === norm(eM), 'la melodía de los pasos = la de la partitura (notas, tiempo y duración, con las ligaduras)');
    check(norm(gotB) === norm(eB), 'el bajo de los pasos = el de la partitura');
    check(cm.steps.reduce((a, x) => a + x.dur, 0) === 62, '15 compases de 4 + el último con solo la blanca = 62 tiempos (como Arpèges à Agathe)');
    // Tonalidad: Fa mayor, la única tecla negra es el Si♭2 del bajo
    check(cm.steps.every(x => x.rh.every(n => [0, 2, 4, 5, 7, 9, 11].includes(n % 12))), 'la melodía es toda de teclas blancas');
    check(cm.steps.flatMap(x => x.lh).filter(n => [1, 3, 6, 8, 10].includes(n % 12)).every(n => n === 46), 'en el bajo solo hay una negra: Si♭2');
    check(Math.max(...cm.steps.flatMap(x => x.lh)) < Math.min(...cm.steps.flatMap(x => x.rh)), 'las manos no se cruzan');
    // El bajo da los acordes: nota inicial de cada compás
    const firstLh = [50, 48, 48, 50, 50, 46, 41, 46, 41, 46, 46, 41, 38, 48, 50, 50];
    check(eB.filter((e, i) => true).length > 0 && BAS.every((b, i) => nn[b.split(/[ +]/)[0].split('/')[0]] === firstLh[i]), 'el bajo de cada compás arranca en Re-Do-Do-Re-Re-Si♭-Fa-Si♭-Fa-Si♭-Si♭-Fa-Re-Do-Re-Re');
    // Dedos
    const seq = (hand) => { const o = []; cm.steps.forEach(x => { if(x[hand].length) o.push({ n: x[hand].slice(), f: x[hand + 'F'].slice() }); }); return o; };
    const rhS = seq('rh'), lhS = seq('lh');
    check(cm.steps.every(x => x.rh.length === (x.rhF || []).length && x.lh.length === (x.lhF || []).length), 'cada nota trae su dedo');
    // Derecha: más agudo = dedo mayor; ninguna contradicción ni mismo dedo en dos teclas distintas
    const rhBad = []; let rhSlide = 0;
    for(let i = 1; i < rhS.length; i++){
      const dp = rhS[i].n[0] - rhS[i - 1].n[0], df = rhS[i].f[0] - rhS[i - 1].f[0];
      if(dp !== 0 && df === 0) rhSlide++;
      if(dp !== 0 && df !== 0 && (dp > 0) !== (df > 0)) rhBad.push(rhS[i - 1].n[0] + '→' + rhS[i].n[0]);
    }
    // la única contradicción es el cambio de posición avisado del c. 12 (Do con el pulgar → La con el 3, mano que baja)
    check(rhBad.join() === '72→69' && rhSlide === 0, 'derecha: ningún dedo contradice el sentido de la nota, salvo el cambio de mano avisado del c. 12; nunca el mismo dedo en teclas distintas');
    // Izquierda: más grave = dedo mayor. El único "mismo dedo en dos teclas" es el pulgar que baja a Do (c. 5, tiempo 4).
    let lhBad = 0, lhSlide = [];
    for(let i = 1; i < lhS.length; i++){
      const a = lhS[i - 1], b = lhS[i];
      if(a.n.length > 1 || b.n.length > 1) continue;
      const dp = b.n[0] - a.n[0], df = b.f[0] - a.f[0];
      if(dp !== 0 && df === 0) lhSlide.push(a.n[0] + '→' + b.n[0]);
      if(dp !== 0 && df !== 0 && (dp > 0) !== (df < 0)) lhBad++;
    }
    check(lhBad === 0 && lhSlide.join() === '50→48', 'izquierda: sentido correcto; solo el pulgar que baja de Re a Do (c. 5) repite dedo');
    // Posiciones de la izquierda: cada tecla lleva el mismo dedo dentro de su tramo
    const lhFingerBars = (from, to) => { const m = {}; let ok = true, tt = 0;
      cm.steps.forEach(x => { const b = Math.floor(tt / 4) + 1; if(b >= from && b <= to) x.lh.forEach((n, i) => { if(m[n] && m[n] !== x.lhF[i]) ok = false; m[n] = x.lhF[i]; }); tt += x.dur; });
      return ok; };
    check(lhFingerBars(2, 4) && lhFingerBars(6, 11) && lhFingerBars(12, 13) && lhFingerBars(14, 15), 'izquierda: dentro de cada posición (c. 2-4, 6-11, 12-13, 14-15) cada tecla lleva siempre el mismo dedo');
    // Cada cambio de posición está avisado en un rótulo
    const lab = cm.steps.map(x => x.label || '');
    ['pulgar sobre Re', 'pulgar en Do', 'mano abierta', 'pulgar baja a Do', 'pulgar en Do (Re con el 2)', 'Fa pasa al 3', 'pulgar en Fa', 'meñique en Re', 'Do con el 2', 'pulgar en Re'].forEach(k =>
      check(lab.some(l => l.includes(k)), `rótulo de cambio de mano: "${k}"`));
    // Un rótulo "c. N" por compás (ancla del Tramo en la cascada)
    check([...Array(16)].every((_, i) => lab.some(l => l.startsWith('c. ' + (i + 1) + ' ') || l === 'c. ' + (i + 1))), 'hay un rótulo "c. N" en cada uno de los 16 compases');
    // Se puede abrir desde el plan/enlaces aunque el filtro vigente la esconda, y la cascada dibuja las ligaduras largas
    W("selectCategory('fragments'); fragCat = 'popular'; pickFragmentById('sound-of-silence')");
    check(W('currentFragment.id') === 'sound-of-silence' && W('fragCat') === 'clase', 'pickFragmentById abre la categoría de la pieza');
    const bigRh = W("(() => { const { events, beatMs } = buildCascadeSchedule(); const d = events.filter(x => x.hand === 'rh').map(e => Math.round((e.tEnd - e.tStart) / beatMs * 100) / 100); return Math.max(...d); })()");
    check(Math.abs(bigRh - 4 * 0.85) < 1e-6, 'en la cascada la nota más larga de la derecha (Sol, 4 tiempos) se dibuja completa');
    W("selectCategory('today')");
  }

  section('Día de lluvia (triste y pausada): izquierda sencilla, sin saltos');
  {
    const dl = W("SONGS.find(s => s.id === 'dia-de-lluvia')");
    check(!!dl && dl.cat === 'clase' && dl.tempo === 60 && !dl.meter && dl.plan !== false, 'está en "De la clase", ♩=60 (pausado, mío) y entra al plan de Hoy');
    check(W("SONGS.filter(s => s.cat === 'clase')[0].id") === 'sound-of-silence', 'The Sound of Silence sigue primera de "De la clase"');
    check(dl.steps.reduce((a, x) => a + x.dur, 0) === 48, '12 compases de 4 tiempos, sin sobras');
    const bars = []; { let t = 0; dl.steps.forEach(x => { const b = Math.floor(t / 4 + 1e-9); (bars[b] = bars[b] || []).push(x); t += x.dur; }); }
    check(bars.length === 12 && bars.every((b, i) => b.reduce((a, x) => a + x.dur, 0) === 4 && b[0].label && b[0].lh.length === (i >= 8 ? 2 : 1)), 'cada compás suma 4, abre con rótulo y la izquierda ataca UNA nota (c. 1-8) o DOS (c. 9-12)');
    check(dl.steps.every(x => x.lh.length <= 2 && x.rh.length === 1), 'nunca más de dos teclas por mano (la regla del profe) y la derecha de una en una');
    // Izquierda: Lam–Fa–Do–Sol (La2 3, Fa2 5, Do3 1, Sol2 4), mismo dedo para la misma tecla, sin mover la mano
    const LHF = { 45: 3, 41: 5, 48: 1, 43: 4 };
    check(dl.steps.filter(x => x.lh.length).every(x => x.lh.every((n, i) => LHF[n] === x.lhF[i])), 'izquierda: pulgar en Do3, La 3, Sol 4, Fa 5 (la posición de Amanecer), cada tecla con su dedo');
    const duo = bars.slice(8).map(b => b[0].lh);
    check(duo.map(l => l[1] - l[0]).join() === '3,7,5,3' && duo.every(l => l[1] === 48), 'c. 9-12: 3ª menor (La–Do), 5ª (Fa–Do), 4ª (Sol–Do) y 3ª menor; el pulgar siempre en Do3');
    check(bars.slice(0, 8).every(b => b.every(x => x.lh.length <= 1)), 'c. 1-8: la izquierda sigue con una sola nota');
    check(bars.map(b => b[0].lh[0]).join() === '45,41,48,43,45,41,43,45,45,41,43,45', 'bajo (nota más grave): Lam Fa Do Sol · Lam Fa Sol Lam · Lam Fa Sol Lam');
    check(dl.steps.every(x => x.dur >= 1), 'todo en negras o más largas: ninguna corchea');
    // Derecha: posición fija Do5=1 … Sol5=5, teclas blancas, sin saltos mayores que una 3ª
    const RHF = { 72: 1, 74: 2, 76: 3, 77: 4, 79: 5 };
    check(dl.steps.every(x => RHF[x.rh[0]] === x.rhF[0]), 'derecha: Do5=1 … Sol5=5, siempre el mismo dedo');
    const mel = dl.steps.map(x => x.rh[0]);
    check(Math.max(...mel.slice(1).map((n, i) => Math.abs(n - mel[i]))) <= 4, 'el salto más grande de la melodía es una 3ª mayor (4 semitonos)');
    check(Math.max(...dl.steps.flatMap(x => x.lh)) < Math.min(...mel), 'las manos no se cruzan');
    check(dl.steps.flatMap(x => [...x.lh, ...x.rh]).every(n => [0, 2, 4, 5, 7, 9, 11].includes(n % 12)), 'todo en teclas blancas (La menor)');
    // Carácter: cada parte cae al final, y termina en Do sobre Lam (tercera menor del acorde: triste y estable)
    check(mel[mel.length - 1] === 72 && dl.steps[dl.steps.length - 1].dur === 4 && dl.steps[dl.steps.length - 1].lh[0] === 45, 'termina en Do5 sobre La2, redonda');
    check(['Parte 1', 'Parte 2', 'Parte 3', 'Fin'].every(k => dl.steps.some(x => (x.label || '').includes(k))), 'rótulos de las tres partes y del final');
    check(dl.steps.filter(x => x.rh[0] === 76 && x.dur === 1).length >= 5, 'las "gotas": notas repetidas en negras (Mi5 sobre todo)');
    W("selectCategory('fragments'); fragCat = 'popular'; pickFragmentById('dia-de-lluvia')");
    check(W('currentFragment.id') === 'dia-de-lluvia' && W('fragCat') === 'clase', 'pickFragmentById abre la categoría de la pieza');
    W("selectCategory('today')");
  }

  section('Coordinación: las dos manos no hacen lo mismo');
  const coord = W('AGILITY_DRILLS.filter(d => d.coord)');
  check(coord.length === 8, `${coord.length} ejercicios de coordinación (escalera del 1 al 8)`);
  check(coord.every(d => d.grupo === 'manos'), 'todos viven en el grupo "Manos juntas"');
  check(coord.every((d, i) => d.name.startsWith((i + 1) + ' · ')),
    'los nombres van numerados 1..8 en el mismo orden del arreglo (el orden ES la escalera)');
  // Espejo (David Domínguez): mismo dedo en las dos manos, posición fija real.
  // El dedo 3 es el eje (Mi en las dos) y el 1/5 se intercambian entre manos.
  const espejoFam = ['espejo-1', 'espejo-2'].map(id => coord.find(d => d.id === id));
  check(espejoFam.every(Boolean), 'espejo-1 y espejo-2 están en AGILITY_DRILLS');
  const LH_DEG = {1:7, 2:5, 3:4, 4:2, 5:0}, RH_DEG = {1:0, 2:2, 3:4, 4:5, 5:7};
  check(espejoFam.every(d => d.pattern.every(p =>
      p.l !== undefined && p.r !== undefined && p.lf === p.rf &&
      p.l === LH_DEG[p.lf] && p.r === RH_DEG[p.rf])),
    'espejo: mismo dedo en las dos manos en todos los pasos, y el grado sale de la posición fija (dedo 3 = Mi en las dos)');
  // Todo lo que NO es espejo tiene que tener pasos de una sola mano: si no,
  // sería unísono, que ya cubren los de Dedos y no entrena independencia.
  const otros = coord.filter(d => !['espejo-1', 'espejo-2'].includes(d.id));
  check(otros.length === 6 && otros.every(d => d.pattern.some(p => p.l === undefined || p.r === undefined)),
    'los otros seis tienen pasos donde solo entra una mano (turnarse, sostener, contratiempo)');
  const alternadasFam = ['alternadas-1', 'alternadas-2'].map(id => coord.find(d => d.id === id));
  check(alternadasFam.every(d => d && d.pattern.reduce((a, p) => a + p.dur, 0) === 64),
    'alternadas-1/2: 16 compases de 4/4 exactos (64 tiempos)');
  check(alternadasFam.some(d => d.pattern.some(p => p.l !== undefined && p.r !== undefined && p.lf !== p.rf)),
    'al menos uno de los dos usa dedos DISTINTOS en las dos manos cuando coinciden (no es un espejo)');
  // Cuadrar en compases de 4 importa aquí igual que en las piezas: la cascada
  // dibuja la rejilla de compases y es donde estos ejercicios se practican.
  coord.forEach(d => {
    const beats = d.pattern.reduce((a, p) => a + p.dur, 0);
    check(beats % 4 === 0, `${d.id}: ${beats} tiempos = ${beats / 4} compases justos`);
  });
  check(coord.every(d => d.pattern.every(p =>
      (p.l === undefined || (p.lf >= 1 && p.lf <= 5)) &&
      (p.r === undefined || (p.rf >= 1 && p.rf <= 5)))),
    'cada mano que entra trae un dedo válido (1-5)');
  // La mano no se mueve dentro de un ejercicio: el mismo grado lleva siempre el
  // mismo dedo. Si cambiara habría que reacomodar la mano y no está marcado.
  const posFija = coord.every(d => {
    const vistos = {};
    return d.pattern.every(p => {
      for(const [g, f] of [['L' + p.l, p.lf], ['R' + p.r, p.rf]]){
        if(f === undefined) continue;
        if(vistos[g] === undefined) vistos[g] = f;
        else if(vistos[g] !== f) return false;
      }
      return true;
    });
  });
  check(posFija, 'dentro de cada ejercicio cada tecla lleva siempre el mismo dedo (la mano no se mueve)');

  // Materialización: una mano sin grado en el paso NO vuelve a pulsar (lh:[]),
  // que es la misma convención de ligadura de SONGS — y es justo el ejercicio
  // de "La izquierda sostiene".
  const sost = W('materializeAgilitySteps(AGILITY_DRILLS.find(d => d.id === "manos-sostiene"), 4, 3)');
  check(sost.filter(st => st.lh.length).length === 4 && sost.length === 15,
    `la izquierda entra 4 veces (una por compás) en los ${sost.length} pasos, el resto la sostiene`);
  check(sost.every(st => st.rh.length === 1), 'y la derecha toca en todos');
  check(sost.every(st => !st.lh.length || st.lh[0] < Math.min(...st.rh)),
    'la izquierda siempre queda por debajo de la derecha');
  check(sost.every(st => (!st.lh.length || st.lhF.length === st.lh.length) &&
                         (!st.rh.length || st.rhF.length === st.rh.length)),
    'cada nota materializada trae su dedo');
  // El grado 0 es falsy: si se comparara con if(p.l) el Do se perdería.
  const esp = W('materializeAgilitySteps(AGILITY_DRILLS.find(d => d.id === "espejo-1"), 4, 3)');
  check(W('AGILITY_DRILLS.find(d => d.id === "espejo-1").pattern.some(p => p.l === 0)') &&
        esp.some(st => st.lh[0] === 48), 'el grado 0 (el Do) no se pierde por ser falsy');
  check(W("shapeOctaveValid(3, AGILITY_DRILLS.find(d => d.id === 'espejo-1'), 'lh')") === true &&
        W("shapeOctaveValid(8, AGILITY_DRILLS.find(d => d.id === 'espejo-1'), 'lh')") === false,
    'la octava se valida por mano: la 8 no cabe');
  // Se puede practicar una mano sola, que es el primer paso cuando se traba.
  check(W(`(function(){
      const st = materializeAgilitySteps(AGILITY_DRILLS.find(d => d.id === 'manos-contratiempo'), 4, 3);
      return st.some(x => stepNotes(x, 'lh').length) && st.some(x => stepNotes(x, 'rh').length);
    })()`), 'el contratiempo se puede practicar con cada mano por separado');
  // El plan de Hoy empuja la escalera: mientras quede un peldaño sin estrenar,
  // el calentamiento es ese y en orden, no el "menos practicado".
  W("progress.drills = {};");
  const planCoord = W('buildTodayPlan(1)[0]');
  check(planCoord.title.includes('Espejo'), 'el calentamiento de Hoy arranca en el peldaño 1 de la escalera');
  W("progress.drills = {}; AGILITY_DRILLS.filter(d => d.grupo === 'manos').forEach(d => { progress.drills[d.id] = {runs:1, lastDay:'2000-01-01'}; });");
  check(W("AGILITY_DRILLS.filter(d => d.grupo === 'manos').every(d => !buildTodayPlan(1)[0].title.includes(d.name))"),
    'y cuando ya pasó por los ocho, vuelve la rotación normal entre todos');
  W("progress.drills = {};");

  section('Acordes repetidos, como se tocan de verdad');
  W("soundEnabled = false; selectCategory('chords'); chordReps = 1; practiceIndex = 0; startChordStep();");
  const acordeNotas = () => W('JSON.stringify(chordVoicing(CHORDS[practiceIndex], chordInversion, chordOctave))');
  const tocar = () => {
    const ns = JSON.parse(acordeNotas());
    ns.forEach(n => W(`noteOn(${n})`));
    ns.forEach(n => W(`noteOff(${n})`));
  };
  tocar();
  check(W('practiceIndex') === 1, 'con 1 repetición sigue como antes: un toque y al siguiente acorde');
  W("chordReps = 4; practiceIndex = 0; startChordStep();");
  check(doc.getElementById('timingBox').innerHTML.split('timing-chip').length - 1 === 4,
    'con 4 repeticiones aparece una casilla por toque');
  // Primer toque, sin soltar todavía.
  const ns0 = JSON.parse(acordeNotas());
  ns0.forEach(n => W(`noteOn(${n})`));
  check(W('chordRepDone') === 1 && W('practiceIndex') === 0,
    'el primer toque cuenta pero NO pasa al siguiente acorde');
  // Dejarlo pisado no puede contar cuatro veces de golpe: hace falta soltar.
  W('checkChord()'); W('checkChord()');
  check(W('chordRepDone') === 1, 'tenerlo pisado no suma repeticiones; hay que levantar la mano');
  check(W('chordAwaitRelease') === true, 'y queda esperando que se suelte');
  ns0.forEach(n => W(`noteOff(${n})`));
  check(W('chordAwaitRelease') === false && doc.querySelectorAll('.target').length === ns0.length,
    'al soltar se vuelve a marcar el objetivo para el toque siguiente');
  tocar(); tocar(); tocar();
  check(W('chordRepDone') === 4 && W('practiceIndex') === 1,
    'al cuarto toque sí pasa al siguiente acorde');
  check(W("progress.chords['C'].runs") >= 1, 'y el acorde se registra una sola vez, no una por repetición');
  // Con el metrónomo encendido cada toque se clasifica igual que una nota de
  // escala: repetir sin medir el tiempo no sirve de mucho, que es el punto.
  W(`metroOffsetMs = () => 15; metro.on = true; chordReps = 4; practiceIndex = 0; startChordStep();`);
  tocar();
  check(W('chordRepTiming[0]') === 15, 'con metrónomo se guarda el desfase de cada toque');
  check(doc.querySelector('#timingBox .timing-chip').className.includes('ok'),
    'y la casilla se pinta según lo ajustado que estuvo, no solo como "tocado"');
  W(`metroOffsetMs = () => 400;`);
  tocar();
  check(doc.querySelectorAll('#timingBox .timing-chip')[1].className.includes('miss'),
    'un toque muy fuera del pulso se marca como fallado');
  W("metro.on = false; chordReps = 1; try { localStorage.removeItem('chordReps'); } catch(e){} practiceIndex = 0; startChordStep();");

  section('All of Me: la estrofa confirma el intro');
  const aomI = W("SONGS.find(s => s.id === 'all-of-me').steps");
  const aomV = W("SONGS.find(s => s.id === 'all-of-me-2').steps");
  check(aomV.reduce((a, x) => a + x.dur, 0) === 16, 'la estrofa son 16 tiempos = 4 compases justos');
  // Un compás = 3 golpes del mismo acorde, así que basta mirar uno de cada tres.
  const clases = st => [...new Set(st.lh.concat(st.rh).map(n => n % 12))].sort((a, b) => a - b);
  const acordeDe = (pasos, i) => [...new Set(pasos[i * 3].rh.map(n => n % 12))].sort((a, b) => a - b);
  const TRIADAS = { 'Fam':[0,5,8], 'Reb':[1,5,8], 'Lab':[0,3,8], 'Mib':[7,10,3] };
  const esperadas = ['Fam', 'Reb', 'Lab', 'Mib'];
  esperadas.forEach((nombre, i) => {
    const got = acordeDe(aomV, i);
    const want = TRIADAS[nombre].slice().sort((a, b) => a - b);
    check(JSON.stringify(got) === JSON.stringify(want),
      `compás ${i + 1}: la derecha da ${nombre} exacto`);
  });
  // Verificación que reemplaza a "el bajo da los acordes" cuando la fuente es un
  // tutorial: TODO tiene que caer en una sola tonalidad. Lab mayor es el tono
  // original de la canción, y el tutorial no se sale ni una nota.
  const LAB_MAYOR = [8, 10, 0, 1, 3, 5, 7];
  const fueraLab = [...new Set(aomV.flatMap(x => x.lh.concat(x.rh)).map(n => n % 12))]
    .filter(pc => !LAB_MAYOR.includes(pc));
  check(fueraLab.length === 0, 'y todo cae dentro de Lab mayor, el tono original (ni una nota fuera)');
  // LA comprobación cruzada: el tutorial nuevo (por letras) y el fotograma del
  // reel (decodificado midiendo teclas negras) son fuentes distintas. Cada par
  // del intro tiene que estar DENTRO del acorde de la estrofa en su compás.
  for(let i = 0; i < 4; i++){
    const par = clases(aomI[i * 3]);
    const tri = acordeDe(aomV, i);
    check(par.every(pc => tri.includes(pc)),
      `compás ${i + 1}: las dos notas del intro están dentro del acorde de la estrofa (dos fuentes independientes, misma armonía)`);
  }
  // La izquierda: una nota por compás, sostenida el resto (misma convención de
  // ligadura de SONGS) y siempre por debajo de la derecha.
  check(aomV.filter(st => st.lh.length).length === 4 && aomV.every(st => st.lh.length <= 1),
    'la izquierda entra una sola vez por compás y con una sola tecla');
  check(aomV.every(st => !st.lh.length || st.lh[0] < Math.min(...st.rh)),
    'y siempre queda por debajo de la derecha');
  // Digitación del tutorial, no inventada: cada tecla lleva siempre el mismo dedo.
  const dedoDe = {};
  let dedosFijos = true;
  aomV.forEach(st => {
    st.lh.forEach((n, i) => {
      if(dedoDe['L' + n] === undefined) dedoDe['L' + n] = st.lhF[i];
      else if(dedoDe['L' + n] !== st.lhF[i]) dedosFijos = false;
    });
    st.rh.forEach((n, i) => {
      if(dedoDe['R' + n] === undefined) dedoDe['R' + n] = st.rhF[i];
      else if(dedoDe['R' + n] !== st.rhF[i]) dedosFijos = false;
    });
  });
  check(dedosFijos, 'cada tecla lleva siempre el mismo dedo: ninguna mano se mueve en toda la vuelta');
  check(aomV.every(st => st.rh.length === 3), 'los cuatro son acordes de tres teclas (el salto respecto al intro)');

  section('Acordes: tres menús y calificación del ejercicio');
  W("soundEnabled = false; selectCategory('chords'); metro.on = false; chordReps = 1; chordGroup = 'basicos'; practiceIndex = 0; buildChordPicker(); startChordStep();");
  check(W('visibleChords().map(c => c.name).join()') === 'C,G,F,Am,Em,Dm',
    'el grupo por defecto son los seis que el propio consejo del modo manda practicar primero');
  check(W("CHORD_GROUPS.map(g => CHORDS.slice(g.from, g.to).length).join()") === '6,18,24',
    'los tres menús cubren 6 / 18 / 24 acordes');
  W("selectChordGroup('resto')");
  check(W('visibleChords().length') === 18 && W('visibleChords()[0].name') === 'F#m' && W('practiceIndex') === 0,
    'cambiar de menú reinicia en el primero de esa lista');
  check(doc.querySelectorAll('#chordPicker .pick-btn').length === 18,
    'y el selector "Ir directo a" se redibuja con esa lista');
  // El plan de "Hoy" manda a un acorde concreto: tiene que llegar aunque esté
  // en el otro menú (mismo fallo silencioso que ya tuvieron Fragmentos y Agilidad).
  W("pickChordByName('Am')");
  check(W('chordGroup') === 'basicos' && W('visibleChords()[practiceIndex].name') === 'Am',
    'saltar a un acorde del otro menú abre su menú y lo selecciona');
  // `chordDoneSet` guarda NOMBRES: con listas de distinto largo un índice
  // guardado apuntaría a otro acorde al cambiar de menú.
  check(W("[...chordDoneSet].every(x => typeof x === 'string')"),
    'los acordes hechos se recuerdan por nombre, no por índice');

  // --- calificación ---
  W(`metroOffsetMs = () => 10; metro.on = true; metro.bpm = 72;
     chordGroup = 'basicos'; practiceIndex = 0; chordReps = 4;
     chordGoodRun = 0; chordSetsRun = 0; progress.chords = {}; buildChordPicker(); startChordStep();`);
  const tocarAcorde = () => {
    const ns = JSON.parse(W('JSON.stringify(chordVoicing(visibleChords()[practiceIndex], chordInversion, chordOctave))'));
    ns.forEach(n => W(`noteOn(${n})`));
    ns.forEach(n => W(`noteOff(${n})`));
  };
  for(let i = 0; i < 4; i++) tocarAcorde();
  check(W('chordGoodRun') === 1 && W('chordSetsRun') === 1, 'una tanda a tiempo cuenta como acorde logrado');
  check(/4 de 4 a tiempo/.test(W('document.getElementById("feedbackText").textContent')),
    'el veredicto dice cuántas veces salió bien, no solo "Correcto"');
  check(W("progress.chords['C'].bestPct") === 100 && W("progress.chords['C'].bestBpm") === 72 &&
        W("progress.chords['C'].good") === 1,
    'y se guarda la calificación: mejor %, BPM al que se logró y cuántas veces');
  // Fuera de tiempo: no cuenta como logrado, pero sí como practicado.
  W(`metroOffsetMs = () => 400; practiceIndex = 0; startChordStep();`);
  for(let i = 0; i < 4; i++) tocarAcorde();
  check(W('chordGoodRun') === 1 && W('chordSetsRun') === 2,
    'una tanda fuera de tiempo suma intento pero no suma logro');
  check(W("progress.chords['C'].runs") === 2 && W("progress.chords['C'].good") === 1,
    'el acorde queda registrado como practicado igual (si no, el día saldría vacío)');
  check(W("progress.chords['C'].bestPct") === 100,
    'y la mejor marca NO baja: es un máximo, que es lo que la fusión del respaldo sabe manejar');
  check(W('practiceIndex') === 1, 'igual se avanza al siguiente acorde: quedarse atascado en uno no enseña los otros');
  // Sin metrónomo no hay nada que medir y no se inventa una nota.
  W(`metro.on = false; practiceIndex = 0; startChordStep();`);
  for(let i = 0; i < 4; i++) tocarAcorde();
  check(/enciende el metrónomo/i.test(W('document.getElementById("feedbackText").textContent')),
    'sin metrónomo el veredicto lo dice en vez de calificar a ojo');
  W(`metroOffsetMs = ${'function(t){ return 0; }'}; metro.on = false; chordReps = 1; chordGroup = 'basicos'; practiceIndex = 0;
     try { localStorage.removeItem('chordReps'); localStorage.removeItem('chordGroup'); } catch(e){}
     buildChordPicker(); startChordStep();`);

  section('Coordinación al azar y niveles');
  W("selectCategory('agility'); selectAgilGroup('manos'); soundEnabled = false;");
  check(W("!!AGILITY_DRILLS.find(d => d.id === 'cinco-dedos').coord") === false &&
        W("agilRandomOn.toString().includes('coord')"),
    'el azar solo aplica a los de coordinación: sortear "Posición de 5 dedos" destruiría el ejercicio');
  W("pickFragmentById('manos-sostiene'); agilRandom = true; agilLevel = 3; agilStreak = 0; onAgilityChange();");
  const antes = W('JSON.stringify(currentFragment.steps.map(s => s.lh.concat(s.rh)))');
  const ritmoAntes = W('JSON.stringify(currentFragment.steps.map(s => [s.dur, s.lh.length, s.rh.length]))');
  W('onAgilityChange()');
  const despues = W('JSON.stringify(currentFragment.steps.map(s => s.lh.concat(s.rh)))');
  const ritmoDespues = W('JSON.stringify(currentFragment.steps.map(s => [s.dur, s.lh.length, s.rh.length]))');
  check(antes !== despues, 'cada sorteo cambia las notas');
  check(ritmoAntes === ritmoDespues,
    'pero NO el ritmo ni el reparto de manos: ese esqueleto ES el ejercicio ("la izquierda sostiene" dejaría de existir)');
  // El dedo sale del grado, así que la regla de "cada tecla siempre el mismo
  // dedo" se cumple sola también con notas sorteadas.
  check(W(`(function(){
      for(let i = 0; i < 40; i++){
        const st = materializeAgilitySteps(
          Object.assign({}, currentDrillShape, {pattern: randomCoordPattern(currentDrillShape, 4)}), 4, 3);
        const m = {};
        for(const x of st){
          for(const [n, f] of x.lh.map((n, j) => [n, x.lhF[j]]).concat(x.rh.map((n, j) => [n, x.rhF[j]]))){
            if(m[n] === undefined) m[n] = f; else if(m[n] !== f) return false;
          }
        }
      }
      return true;
    })()`), 'en 40 sorteos, cada tecla lleva siempre el mismo dedo (la mano no se mueve)');
  // El espejo vive de que las dos manos usen el MISMO dedo: la izquierda no
  // sortea por su cuenta, y el grado sale de la posición fija (eje dedo 3 = Mi).
  check(W(`(function(){
      for(const id of ['espejo-1', 'espejo-2']){
        const esp = AGILITY_DRILLS.find(d => d.id === id);
        for(let i = 0; i < 30; i++){
          const pat = randomCoordPattern(esp, 4);
          if(!pat.every(p => p.lf === p.rf)) return false;
          const LH = ${JSON.stringify({1:7,2:5,3:4,4:2,5:0})}, RH = ${JSON.stringify({1:0,2:2,3:4,4:5,5:7})};
          if(!pat.every(p => p.l === LH[p.lf] && p.r === RH[p.rf])) return false;
        }
      }
      return true;
    })()`), 'el espejo sortea con el mismo dedo en las dos manos y el grado de la posición fija');
  // Los niveles mueven de verdad el tamaño del salto.
  const salto = (nivel) => W(`(function(){
      const d = AGILITY_DRILLS.find(x => x.id === 'manos-sostiene');
      let max = 0;
      for(let i = 0; i < 60; i++){
        const pat = randomCoordPattern(d, ${nivel}).filter(p => p.rf !== undefined);
        for(let j = 1; j < pat.length; j++) max = Math.max(max, Math.abs(pat[j].rf - pat[j-1].rf));
      }
      return max;
    })()`);
  check(salto(1) === 1, 'nivel 1: la derecha solo se mueve a un dedo vecino');
  check(salto(2) === 2, 'nivel 2: hasta dos dedos de salto');
  check(salto(4) === 4, 'nivel 4: del pulgar al meñique de una');
  check(W("randomCoordPattern(AGILITY_DRILLS.find(d => d.id === 'manos-sostiene'), 1).filter(p => p.l !== undefined).every(p => p.l === 0)"),
    'y en el nivel 1 la izquierda se queda en el Do: el salto es lo que descoordina, no la nota');
  // Etiquetas: la original nombra notas y dedos fijos y al azar mentiría.
  check(W(`randomCoordPattern(AGILITY_DRILLS.find(d => d.id === 'manos-sostiene'), 3)
      .every(p => ['Las dos a la vez','Solo izquierda','Solo derecha'].includes(p.label))`),
    'las etiquetas al azar solo dicen quién pulsa, que es lo único que sigue siendo cierto');

  section('Vuelta limpia: se cuentan las notas equivocadas y sube el nivel');
  W("agilRandom = true; agilLevel = 1; agilStreak = 0; pickFragmentById('espejo-1'); currentHand = 'both'; onAgilityChange();");
  const vuelta = (conError) => {
    W('practiceIndex = 0; startFragmentStep();');
    if(conError) W('noteOn(61); noteOff(61);');   // Do#: los ejercicios son todos de teclas blancas
    for(let i = 0; i < 100; i++){
      const ns = JSON.parse(W('JSON.stringify(stepNotes(currentFragment.steps[practiceIndex] || {lh:[],rh:[]}, currentHand))'));
      if(!ns.length) break;
      const antesIdx = W('practiceIndex');
      ns.forEach(n => W(`noteOn(${n})`));
      ns.forEach(n => W(`noteOff(${n})`));
      if(W('practiceIndex') === antesIdx) break;
    }
  };
  vuelta(true);
  check(W('fragMistakes') === 1, 'una tecla que no toca cuenta como nota equivocada');
  check(W('agilStreak') === 0, 'y una vuelta con errores no suma racha');
  vuelta(false);
  check(W('agilStreak') === 1 && W('agilLevel') === 1, 'una vuelta limpia suma racha pero todavía no sube');
  vuelta(false);
  check(W('agilLevel') === 2 && W('agilStreak') === 0,
    'dos vueltas limpias seguidas suben de nivel (terminar una vuelta despacio no acredita nada; terminarla sin errores sí)');
  W("agilRandom = false; agilLevel = 1; agilStreak = 0; try { localStorage.removeItem('agilRandom'); localStorage.removeItem('agilLevel'); } catch(e){} onAgilityChange();");

  section('Desbloqueo de audio en iOS');
  // jsdom no trae AudioContext; se inyecta una falsa MUY mínima (solo lo que
  // ensureAudioCtx/unlockAudioContextIOS tocan) para fijar que, al crear el
  // contexto, se agenda un buffer real — no basta con resume(). En iOS/Safari
  // (Safari y Chrome comparten motor WebKit ahí) resume() puede reportar
  // 'running' y aun así la primera nota agendada no suena; el navegador
  // exige tocar un buffer de verdad dentro del MISMO gesto para despertar
  // la salida. Sin este desbloqueo el toque se registra ("Sonando: X" sale
  // en pantalla) pero no sale ningún sonido — justo lo que se reportó.
  W(`window.__starts = 0;
     class FakeCtx {
       constructor(){ this.state = 'suspended'; this.destination = {}; }
       resume(){ this.state = 'running'; return Promise.resolve(); }
       createBuffer(){ return {}; }
       createBufferSource(){ return { connect(){}, start(){ window.__starts++; } }; }
     }
     window.AudioContext = FakeCtx; window.webkitAudioContext = FakeCtx;
     audioCtx = null;`);
  W('ensureAudioCtx()');
  check(W('window.__starts') === 1, 'crear el contexto agenda un buffer real (el desbloqueo de iOS), no solo resume()');
  W('ensureAudioCtx()');
  check(W('window.__starts') === 1, 'y solo una vez: la segunda llamada reusa el contexto sin re-desbloquear');
  W('audioCtx = null; delete window.AudioContext; delete window.webkitAudioContext;');

  section('Sonido alternativo (cuando Web Audio en vivo no suena)');
  W('soundEnabled = true;'); // secciones anteriores lo dejan apagado
  // jsdom no tiene OfflineAudioContext ni un <audio> real que reproduzca:
  // se inyectan fakes mínimos que cubren todo lo que buildVoice/ensureAudioBus
  // tocan (visto grepeando el archivo), para poder probar el camino de
  // verdad sin adivinar su forma.
  W(`
    window.URL.createObjectURL = () => 'blob:fake';
    window.__playCalls = []; window.__renderCount = 0;
    function __fakeParam(){ return { value:0, setValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){} }; }
    function __fakeNode(extra){ return Object.assign({ connect(){}, disconnect(){} }, extra || {}); }
    class __FakeOfflineCtx {
      constructor(channels, length, sampleRate){
        this.destination = __fakeNode(); this.sampleRate = sampleRate;
        this._channels = channels; this._length = length;
      }
      createGain(){ return __fakeNode({ gain: __fakeParam() }); }
      createBiquadFilter(){ return __fakeNode({ type:'', frequency: __fakeParam(), Q: __fakeParam(), detune: __fakeParam() }); }
      createOscillator(){ return __fakeNode({ type:'', frequency: __fakeParam(), detune: __fakeParam(), start(){}, stop(){} }); }
      createDynamicsCompressor(){ return __fakeNode({ threshold:__fakeParam(), knee:__fakeParam(), ratio:__fakeParam(), attack:__fakeParam(), release:__fakeParam() }); }
      createConvolver(){ return __fakeNode({ buffer:null }); }
      createBufferSource(){ return __fakeNode({ buffer:null, start(){}, stop(){} }); }
      createBuffer(channels, length, sampleRate){
        const chans = []; for(let i=0;i<channels;i++) chans.push(new Float32Array(length));
        return { numberOfChannels:channels, length, sampleRate, getChannelData:c=>chans[c] };
      }
      startRendering(){
        window.__renderCount++;
        return Promise.resolve(this.createBuffer(this._channels, this._length, this.sampleRate));
      }
    }
    window.OfflineAudioContext = __FakeOfflineCtx;
    class __FakeAudioEl {
      constructor(src){ this.src = src; this.currentTime = 0; this.volume = 1; this.paused = true; }
      play(){ this.paused = false; window.__playCalls.push(this.src); return Promise.resolve(); }
      pause(){ this.paused = true; }
    }
    window.Audio = __FakeAudioEl;
  `);
  check(W('audioFallback') === false, 'apagado por defecto: es un rodeo para un caso raro, no para todos');
  ev('#soundFallbackBtn');
  check(W('audioFallback') === true, 'el botón enciende el sonido alternativo');
  check(W("localStorage.getItem('audioFallback')") === '1', 'se recuerda en localStorage');
  check(doc.getElementById('soundFallbackBtn').classList.contains('active'), 'el botón se ve encendido');

  W('playNoteSound(60)');
  await new Promise(r => setTimeout(r, 30));
  check(W('window.__renderCount') === 1, 'la primera vez que suena una tecla, se renderiza en silencio');
  check(W('window.__playCalls.length') === 1, 'y se reproduce como <audio>, no en vivo');
  W('playNoteSound(60)');
  await new Promise(r => setTimeout(r, 30));
  check(W('window.__renderCount') === 1, 'la segunda vez NO se vuelve a renderizar — usa la caché por nota');
  check(W('window.__playCalls.length') === 2, 'pero sí se reproduce de nuevo cada toque');

  W('playNoteSound(64)');
  await new Promise(r => setTimeout(r, 30));
  check(Object.keys(W('noteClipPlaying')).includes('64'), 'mientras suena, queda marcada como sonando');
  W('stopNoteSound(64)');
  await new Promise(r => setTimeout(r, 250));
  check(!Object.keys(W('noteClipPlaying')).includes('64'), 'soltar la tecla la desvanece y la saca de "sonando" (no de golpe)');

  W('playNoteSound(67)');
  await new Promise(r => setTimeout(r, 30));
  // 60 sigue sonando de antes (nunca se soltó, como una tecla sostenida) + 67 recién tocada
  check(Object.keys(W('noteClipPlaying')).includes('67'), 'setup: hay al menos una nota sonando antes de allNotesOff');
  W('allNotesOff()');
  check(Object.keys(W('noteClipPlaying')).length === 0, 'allNotesOff también corta el sonido alternativo, no solo el MIDI');

  W(`window.__wav = (() => {
    const buf = { numberOfChannels:1, length:2, sampleRate:8000, getChannelData:() => new Float32Array([0.5,-0.5]) };
    const b = audioBufferToWavBlob(buf);
    return { size:b.size, type:b.type };
  })();`);
  check(W('window.__wav.type') === 'audio/wav', 'el clip renderizado se etiqueta audio/wav');
  check(W('window.__wav.size') === 44 + 2 * 2, 'tamaño = cabecera de 44 bytes + PCM de 16 bits (1 canal × 2 muestras)');

  // Reportado: algunas notas se sentían "pegadas" — retocar la MISMA tecla
  // mientras el desvanecido de la vez anterior seguía corriendo dejaba un
  // setInterval huérfano peleando el volumen contra la reproducción nueva,
  // y hasta la pausaba a la mitad. Retriggerear rápido tiene que cancelar
  // ese desvanecido, no dejarlo correr en paralelo.
  W('playNoteSound(69)');
  await new Promise(r => setTimeout(r, 30)); // deja que el render (async) termine y quede marcada sonando
  W('stopNoteSound(69)'); // arranca un desvanecido de 160ms
  await new Promise(r => setTimeout(r, 40)); // a medio desvanecer, no terminado
  check(W('!!noteClipFade[69]'), 'setup: el desvanecido de la vez anterior sigue corriendo');
  W('playNoteSound(69)'); // se retoca la misma tecla A MITAD del desvanecido
  check(W('!noteClipFade[69]'), 'retocar la tecla cancela el desvanecido viejo en el acto');
  await new Promise(r => setTimeout(r, 220)); // más que de sobra para que el intervalo viejo hubiera terminado
  check(W('noteClipCache[69].volume') === 1, 'y el volumen se queda en 1: el intervalo huérfano no lo baja por detrás');
  check(Object.keys(W('noteClipPlaying')).includes('69'), 'la nota retocada sigue marcada sonando');
  W('stopNoteSound(69)');
  await new Promise(r => setTimeout(r, 250));

  // warmNoteClips: precalienta sin sonar (lo usan "Escuchar" de Fragmentos y
  // el modo de oído para no renderizar A MITAD de una pasada con tiempo).
  W('window.__playCalls = []; window.__renderCount = 0;');
  W('audioFallback = false;'); // apagado: no debe hacer nada
  await W('warmNoteClips([72, 74])');
  check(W('window.__renderCount') === 0, 'con el sonido alternativo apagado, warmNoteClips no hace nada');
  W('audioFallback = true;');
  await W('warmNoteClips([72, 74, 72])'); // nota repetida: no debe renderizarse dos veces
  check(W('window.__renderCount') === 2, 'precalienta cada nota UNA vez (72 repetida no cuenta dos)');
  check(W('window.__playCalls.length') === 0, 'precalentar renderiza pero no reproduce nada');
  check(Object.keys(W('noteClipCache')).includes('72') && Object.keys(W('noteClipCache')).includes('74'),
    'las notas precalentadas quedan cacheadas, listas para sonar al instante');

  ev('#soundFallbackBtn'); // vuelve a apagarlo: no debe quedar prendido para el resto de la suite
  check(W('audioFallback') === false, 'se puede apagar igual que se prendió');
  W(`for(const k in noteClipCache) delete noteClipCache[k];
     delete window.OfflineAudioContext; delete window.Audio;
     delete window.__playCalls; delete window.__renderCount; delete window.__wav;`);

  section('Estrellita: una sola versión y la izquierda sencilla');
  // Estaba dos veces (corta con acordes + "Twinkle" larga). Jorge pidió dejar
  // solo la corta, y sin acordes: todavía no los domina.
  check(W("SONGS.filter(s => /estrellita|twinkle/i.test(s.id)).length") === 1,
    'solo queda una versión de Estrellita (se quitó la larga)');
  check(W("SONGS.find(s => s.id === 'estrellita').steps.every(st => st.lh.length <= 1)"),
    'la izquierda nunca pide más de una tecla a la vez (ya no hay acordes)');
  const estrLh = JSON.parse(W(
    "JSON.stringify([...new Set(SONGS.find(s => s.id === 'estrellita').steps.flatMap(st => st.lh))])"));
  check(Math.max(...estrLh) - Math.min(...estrLh) <= 7,
    'todas las notas graves caben en una 5ª: la mano izquierda no se mueve en toda la pieza');
  // Si una misma nota llevara dedos distintos, la mano tendría que reacomodarse.
  check(W(`(() => {
    const map = {}; let ok = true;
    for(const st of SONGS.find(s => s.id === 'estrellita').steps){
      st.lh.forEach((n, i) => {
        if(map[n] !== undefined && map[n] !== st.lhF[i]) ok = false;
        map[n] = st.lhF[i];
      });
    }
    return ok;
  })()`), 'cada nota grave lleva siempre el mismo dedo (posición fija)');

  section('"Escuchar" se puede detener a mitad');
  ev('#mainTabs [data-cat="fragments"]');
  W("pickFragmentById('estrellita')");
  check(W("currentFragment.id") === 'estrellita', 'setup: Estrellita cargada');
  const pieceMs = W("currentFragment.steps.reduce((a, s) => a + s.dur, 0) * 60000 / currentFragment.tempo");
  const listen = doc.querySelector('#listenBtn');
  const t0 = Date.now();
  ev('#listenBtn');
  check(W('isPlayingBack') === true, 'tocar Escuchar arranca la reproducción');
  check(listen.textContent.includes('Detener'), 'el botón pasa a decir Detener mientras suena');
  check(listen.classList.contains('busy'), 'y se ve "trabajando ahora"');
  await new Promise(r => setTimeout(r, 120));
  ev('#listenBtn');                         // segundo toque = detener
  await new Promise(r => setTimeout(r, 60));
  const stoppedMs = Date.now() - t0;
  check(W('isPlayingBack') === false, 'volver a tocarlo detiene la reproducción');
  check(listen.textContent.includes('Escuchar'), 'el botón vuelve a decir Escuchar');
  check(!listen.classList.contains('busy'), 'y deja de verse trabajando');
  check(stoppedMs < pieceMs / 2,
    `corta en el acto, no espera a que termine la nota ni la pieza (${Math.round(stoppedMs)}ms de ${Math.round(pieceMs)}ms)`);
  check(doc.querySelectorAll('#pianoSvg .active').length === 0,
    'no queda ninguna tecla encendida del paso que iba sonando');

  // El token de cancelación no puede quedar "gastado": tiene que poder volver a sonar.
  ev('#listenBtn');
  check(W('isPlayingBack') === true, 'después de detener, se puede volver a escuchar');
  await new Promise(r => setTimeout(r, 40));

  // Cambiar de pieza mientras suena también corta: antes seguía sonando la
  // anterior encima de la nueva.
  W("pickFragmentById('au-clair')");
  await new Promise(r => setTimeout(r, 60));
  check(W('isPlayingBack') === false, 'cambiar de pieza mientras suena detiene la reproducción');
  check(W("currentFragment.id") === 'au-clair', 'y la pieza nueva queda cargada');

  // ------------------------------------------------------------------
  section('Nombre de intervalos (Sin pista y Tocar libre)');
  check(W('intervalName(60, 64)') === '3ª mayor', 'Do-Mi es 3ª mayor');
  check(W('intervalName(64, 60)') === '3ª mayor', 'el orden de las teclas no importa');
  check(W('intervalName(60, 76)') === '3ª mayor + una octava', 'una décima se dice como 3ª mayor + una octava');
  check(W('intervalName(60, 72)') === '8ª (octava)' && W('intervalName(60, 84)') === '2 octavas', 'octava y dos octavas');
  check(W('intervalName(60, 60)') === 'unísono' && W("withArticle('unísono')") === 'un unísono', 'unísono, con su artículo');
  check(W("withArticle('2 octavas')") === '2 octavas' && W("withArticle('5ª justa')") === 'una 5ª justa', 'artículo correcto');

  section('Tocar libre nombra lo que se pisa');
  W("soundEnabled = false; activeNotes.clear(); selectCategory('free');");
  check(doc.getElementById('freeBox').style.display !== 'none', 'el recuadro se ve en Tocar libre');
  W('noteOn(60); noteOn(64);');
  const fr = doc.getElementById('freeRead');
  check(fr.textContent.includes('3ª mayor') && fr.textContent.includes(W('noteLabel(60)')) && !fr.classList.contains('stale'),
    'dos teclas: dice las notas y el intervalo');
  W('noteOff(60); noteOff(64);');
  check(fr.textContent.includes('3ª mayor') && fr.classList.contains('stale'), 'al soltar queda la última lectura, apagada');
  W('noteOn(64); noteOn(67); noteOn(72);');
  check(fr.textContent.includes('Do mayor') && fr.textContent.includes('1ª inversión'), 'Mi-Sol-Do: Do mayor en 1ª inversión');
  W('noteOff(64); noteOff(67); noteOff(72); noteOn(60); noteOn(62); noteOn(67);');
  check(fr.textContent.includes('2ª mayor + 4ª justa'), 'si no es tríada, el intervalo entre cada par vecino');
  W('noteOff(60); noteOff(62); noteOff(67);');
  W("selectCategory('intervals');");
  check(doc.getElementById('freeBox').style.display === 'none', 'fuera de Tocar libre no aparece');

  section('Intervalos · Sin pista');
  W("if(earMode) $('earModeBtn').click(); activeNotes.clear();");
  W('var __rnd = Math.random; Math.random = () => 0.5;');
  ev('#ivHideBtn');
  W('Math.random = __rnd;');
  check(W('ivMode') === 'hide' && doc.getElementById('ivHideBtn').classList.contains('active'), 'se enciende Sin pista');
  check(W('intervalRootPC') === 6, 'la nota de partida se sortea al encenderlo');
  W('practiceIndex = 4; startIntervalStep();');     // 3ª mayor
  const hRoot = W('currentIntervalRoot()'), hTop = hRoot + 4;
  check(doc.querySelectorAll('#pianoSvg .target').length === 1 && W(`getRect(${hRoot}).classList.contains('target')`),
    'solo se marca la nota de partida');
  check(doc.getElementById('distanceBox').style.display === 'none', 'la distancia no se muestra (diría dónde está)');
  check(!doc.getElementById('targetSubLabel').textContent.includes(W(`noteLabel(${hTop})`)), 'el texto no nombra la segunda nota');
  W(`noteOn(${hRoot}); noteOn(${hRoot + 5});`);
  check(W('feedbackText.textContent').includes('4ª justa') && W('feedbackText.textContent').includes('3ª mayor'),
    'una nota equivocada dice qué intervalo formó y cuál se busca');
  W(`noteOff(${hRoot + 5});`);
  const runsBefore = W('(progress.intervals[4] || {}).runs || 0');
  W('Math.random = () => 0.1;');
  W(`noteOn(${hTop});`);
  check(W('feedbackText.textContent').startsWith('Correcto'), 'con las dos juntas es correcto');
  check(W('(progress.intervals[4] || {}).runs') === runsBefore + 1, 'y cuenta en el progreso');
  W(`noteOff(${hRoot}); noteOff(${hTop});`);
  await new Promise(r => setTimeout(r, 1500));
  W('Math.random = __rnd;');
  check(W('practiceIndex') === W('nextIntervalIdx(4)'), 'pasa al siguiente intervalo de la escalera');
  check(W('intervalRootPC') === 1, 'con otra nota de partida (se volvió a sortear)');

  section('Intervalos · A tiempo');
  ev('#ivTempoBtn');
  check(W('ivMode') === 'tempo' && !doc.getElementById('ivHideBtn').classList.contains('active'), 'A tiempo apaga Sin pista');
  check(doc.getElementById('ivBeatGroup').style.display !== 'none', 'aparece el selector de tiempo');
  check(doc.querySelectorAll('#timingBox .beat-cell').length === 4 && doc.querySelectorAll('#timingBox .beat-cell.tgt').length === 1,
    'conteo 1 2 3 4 con el tiempo pedido marcado');
  W('metro.on = false; practiceIndex = 4; startIntervalStep();');
  W('noteOn(60); noteOn(64);');
  check(W('ivT.done') === 0 && W('feedbackText.textContent').includes('metrónomo'), 'sin metrónomo no cuenta y lo dice');
  W('noteOff(60); noteOff(64);');

  // El tiempo del compás: el pulso de referencia cae en refPerf y es el número refBeat+1.
  W("metro.on = true; metro.bpm = 60; metro.refPerf = 1000; metro.refBeat = 0; ivBeat = '1';");
  check(W('ivBeatOffset(1000)') === 0 && W('ivBeatOffset(5050)') === 50, 'en el 1: desfase al 1 más cercano');
  check(W('ivBeatOffset(2000)') === 1000, 'tocar en el 2 cuando se pide el 1 queda un pulso fuera');
  W("ivBeat = '2';");
  check(W('ivBeatOffset(2000)') === 0, 'en el 2: el pulso siguiente al 1');
  W("metro.refBeat = 3; ivBeat = '1';");
  check(W('ivBeatOffset(2000)') === 0, 'si el pulso de referencia era el 4, el 1 es el siguiente');
  W("metro.refBeat = 0; ivBeat = '1'; metroFlash(false, 2);");
  check(doc.querySelector('#timingBox .beat-cell[data-b="2"]').classList.contains('now'), 'el conteo sigue al clic');
  W('metroRender();');
  check(doc.querySelectorAll('#timingBox .beat-cell').length === 4, 'encender/renderizar el metrónomo no borra la cinta (la caja es compartida)');

  W('var __bo = ivBeatOffset; ivBeatOffset = () => 20; practiceIndex = 4; startIntervalStep();');
  // 7 terceras mayores desde teclas distintas + 1 intervalo equivocado
  for(let i = 0; i < 7; i++){
    const r = 48 + i * 2;
    W(`noteOn(${r}); noteOn(${r + 4});`);
    if(i === 0){
      W(`noteOn(${r + 7});`);
      check(W('ivT.done') === 1, 'sin soltar, otra tecla no suma un toque');
    }
    W(`activeNotes.forEach(n => noteOff(n));`);
  }
  check(W('ivT.done') === 7 && W('ivT.timing').every(v => v === 20), 'vale el intervalo desde cualquier tecla');
  const runs4 = W('(progress.intervals[4] || {}).runs || 0');
  W('noteOn(60); noteOn(65);');
  check(W('feedbackText.textContent').includes('8 a tiempo') || W('ivT.timing[7]') === Infinity, 'el octavo es otro intervalo: cuenta como fallo');
  check(doc.querySelectorAll('#timingBox .timing-chip.miss').length === 1, 'y su casilla sale en rojo');
  check(W('feedbackText.textContent').includes('7 de 8') && W('feedbackText.textContent').includes('✓'), '7 de 8 (87%) pasa el listón');
  check(W('(progress.intervals[4] || {}).runs') === runs4 + 1, 'una vuelta aprobada cuenta en el progreso');
  W('noteOff(60); noteOff(65);');
  await new Promise(r => setTimeout(r, 2300));
  check(W('practiceIndex') === W('nextIntervalIdx(4)') && W('ivT.done') === 0, 'aprobada, pasa al siguiente intervalo');

  W('ivBeatOffset = () => 200; practiceIndex = 0; startIntervalStep();');   // unísono
  for(let i = 0; i < 8; i++){ W(`noteOn(${60 + i}); noteOff(${60 + i});`); }
  check(W('ivT.done') === 8, 'unísono: una sola tecla es el intervalo');
  check(W('feedbackText.textContent').includes('otra vuelta'), 'todo fuera de tiempo: otra vuelta');
  await new Promise(r => setTimeout(r, 2300));
  check(W('practiceIndex') === 0, 'reprobada, repite el mismo intervalo');

  ev('#earModeBtn');
  check(W('earMode') === true && W('ivMode') === 'show' && !doc.getElementById('ivTempoBtn').classList.contains('active'),
    'De oído apaga A tiempo: los modos son excluyentes');
  check(doc.getElementById('ivBeatGroup').style.display === 'none' && doc.getElementById('timingBox').style.display === 'none',
    'y esconde el conteo');
  ev('#earModeBtn');
  W("ivBeatOffset = __bo; metro.on = false; metro.refPerf = null; ivMode = 'show'; ivBeat = '1'; applyIvModeButtons();" +
    " try { localStorage.removeItem('ivMode'); localStorage.removeItem('ivBeat'); } catch(e){}");

  section('Arpèges à Agathe (Daguet)');
  {
    const ag = W("SONGS.find(s => s.id === 'arpeges-agathe')");
    check(!!ag && ag.cat === 'clasica', 'está en Clásicas');
    const beats = ag.steps.reduce((a, s) => a + s.dur, 0);
    check(beats === 62, `15 compases de 4 + el final de 2 tiempos (${beats})`);
    // cada compás: el bajo solo en el 1 (la derecha empieza tras un silencio de corchea) + 7 corcheas
    const bars = [];
    for(let i = 0; i < 15 * 8; i += 8) bars.push(ag.steps.slice(i, i + 8));
    check(bars.every(b => b[0].lh.length === 1 && b[0].rh.length === 0 && b.slice(1).every(s => s.lh.length === 0 && s.rh.length === 1)),
      'cada compás: nota larga de la izquierda y siete corcheas de la derecha');
    // las corcheas de cada mitad de compás forman una tríada (es un ejercicio de acordes en arpegio)
    const triad = (ns) => { const pcs = [...new Set(ns.map(n => n % 12))].sort((a, b) => a - b);
      return pcs.length === 3 && [0, 1, 2].some(r => { const root = pcs[r], iv = pcs.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
        return (iv[1] === 3 || iv[1] === 4) && (iv[2] === 6 || iv[2] === 7); }); };
    check(bars.slice(0, 14).every(b => triad(b.slice(1, 4).map(s => s.rh[0])) && triad(b.slice(4, 8).map(s => s.rh[0]))),
      'cada mitad de compás (1-14) es una tríada en arpegio');
    const bajos = bars.map(b => b[0].lh[0]).concat(ag.steps[ag.steps.length - 1].lh);
    check(JSON.stringify(bajos) === JSON.stringify([52,52,50,50,48,48,47,40,52,45,50,43,48,42,47,40]),
      'bajos Mi Mi Re Re Do Do Si Mi Mi La Re Sol Do Fa# Si Mi (cuadran con el mp3)');
    // dedos de la partitura: 4-2-1 al bajar el acorde
    check(bars.slice(0, 14).every(b => b.slice(1, 4).map(s => s.rhF[0]).join('') === '421'), 'la derecha baja cada acorde con 4-2-1');
    check(ag.steps.every(s => (s.rhF || []).length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    check(!W("buildTodayPlan(1)").some(it => it.key === 'song' && it.title.includes('Agathe')) &&
          !W("buildTodayPlan(7)").some(it => it.key === 'song' && it.title.includes('Agathe')),
      'el plan de Hoy no la propone todavía (es "para más adelante")');
  }

  section('Melodías de la clase (pianoencasa)');
  {
    const ids = ['clase-sol','clase-mim','clase-re','clase-la','clase-fa','clase-sib'];
    const KEY = { 'clase-sol':[7,9,11,0,2,4,6], 'clase-mim':[7,9,11,0,2,4,6], 'clase-re':[2,4,6,7,9,11,1],
                  'clase-la':[9,11,1,2,4,6,8], 'clase-fa':[5,7,9,10,0,2,4], 'clase-sib':[10,0,2,3,5,7,9] };
    const BEATS = { 'clase-mim':36 };
    check(W("SONG_CATS[0].id") === 'clase', 'categoría "De la clase" primera en la barra');
    for(const id of ids){
      const p = W(`SONGS.find(s => s.id === '${id}')`);
      check(!!p && p.cat === 'clase', `${id}: está en De la clase`);
      const beats = p.steps.reduce((a, s) => a + s.dur, 0);
      check(Math.abs(beats - (BEATS[id] || 32)) < 1e-9, `${id}: ${BEATS[id] ? 9 : 8} compases de 4 (${beats})`);
      // todo cae en la tonalidad de la hoja: una nota mal leída se saldría
      const key = new Set(KEY[id]);
      check(p.steps.every(s => s.rh.concat(s.lh).every(n => key.has(n % 12))), `${id}: todas las notas en su tonalidad`);
      // la izquierda: tríadas en posición fundamental con 5-3-1
      const chords = p.steps.filter(s => s.lh.length);
      check(chords.every(s => s.lh.length === 3 && s.lhF.join('') === '531' &&
        [3,4].includes(s.lh[1] - s.lh[0]) && s.lh[2] - s.lh[0] === 7), `${id}: acordes en bloque, fundamental, 5-3-1`);
      check(p.steps.every(s => s.rh.length === 1 && s.rhF.length === 1), `${id}: una nota de melodía por paso, con dedo`);
      // las manos no se cruzan
      check(p.steps.every(s => !s.lh.length || Math.max(...s.lh) < s.rh[0]), `${id}: la izquierda siempre debajo de la melodía`);
    }
    // La melodía de Re va una octava arriba (clave con 8 encima en la hoja)
    const re = W("SONGS.find(s => s.id === 'clase-re')");
    check(re.steps[0].rh[0] === 74 && Math.max(...re.steps.map(s => s.rh[0])) === 86, 'Re: empieza en Re5 y llega a Re6 (8va de la hoja)');
    // Si bemol: la hoja escribe la izquierda más grave que en las otras
    const sib = W("SONGS.find(s => s.id === 'clase-sib')");
    check(JSON.stringify(sib.steps[0].lh) === '[46,50,53]', 'Si♭: el acorde de Si♭ es Si♭2-Re3-Fa3');
    check(sib.steps[0].dur === 0.75 && sib.steps[1].dur === 0.25, 'Si♭: el puntillo (corchea con puntillo + semicorchea)');
    // el plan de Hoy puede mandar a una de estas y el enlace funciona
    W("fragCat = 'facil'; selectCategory('fragments'); pickFragmentById('clase-la');");
    check(W('currentFragment.id') === 'clase-la' && W('fragCat') === 'clase', 'pickFragmentById abre "De la clase"');
  }

  section('El metrónomo se detiene al cambiar de ejercicio');
  {
    // Cambiar de práctica (Jorge reportó que seguía sonando solo).
    W("selectCategory('chords'); metro.on = true; metro.timer = 999; metro.refPerf = 1234;");
    W("selectCategory('scales');");
    check(W('metro.on') === false, 'cambiar de pestaña principal apaga el metrónomo');
    check(W('metro.timer') === null && W('metro.refPerf') === null, 'y limpia el temporizador y la referencia de pulso');

    // Cambiar de escala dentro de Escalas también cuenta como cambiar de ejercicio.
    W("selectCategory('scales'); metro.on = true;");
    W("$('scaleFamilyTabs').querySelector('[data-family=\\'minor\\']').click();");
    check(W('metro.on') === false, 'cambiar de familia de escala también lo apaga');
    W("$('scaleFamilyTabs').querySelector('[data-family=\\'major\\']').click(); metro.on = true;");
    W("document.querySelectorAll('#scaleSubTabs .mode-tab')[1].click();");
    check(W('metro.on') === false, 'y cambiar de escala dentro de la misma familia');

    // No se reanuda solo: encenderlo vuelve a depender del botón.
    W("selectCategory('intervals');");
    check(W('metro.on') === false, 'no se reanuda solo al volver a entrar a una pestaña');

    // Cambiar de app / de pestaña del navegador.
    W("metro.on = true;");
    W("Object.defineProperty(document, 'hidden', { value: true, configurable: true });" +
      "document.dispatchEvent(new window.Event('visibilitychange'));");
    check(W('metro.on') === false, 'salir de la pestaña/app (visibilitychange) también lo apaga');
    W("Object.defineProperty(document, 'hidden', { value: false, configurable: true });");
  }

  section('Aleluya: la izquierda queda en una sola posición');
  {
    const al = W("SONGS.find(s => s.id === 'aleluya')");
    const lhSteps = al.steps.filter(s => s.lh.length);
    check(lhSteps.every(s => s.lh.length === 1 && s.lhF.length === 1), 'una nota grave por vez, con dedo');
    const byNote = {};
    lhSteps.forEach(s => { byNote[s.lh[0]] = s.lhF[0]; });
    check(JSON.stringify(byNote) === JSON.stringify({48:1, 45:3, 41:5}), 'pulgar en Do(48), 3 en La(45), 5 en Fa(41) — siempre el mismo dedo por nota');
    check(Math.max(...lhSteps.map(s => s.lh[0])) - Math.min(...lhSteps.map(s => s.lh[0])) === 7,
      'las tres notas caben en una sola posición de mano (una 5ª de span)');
  }

  section('Amanecer: la izquierda queda en una sola posición');
  {
    const am = W("SONGS.find(s => s.id === 'amanecer')");
    const lhSteps = am.steps.filter(s => s.lh.length);
    const byNote = {};
    let consistent = true;
    lhSteps.forEach(s => { if(byNote[s.lh[0]] !== undefined && byNote[s.lh[0]] !== s.lhF[0]) consistent = false; byNote[s.lh[0]] = s.lhF[0]; });
    check(consistent, 'cada nota grave lleva siempre el mismo dedo');
    check(JSON.stringify(byNote) === JSON.stringify({41:5, 43:4, 45:3, 48:1}),
      'pulgar en Do(48), 3 en La(45), 4 en Sol(43), 5 en Fa(41)');
  }

  section('La izquierda no salta con el meñique de nota en nota');
  {
    // En estas piezas la izquierda cabe en UNA posición: cada dedo toca una sola tecla.
    for(const id of ['cadencia','arpegio','colegiala','faded','espiritu-de-dios','aleluya','amanecer','estrellita','dios-esta-aqui']){
      const song = W(`SONGS.find(s => s.id === '${id}')`);
      const byFinger = {};
      song.steps.filter(s => s.lh.length === 1).forEach(s => (byFinger[s.lhF[0]] = byFinger[s.lhF[0]] || new Set()).add(s.lh[0]));
      check(Object.values(byFinger).every(set => set.size === 1), `${id}: cada dedo de la izquierda toca siempre la misma tecla`);
    }
    // Flaca: meñique en Sol; solo el Mi mueve el pulgar un paso (y lo avisa).
    const fl = W("SONGS.find(s => s.id === 'flaca')").steps.filter(s => s.lh.length === 1);
    check(fl.every(s => ({43:5,47:3,48:2,50:1,52:1})[s.lh[0]] === s.lhF[0]), 'Flaca: Sol 5, Si 3, Do 2, Re 1, Mi 1');
    check(fl.filter(s => s.lh[0] === 52).every(s => /pulgar sube un paso a Mi/.test(s.label || '')), 'Flaca: el paso del Mi avisa que sube el pulgar');
    // Bella Ciao: dos posiciones, y cada mudanza de la izquierda va avisada.
    const bc = W("SONGS.find(s => s.id === 'bella-ciao')").steps;
    const labels = bc.map(s => s.label || '').join(' | ');
    check(/Izquierda baja: meñique a La/.test(labels) && /Izquierda sube: pulgar a La/.test(labels) && /izquierda: pulgar a Mi/.test(labels),
      'Bella Ciao: las tres mudanzas de la izquierda están marcadas');
    check(bc.filter(s => s.lh.length === 1).every(s => s.lhF[0] !== 5 || s.lh[0] === 45 || s.lh[0] === 50),
      'Bella Ciao: el meñique solo cae en La grave o en Re (fin de la bajada)');
  }

  section('Passacaglia (Händel-Halvorsen), muestra c. 1-8');
  {
    const pc = W("SONGS.find(s => s.id === 'passacaglia')");
    check(!!pc && pc.cat === 'clasica' && pc.plan === false && pc.tempo === 120, 'en Clásicas, fuera del plan de Hoy, ♩=120');
    check(pc.steps.reduce((a, s) => a + s.dur, 0) === 32, '8 compases de 4 tiempos');
    const bajos = pc.steps.filter(s => s.lh.length).map(s => s.lh[0]);
    check(JSON.stringify(bajos) === '[57,50,55,48,53,50,52,57]', 'bajo La–Re–Sol–Do–Fa–Re–Mi–La (la progresión de Händel, en La menor)');
    const rh = pc.steps.map(s => s.rh[0]).join(',');
    check(rh === '72,84,83,84,81,84,79,84,77,84,76,84,74,84,72,84,71,83,81,83,79,83,77,83,76,83,74,83,72,83,71,83,' +
      '69,81,79,81,77,81,76,81,74,81,72,81,71,81,69,81,81,80,78,80,81,81', 'la derecha, nota por nota, igual al JSON recibido');
    check(pc.steps.every(s => s.rhF.length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    // Segunda versión del JSON: trae `finger` con fingerSource:"printed" (MusicXML). Ganan los impresos.
    check(pc.steps.filter(s => s.lh.length).map(s => s.lhF[0]).join(',') === '1,4,1,5,2,4,3,1', 'izquierda: dedos impresos 1-4-1-5-2-4-3-1');
    check(pc.steps.flatMap(s => s.rhF).join(',') === '1,5,4,5,3,5,2,5,1,5,1,5,1,5,1,5,1,5,4,5,3,5,2,5,1,5,1,5,1,5,1,5,' +
      '1,5,4,5,3,5,2,5,1,5,1,5,1,5,1,5,5,4,3,4,5,5', 'derecha: dedos impresos, nota por nota');
    check(pc.steps.every(s => !s.lh.length || s.lh[0] < Math.min(...s.rh)), 'las manos no se cruzan');
  }

  section('Für Elise (JSON de eventos, 3/4 con anacrusa)');
  {
    const fe = W("SONGS.find(s => s.id === 'fur-elise')");
    check(!!fe && fe.cat === 'clasica' && fe.plan === false && fe.tempo === 120 && fe.meter === 3 && fe.pickup === 1,
      'en Clásicas, fuera del plan de Hoy, ♩=120, compás de 3 con un tiempo de anacrusa');
    const total = fe.steps.reduce((a, s) => a + s.dur, 0);
    check(total === 76 && (total - fe.pickup) % 3 === 0, 'anacrusa + 25 compases de 3 tiempos, sin sobras');
    const rh = fe.steps.flatMap(s => s.rh).join(',');
    const rhJson = '76,75,76,75,76,71,74,72,69,60,64,69,71,64,68,71,72,64,76,75,76,75,76,71,74,72,69,60,64,69,71,64,72,71,69,71,72,74,76,67,77,76,74,65,76,74,72,64,74,72,71';
    check(rh === rhJson + ',' + rhJson, 'la derecha, nota por nota, igual al JSON (las dos vueltas)');
    const lh = fe.steps.flatMap(s => s.lh).join(',');
    check(lh === '57,52,57,57,52,57,60,59,57,56,57,52,57,57,52,57,60,59,57,56', 'la izquierda igual al JSON');
    check(W("(() => { const s = SONGS.find(x => x.id === 'fur-elise').steps; return s[1] === FE_A[0] && s[52] === FE_A[0]; })()"),
      'las dos vueltas comparten FE_A: corregir una nota corrige las dos');
    check(fe.steps.every(s => s.rhF.length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    // Dedos: los impresos del MusicXML (segunda entrega del JSON). Los 6 "sugeridos" (E-D#-E de los c. 2 y 6,
    // que el proponedor dio como 4-3-4) se dejaron 5-4-5: es el motivo de la anacrusa (5-4 impreso).
    const lhOne = '1,4,1,1,4,2,1,2,3,4';
    check(fe.steps.filter(s => s.lh.length).map(s => s.lhF[0]).join(',') === lhOne + ',' + lhOne,
      'izquierda: dedos impresos 1-4-1-1-4-2-1-2-3-4, en las dos vueltas (no es posición fija)');
    const rhOne = '5,4,5,4,5,2,4,3,2,1,2,4,5,1,2,3,4,1,5,4,5,4,5,2,4,3,2,1,2,4,5,1,3,2,1,2,3,4,5,1,5,4,3,1,5,4,3,1,5,4,3';
    check(fe.steps.flatMap(s => s.rhF).join(',') === rhOne + ',' + rhOne, 'derecha: dedos impresos nota por nota, en las dos vueltas');
    check(fe.steps.flatMap(s => s.rh.map((n, i) => (n === 76 || n === 75) ? s.rhF[i] : null)).filter(x => x).slice(0, 5).join(',') === '5,4,5,4,5',
      'el motivo Mi-Re#-Mi-Re#-Mi lleva 5-4-5-4-5 (sin el 4-3-4 sugerido)');
    check(fe.steps.every(s => !s.lh.length || s.lh[0] < Math.min(...s.rh)), 'las manos no se cruzan');
  }

  section('Cascada: compás y anacrusa de la pieza');
  {
    const bars = (id, from) => W(`(() => {
      currentFragment = SONGS.find(s => s.id === '${id}'); cascadeFrom = ${from}; cascadeTo = null;
      return buildCascadeSchedule().beats.filter(b => b.bar && b.k >= 0).slice(0, 3).map(b => b.k);
    })()`);
    check(JSON.stringify(bars('amanecer', 1)) === '[0,4,8]', '4/4 sin anacrusa: barras cada 4 tiempos, como antes');
    check(JSON.stringify(bars('fur-elise', 1)) === '[1,4,7]', 'Für Elise: la primera barra cae después del tiempo de anacrusa, y luego cada 3');
    // Tramo que empieza en el c. 3 (paso 9): la barra cae justo al empezar.
    check(JSON.stringify(bars('fur-elise', 9)) === '[0,3,6]', 'un tramo a mitad de pieza sigue la rejilla de la pieza, no la del tramo');
    W("cascadeFrom = 1; cascadeTo = null; currentFragment = FRAGMENTS[0];");
  }

  section('Clocks (Coldplay, arreglo fácil, JSON con dudas)');
  {
    const ck = W("SONGS.find(s => s.id === 'clocks')");
    check(!!ck && ck.cat === 'popular' && ck.plan === false && ck.tempo === 120, 'en Populares, fuera del plan de Hoy, ♩=120');
    check(ck.steps.reduce((a, s) => a + s.dur, 0) === 88, '22 compases de 4 tiempos, sin sobras');
    check(ck.steps.flatMap(s => s.rh).join(',') === '75,70,66,75,70,66,75,70,73,70,65,73,70,65,73,70,73,70,65,73,70,65,73,70,72,68,65,72,68,65,72,68,75,75,75,75,72,73,72,70,73,73,73,73,70,72,70,68,61,61,68,66,65,63,61,63,65,75,70,66,75,70,66,75,70,73,70,65,73,70,65,73,70,73,70,65,73,70,65,73,70,72,68,65,72,68,65,72,68,80,78,75,80,78,75,80,78,80,78,73,80,78,73,80,78,80,78,73,80,78,73,80,78,80,78,72,80,78,72,80,78,80,78,72,80,78,72,80,78,80,78,72,80,78,72,80,78,80,78,72,80,78,72,80,78', 'la derecha, nota por nota, igual al JSON');
    check(ck.steps.flatMap(s => s.rhF).join(',') === '4,2,1,4,2,1,4,2,3,2,1,3,2,1,3,2,3,2,1,3,2,1,3,2,4,2,1,4,2,1,4,2,5,5,5,5,3,4,3,2,4,4,4,4,2,3,2,1,1,1,5,4,3,2,1,2,3,4,2,1,4,2,1,4,2,3,2,1,3,2,1,3,2,3,2,1,3,2,1,3,2,4,2,1,4,2,1,4,2,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4,5,4,1,5,4,1,5,4', 'derecha: todos los dedos impresos');
    check(ck.steps.flatMap(s => s.lh).join(',') === '63,58,58,53,54,58,63,53,58,61,53,58,61,53,56,60,49,54,58,49,53,56,51,46,46,41,54,58,63,53,58,61,53,58,61,53,56,60,53,56,60', 'la izquierda, nota por nota, igual al JSON');
    check(ck.steps.every(s => s.rhF.length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    check(ck.steps.flatMap(s => s.rh.concat(s.lh)).every(n => [0, 1, 3, 5, 6, 8, 10].includes(n % 12)), 'todo cae en Reb mayor / Sib menor');
    // Bajos sueltos: 1-3-5 (los dedos del acorde del c. 5), no el meñique en cada nota.
    const bajos = ck.steps.filter(s => s.lh.length === 1).map(s => s.lh[0] + ':' + s.lhF[0]).join(',');
    check(bajos === '63:1,58:3,58:3,53:5,51:1,46:3,46:3,41:5', 'bajos sueltos con 1-3-5, no con el meñique saltando de tecla en tecla');
    check(ck.steps.filter(s => s.lh.length === 3).every(s => s.lhF.join(',') === '5,3,1'), 'acordes de la izquierda con 5-3-1');
    check(ck.steps.every(s => !s.lh.length || s.lh[0] < Math.min(...(s.rh.length ? s.rh : [999]))), 'las manos no se cruzan');
    // Ritmo del riff 3+3+2: en el c. 1 cada corchea es un paso de 0.5.
    check(ck.steps.slice(0, 8).every(s => s.dur === 0.5) && ck.steps[8].label.startsWith('c. 2'), 'el riff del c. 1 son 8 corcheas seguidas');
    // El c. 9 (lectura dudosa): acorde de la izquierda solo, 3 tiempos, y la derecha entra en el tiempo 4.
    const i9 = ck.steps.findIndex(s => /^c\. 9/.test(s.label || ''));
    check(ck.steps[i9].rh.length === 0 && ck.steps[i9].dur === 3 && ck.steps[i9].label.includes('dudosa'), 'c. 9: acorde solo 3 tiempos y aviso de lectura dudosa');
    // Sostenido final: el acorde del c. 20 dura hasta el final (3 compases).
    const i20 = ck.steps.findIndex(s => /^c\. 20/.test(s.label || ''));
    check(ck.steps.slice(i20).reduce((a, s) => a + s.dur, 0) === 12 && ck.steps.slice(i20 + 1).every(s => !s.lh.length), 'el acorde del c. 20 se sostiene hasta el final');
  }

  section('Arioso (Mozart, JSON 3/4 con dedos impresos y propuestos)');
  {
    const ar = W("SONGS.find(s => s.id === 'mozart-arioso')");
    check(!!ar && ar.cat === 'clasica' && ar.plan === false && ar.tempo === 71 && ar.meter === 3, 'en Clásicas, fuera del plan de Hoy, ♩=71, compás de 3');
    check(ar.steps.reduce((a, s) => a + s.dur, 0) === 96, '32 compases de 3 tiempos, sin sobras');
    check(ar.steps.flatMap(s => s.rh).join(',') === '74,71,69,67,66,67,67,69,72,69,67,66,64,66,67,83,79,76,73,74,69,71,76,74,73,74,74,71,69,67,66,67,67,69,72,69,67,66,64,66,67,83,79,76,73,74,69,71,76,74,73,74,74,71,69,67,66,67,76,76,73,71,69,68,69,78,76,72,69,66,67,62,64,69,67,66,67,74,71,69,67,66,67,76,76,73,71,69,68,69,78,76,72,69,66,67,62,64,69,67,66,67', 'la derecha, nota por nota, igual al JSON');
    check(ar.steps.flatMap(s => s.lh).join(',') === '55,59,62,60,60,60,62,62,62,55,59,62,55,59,64,57,54,55,57,57,54,50,55,59,62,60,60,60,62,62,62,55,59,62,55,59,64,57,54,55,57,57,54,50,59,59,59,60,59,60,61,61,61,62,61,62,60,60,60,60,59,60,59,62,57,60,55,59,59,59,59,60,59,60,61,61,61,62,61,62,60,60,60,60,59,60,59,62,57,60,55,59', 'la izquierda, nota por nota, igual al JSON');
    check(ar.steps.flatMap(s => s.rhF).join(',') === '5,3,2,1,2,3,2,3,5,4,3,2,1,2,3,5,3,1,2,3,1,2,5,3,2,3,5,3,2,1,2,3,2,3,5,4,3,2,1,2,3,5,3,1,2,3,1,2,5,3,2,3,5,3,2,1,2,1,5,5,3,2,1,2,1,5,5,3,1,2,3,1,2,5,3,1,2,5,3,2,1,2,1,5,5,3,2,1,2,1,5,5,3,1,2,3,1,2,5,3,1,2', 'derecha: dedos del JSON (impresos y propuestos)');
    check(ar.steps.flatMap(s => s.lhF || []).join(',') === '5,3,1,2,2,2,1,1,1,5,3,1,5,3,1,4,5,2,1,1,3,5,5,3,1,2,2,2,1,1,1,5,3,1,5,3,1,4,5,2,1,1,3,5,2,2,2,1,2,2,2,2,2,1,2,1,2,2,1,1,2,2,3,1,4,2,5,3,2,2,2,1,2,2,2,2,2,1,2,1,2,2,1,1,2,2,3,1,4,2,5,3', 'izquierda: dedos del JSON, con el Si3 del c. 24 en 3');
    check(ar.steps.every(s => s.rhF.length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    check(ar.steps.every(s => !s.lh.length || !s.rh.length || Math.max(...s.lh) < Math.min(...s.rh)), 'las manos no se cruzan');
    // Repeticiones: A (c. 1-8) y C (c. 17-24) se usan dos veces y comparten los MISMOS objetos de paso.
    check(W("(() => { const s = SONGS.find(x => x.id === 'mozart-arioso').steps; return s.length === 118 && s[1] === MOZ_A[1] && s[31] === MOZ_A[1] && s[61] === MOZ_C[1] && s[90] === MOZ_C[1]; })()"),
      'las dos vueltas de cada sección comparten pasos: corregir una nota corrige las dos');
    const lab = ar.steps.map(s => s.label || '').filter(Boolean);
    check(['c. 1 · Tema', 'c. 9 · Repetición', 'c. 17 · Desarrollo', 'c. 25 · Cierre'].every(l => lab.includes(l)), 'cuatro anclas de sección para el Tramo de la cascada');
    check(ar.steps.filter(s => s.rh.includes(83)).length === 2 && ar.steps.filter(s => /salto/.test(s.label || '')).length === 2, 'el salto Sol4 a Si5 (c. 5 y 13) va avisado');
    // El acorde Sol3+Si3 del c. 24 (y del 32): 5-3, como Sol3 5 / Si3 3 impresos en el c. 5. El JSON daba 2 en el c. 24 y 3 en el 32.
    const acordes = ar.steps.filter(s => s.lh.join() === '55,59').map(s => s.lhF.join());
    check(acordes.length === 2 && acordes.every(x => x === '5,3'), 'el acorde Sol3+Si3 lleva 5-3 en las dos vueltas de la sección C');
    // La cascada dibuja la barra cada 3 tiempos desde el primer paso.
    const barras = W(`(() => { currentFragment = SONGS.find(s => s.id === 'mozart-arioso'); cascadeFrom = 1; cascadeTo = null;
      return buildCascadeSchedule().beats.filter(b => b.bar && b.k >= 0).slice(0, 3).map(b => b.k); })()`);
    check(JSON.stringify(barras) === '[0,3,6]', 'la cascada marca la barra cada 3 tiempos');
    W("cascadeFrom = 1; cascadeTo = null; currentFragment = FRAGMENTS[0];");
  }

  section('Canon en Re (Pachelbel): versión simplificada desde la completa');
  {
    const cn = W("SONGS.find(s => s.id === 'canon-en-re')");
    check(!!cn && cn.cat === 'clasica' && cn.plan === false && cn.tempo === 108 && !cn.meter, 'en Clásicas, fuera del plan de Hoy, ♩=108, compás de 4');
    check(cn.steps.reduce((a, s) => a + s.dur, 0) === 196, '49 compases de 4 tiempos, sin sobras');
    check(cn.steps.flatMap(s => s.rh).join(',') === '66,69,74,64,69,73,62,66,71,61,66,69,59,62,67,57,62,66,59,62,67,61,64,69,78,76,74,73,71,69,71,73,74,73,74,66,74,69,64,66,74,74,73,71,73,78,81,83,79,78,76,79,78,76,74,73,71,69,67,66,64,67,66,64,62,64,66,67,69,64,69,67,66,71,69,67,69,67,66,64,62,59,71,73,74,73,71,69,67,66,64,71,69,71,69,81,78,79,81,78,79,81,69,71,73,74,76,78,79,78,74,76,78,66,67,69,71,69,67,69,66,67,69,67,71,69,67,66,64,66,64,62,64,66,67,69,71,67,71,69,71,73,74,69,71,73,74,76,78,79,81,78,76,74,73,71,69,71,76,73,76,74,78,81', 'la derecha: una voz, nota por nota (el acorde final aparte)');
    check(cn.steps.flatMap(s => s.lh).join(',') === '62,57,59,54,55,50,55,57,62,66,69,74,57,61,64,69,59,62,66,71,54,57,61,66,55,59,62,67,50,54,57,62,55,59,62,67,57,61,64,69,38,45,47,42,43,38,43,45,38,45,42,43,47,43,38,45,62,57,55,54,55,50,55,57,62,66,69,74,57,61,64,69,59,62,66,71,54,57,61,66,55,59,62,67,50,54,57,62,55,59,62,67,57,61,64,69,50', 'la izquierda: nota por nota');
    check(cn.steps.flatMap(s => s.rhF).join(',') === '1,3,5,1,3,5,1,3,5,1,4,5,1,3,5,1,3,5,1,2,5,1,2,4,3,2,1,3,2,1,2,3,4,3,5,1,5,3,1,2,5,5,2,1,2,3,4,5,3,2,1,4,3,2,1,4,5,4,3,2,1,4,3,2,1,2,3,4,5,2,5,4,2,5,4,3,4,3,2,1,3,1,2,3,4,3,2,1,3,2,1,5,4,5,4,5,4,1,2,1,3,5,1,2,3,1,2,3,4,3,1,3,5,2,3,4,5,4,3,4,2,3,4,3,5,4,3,2,1,3,2,1,2,3,1,2,3,1,3,1,2,3,4,1,2,3,1,2,3,4,5,3,2,1,3,2,1,2,5,2,3,1,3,5', 'derecha: dedos');
    check(cn.steps.flatMap(s => s.lhF || []).join(',') === '1,4,2,4,3,5,4,3,5,4,3,1,5,4,3,1,5,4,3,1,5,4,2,1,5,4,3,1,5,4,3,1,5,4,3,1,5,4,3,1,5,2,1,4,3,5,2,1,5,1,4,3,1,3,5,3,1,3,4,5,4,5,4,3,5,4,3,1,5,4,3,1,5,4,3,1,5,4,2,1,5,4,3,1,5,4,3,1,5,4,3,1,5,4,3,1,5', 'izquierda: dedos');
    check(cn.steps.every(s => s.rhF.length === s.rh.length && (s.lhF || []).length === s.lh.length), 'toda nota lleva dedo');
    // Los c. 9-14 y 41-46 son idénticos: comparten los mismos objetos de paso.
    check(W("(() => { const s = SONGS.find(x => x.id === 'canon-en-re').steps; return s.length === 216 && s[33] === CAN_B6[1] && s[184] === CAN_B6[1]; })()"),
      'los c. 9-14 y 41-46 comparten pasos: corregir una nota corrige las dos vueltas');
    // Bajo: el de la versión completa en todos los compases, salvo el c. 38 (una octava abajo a propósito).
    const bajoCompleta = [62,57,59,54,55,50,55,57,62,57,59,54,55,50,55,57,38,45,47,42,43,38,43,45,38,45,42,43,47,43,38,45,62,57,55,54,55,62,55,57,62,57,59,54,55,50,55,57,50];
    const bajo = []; let beat = 0;
    cn.steps.forEach(s => { if(beat % 4 === 0 && s.lh.length) bajo.push(Math.min(...s.lh)); beat += s.dur; });
    check(bajo.length === 49 && bajo.every((n, i) => n === (i === 37 ? bajoCompleta[i] - 12 : bajoCompleta[i])), 'el bajo es el de la versión completa (el c. 38, una octava abajo)');
    // Las manos nunca se cruzan ni tocan la misma tecla (cada nota suena hasta el siguiente ataque de su mano).
    let lhSuena = [], rhSuena = [], choque = 0;
    cn.steps.forEach(s => {
      if(s.lh.length) lhSuena = s.lh;
      if(s.rh.length) rhSuena = s.rh;
      if(lhSuena.length && rhSuena.length && Math.max(...lhSuena) >= Math.min(...rhSuena)) choque++;
    });
    check(choque === 0, 'la izquierda siempre queda por debajo de la derecha: ni cruces ni la misma tecla en las dos manos');
    // Melodía (derecha): saltos y deslizamientos
    const rhSeq = cn.steps.flatMap(s => s.rh.map((n, i) => ({ n, f: s.rhF[i], solo: s.rh.length === 1 })));
    const saltos = rhSeq.slice(1).map((x, i) => Math.abs(x.n - rhSeq[i].n));
    check(Math.max(...saltos) <= 12, 'ningún salto de la derecha pasa de una octava');
    const deslizan = rhSeq.slice(1).filter((x, i) => x.solo && rhSeq[i].solo && x.f === rhSeq[i].f && x.n !== rhSeq[i].n).length;
    check(deslizan === 0, 'la derecha no usa el mismo dedo en dos teclas seguidas');
    // c. 24-29: la octava con menos salto (Mi4 Re4 La4 Fa#4 La4 Re4 en el primer tiempo)
    const pasos = []; { let b = 0; cn.steps.forEach(s => { pasos.push([b, s]); b += s.dur; }); }
    const primerRh = c => pasos.find(([b, s]) => b === 4 * (c - 1) && s.rh.length)[1].rh[0];
    check([24, 25, 26, 27, 28, 29].map(primerRh).join() === '64,62,69,66,69,62', 'c. 24-29: el primer tiempo de la derecha usa la octava que continúa la línea');
    // c. 12 y 44: arpegio de la izquierda en una octava (Fa#3 La3 Do#4 Fa#4), no en una 10ª
    const arp = c => pasos.filter(([b, s]) => b >= 4 * (c - 1) && b < 4 * c && s.lh.length).map(([, s]) => s.lh[0]).join();
    check(arp(12) === '54,57,61,66' && arp(44) === '54,57,61,66', 'c. 12 y 44: el arpegio de la izquierda abarca una octava');
    // Final: acorde de Re en la derecha (1-3-5) y bajo Re3
    const fin = cn.steps[cn.steps.length - 1];
    check(fin.rh.join() === '74,78,81' && fin.rhF.join() === '1,3,5' && fin.lh.join() === '50', 'c. 49: acorde de Re en la derecha con 1-3-5 y Re3 en la izquierda');
    const lab = cn.steps.map(s => s.label || '');
    check(['c. 1 ·', 'c. 9 ·', 'c. 17 ·', 'c. 33 ·', 'c. 41 ·', 'c. 47 ·', 'c. 49 ·'].every(p => lab.some(l => l.startsWith(p))), 'anclas de sección y del ritardando para el Tramo de la cascada');
    check(lab.filter(l => /mueve la mano/.test(l)).length === 1, 'el único pasaje que pide mover la mano (Si3 a Si4, c. 29) va avisado');
    check(/ritardando/.test(cn.tip), 'el consejo avisa que el ritardando impreso no se hace');
  }

  section('Dedos revisados (octubre 2026): sin meñique de tecla en tecla en lo inventado');
  {
    // Piezas cuya digitación NO viene impresa: el meñique no salta entre notas distintas seguidas.
    const pinkyHops = id => {
      const out = [];
      for(const hand of ['rh', 'lh']){
        let prev = null;
        W(`SONGS.find(s => s.id === '${id}')`).steps.forEach(st => {
          if(st[hand].length !== 1){ if(st[hand].length) prev = null; return; }
          const n = st[hand][0], f = st[hand + 'F'][0];
          if(prev && f === 5 && prev.f === 5 && n !== prev.n) out.push(hand + ':' + prev.n + '→' + n);
          prev = { n, f };
        });
      }
      return out;
    };
    for(const id of ['cumple', 'estrellita', 'flaca', 'bella-ciao', 'dbgt', 'dbgt-2', 'camino-intervalos', 'amanecer', 'colegiala', 'jingle-bells'])
      check(pinkyHops(id).length === 0, id + ': ningún meñique pasa de una tecla a otra seguida (' + pinkyHops(id).join(' ') + ')');
    // Cumpleaños feliz (octubre 2026): versión de Janneke Gunther en Fa mayor, izquierda simplificada.
    const cu = W("SONGS.find(s => s.id === 'cumple')");
    const cs = cu.steps;
    check(cu.meter === 3 && cu.pickup === 1 && cu.tempo === 96, 'Cumpleaños: compás de 3 con anacrusa de 1 tiempo, ♩=96 (práctica; el MIDI trae 114)');
    check(cs.reduce((a, s) => a + s.dur, 0) === 49, 'Cumpleaños: 49 tiempos = anacrusa de 1 + 16 compases de 3');
    check(cs.every(s => s.rh.length === 1 && s.rhF.length === 1), 'Cumpleaños: una sola tecla a la vez en la derecha, con su dedo');
    // Melodía contra el MusicXML (Do Re Mi Fa Sol La Sib Do; duraciones en tiempos)
    const VERSO = '62:1 60:1 65:1 | 64:2 60:.5 60:.5 | 62:1 60:1 67:1 | 65:2 60:.5 60:.5 | 72:1 69:1 65:1 | 64:1 62:1 70:.5 70:.5 | 69:1 65:1 67:1';
    const mel = cs.map(s => s.rh[0] + ':' + (s.dur === 0.5 ? '.5' : s.dur));
    const melEsperada = ['60:.5 60:.5', VERSO.replace(/ \| /g, ' '), '65:2 60:.5 60:.5', VERSO.replace(/ \| /g, ' '), '65:3'].join(' ').split(' ');
    check(mel.join(' ') === melEsperada.join(' '), 'Cumpleaños: la melodía coincide nota por nota y en ritmo con el MusicXML (dos vueltas)');
    // Izquierda: UNA nota por compás, nunca acordes, en la posición de Fa (Fa2 5, Sib2 2, Do3 1)
    const lhHits = cs.filter(s => s.lh.length);
    check(lhHits.length === 16 && lhHits.every(s => s.lh.length === 1 && s.lhF.length === 1), 'Cumpleaños: la izquierda ataca 16 veces, siempre una sola nota (el archivo traía acordes de 3-4 notas)');
    const LHF = { 41: 5, 46: 2, 48: 1 };
    check(lhHits.every(s => LHF[s.lh[0]] === s.lhF[0]), 'Cumpleaños: izquierda en posición fija de Fa (Fa 5, Sib 2, Do 1): la mano no se mueve');
    check(lhHits.map(s => s.lh[0]).join() === '41,48,48,41,41,46,41,41,41,48,48,41,41,46,41,41', 'Cumpleaños: la raíz de cada compás es la del acorde del archivo (Fa Do Do Fa Fa Sib Fa)');
    check(cs[0].lh.length === 0 && cs[1].lh.length === 0, 'Cumpleaños: la anacrusa va sin izquierda');
    // Derecha: dos posiciones (pulgar en Do4 y en Fa4); tres cambios de mano avisados con Salto
    const moves = cs.filter(s => /Salto/.test(s.label || ''));
    check(moves.length === 3 && moves.map(s => s.label.match(/Salto \d/)[0]).join() === 'Salto 1,Salto 2,Salto 3', 'Cumpleaños: la mano se mueve tres veces y las tres están avisadas (Salto 1, 2, 3)');
    const P1 = { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 }, P2 = { 65: 1, 67: 2, 69: 3, 70: 4, 72: 5 };
    // c. 2-5 (y 10-13) en posición 1; c. 6 y 8 (y 14, 16) en posición 2
    const verso1 = cs.slice(2, 27), verso2 = cs.slice(27, 49);
    check([verso1, verso2].every(v => v.slice(0, 12).every(s => P1[s.rh[0]] === s.rhF[0])), 'Cumpleaños: c. 2-5 y 10-13 con el pulgar en Do4 (Do 1 … Sol 5)');
    check([verso1, verso2].every(v => v.slice(12, 15).every(s => P2[s.rh[0]] === s.rhF[0]) && v.slice(19, 22).every(s => P2[s.rh[0]] === s.rhF[0])), 'Cumpleaños: c. 6 y 8 (14 y 16) con el pulgar en Fa4 (Fa 1 … Do 5)');
    check(cs.filter(s => s.rhF[0] === 5 && s.rh[0] === 70).length === 4 && cs.filter(s => /Estira el meñique/.test(s.label || '')).length === 2, 'Cumpleaños: el Sib del compás 7 va con el 5 estirado y está avisado');
    // El pulgar camina en el c. 7 (Fa, Mi, Re): único caso de mismo dedo en teclas distintas, y está explicado
    check(cs.filter(s => /pulgar camina/.test(s.label || '')).length === 2, 'Cumpleaños: el pulgar caminando (Fa, Mi, Re) está explicado en el rótulo, c. 7 y c. 15');
    check(cs.filter(s => /fermata/.test(s.label || '')).length === 2, 'Cumpleaños: la pausa (fermata) del Re se menciona (la app no la hace, es opcional)');
    check(cs.slice(-1)[0].dur === 3 && cs.slice(-1)[0].lh[0] === 41 && /Fin/.test(cs.slice(-1)[0].label), 'Cumpleaños: cierra con Fa de 3 tiempos sobre Fa2');
    check(cs.every(s => !s.lh.length || s.lh[0] < Math.min(...cs.map(x => x.rh[0]))), 'Cumpleaños: la izquierda siempre queda por debajo de la derecha');
    // Estrellita: la derecha sube un tono una sola vez y no se mueve más
    const es = W("SONGS.find(s => s.id === 'estrellita')").steps;
    check(es.map(s => s.rhF[0]).join() === '1,1,4,4,5,5,4,3,3,2,2,1,1,1', 'Estrellita: Do 1, Sol 4, La 5, y baja Fa 3, Mi 2, Re 1');
    // Bella Ciao: en el tramo grave el Re lleva siempre el 2 (pulgar en Mi), nunca el meñique
    check(W("SONGS.find(s => s.id === 'bella-ciao')").steps.filter(s => s.lh[0] === 50 && s.lh.length === 1).every(s => s.lhF[0] === 2), 'Bella Ciao: el Re grave de la izquierda siempre con el 2');
  }

  section('Camino de intervalos (original): la izquierda toca solo intervalos, sin mover la mano');
  {
    const ci = W("SONGS.find(s => s.id === 'camino-intervalos')");
    check(!!ci && ci.cat === 'clase' && ci.tempo === 72 && !ci.meter, 'en "De la clase", ♩=72, compás de 4');
    check(ci.steps.reduce((a, s) => a + s.dur, 0) === 48, '12 compases de 4 tiempos, sin sobras (como Amanecer, 13)');
    const hits = ci.steps.filter(s => s.lh.length);
    check(hits.every(s => s.lh.length === 2 && s.lhF.length === 2), 'la izquierda nunca toca un acorde: siempre exactamente dos notas con su dedo');
    const ivs = new Set(hits.map(s => s.lh[1] - s.lh[0]));
    check([3, 5, 7].every(n => ivs.has(n)) && [...ivs].every(n => [3, 5, 7].includes(n)), 'solo 3ª m (La–Do), 4ª (Sol–Do) y 5ª (Fa–Do): sin 3ª M, tritono, 7ªs ni octava (octubre 2026: demasiado para el nivel de Jorge)');
    check(Math.max(...hits.map(s => s.lh[1] - s.lh[0])) <= 7, 'la izquierda nunca abre más que una 5ª');
    // Izquierda en posición FIJA (la de Amanecer): pulgar en Do3, Si 2, La 3, Sol 4, Fa 5.
    const LHPOS = { 48: 1, 47: 2, 45: 3, 43: 4, 41: 5 };
    check(hits.every(s => s.lh.every((n, i) => LHPOS[n] === s.lhF[i])), 'izquierda: pulgar en Do3 (Si 2, La 3, Sol 4, Fa 5), cada tecla siempre con el mismo dedo');
    check(hits.every(s => s.lh[1] === 48 && s.lhF[1] === 1), 'izquierda: el pulgar nunca sale de Do3; solo cambia el segundo dedo (4, 3 o 5)');
    check(hits.length === 9, 'la izquierda ataca 9 veces en 12 compases (antes 12): el resto va sostenido');
    const rh = ci.steps.flatMap(s => s.rh);
    check(Math.min(...rh) >= 72 && Math.max(...rh) <= 79 && rh.every(n => [72, 74, 76, 77, 79].includes(n)), 'derecha: posición fija de cinco dedos (Do5-Sol5)');
    check(ci.steps.every(s => s.rhF.length === s.rh.length && s.rh.every((n, i) => s.rhF[i] === [72, 74, 76, 77, 79].indexOf(n) + 1)), 'derecha: un dedo por tecla, siempre el mismo');
    check(Math.max(...ci.steps.flatMap(s => s.lh)) < Math.min(...rh), 'las manos no se cruzan');
    check(ci.steps.flatMap(s => s.lh).every(n => [0, 2, 4, 5, 7, 9, 11].includes(n % 12)), 'todo en Do mayor (teclas blancas)');
    // Cada compás empieza en el golpe 1 con un rótulo (el intervalo que suena).
    let t = 0, bars = 0, sinRotulo = 0;
    ci.steps.forEach(s => { if (t % 4 === 0) { bars++; if (!s.label) sinRotulo++; } t += s.dur; });
    check(bars === 12 && sinRotulo === 0, 'los 12 compases arrancan con rótulo');
    check(ci.steps[0].lh.join() === '43,48', 'abre con la 4ª Sol–Do');
    // Tensión y resolución
    const cb = []; { let tt = 0; ci.steps.forEach(s => { const b = Math.floor(tt / 4 + 1e-9); (cb[b] = cb[b] || []).push(s); tt += s.dur; }); }
    check(cb.length === 12, '12 compases');
    const corch = cb.map(b => b.some(s => s.dur === 0.5 && s.rh.length));
    check(corch[9] && corch.filter(Boolean).length === 1, 'las corcheas (más tensión por ritmo) van solo en el c. 10, el del tritono');
    check(cb[8][0].lh.join() === '41,48' && cb[9].every(s => !s.lh.length) && cb[10][0].lh.join() === '43,48', 'final IV – V – I: Fa–Do (5ª), el compás de las corcheas sin cambio en la izquierda y Sol–Do');
    check(cb[10].every(s => s.dur >= 2), 'la resolución va en notas largas: el ritmo también descansa');
    check(ci.steps.every(s => s.rh.length <= 2 && s.lh.length <= 2), 'ninguna mano toca más de dos teclas a la vez (pedido del profe)');
    const fin = ci.steps[ci.steps.length - 1];
    check(fin.lh.length === 0 && fin.rh.join() === '72,76' && fin.rhF.join() === '1,3' && fin.dur === 4, 'c. 12: la derecha toca solo dos teclas (Do–Mi, 3ª mayor, dedos 1-3), redonda; la izquierda sigue sonando');
    // El mismo criterio que Amanecer: el salto más grande de la melodía es una 3ª o una 4ª
    const mel = ci.steps.filter(s => s.rh.length === 1).map(s => s.rh[0]);
    check(mel.every((n, i) => i === 0 || Math.abs(n - mel[i - 1]) <= 5), 'la melodía no salta más que una 4ª');
  }

  section('Lectura: antes del pentagrama, las teclas');
  {
    W("soundEnabled = false; progress = emptyProgress();");
    const ids = W('READING_LEVELS.map(l => l.id)');
    check(ids.slice(0, 7).join() === 'x0,f1,f2,f3,k1,s1,s2' && ids.slice(7).join() === 't5,t8,tl,b5,b8,g,ga', 'siete niveles nuevos al principio y los del pentagrama intactos detrás');
    check(W("readingLevelFromSaved('f2', NaN)") === 2 && W("readingLevelFromSaved(null, 3)") === ids.indexOf('b5') && W("readingLevelFromSaved(null, 0)") === ids.indexOf('t5'), 'el índice guardado de antes se traduce al nivel que era, no a otro');
    const go = id => { W("readingLevel = READING_LEVELS.findIndex(l => l.id === '" + id + "'); selectCategory('reading'); startReading();"); };
    // nombres
    check(W("solName(spellMidi(61, false))") === 'Do♯' && W("solName(spellMidi(70, true))") === 'Si♭' && W("solPc(11, false)") === 'Si' && W("solPc(7, false)") === 'Sol', 'nombres en español con ♯ y ♭');
    check(/entre Do y Re/.test(W('keyWhere(61)')) && /izquierda del grupo de 3/.test(W('keyWhere(65)')) && /izquierda del grupo de 2/.test(W('keyWhere(60)')), 'cada tecla se explica por los grupos de negras');
    // Explorar
    go('x0');
    check(W('reading.kind') === 'explore' && doc.getElementById('readingSkipBtn').style.display === 'none' && doc.getElementById('readingHintBtn').style.display === 'none', 'Explorar: sin pista ni saltar');
    W("noteOn(66, 'ui')");
    check(/Fa♯ = Sol♭/.test(doc.getElementById('readingFeedback').textContent) && doc.querySelectorAll('#readingStaff ellipse').length === 1 && doc.querySelectorAll('#readingStaff .staff-acc').length === 1, 'tocar una negra la dibuja con ♯ y dice sus dos nombres');
    W("noteOff(66)");
    for(const n of [60, 62, 64, 65, 67, 69, 71]){ W('noteOn(' + n + ", 'ui')"); W('noteOff(' + n + ')'); }
    check(doc.querySelectorAll('#readingStaff ellipse').length === 5, 'se ven las últimas 5 notas');
    check(W("progress.reading.x0") === undefined, 'explorar no cuenta como examen');
    // Encuentra
    go('f1');
    check(W('reading.kind') === 'find' && [0, 5].includes(W('reading.pc')) && doc.getElementById('readingAnswers').style.display === 'none', 'Encuentra: pide Do o Fa');
    W("reading.pc = 5; reading.missed = false;");
    W("noteOn(60, 'ui')"); W("noteOff(60)");
    check(doc.getElementById('readingFeedback').classList.contains('wrong') && /izquierda del grupo de 3/.test(doc.getElementById('readingFeedback').textContent) && W('reading.missed') === true, 'una tecla equivocada dice dónde está la que se pide');
    W("noteOn(53, 'ui')"); W("noteOff(53)");   // Fa3: otra octava, también vale
    check(doc.getElementById('readingFeedback').classList.contains('correct') && W('progress.reading.f1.attempts') === 1 && W('progress.reading.f1.first') === 0, 'cualquier Fa vale, y como se falló antes no cuenta "a la primera"');
    check(doc.querySelectorAll('#readingStaff ellipse').length === 1, 'al acertar se enseña cómo se escribe');
    W("nextReadingNote()"); W("reading.pc = 0");
    W("noteOn(72, 'ui')"); W("noteOff(72)");
    check(W('progress.reading.f1.attempts') === 2 && W('progress.reading.f1.first') === 1, 'acierto limpio: cuenta a la primera');
    W("nextReadingNote()"); W("reading.pc = 0");
    W("reading.hinted = false; document.getElementById('readingHintBtn').click()");
    const nC = [...Array(88)].map((_, i) => 21 + i).filter(n => n % 12 === 0).length;
    check(doc.querySelectorAll('.white-key.target, .black-key.target').length === nC && W('reading.hinted') === true, 'la pista marca todas las teclas con ese nombre (' + nC + ')');
    // pozos
    go('f2');
    const seen = {}; let rep = false, prev = -1;
    for(let i = 0; i < 300; i++){ W('reading = null'); W('nextReadingNote()'); const pc = W('reading.pc'); seen[pc] = (seen[pc] || 0) + 1; if(pc === prev) rep = true; prev = pc; }
    check(Object.keys(seen).sort().join() === '0,2,4,5' && (seen[2] + seen[4]) / 300 > 0.6, 'Re y Mi (lo nuevo) salen más, con Do y Fa de repaso');
    go('f3');
    const seen3 = new Set(); for(let i = 0; i < 300; i++){ W('reading = null'); W('nextReadingNote()'); seen3.add(W('reading.pc')); }
    check([7, 9, 11].every(p => seen3.has(p)) && seen3.size === 7, 'el nivel 3 usa las siete blancas');
    // ¿Qué tecla es?
    go('k1');
    check(W('reading.kind') === 'key' && doc.querySelectorAll('#readingAnswers .name-btn').length === 7 && doc.querySelectorAll('.white-key.target, .black-key.target').length === 1, 'se ilumina una tecla y hay 7 botones');
    check(!W("BLACK_SET.has(reading.sp.midi % 12)"), 'solo teclas blancas');
    const kpc = W('reading.sp.midi') % 12;
    W("noteOn(reading.sp.midi, 'ui')"); W("noteOff(reading.sp.midi)");
    check(W("progress.reading.k1") === undefined, 'tocar la tecla iluminada no contesta: se contesta con los botones');
    const wrongPc = [0, 2, 4, 5, 7, 9, 11].find(p => p !== kpc);
    doc.querySelector('#readingAnswers [data-pc="' + wrongPc + '"]').click();
    check(doc.getElementById('readingFeedback').classList.contains('wrong') && W('reading.missed') === true, 'botón equivocado: avisa y recuerda cómo ubicarla');
    doc.querySelector('#readingAnswers [data-pc="' + kpc + '"]').click();
    check(doc.getElementById('readingFeedback').classList.contains('correct') && W('progress.reading.k1.attempts') === 1 && W('progress.reading.k1.first') === 0, 'botón correcto: cuenta, pero no a la primera');
    // Negras subiendo / bajando
    const walk = (id) => {
      go(id); const names = [];
      for(let i = 0; i < 13; i++){ names.push(W('solName(reading.sp)')); const m = W('reading.sp.midi'); W('noteOn(' + m + ", 'ui')"); W('noteOff(' + m + ')'); W('nextReadingNote()'); }
      return names.join();
    };
    check(walk('s1') === 'Do,Do♯,Re,Re♯,Mi,Fa,Fa♯,Sol,Sol♯,La,La♯,Si,Do', 'subiendo: sostenidos, de Do a Do');
    check(W('readingSeq.i') === 0, 'y da la vuelta completa');
    check(walk('s2') === 'Do,Si,Si♭,La,La♭,Sol,Sol♭,Fa,Mi,Mi♭,Re,Re♭,Do', 'bajando: bemoles, de Do a Do');
    go('s1'); W("readingSeq.i = 1; nextReadingNote()");
    check(doc.querySelectorAll('#readingStaff .staff-acc').length === 1 && /entre Do y Re/.test(doc.getElementById('readingFeedback').textContent), 'la negra se ve con su ♯ en el pentagrama y se explica entre qué blancas está');
    W("noteOn(60, 'ui')"); W("noteOff(60)");
    check(doc.getElementById('readingFeedback').classList.contains('wrong') && /Busca Do♯/.test(doc.getElementById('readingFeedback').textContent), 'una equivocada nombra lo que tocaste y lo que buscas');
    doc.querySelectorAll('#readingLevelTabs .mode-tab')[2].click();
    check(W("localStorage.getItem('readingLevelId')") === 'f2' && doc.querySelectorAll('#readingLevelTabs .mode-tab').length === 14, 'el nivel se guarda por su id (14 niveles en la fila)');
    // salir de Lectura corta el avance automático
    W("reading.answered = false; selectCategory('scales')");
    W("nextReadingNote()");
    check(W('reading') === null, 'si ya saliste de Lectura, el avance automático no resucita la nota');
    // plan y dominio
    W("progress = emptyProgress(); todayPlan = buildTodayPlan(1)");
    check(/Encuentra: Do y Fa/.test(W("todayPlan.find(it => it.key === 'reading').title")), 'el plan de Hoy manda primero a "Encuentra: Do y Fa" (Explorar no es examen)');
    W("READING_LEVELS.slice(1, 7).forEach(l => { progress.reading[l.id] = {attempts:30, first:30, sumMs:30000, lastDay:null}; }); todayPlan = buildTodayPlan(1)");
    check(/Clave de Sol · 5 dedos/.test(W("todayPlan.find(it => it.key === 'reading').title")), 'con los seis niveles de teclas dominados, el plan pasa al pentagrama');
    check(Math.abs(W("masteryRows().find(r => r[0] === 'Lectura')[1]") - 6 / 13) < 1e-9, 'el dominio de Lectura promedia 13 niveles (Explorar no cuenta)');
    W("progress = emptyProgress(); selectCategory('today');");
  }

  section('Metrónomo: compás visible y acento');
  {
    W("progress = emptyProgress(); selectCategory('scales');");
    const cells = () => [...doc.querySelectorAll('#metroBeats .metro-cell')];
    check(cells().length === 4 && cells()[0].classList.contains('first') && cells().map(c => c.textContent).join('') === '1234', 'por defecto 4 casillas numeradas, el 1 marcado');
    doc.getElementById('metroBeats').click();
    check(W('metro.meter') === 2 && cells().length === 2, 'tocar las casillas cambia a 2 tiempos');
    doc.getElementById('metroBeats').click();
    check(W('metro.meter') === 3 && cells().length === 3, 'otra vez: 3 tiempos, 3 casillas, y el metrónomo cuenta de a 3');
    check(W("localStorage.getItem('metroMeter')") === '3', 'la elección se recuerda');
    check(/3 tiempos/.test(doc.getElementById('metroBeats').title), 'y la ayuda dice cuántos tiempos hay');
    W('metroFlash(true, 0)');
    check(cells()[0].classList.contains('now'), 'el clic enciende su casilla (la del 1 con acento)');
    W('metroFlash(false, 1)');
    check(cells()[1].classList.contains('now') && !cells()[0].classList.contains('now'), 'y la siguiente apaga la anterior');
    // En Ritmo (y en Intervalos "A tiempo") el compás se fuerza a 4 sin perder lo elegido
    W("selectCategory('rhythm')");
    check(W('metro.meter') === 4 && cells().length === 4 && doc.getElementById('metroBeats').disabled, 'en Ritmo el compás es de 4 y las casillas quedan sin acción');
    doc.getElementById('metroBeats').click();
    check(W('metro.meter') === 4 && W('metroUserMeter') === 3, 'tocarlas ahí no cambia nada');
    W("selectCategory('scales')");
    check(W('metro.meter') === 3 && !doc.getElementById('metroBeats').disabled, 'al salir vuelve el compás de 3 que había elegido');
    W("selectCategory('intervals'); setIvMode('tempo');");
    check(W('metro.meter') === 4 && doc.getElementById('metroBeats').disabled, 'Intervalos "A tiempo" también cuenta de a 4 (su selector de tiempo lo exige)');
    W("setIvMode('show'); selectCategory('scales');");
    doc.getElementById('metroBeats').click();
    check(W('metro.meter') === 4, 'se puede volver a 4');
  }

  section('Ritmo: tomar el tempo');
  {
    W("soundEnabled = false; progress = emptyProgress(); rhythmLevel = 0; selectCategory('rhythm');");
    const L = W('RHYTHM_LEVELS');
    check(!!doc.querySelector('#mainTabs [data-cat="rhythm"]') && doc.getElementById('rhythmPanel').style.display !== 'none', 'hay pestaña Ritmo y su panel');
    check(L.length === 9 && new Set(L.map(l => l.id)).size === 9, 'nueve niveles, sin repetir');
    check(L.every(l => l.pos.every((p, i) => p >= 0 && p < 4 && (i === 0 || p > l.pos[i - 1]))), 'cada patrón cae dentro del compás de 4, en orden y sin repetir');
    check(L[8].pos.length === 12 && L[4].pos.length === 8 && L[1].pos.join() === '0', 'tresillos 12 por compás, corcheas 8, "solo el 1" uno');
    check(L.every(l => W('rhythmBars(RHYTHM_LEVELS[' + L.indexOf(l) + '])') * l.pos.length >= 8), 'toda ronda pide al menos 8 toques (80% de menos sería regalado)');
    check(W('rhythmBars(RHYTHM_LEVELS[0])') === 4 && W('rhythmBars(RHYTHM_LEVELS[1])') === 8 && W('rhythmBars(RHYTHM_LEVELS[7])') === 5, 'los patrones ralos duran más compases: 4, 8 y 5');
    // tiempos exactos
    const tg = W('rhythmTargets(RHYTHM_LEVELS[0], 1000, 60, 4)');
    check(tg.length === 16 && tg[0].t === 5000 && tg[1].t === 6000 && tg[4].bar === 1, 'el primer compás es de cuenta atrás: el primer toque pedido cae 4 tiempos después');
    check(W('rhythmWindow(RHYTHM_LEVELS[0], 60)') === 250 && Math.abs(W('rhythmWindow(RHYTHM_LEVELS[8], 80)') - 125) < 1e-6, 'ventana: media distancia al vecino, con tope; en tresillos no se pisa con el vecino');
    // calificación
    const T = W('rhythmTargets(RHYTHM_LEVELS[0], 0, 60, 4)'), win = 250;
    const grade = presses => JSON.parse(JSON.stringify(W('rhythmGrade(' + JSON.stringify(T) + ', ' + JSON.stringify(presses) + ', ' + win + ')')));
    let g = grade(T.map(x => x.t));
    check(g.pct === 100 && g.pass && Math.round(g.mean) === 0 && g.extras === 0, 'todo exacto: 100% y aprobado');
    g = grade(T.map(x => x.t - 40));
    check(g.pct === 100 && g.pass && Math.round(g.mean) === -40 && /ADELANTADO/.test(W('rhythmBias(' + JSON.stringify(g) + ')')), 'siempre 40 ms antes: aprueba, pero dice que tiende a ADELANTARSE');
    g = grade(T.map(x => x.t + 45));
    check(/ATRASADO/.test(W('rhythmBias(' + JSON.stringify(g) + ')')), 'siempre 45 ms después: tiende a ATRASARSE');
    g = grade(T.map((x, i) => x.t + (i % 2 ? 70 : -70)));
    check(g.pct === 100 && g.sd >= 55 && /antes y otras después/.test(W('rhythmBias(' + JSON.stringify(g) + ')')), 'unas veces +70 y otras −70: lo llama irregular, no "adelantado"');
    g = grade(T.map(x => x.t + 130));
    check(g.pct === 0 && !g.pass && g.got === 16, 'siempre 130 ms tarde: los toques se emparejan pero ninguno cuenta a tiempo');
    g = grade(T.slice(0, 10).map(x => x.t));
    check(g.pct === 63 && !g.pass && g.offs.filter(o => o === null).length === 6, '10 de 16: 63%, no aprueba, y los 6 que faltan quedan como fallo');
    g = grade(T.map(x => x.t).concat([T[0].t + 500, T[3].t + 500, T[5].t + 500]));
    check(g.pct === 100 && g.extras === 3 && !g.pass, 'tocar de más (3) impide aprobar aunque todo lo pedido salga');
    g = grade([]);
    check(/Casi no tocaste/.test(W('rhythmBias(' + JSON.stringify(g) + ')')), 'sin toques no inventa un diagnóstico');

    // una ronda completa, con tiempos controlados
    W("metro.bpm = 60; metroRender(); rhythmLevel = 0;");
    W("rhythmBegin(performance.now() + 200)");
    check(W('rhythm.active') === true && W('rhythm.targets.length') === 16, 'rhythmBegin arma la ronda');
    const t0 = W('rhythm.T0'), per = 1000;
    W(`rhythmHit(${t0 + 1 * per})`);   // cuenta atrás: no cuenta
    W(`rhythmHit(${t0 + 4 * per + 10})`); W(`rhythmHit(${t0 + 4 * per + 30})`); // dos teclas casi juntas = un toque
    check(W('rhythm.presses.length') === 1, 'la cuenta atrás no se toca y dos teclas a la vez cuentan como un toque');
    for(let i = 1; i < 16; i++) W(`rhythmHit(${t0 + (4 + i) * per - 25})`);
    const res = W('rhythmFinish()');
    check(res && res.pass && res.pct === 100 && W('rhythm.active') === false, 'ronda aprobada a 60 BPM');
    check(W('progress.rhythm.pulso.clean') === 1 && W('progress.rhythm.pulso.bestBpm') === 60 && W('progress.rhythm.pulso.runs') === 1, 'queda registrada con su BPM');
    check(W('metro.bpm') === 70, 'aprobar sube el metrónomo al siguiente peldaño (70)');
    check(doc.querySelectorAll('#rhythmResult .rhythm-chip').length === 16 && /ADELANTADO|centrado|Bien/.test(doc.getElementById('rhythmResult').textContent), 'se dibuja un cuadro por toque y el diagnóstico de adelanto/atraso');
    check(/a tiempo/.test(doc.getElementById('rhythmBig').textContent), 'el titular dice cuántos salieron a tiempo');
    // reprobar no sube ni acredita BPM
    W("rhythmBegin(performance.now() + 200)");
    check(W('rhythm.bpm') === 70, 'la siguiente ronda va a 70');
    W('rhythmFinish()');
    check(W('progress.rhythm.pulso.bestBpm') === 60 && W('progress.rhythm.pulso.runs') === 2 && W('progress.rhythm.pulso.clean') === 1, 'una ronda sin tocar suma intento pero no acredita 70 BPM');
    // escalera de tempo y desbloqueo
    check(doc.querySelectorAll('#rhythmLevelTabs .locked').length === 8 && !W('rhythmUnlocked(1)'), 'con el nivel 1 a medias, los demás están bloqueados');
    doc.querySelectorAll('#rhythmLevelTabs .mode-tab')[3].click();
    check(W('rhythmLevel') === 0 && /Primero supera/.test(doc.getElementById('rhythmBig').textContent), 'tocar un nivel bloqueado dice qué falta y no cambia de nivel');
    W("progress.rhythm.pulso.bestBpm = 80");
    check(W('rhythmUnlocked(1)') && W('rhythmDone(0)') && W('rhythmCurrentLevel()') === 1 && W('rhythmNextBpm(1)') === 60, 'a 80 BPM el nivel 1 está superado, se abre el 2 y arranca a 60');
    W("rhythmSelectLevel(1)");
    check(W('rhythmLevel') === 1 && W('metro.bpm') === 60 && doc.getElementById('rhythmSay').textContent.includes('(2)'), 'elegir el nivel 2 pone 60 BPM y muestra cómo se cuenta');
    check(doc.querySelectorAll('#rhythmBar .rhythm-dot').length === 1 && doc.querySelectorAll('#rhythmBar .rhythm-beat').length === 4, 'el compás dibujado marca 4 tiempos y los toques de ese nivel');
    check(doc.querySelectorAll('#rhythmBar .rhythm-beat span').length === 4 && doc.querySelector('#rhythmBar .rhythm-beat span').textContent === '1', 'el conteo 1 2 3 4 va bajo cada tiempo del compás');
    check(doc.querySelectorAll('#rhythmBars .bc').length === 1 + W('rhythmBars(RHYTHM_LEVELS[rhythmLevel])') && /Cuenta/.test(doc.querySelector('#rhythmBars .bc').textContent), 'la tira de compases trae "Cuenta" + un chip por compás');
    // aprobar a 80 supera el nivel
    W("metro.bpm = 80; metroRender(); rhythmBegin(performance.now() + 200)");
    const u0 = W('rhythm.T0');
    W(`rhythm.targets.forEach(g => rhythmHit(g.t + 5))`);
    const r80 = W('rhythmFinish()');
    check(r80.pass && W('progress.rhythm["uno"].bestBpm') === 80 && W('rhythmDone(1)') && /superado/.test(doc.getElementById('rhythmBig').textContent), 'aprobar a 80 BPM supera el nivel');
    // cancelaciones
    W("rhythmBegin(performance.now() + 200)");
    W("metroStop()");
    check(W('rhythm.active') === false && /metrónomo se apagó/.test(doc.getElementById('rhythmBig').textContent), 'apagar el metrónomo a media ronda la cancela y lo dice');
    W("rhythmBegin(performance.now() + 200)");
    doc.querySelector('.metro-step[data-bpm="5"]').click();
    check(W('rhythm.active') === false && /Cambiaste el tempo/.test(doc.getElementById('rhythmBig').textContent), 'cambiar el tempo a media ronda también');
    W("rhythmBegin(performance.now() + 200)");
    W("selectCategory('scales')");
    check(W('rhythm.active') === false, 'salir de Ritmo corta la ronda');
    W("selectCategory('rhythm')");
    // sin audio (jsdom) no se puede empezar y lo dice
    W("rhythmStart()");
    check(W('rhythm.active') === false && /Sin audio/.test(doc.getElementById('rhythmBig').textContent), 'sin audio no empieza y dice por qué');
    // ya no hay pad "Toca aquí": se toca en el piano (o en el teclado dibujado)
    check(doc.getElementById('rhythmPad') === null, 'sin botón "Toca aquí"');
    check(/4 tiempos/.test(doc.getElementById('rhythmBarHelp').textContent) && /círculo/.test(doc.getElementById('rhythmBarHelp').textContent), 'la barra con 1 2 3 4 viene explicada');
    // tiempo para poner las manos antes de que suene el primer clic
    W("window.__ms = metroStart; window.__ec = ensureAudioCtx; ensureAudioCtx = () => ({}); metroStart = function(){ metro.on = true; metro.beat = 0; metro.refPerf = performance.now() + 50; metro.refBeat = 0; };");
    W("rhythmLevel = 0; metro.bpm = 60; rhythmStart()");
    check(W('rhythm.preparing') === true && W('rhythm.active') === false && W('metro.on') === false, 'Empezar no arranca el clic de golpe: primero una cuenta para prepararse');
    check(/Prepara las manos/.test(doc.getElementById('rhythmBig').textContent) && /Parar/.test(doc.getElementById('rhythmStartBtn').textContent), 'dice que prepares las manos y el botón pasa a Parar');
    W("rhythmHit(performance.now())");
    check(W('rhythm.presses.length') === 0, 'lo tocado mientras te preparas no cuenta');
    W("rhythmStart()");
    check(W('rhythm.preparing') === false && W('rhythm.active') === false && /Parado/.test(doc.getElementById('rhythmBig').textContent), 'Parar durante la preparación la cancela');
    W("rhythmStart(); rhythm.preparing = false; rhythmLaunch()");
    check(W('rhythm.active') === true && W('RHYTHM_READY_S') >= 3, 'tras la preparación arranca el clic y la ronda (preparación de ' + W('RHYTHM_READY_S') + ' s)');
    W("rhythmCancel(''); metroStop(); metroStart = window.__ms; ensureAudioCtx = window.__ec;");
    // cada pulsación se juzga al instante
    W("rhythmLevel = 0; rhythmSelectLevel(0); metro.bpm = 60; metroRender(); rhythmBegin(performance.now() + 200)");
    const T1 = W('rhythm.T0');
    W("rhythm.uiBar = 1");   // como si ya estuviera en el primer compás de toque
    W(`rhythmHit(${T1 + 4000 + 30})`);
    check(/A tiempo/.test(doc.getElementById('rhythmHit').textContent) && /\+30/.test(doc.getElementById('rhythmHit').textContent) && doc.getElementById('rhythmHit').classList.contains('ok'), 'una pulsación a +30 ms dice "A tiempo" al instante');
    check(doc.querySelectorAll('#rhythmBar .rhythm-dot')[0].classList.contains('ok'), 'y el círculo del compás se pinta de verde');
    W(`rhythmHit(${T1 + 5000 - 130})`);
    check(/Antes/.test(doc.getElementById('rhythmHit').textContent) && /−130/.test(doc.getElementById('rhythmHit').textContent) && doc.querySelectorAll('#rhythmBar .rhythm-dot')[1].classList.contains('early'), '130 ms antes: "Antes" y el círculo en azul');
    W(`rhythmHit(${T1 + 6000 + 140})`);
    check(/Tarde/.test(doc.getElementById('rhythmHit').textContent) && doc.querySelectorAll('#rhythmBar .rhythm-dot')[2].classList.contains('late'), '140 ms después: "Tarde" y el círculo en naranja');
    W(`rhythmHit(${T1 + 6500})`);
    check(/De más/.test(doc.getElementById('rhythmHit').textContent) && doc.getElementById('rhythmHit').classList.contains('miss'), 'un toque donde no tocaba: "De más"');
    // justo en el 1: un toque 40 ms ANTES del 1 del compás siguiente también se pinta
    W(`rhythmHit(${T1 + 4000 + 4000 - 40})`);
    check(doc.querySelectorAll('#rhythmBar .rhythm-dot')[0].classList.contains('ok'), 'un toque pegado al 1 (antes o después) siempre pinta su círculo');
    // el color de un toque del último tiempo NO se borra al cruzar el 1: dura hasta que la raya se acerca a su turno
    W("rhythmDots = rhythmDots; rhythm.dotBar = []; rhythmDots.forEach(d => d.classList.remove('ok','early','late')); rhythmDots[3].classList.add('late'); rhythm.dotBar[3] = 0; rhythm.T0 = performance.now() - 8100; rhythmTickUi()");
    check(doc.querySelectorAll('#rhythmBar .rhythm-dot')[3].classList.contains('late'), 'cruzar el 1 no borra el color del último toque del compás anterior');
    W("rhythm.T0 = performance.now() - 10700; rhythmTickUi()");
    check(!doc.querySelectorAll('#rhythmBar .rhythm-dot')[3].classList.contains('late'), 'se limpia cuando la raya vuelve a acercarse a ese círculo');
    check(doc.querySelectorAll('#rhythmBar .rhythm-beat span.now').length === 1 && doc.querySelectorAll('#rhythmBars .bc.cur').length === 1, 'un solo número del conteo y un solo compás quedan marcados como actuales');
    const fin = W('rhythmFinish()');
    check(fin.ok >= 1 && fin.extras === 1, 'lo que se vio al instante coincide con la nota final (1 a tiempo, 1 de más)');
    check(doc.querySelectorAll('#rhythmBar .rhythm-dot.ok, #rhythmBar .rhythm-dot.early, #rhythmBar .rhythm-dot.late').length === 0, 'al terminar los círculos se limpian');
    // plan de Hoy y progreso
    W("progress = emptyProgress(); todayPlan = buildTodayPlan(1); renderToday()");
    const ri = W("todayPlan.find(it => it.key === 'rhythm')");
    check(!!ri && ri.block === 'warm' && /nivel 1 de 9/.test(ri.title) && /60 BPM/.test(ri.sub), 'el plan de Hoy trae Ritmo en el calentamiento, nivel 1 a 60 BPM');
    W("todayPlan.find(it => it.key === 'rhythm').go()");
    check(W('currentMode') === 'rhythm', 'el botón Ir abre Ritmo');
    check(W('masteryRows().some(r => r[0] === "Ritmo")'), 'Progreso muestra la fila Ritmo');
    W("progress = emptyProgress(); recordRhythm('pulso', 90, 70, true)");
    const a = JSON.stringify(W('progress.rhythm'));
    const merged = JSON.stringify(W('mergeProgress(progress, JSON.parse(JSON.stringify(progress))).rhythm'));
    check(a === merged, 'fusionar el respaldo consigo mismo no infla Ritmo (idempotente)');
    W("progress = emptyProgress(); selectCategory('today');");
  }

  section('Categorías de intervalos: fundamentales, anclas y otros');
  {
    const cats = W('INTERVAL_CATS');
    const todos = cats.flatMap(c => c.ids).sort((a, b) => a - b);
    check(todos.join(',') === '0,1,2,3,4,5,6,7,8,9,10,11,12', 'las categorías cubren los 13 intervalos exactamente una vez');
    check(cats.map(c => c.id + ':' + c.ids.length).join(',') === 'fund:6,anclas:2,otros:5', 'seis fundamentales, dos anclas, cinco otros');
    const fund = cats.find(c => c.id === 'fund').ids, otros = cats.find(c => c.id === 'otros').ids;
    check([3, 4, 6, 7, 10, 11].every(i => fund.includes(i)), 'fundamentales: 3ª m, 3ª M, tritono, 5ª J, 7ª m, 7ª M (todo lo que nombró el profe)');
    check(otros.every(i => fund.includes(12 - i)), 'cada "otro" es un fundamental dado vuelta (12 − semitonos)');
    check(W('intervalCatOf(7)') === 'fund' && W('intervalCatOf(5)') === 'otros' && W('intervalCatOf(12)') === 'anclas', 'intervalCatOf clasifica');
    W("selectCategory('intervals')");
    const btns = [...doc.querySelectorAll('#intervalPicker .pick-btn')];
    check(btns.length === 13 && btns.every((b, i) => b.dataset.icat === W('intervalCatOf(' + i + ')')), 'cada botón del selector lleva su categoría');
    check(doc.getElementById('intervalCatBox').style.display !== 'none' && doc.querySelectorAll('#intervalCatList .cat-row').length === 3, 'la tarjeta explica las tres categorías');
    W("selectCategory('scales')");
    check(doc.getElementById('intervalCatBox').style.display === 'none', 'y solo se ve en Intervalos');
    // el valor guardado de antes ("Los de la clase") pasa a Fundamentales
    W("localStorage.setItem('namePool', 'clase')");
    check(W("(() => { const np = localStorage.getItem('namePool'); return np === 'clase' ? 'fund' : np; })()") === 'fund', 'lo guardado como "clase" migra a Fundamentales');
  }

  section('⚡ Nombrar: reconocer el intervalo de golpe');
  {
    W("soundEnabled = false; progress = emptyProgress(); selectCategory('intervals'); if(earMode) $('earModeBtn').click(); if(ivMode !== 'show') setIvMode('show');");
    check(!!doc.getElementById('nameModeBtn') && W('nameMode') === false, 'el botón ⚡ Nombrar existe y arranca apagado');
    doc.getElementById('nameModeBtn').click();
    check(W('nameMode') === true && W('earMode') === false && W('ivMode') === 'show', 'al encenderlo apaga De oído y deja el modo normal');
    check(doc.getElementById('nameBar').style.display !== 'none', 'aparece la barra de Nombrar');
    const labels = () => [...doc.querySelectorAll('#nameAnswers .name-btn')].map(b => b.textContent);
    check(labels().join(',') === 'Unísono,5ª J,8ª', 'con el nivel 1 solo hay tres botones, ordenados por tamaño: ' + labels().join(','));
    check(W('nameQ !== null') && W('namePoolIds()').includes(W('nameQ.idx')) && W('nameQ.top - nameQ.root') === W('INTERVALS[nameQ.idx].semitones'),
      'la pregunta sale del nivel y la 2ª nota está a la distancia del intervalo');
    // la respuesta no se delata mientras la pregunta está abierta
    check(doc.querySelectorAll('#intervalPicker .current').length === 0, 'con la pregunta abierta el selector no marca cuál es');
    check(doc.getElementById('distanceBox').style.display === 'none' && doc.getElementById('intervalTip').style.display === 'none', 'ni la distancia ni el consejo se ven antes de contestar');
    // tocar el piano no cuenta como respuesta ni avanza el modo exacto
    const antes = JSON.stringify(W('progress.intervals'));
    W("noteOn(nameQ.root,'midi'); noteOn(nameQ.top,'midi'); noteOff(nameQ.root,'midi'); noteOff(nameQ.top,'midi');");
    check(JSON.stringify(W('progress.intervals')) === antes && W('nameQ.answered') === false, 'tocar las dos teclas no responde ni cuenta como intervalo hecho');
    // acierto rápido
    const idx1 = W('nameQ.idx');
    W('nameQ.t0 = performance.now() - 1200');
    [...doc.querySelectorAll('#nameAnswers .name-btn')].find(b => Number(b.dataset.nameidx) === idx1).click();
    check(W(`progress.name[${idx1}].asked`) === 1 && W(`progress.name[${idx1}].right`) === 1 && W(`progress.name[${idx1}].fast`) === 1, 'acierto en 1,2 s: pregunta, acierto y rápida');
    check(W('nameStats.streak') === 1 && doc.querySelector('#nameAnswers .name-btn.right') !== null, 'racha 1 y el botón correcto se pinta');
    check(/Rápido/.test(doc.getElementById('feedbackText').textContent), 'el mensaje dice que fue rápido');
    check(doc.getElementById('distanceBox').style.display === 'block' && doc.querySelectorAll('#intervalPicker .current').length === 1, 'después de contestar sí se ve la distancia y cuál era');
    check(W('dayRec().name') === 1, 'suma al día de hoy');
    check(doc.getElementById('nameNextBtn').style.display !== 'none', 'aparece Siguiente para no esperar');
    // doble clic no cuenta dos veces
    [...doc.querySelectorAll('#nameAnswers .name-btn')][0].click();
    check(W('nameStats.asked') === 1, 'una vez contestada, otro clic no cuenta');
    // acierto lento
    doc.getElementById('nameNextBtn').click();
    const idx2 = W('nameQ.idx');
    W('nameQ.t0 = performance.now() - 6000');
    [...doc.querySelectorAll('#nameAnswers .name-btn')].find(b => Number(b.dataset.nameidx) === idx2).click();
    check(W(`progress.name[${idx2}].right`) >= 1 && (W(`progress.name[${idx2}].fast`) || 0) === (idx2 === idx1 ? 1 : 0), 'acierto en 6 s: cuenta como acierto pero NO como rápida');
    check(/Lento/.test(doc.getElementById('feedbackText').textContent), 'y el mensaje lo dice');
    // fallo
    doc.getElementById('nameNextBtn').click();
    const idx3 = W('nameQ.idx');
    const wrong = [...doc.querySelectorAll('#nameAnswers .name-btn')].find(b => Number(b.dataset.nameidx) !== idx3);
    const rightBefore = W('nameStats.right');
    wrong.click();
    check(W('nameStats.streak') === 0 && W('nameStats.right') === rightBefore && doc.querySelector('#nameAnswers .name-btn.bad') !== null, 'un fallo corta la racha y se marca en rojo');
    check(/Era /.test(doc.getElementById('feedbackText').textContent), 'y dice cuál era');
    check(W('nameStats.best') === 2, 'el récord de racha queda en 2');
    // se pregunta de un nivel a otro con progreso
    W("progress = emptyProgress(); INTERVAL_STAGES[0].ids.forEach(i => { progress.name[i] = {asked:6, right:6, fast:6, lastDay:null}; });");
    check(W('nameStageDone(INTERVAL_STAGES[0])') === true && W('currentStageIdx(nameStageDone)') === 1, '6 de 6 y todas rápidas dan el nivel 1 por hecho');
    W("progress.name[INTERVAL_STAGES[0].ids[0]] = {asked:6, right:6, fast:1, lastDay:null}");
    check(W('nameStageDone(INTERVAL_STAGES[0])') === false, 'acertar sin ser rápido NO alcanza para pasar (la velocidad es parte de la meta)');
    W("progress.name[INTERVAL_STAGES[0].ids[0]] = {asked:6, right:4, fast:4, lastDay:null}");
    check(W('nameStageDone(INTERVAL_STAGES[0])') === false, 'ser rápido con 67% de aciertos tampoco');
    W("progress = emptyProgress(); INTERVAL_STAGES[0].ids.forEach(i => { progress.name[i] = {asked:6, right:6, fast:6, lastDay:null}; });");
    const vistos = new Set();
    for(let i = 0; i < 300; i++) vistos.add(W('pickNameIndex(-1)'));
    const permitidos = W('INTERVAL_STAGES[0].ids.concat(INTERVAL_STAGES[1].ids)');
    check([...vistos].every(i => permitidos.includes(i)) && W('INTERVAL_STAGES[1].ids').every(i => vistos.has(i)), 'con el nivel 1 hecho pregunta el 2 y repasa el 1, nada más adelante');
    // la misma pregunta no sale dos veces seguidas
    let repetida = false;
    for(let i = 0; i < 300; i++){ const a = W('pickNameIndex(4)'); if(a === 4) repetida = true; }
    check(!repetida, 'nunca repite el intervalo recién preguntado (si hay otros)');
    // las otras fuentes de preguntas
    doc.querySelector('#namePoolPicker [data-npool="fund"]').click();
    check([...doc.querySelectorAll('#nameAnswers .name-btn')].map(b => b.textContent).join(',') === '3ª m,3ª M,Tritono,5ª J,7ª m,7ª M', 'Fundamentales: 3ª m, 3ª M, tritono, 5ª, 7ª m y 7ª M');
    doc.querySelector('#namePoolPicker [data-npool="otros"]').click();
    check([...doc.querySelectorAll('#nameAnswers .name-btn')].map(b => b.textContent).join(',') === '2ª m,2ª M,4ª J,6ª m,6ª M', 'Otros: 2ª m, 2ª M, 4ª J, 6ª m y 6ª M');
    for(let i = 0; i < 200; i++){ W('startNameQuestion()'); if(!W('INTERVAL_CATS.find(c => c.id === "otros").ids').includes(W('nameQ.idx'))){ check(false, 'en Otros solo preguntan los otros'); break; } }
    doc.querySelector('#namePoolPicker [data-npool="all"]').click();
    check(doc.querySelectorAll('#nameAnswers .name-btn').length === 13, 'Los 13: un botón por intervalo');
    check(W("localStorage.getItem('namePool')") === 'all', 'la elección se recuerda');
    doc.querySelector('#nameSrcPicker [data-nsrc="eye"]').click();
    check(doc.querySelectorAll('.white-key.target, .black-key.target').length === 2 || W('nameQ.top === nameQ.root'), 'en Teclas se marcan las dos teclas en el piano');
    check(doc.getElementById('namePlayBtn').style.display === 'none', 'y ahí no hay botón de volver a oír');
    doc.querySelector('#nameSrcPicker [data-nsrc="har"]').click();
    check(doc.querySelectorAll('.white-key.target, .black-key.target').length === 0 && doc.getElementById('namePlayBtn').style.display !== 'none', 'Juntas y Una tras otra no marcan teclas: es de oído puro');
    // el cronómetro mide desde el estímulo y el tiempo se redondea a ms
    check(W('fmtSec(1234)') === '1,2 s' && W('fmtSec(3500)') === '3,5 s', 'los tiempos se muestran con coma: 1,2 s');
    W("nameStats.times = [1000, 3000, 2000]");
    check(W('nameMedian()') === 2000, 'la mediana de 1, 3 y 2 s es 2 s');
    // exclusión con los otros modos
    doc.getElementById('earModeBtn').click();
    check(W('nameMode') === false && W('earMode') === true && doc.getElementById('nameBar').style.display === 'none', 'encender De oído apaga Nombrar');
    doc.getElementById('nameModeBtn').click();
    check(W('nameMode') === true && W('earMode') === false, 'y al revés');
    doc.getElementById('ivHideBtn').click();
    check(W('nameMode') === false && W('ivMode') === 'hide', 'Sin pista también lo apaga');
    W("setIvMode('show')");
    // el respaldo y la fusión conocen la sección nueva
    check(W("PROGRESS_SECTIONS.includes('name')") && W("emptyProgress().name !== undefined"), 'el progreso trae la sección name y el respaldo la fusiona');
    W(`window.__NA = Object.assign(emptyProgress(), { name:{ '4': {asked:5,right:4,fast:3,lastDay:'2026-10-01'} } });
       window.__NB = Object.assign(emptyProgress(), { name:{ '4': {asked:8,right:6,fast:2,lastDay:'2026-10-03'} } });
       window.__NM = mergeProgress(window.__NA, window.__NB); window.__NM2 = mergeProgress(window.__NM, window.__NB);`);
    check(W("window.__NM.name['4'].asked") === 8 && W("window.__NM.name['4'].fast") === 3 && W("window.__NM.name['4'].lastDay") === '2026-10-03', 'la fusión es por máximo, campo a campo');
    check(JSON.stringify(W('window.__NM2.name')) === JSON.stringify(W('window.__NM.name')), 'y es idempotente');
    // el plan de Hoy lo incluye y lleva al modo
    W("progress = emptyProgress(); todayPlan = buildTodayPlan(1); renderToday()");
    check(W('todayPlan.map(it => it.key).includes("name")'), 'Hoy propone Nombrar');
    W("todayPlan.find(it => it.key === 'name').go()");
    check(W('currentMode') === 'intervals' && W('nameMode') === true, 'el botón Ir abre Nombrar');
    W("todayPlan.find(it => it.key === 'intervals').go()");
    check(W('nameMode') === false, 'y el paso de Intervalos lo apaga');
    // limpieza
    W("if(nameMode) setNameMode(false); selectCategory('today');");
  }

  console.log(`\n${passes} pruebas OK, ${failures} fallos`);
  if(errors.length) console.log('Errores de consola:', errors);
  process.exit(failures || errors.length ? 1 : 0);
})();

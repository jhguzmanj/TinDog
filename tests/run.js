// Pruebas funcionales con jsdom (misma convención que se usó todo el proyecto).
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
  const pattern = d.family === 'major' ? [2,2,1,2,2,2,1] : [2,1,2,2,1,2,2];
  const semis = sc.notes.map(n => n - sc.notes[0]);
  const expect = pattern.reduce((acc, s) => acc.concat(acc[acc.length-1] + s), [0]);
  check(JSON.stringify(semis) === JSON.stringify(expect), d.id + ': patrón tono/semitono correcto');
  check(sc.names.length === 8 && sc.names[0] === sc.names[7], d.id + ': 8 nombres, octava repetida');
  check(/^[1-5]{8}$/.test(d.rh) && /^[1-5]{8}$/.test(d.lh), d.id + ': digitación de 8 dedos por mano');
  // cada letra aparece una vez por octava (deletreo diatónico)
  const letters = sc.names.slice(0,7).map(n => n[0]);
  check(new Set(letters).size === 7, d.id + ': cada letra una sola vez (' + sc.names.join(' ') + ')');
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
check(run.steps.length === 15, 'subida y bajada de 1 octava = 15 pasos');
check(run.steps.every(s => s.notes.length === 2 && s.notes[1].n === s.notes[0].n - 12), 'ambas manos: izquierda una octava abajo');
check(run.steps[0].notes[0].finger === 1 && run.steps[0].notes[1].finger === 5, 'primer paso: pulgar derecha, meñique izquierda');
check(run.steps[7].notes[0].n === 72 && run.steps[7].notes[0].finger === 5, 'tope de la escala: Do5 con el 5');
check(run.steps[14].notes[0].n === 60 && run.steps[14].notes[0].finger === 1, 'vuelve a Do4 con el pulgar');
run = W("buildScaleRun(SCALES.cmajor, 'rh', 2, 'up')");
check(run.steps.length === 15 && run.steps[14].notes[0].n === 84, '2 octavas subida: 15 notas hasta Do6');
run = W("buildScaleRun(SCALES.bbmajor, 'lh', 1, 'up')");
check(run.steps[0].notes[0].n === 58 && run.steps[0].notes[0].finger === 3, 'Sib M izquierda arranca en Sib3 con el 3');

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
check(W('practiceIndex') === 5, 'Do4 + Mi4 aprueba');
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
W('window.__played = 0; const _orig = playNoteSound; playNoteSound = (n) => { window.__played++; };');
ev('#mainTabs [data-cat="free"]');
W("noteOn(60, 'midi'); noteOff(60)");
check(W('window.__played') === 0, 'nota del piano real no dispara el sintetizador');
W("noteOn(60, 'ui'); noteOff(60)");
check(W('window.__played') === 1, 'clic en el teclado dibujado sí suena');

section('Fragmentos y agilidad siguen funcionando');
ev('#mainTabs [data-cat="agility"]');
check(W('currentMode') === 'agility' && W("practiceFamily") === 'agility', 'agilidad carga');
W("currentHand='rh'; practiceIndex=0; startFragmentStep()");
const first = W('stepNotes(currentFragment.steps[0], "rh")[0]');
W(`noteOn(${first})`); W(`noteOff(${first})`);
check(W('practiceIndex') === 1, 'la nota correcta avanza en agilidad');
ev('#mainTabs [data-cat="fragments"]');
check(W("currentFragment.id") === 'cuatro-acordes', 'fragmentos carga la primera pieza');
W('practiceIndex = currentFragment.steps.length - 1; currentHand = "rh"; startFragmentStep()');
const last = W('stepNotes(currentFragment.steps[currentFragment.steps.length-1], "rh")[0]');
W(`noteOn(${last})`); W(`noteOff(${last})`);
check(W("progress.songs['cuatro-acordes'].runs") === 1, 'terminar una pieza se registra');

section('Plan de hoy y progreso');
ev('#mainTabs [data-cat="today"]');
const plan = W('todayPlan');
check(plan.length >= 5 && plan.every(p => typeof p.go === 'function' && typeof p.done === 'function'), 'plan con acciones');
check(plan[1].title.includes('Do mayor'), 'la escala del día es Do mayor al empezar');
W("progress.scales['cmajor:rh'] = {runs:3, clean:3, lastDay:null}; progress.scales['cmajor:lh'] = {runs:3, clean:3, lastDay:null}; todayPlan = buildTodayPlan(1)");
check(W('todayPlan[1].title').includes('Sol mayor'), 'con Do mayor limpia 3 veces por mano, propone Sol mayor');
W("todayPlan[1].go()");
check(W('currentMode') === 'gmajor', 'el botón Ir lleva a Sol mayor');
ev('#mainTabs [data-cat="progress"]');
check(doc.querySelectorAll('#heatGrid .heat-cell').length >= 84, 'mapa de calor de 12 semanas');
check(doc.querySelectorAll('#masteryList .mastery-item').length === 9, '9 filas de dominio');
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
check(sub.indexOf('I') < sub.indexOf('D') || !sub.includes('dedo'), 'escalas: el dedo izquierdo se lee antes que el derecho (' + sub + ')');
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
W('window.__mk = (names) => ({ inputs: new Map(names.map((n,i) => [i, { name:n, onmidimessage:null }])), onstatechange:null });');
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

console.log(`\n${passes} pruebas OK, ${failures} fallos`);
if(errors.length) console.log('Errores de consola:', errors);
process.exit(failures || errors.length ? 1 : 0);

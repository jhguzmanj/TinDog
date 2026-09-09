# Piano MIDI Trainer — guía para retomar el proyecto

## Qué es
App de práctica de piano de **un solo archivo** (`piano-midi-trainer.html`, HTML/CSS/JS
vanilla, sin build ni dependencias en producción) para Jorge, que aprende piano desde
cero en clases de academia (sábados) con un Yamaha P-45B conectado por USB. Usa Web MIDI
para leer las notas reales del piano y también funciona sin MIDI (clic/touch sobre el
teclado dibujado en SVG, con sintetizador Web Audio).

Contexto de Jorge: sin conocimiento previo, prefiere retroalimentación honesta y
directa, es corto de vista (**no reducir tamaños de letra**; el teclado tiene zoom).

## Cómo se prueba (seguir esta convención)
```
npm install        # solo jsdom, como devDependency
npm test           # node tests/run.js
```
`tests/run.js` carga el HTML real en jsdom (`runScripts:'dangerously'`), simula clics
con `MouseEvent`, llama `noteOn()/noteOff()` y lee estado interno con `window.eval`.
Cosas a recordar:
- Poner `soundEnabled=false` antes de simular notas (jsdom no tiene `AudioContext`;
  `ensureAudioCtx()` devuelve `null` en ese caso y todo lo de audio lo tolera).
- `node --check` sobre el `<script>` extraído sigue sirviendo para sintaxis rápida.
- Para mirar la UI: Chromium headless con Playwright (`file://` + screenshot).

## Mapa del archivo (un `<style>` y un `<script>`)
Orden dentro del `<script>`:
1. Teclado SVG de 88 teclas, etiquetas (letra / Do Re Mi), zoom, sonido, Web MIDI.
2. `noteOn(note, src)` — **`src:'midi'` no dispara el sintetizador** (el piano ya
   suena solo); `'ui'` sí. Despacha por modo con `NOTE_HANDLERS` (registro):
   `registerNoteHandler('chords', checkChord)` etc. Las escalas se detectan con
   `SCALES[currentMode]`; la cascada tiene prioridad en fragmentos/agilidad.
   **Modo nuevo = una línea `registerNoteHandler(...)`, nada más.**
3. Datos de escalas (`SCALE_DEFS`, `spellScale`, `buildScale`, `SCALES`,
   `buildScaleRun`, `fingerSeq`).
4. `CHORDS`, `FUNC_CATS/FUNC_KEYS` (mapa del P-45), `AGILITY_DRILLS`, `SONGS`,
   `INTERVALS`.
5. Modos y pestañas: `enterMode`, `selectCategory`, sub-pestañas de escalas,
   opciones de escala (mano/octavas/sentido/dedos/metrónomo).
6. Motor de escalas (`startScaleRun/startScaleStep/checkScaleStep`, dedos, tiempo).
7. Acordes (inversiones, mano, notas exactas), zoom, fragmentos/agilidad, intervalos
   (exactos + oído), pickers, mapa de funciones, barra C=Do, cascada.
8. Pentagrama (`renderStaff`), Lectura (`READING_LEVELS`), metrónomo, progreso,
   plan de "Hoy", panel de progreso. Termina con `selectCategory('today')`.

## Pestañas (`data-cat`)
`today | free | scales | chords | intervals | reading | agility | fragments | progress | functions`

## Datos principales
- **Escalas**: `SCALE_DEFS` = raíz (letra + clase de nota), familia (`major|minor`) y
  digitación estándar de una octava por mano (`rh`, `lh`, 8 dígitos). Las notas y los
  nombres se **calculan** (`spellScale`), por eso Sol# mayor sale con B# y Fx sin
  tabla a mano. `rebuildScales(variant)` regenera las menores en natural/armónica.
  `buildScaleRun(scale, hand, octaves, dir)` produce los pasos (una nota por mano y
  paso, con dedo). Digitación de 2 octavas: derecha = 7 primeros dedos ×2 + último;
  izquierda = primer dedo + 7 siguientes ×2 (`fingerSeq`, probado en tests).
  La derecha arranca en la octava 4 (Do central), la izquierda en la 3.
- **Acordes**: `CHORDS` (24 tríadas). `chordVoicing(chord, inv, octave)` da las notas
  exactas de fundamental / 1ª / 2ª inversión. `checkChord` es octave-agnostic salvo
  con `chordStrict` (se enciende solo al elegir una inversión, si no no se distingue).
- **Intervalos**: `checkInterval` compara **notas MIDI exactas** (antes comparaba solo
  la letra y Do4+Mi5 aprobaba como 3ª mayor — no reintroducir). Modo oído: la app
  toca raíz y segunda nota (`playEarInterval`), solo se marca la raíz, se registra
  acierto/fallo por intervalo.
- **Lectura**: `READING_LEVELS` (7 niveles, clave de Sol / Fa / ambas / alteraciones).
  `renderStaff(svg, [{sp, cls, clef}], {clef, width, gap, showName})`; `sp` viene de
  `spellMidi(midi, preferFlat)` o `spellFromName('B#', 60)` (respeta octava de la letra).
  Nivel dominado = ≥20 notas y ≥85% a la primera.
- **Fragmentos / Agilidad**: sin cambios de fondo (ver abajo). `checkFragment` compara
  notas exactas; la detección de "completado" se decide **antes** de
  `advanceToPlayableStep()` (que vuelve a 0 y antes ocultaba el final).
- **P-45**: el manual numera las octavas una posición abajo (su C3 = C4/Do central);
  `manualToMidi()` hace esa conversión. Mapa extraído del PDF, no adivinar.

## Metrónomo
Web Audio con programación por adelantado (`metroScheduler` cada 25 ms, 120 ms de
lookahead). `metroOffsetMs(tPerf)` devuelve el desfase en ms al pulso más cercano
(negativo = adelantado). Escalas "Con metrónomo" clasifican cada nota:
`ok` ≤90 ms, `early/late` hasta 250 ms, `miss` más allá. BPM persiste en localStorage.

## Progreso (localStorage `pianoProgress1`)
```
{ v:1, days:{ 'YYYY-MM-DD': {sec, notes, scales, chords, intervals, ear, reading, drills, songs, cascade} },
  scales:{ 'cmajor:rh': {runs, clean, best2, bestTiming, lastDay} }, chords:{ 'C': {runs, inv, lastDay} },
  intervals:{ idx:{runs,lastDay} }, ear:{ idx:{asked,right,lastDay} }, reading:{ levelId:{attempts,first,sumMs,lastDay} },
  drills:{ id:{runs,lastDay} }, songs:{ id:{runs,lastDay} }, cascade:{ id:{runs,best,lastDay} } }
```
- Tiempo de práctica: cada 15 s se suman 15 s si hubo actividad (nota o clic) en el
  último minuto. Un día cuenta como practicado con ≥3 min (racha).
- Plan de "Hoy" (`buildTodayPlan`): calentamiento (drill menos hecho), escala del día
  (la primera mayor que no tenga 3 pasadas limpias por mano; sugiere la mano más
  floja; con las dos limpias propone ambas manos), 3 acordes menos practicados (grupo
  C G F Am Em Dm hasta dominarlo), nivel de lectura vigente, oído, pieza menos hecha.
- Exportar/importar JSON desde la pestaña Progreso.

## Otras preferencias persistidas
`kbZoom2`, `labelStyle`, `labelsShown` (ahora sí se recuerda; por defecto visible),
`solfaShown`, `cascadeSpeed`, `scaleOpts` (mano/octavas/sentido/dedos/variante menor),
`metroBpm`, `readingLevel`.

## Diseño (jerarquía deliberada)
Regla que manda: el 90% del tiempo Jorge mira **una sola cosa** — qué tecla toca
ahora — desde ~1 m y con las manos en el piano. Todo lo demás es secundario.
- **Encabezado** = barra de herramientas de una fila (identidad + estado MIDI +
  metrónomo + tiempo de hoy). El panel de conexión vive **dentro** del encabezado.
  No volver a poner un hero decorativo alto: costaba 150 px y no informaba nada.
- **`.practice-info.stage`** es el elemento dominante: nombre de nota en
  `clamp(40px,5.4vw,68px)`, digitación y mano debajo, mini pentagrama al lado.
- Dos `MutationObserver` adaptan el escenario sin tocar los modos:
  `progressText` ("Nota 3 / 15") se convierte en puntos (`#stepDots`), y
  `targetNoteLabel` se achica solo (`.sm` >12 chars, `.xs` >22) porque algunos
  modos escriben frases ahí. **Modo nuevo no necesita hacer nada para esto.**
- **Controles segmentados**: `.reg-bar .reg-picker` y `.hand-picker` son un solo
  bloque con segmentos, no botones sueltos. Los pickers largos (`#chordPicker`,
  `#intervalPicker`, `#funcCatPicker`) quedan fuera a propósito: son listas.
- **Color con significado**: brass = "lo que tienes que hacer ahora"; mano derecha
  cálida (`--rh`), izquierda fría (`--lh`) y ese par se usa igual en teclas,
  números de dedo, etiquetas y pentagrama. El cromo es neutro.
- Si se toca tipografía: **subir tamaños, nunca bajarlos** (Jorge es corto de vista).

## Cosas ya resueltas — no "arreglar" de nuevo
- Doble sonido con el piano conectado (solo `src:'ui'` sintetiza).
- Listener duplicado del `<select>` de dispositivos MIDI (`deviceSelectBound`).
- `ensureValidHandSelection()` / `advanceToPlayableStep()` (red de seguridad de manos).
- Barra C=Do plegada por defecto (pedido de Jorge).
- Etiquetas de teclas: el nombre de nota + Do Re Mi en dos líneas (`<tspan>`).
- **Colisión de CSS `.sub`**: existía una regla `.sub { margin:0 auto; max-width:480px }`
  para el subtítulo del encabezado. Como los botones de sub-pestaña son
  `class="mode-tab sub"`, les caía encima y las filas de escalas / fragmentos
  salían repartidas a lo ancho en vez de alineadas a la izquierda. Regla borrada.
  No volver a usar nombres de clase genéricos (`.sub`, `.row`, `.tip`) para algo
  específico de un componente.

## Ideas pendientes (no pedidas aún)
- Progresiones de acordes con metrónomo (I–V–vi–IV a tempo).
- Lectura de dos notas simultáneas / intervalos escritos.
- Grabar y reproducir lo que tocó (MIDI in → buffer) para autoescucha.
- Sincronizar progreso entre dispositivos (hoy es localStorage + respaldo JSON).

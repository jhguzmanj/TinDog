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
   `registerNoteHandler('chords', checkChord)` etc. Hay un registro gemelo para
   cuando se SUELTA una tecla (`NOTE_OFF_HANDLERS` / `registerNoteOffHandler`,
   despachado desde `noteOff`): lo usa Acordes para las repeticiones, porque sin
   saber que se levantó la mano no se distingue "lo tocó otra vez" de "lo tiene
   pisado". Las escalas se detectan con
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
- **Escalera de tempo (`scaleStage`)**: dominar una escala son DOS pasos, no uno.
  `step:1` las **notas** (3 pasadas seguidas sin errores, puede ser sin metrónomo),
  `step:2` el **tiempo** (limpia y a tiempo subiendo `SCALE_TEMPOS = [60,70,80]`).
  `scaleUnlocked` exige los dos con las dos manos: antes bastaban 3 pasadas
  limpias y se acumulaban escalas a medio aprender sin haber tocado nunca una a
  tempo. `bestTiming` (% de notas a tiempo) **no sirve solo**: 90% a 60 BPM y
  90% a 100 no son lo mismo, por eso se guarda `bestBpm` aparte. El peldaño lo
  da únicamente una pasada **seguida, limpia y con `okPct ≥ 80`**; el bloque no
  cuenta (2 pulsaciones, no 8 notas) y sin metrónomo no hay BPM que acreditar.
  `scaleRun.bpm` se fija **al empezar** la pasada: bajar el BPM a media escala no
  debe acreditar el de antes. `bestBpm` es un máximo, así que la fusión por
  máximos del respaldo lo maneja sin caso especial (hay prueba). `scaleMastery`
  (mitad notas, mitad tempo) alimenta el panel de dominio: una escala limpia
  pero nunca tocada a tiempo va por la mitad, no al 100%.
- **Sentido y modo de ataque** (opciones de escala): `scaleDir` es
  `up | down | updown`, rotulados **Ascendente / Descendente / Ascendente y
  descendente** — así los llama el profesor de Jorge, y la app tiene que hablar
  el idioma de la clase (los valores internos siguen en inglés: cambiarlos
  rompería el `scaleOpts` ya guardado). Descendente sola existe: la digitación es
  la de subida al revés y `scaleBlockMode` es el ejercicio **En bloque**, que en vez de una nota
  por paso pide **todas las que caen bajo la mano, presionadas a la vez**.
  `blockGroups(asc, hand)` corta donde el dedo "se reinicia", que es justo donde
  la mano se mueve: derecha, dedo **menor** que el anterior (pasa el pulgar);
  izquierda, dedo **mayor** (cruza por encima). Sale solo del string de
  digitación, así que una escala nueva no necesita datos extra. Do mayor derecha
  da `[Do Re Mi][Fa Sol La Si Do]`; la pentatónica izquierda, `[Do Re Mi Sol La][Do]`.
  El motor ya sabía exigir varias notas a la vez (lo usaba "ambas manos"):
  `checkScaleStep` pide que **todas** estén en `activeNotes`.
  **Una pasada en bloque NO suma `clean`** (`recordScaleRun` mira `run.blocks`):
  son 2 pulsaciones contra 8 notas, y si contara abriría la escala siguiente sin
  haberla tocado nunca seguida. Sí suma `runs`, tiempo y `lastDay`.
  `scaleRunKey()` incluye el modo, o cambiarlo no reconstruiría la corrida.
- **Pentatónicas** (`family:'pentatonic'`, tercera pestaña, tarea de la academia):
  5 notas por octava, patrón `[2,2,3,2,3]` y **sin ningún semitono** — por eso
  todo lo que suene ahí "pega". El motor dejó de asumir 7 grados: `spellScale`
  recibe `steps` de largo variable y un `LETTER_STEPS` paralelo (`[1,1,2,1,2]`)
  porque la escala **se salta letras** (Do Re Mi **Sol** La). Sin ese salto,
  Sol pentatónica se deletrearía `Sol La Si Do## Re##`. `fingerSeq` y
  `buildScaleRun` sacan los grados de `scale.steps.length`, así que una familia
  nueva de N notas no necesita tocar nada más.
  Digitación de la academia: derecha `123123`, izquierda `543212`. Los cuatro
  tonos mayores incluidos (Do, Sol, Fa, Re) son justo los que la mantienen
  literal, con **el pulgar siempre en tecla blanca** — hay una prueba que lo
  fija. Si se agregan La o Fa# (las 5 negras) esa digitación ya no aplica tal cual.
  **Mayor y menor comparten familia pero no patrón**, así que la definición trae
  `pattern` (`pentatonic` = `[2,2,3,2,3]`, `pentatonicMinor` = `[3,2,2,3,2]`) y
  `buildScale` lo prefiere sobre la familia. Las menores incluidas (La, Mi, Re)
  son las **relativas** de Do, Sol y Fa: mismas teclas, otra nota de partida —
  `rel` enlaza el par y hay pruebas que comparan los grupos de clases de nota.
  Si menor queda fuera: su 4ª nota es Fa# y le tocaría el pulgar derecho.
  Su digitación es **una extensión del patrón de la academia, no algo que el
  profe haya dado** — si en clase dan otra, esta se cambia. Ojo con el bloque
  izquierdo: la menor abarca una 7ª menor (10 semitonos) contra la 6ª mayor (9)
  de la mayor, así que estirar los cinco dedos a la vez cuesta más.
  **El consejo (`renderScaleTip`) calcula saltos y cruces de los datos**, no los
  escribe a mano: en la menor el salto NO cae donde cruza la mano (salto al
  principio, pulgar por debajo en medio), y el texto fijo de la mayor mentía.
  Los cruces salen de la digitación con la misma regla que `blockGroups`.
  **La pentatónica está limitada a UNA octava a propósito** (`ensureValidOctaves`
  apaga el botón de 2 y baja el valor si venía puesto): la digitación de clase
  termina en un dedo de *llegada*, no en el que arranca el ciclo siguiente. En
  las mayores el ciclo se repite porque la octava cae en el pulgar (derecha) o
  deja el pulgar listo para el cruce (izquierda); aquí `fingerSeq` daría
  izquierda `Do(2) Re(4)`, que subiendo es físicamente imposible. Antes que
  inventar digitación, se bloquea la opción. **No "arreglar" habilitándola.**
- **Acordes**: `CHORDS` (24 tríadas). `chordVoicing(chord, inv, octave)` da las notas
  exactas de fundamental / 1ª / 2ª inversión. `checkChord` es octave-agnostic salvo
  con `chordStrict` (se enciende solo al elegir una inversión, si no no se distingue).
  **Repeticiones (`chordReps`, 1/2/4/8, persistido).** Pedido de Jorge: en la
  vida real un acorde no se toca una vez y ya, se repite en el tiempo. Con más
  de 1 el mismo acorde se pide N veces antes de pasar al siguiente. Tres cosas
  que no son obvias:
  - **Hay que SOLTAR entre toque y toque** (`chordAwaitRelease`, se limpia en
    `chordReleased` cuando `activeNotes` queda vacío). Sin eso, tener el acorde
    pisado dispararía las N repeticiones de golpe y el ejercicio no existiría.
    Por eso hizo falta el registro de note-off: `checkChord` corre en note-on y
    ahí `activeNotes` nunca está vacío.
  - **La cinta de casillas (`#timingBox`) es a la vez el contador y el
    cronómetro.** Reusa el elemento, el CSS y `timingClass`/`timingPct` de las
    escalas; con el metrónomo apagado la casilla tocada va en `.timing-chip.done`
    (clase nueva, marfil apagado) y con él encendido se clasifica igual que una
    nota de escala. Repetir sin medir el tiempo es apretar N veces, no tocar:
    por eso el resumen invita a encender el metrónomo. `metroRender()` llama a
    `renderChordRepBox()` — si no, encender el metrónomo no cambiaba el texto y
    parecía que el botón no hacía nada.
  - **`recordChord` se llama una sola vez por acorde**, al completar las
    repeticiones, no una por toque: si no, 8 repeticiones inflarían el progreso
    ×8 (y el respaldo fusiona por máximo, así que quedaría inflado para siempre).
  - `chordReps` se declara **arriba, junto a `scaleTempoMode`**, no con el resto
    del estado de acordes: lo lee `enterMode`, que está declarado antes (mismo
    riesgo de zona muerta temporal que tuvo `playbackToken`).
  **Tres menús (`CHORD_GROUPS`, `chordGroup` persistido).** `basicos` (los 6
  primeros de `CHORDS`), `resto` (los otros 18) y `all`. El orden de `CHORDS` ya
  ponía los seis básicos al frente y el plan de "Hoy" se apoyaba en eso con un
  `slice(0,6)` suelto; ahora hay UN sitio que lo define y el plan lo usa.
  **Arranca en `basicos` a propósito**: el consejo del modo decía "empieza por
  C, G, F, Am, Em, Dm" y con los 24 de golpe eso no se cumplía.
  - `practiceIndex` indexa la lista VISIBLE (`visibleChords()`), no `CHORDS`.
    Se puede porque la llave del progreso es `chord.name`, no el índice — al
    revés que en `INTERVALS`, donde el índice ES la llave y por eso no se
    puede reordenar.
  - **`chordDoneSet` guarda NOMBRES, no índices.** Con listas de distinto largo
    un índice guardado apuntaría a otro acorde al cambiar de menú.
  - `pickChordByName()` abre el menú del acorde antes de buscarlo, por el mismo
    fallo silencioso que ya tuvieron Fragmentos y Agilidad.
  **Calificación del ejercicio (`chordVerdict`).** Pedido de Jorge: "saber
  cuántas veces lo hice bien". Con repeticiones y metrónomo, la tanda se
  califica con el **mismo listón que las escalas** (`CHORD_TIMING_OK =
  SCALE_TIMING_OK`, ≥80% de los toques dentro de los 90 ms del pulso) y el
  veredicto dice `Do: 3 de 4 a tiempo (75%) — este repítelo · llevas 5 de 8
  acordes logrados`. Decisiones:
  - **Se avanza al siguiente acorde aunque la tanda no pase.** Un candado
    "hasta que salga" lo dejaría atascado en Do para siempre y los otros 23 sin
    practicar. La calificación mide, no bloquea. `chordGoodRun`/`chordSetsRun`
    son el marcador de la tanda (se reinician al cambiar de menú, de
    repeticiones, o al dar la vuelta completa).
  - **Sin metrónomo no se califica**: `timingPct` devuelve `null`, la tanda se
    da por buena y el veredicto lo dice ("enciende el metrónomo para
    calificarlo"). No inventar una nota de algo que no se midió.
  - `recordChord(name, inv, pct, bpm, passed)` guarda `bestPct`, `bestBpm` y
    `good`. Los tres son máximos o contadores que solo suben, así que
    `mergeRecords` (que fusiona cualquier número por máximo) los maneja sin
    caso especial. Una tanda fallada **sí** suma `runs` y `lastDay`: si no, un
    día de práctica dura saldría vacío en el plan.
- **Intervalos**: `checkInterval` compara **notas MIDI exactas** (antes comparaba solo
  la letra y Do4+Mi5 aprobaba como 3ª mayor — no reintroducir). Modo oído: la app
  toca raíz y segunda nota (`playEarInterval`), solo se marca la raíz, se registra
  acierto/fallo por intervalo. Cada intervalo trae `ref` (cómo reconocerlo de oído,
  va en el cuadro de distancia) y `tip` (qué practicar / dónde cae en el teclado,
  va en `#intervalTip`). No volver a poner un texto genérico ahí.
  **Unísono en modo oído:** `top === root`, así que el acierto se comprueba
  **antes** de descartar la nota de partida. Si se descarta primero (como estaba),
  tocar la tecla correcta no hace nada y la práctica se atasca sin poder avanzar.
  **De oído no se puede filtrar el índice.** `practiceIndex` ES la respuesta, así
  que con la pregunta abierta (`earAwaiting`) se tapan las tres cosas que lo
  decían: el `.current` del selector "Ir directo a" (`refreshIntervalPicker`),
  el rótulo `Intervalo 7 / 13` (pasa a decir `De oído`) y los puntos de progreso,
  que salen de ese mismo número. Se destapa al contestar. Cualquier cosa nueva
  que muestre `practiceIndex` va con el mismo cuidado.
  **Pistas de oído** (`showEarHint`, botón `#earHintBtn`): dos niveles. La 1ª da
  `iv.ref` (cómo suena — la habilidad que entrena el modo), la 2ª el cuadro de
  distancia + `iv.tip` para contar las teclas. Ninguna marca la tecla: encontrarla
  es el ejercicio, y `renderDistanceBox` a propósito **no** nombra la nota de
  llegada. Pedir pista cuenta como fallo (`earCountMiss`, mismo camino que una
  nota equivocada); gratis, el marcador de aciertos no significaría nada.
  `resetEarHint()` vacía `#intervalTip` al preguntar: si no, quedaba a la vista
  el consejo del intervalo anterior.
  **Escalera pedagógica (`INTERVAL_STAGES`, 6 niveles).** `INTERVALS` va en
  orden **cromático** (semitonos 0..12) y **no se puede reordenar**: su índice
  es la llave de lo guardado (`progress.intervals` / `progress.ear`), así que
  moverlo le re-asignaría a Jorge lo practicado a otro intervalo. El orden de
  práctica vive aparte, como lista de índices: anclas (unísono, 8ª, 5ª) →
  terceras (alegre/triste) → pasos (2ªM, 4ªJ) → sextas → tensos (7ªm, 2ªm) →
  7ªM y tritono. En cromático el **segundo** intervalo era la 2ª menor, de las
  más difíciles de oír, y **de oído salía uno al azar entre los 13 desde el día
  1**. Exacto avanza con `nextIntervalIdx` y el rótulo usa `intervalOrderPos`;
  de oído `pickEarIndex()` pregunta dentro del nivel con 50% de repaso de los
  anteriores. **Decir el conjunto de candidatos NO es soplar la respuesta**
  (así se entrena el oído de verdad: se sabe entre qué elegir); decir
  `practiceIndex` sí lo sería y se sigue tapando. Con más de 6 candidatos el
  rótulo pasa a "entre todos los que llevas" en vez de listarlos.
- **Lectura**: `READING_LEVELS` (7 niveles, clave de Sol / Fa / ambas / alteraciones).
  `renderStaff(svg, [{sp, cls, clef}], {clef, width, gap, showName})`; `sp` viene de
  `spellMidi(midi, preferFlat)` o `spellFromName('B#', 60)` (respeta octava de la letra).
  Nivel dominado = ≥20 notas y ≥85% a la primera.
  **`🔊 Escuchar` (`playReadingNote`)** suena la nota del pentagrama por el piano
  para ligar símbolo y sonido. **No descuenta**: oírla no dice qué tecla es, y
  cazarla a tientas ya marca `missed` en el primer error, así que el "a la primera"
  sigue siendo honesto. `stopReadingSound()` (con `readingSounding`/`readingSoundTimer`)
  la apaga a los 900 ms, al pasar de nota y al salir de la práctica — sin eso el
  piano se quedaba sonando solo.
  **`reading.answered` en vez de `reading = null` al acertar.** Entre el acierto y
  la nota siguiente hay 700 ms; anulando `reading` los dos botones quedaban muertos
  justo cuando dan ganas de volver a oír la nota recién leída. `checkReading` y la
  pista salen con `reading.answered`, pero `🔊 Escuchar` sigue vivo.
  La pista hace `scrollIntoView` del teclado: decir "está marcada abajo" no sirve si
  "abajo" quedó fuera de pantalla, y `scrollToTargets()` solo mueve el scroll
  horizontal DENTRO del teclado, no baja la página.
- **Fragmentos / Agilidad**: sin cambios de fondo (ver abajo). `checkFragment` compara
  notas exactas; la detección de "completado" se decide **antes** de
  `advanceToPlayableStep()` (que vuelve a 0 y antes ocultaba el final).
  **Número de dedo en el teclado** (`lhF`/`rhF`, paralelos a `lh`/`rh`): antes solo
  Escalas y Acordes lo dibujaban (`drawFingerNum`); Jorge lo pidió como referencia
  en **todas** las prácticas que marcan tecla. Agilidad y Fragmentos no traían esa
  digitación. Reglas usadas (ninguna viene del profesor — es una digitación
  razonable inventada, igual que en Acordes):
  - **Agilidad** (`materializeAgilitySteps`): cada paso de `AGILITY_DRILLS` ya trae
    un dedo de mano derecha al frente del `label` (p.ej. `'1 (pulgar)'`); el de la
    izquierda es su **espejo**, `mirrorFinger = 6 - dedo`. Es la misma regla que ya
    usa la digitación de escalas a dos manos (Do mayor rh `12312345` / lh
    `54321321`, dedo a dedo suman 6), así que el patrón de cruce de pulgar
    (`cruce-pulgar`, que es literalmente una escala de una octava) no necesitó
    digitación aparte: el espejo solo la reproduce. `alterna-pulgar-indice` y
    `escalera-corta` no traían `label` (nada que espejar); se les agregó
    (`1,2` alternado y `1,2,3` repetido) porque el nombre y el tip ya decían qué
    dedos son. **`escalera-doblada` y `espejo-menique`** salen de un método real
    ("Primer Nivel", altopianista.com) que Jorge compartió en PDF: son ritmo +
    dedo sobre la posición de 5 dedos, **sin alturas fijas** — por eso se
    pudieron copiar con confianza total (a diferencia de una melodía real, aquí
    no hay tono que verificar: el patrón es relativo a la raíz que elija cada
    octava). `escalera-doblada` dobla cada nota (1-1-2-2-3-4-5, la última a 2
    tiempos); `espejo-menique` arranca en el meñique y baja al pulgar antes de
    volver a subir — lo contrario de cómo empiezan los demás ejercicios.
  - **Fragmentos** (`SONGS`): no hay patrón que derivar (son piezas reales, no
    posiciones fijas), así que `lhF`/`rhF` se escribieron a mano por nota.
    Convención: acorde de la izquierda en posición fundamental = `5-3-1` (igual
    que `CHORD_FINGERS`), nota grave suelta de la izquierda = dedo `5`, acordes de
    la derecha reutilizan `CHORD_FINGERS.rh` por inversión, y la melodía de la
    derecha va en posición de 5 dedos (Do=1 Re=2 Mi=3 Fa=4 Sol=5, estirando el 5
    para el La de "Estrellita"). El arpegio de Do usa el patrón estándar 1-2-3-5.
    **"Himno a la alegría" son dos frases, a propósito** (Jorge pidió ir
    construyendo la pieza por partes): la 1ª queda "en el aire" (termina en Mi,
    grado 3), la 2ª responde y resuelve en Do. Las dos caben en la MISMA posición
    de 5 dedos, así que no hace falta digitación nueva — es literalmente la
    frase 1 con el final cambiado. `label:'Frase 1'/'Frase 2'` en el último paso
    de cada una sirve de ancla para el selector de Tramo del modo cascada, para
    practicar una frase sin la otra.
    **Después Jorge pidió la segunda mitad y poder unirlas, así que el tema son
    TRES entradas**: `oda-alegria` (Parte 1, compases 1-8, la que ya tenía),
    `oda-alegria-2` (Parte 2, compases 9-16) y `oda-alegria-full` (completo).
    Tres entradas y no una sola pieza larga con `label` porque **fuera de la
    cascada no hay selector de Tramo**: en el modo paso a paso hay que tocar
    desde el principio, que es justo lo que pidió evitar. Los pasos viven en dos
    arreglos, `ODA_P1` y `ODA_P2`, declarados antes de `SONGS`, y la completa es
    `ODA_P1.concat(ODA_P2)` — **no una copia**, para que corregir una nota en una
    parte corrija la completa sola (hay prueba que lo fija). Compartir los mismos
    objetos de paso entre las tres piezas es seguro: nada del motor los modifica.
    - **La fuente es la hoja del curso de laescueledemusica.net**, que Jorge
      pasó como imagen: trae melodía por nombre de nota, **digitación de las dos
      manos** y el acompañamiento de la izquierda, compás por compás. Da los 16
      compases, así que la pieza entera está verificada, no reconstruida.
      *(Método: el primer intento se hizo sin la hoja, triangulando resultados
      de búsqueda — WebFetch estaba bloqueado por el proxy en todos los
      dominios. La melodía salió bien, pero **dos cosas salieron mal**: el
      acompañamiento y la octava del Sol final. Moraleja repetida: pedir la
      fuente antes, no después.)*
      Para leer la digitación del compás 12, que a tamaño normal no se
      distinguía, se recortó la zona con PIL y se amplió ×4 — barato y resuelve
      de una lo que costaría otra vuelta de preguntas.
    - **Lo único rítmicamente nuevo son dos corcheas SEGUIDAS** (compases 10 y
      11, con corchete en la hoja). Cuidado con decir "las primeras corcheas":
      la parte 1 ya trae una suelta al final de cada frase (negra con puntillo +
      corchea). La prueba cuenta pares de `dur:0.5` consecutivos: 0 en la parte
      1, 2 en la parte 2. Una etiqueta que decía "aquí entran las corcheas" era
      falsa y se cambió.
    - **El compás 12 es el ÚNICO cambio de posición de la pieza**, y la hoja lo
      marca con un asterisco: digitación `Do(1) Re(3*) Sol(1)`. Ese `3` sobre el
      Re (que en posición fija sería 2) es la señal de que la mano baja, y el
      Sol es el **grave** (Sol3 = 55, debajo del Do central), tocado con el
      pulgar. La izquierda cae a la vez en su Sol más grave (Sol2 = 43), así que
      las dos manos aterrizan en la misma nota en octavas — por eso el paso
      muestra `Sol2 + Sol3`.
      **Un intento anterior le dio ese Sol a la izquierda** (con `rh:[]`) para
      no mover la derecha; se veía razonable y era incorrecto: la hoja lo pone
      en la derecha y la izquierda tiene su propia nota ahí. No repetirlo.
    - **La izquierda NO es Do en todos los compases.** Va en posición fija
      `Sol2(5) La2(4) Si2(3) Do3(2) Re3(1)` y toca `Do–Si–La–(Do Si)` en la
      frase A, `Si–Do` dos veces por compás en la frase B, y `Re–Sol` en el
      compás 12. Es una nota a la vez (Jorge no quiere acordes) pero sigue la
      armonía de verdad. La versión anterior ponía Do3 en todos los compases con
      el dedo 5; sonaba plano bajo el compás 2 y además ese dedo 5 chocaba con
      la posición que exige el Sol2 del compás 12. Hay pruebas que fijan que
      cada nota lleva siempre el mismo dedo (o la posición no sería fija), con
      el compás 12 exceptuado a propósito. **Cumpleaños feliz y Bella Ciao se pidieron
    y quedaron pendientes**: Cumpleaños feliz sale de la posición de 5 dedos (la
    melodía sube hasta una 9ª desde el Do de referencia) y necesitaría un cambio
    de posición de mano que Fragmentos hoy no maneja fuera de Agilidad
    (`cruce-pulgar`); Bella Ciao no se agregó por no poder verificar la melodía
    nota por nota contra una fuente confiable en esa sesión — no adivinar una
    melodía conocida, se nota si está mal.
    **"María tenía un corderito"** se agregó como pieza fácil y segura dentro
    de la pentatónica: usa solo Do Re Mi Sol (ni siquiera necesita el La),
    cabe entera en la posición de 5 dedos y aquí la izquierda solo marca el
    Do en cada compás.
    Se eligió sobre Cumpleaños feliz/Bella Ciao por tener rango de mano y
    confianza de transcripción altísimos (melodía de 3-4 notas, ultraconocida).
    **"Estrellita" quedó en UNA sola versión y sin acordes.** Estaba dos veces:
    `estrellita` (media pieza, con tríadas largas en la izquierda) y `twinkle`
    (la misma melodía completa, con el "Brille brille" del medio). Jorge pidió
    dejar solo la corta y quitarle los acordes, que todavía no domina, así que
    `twinkle` se borró y la izquierda de `estrellita` pasó de tríadas a **una
    nota grave por compás**. No se dejó el Do fijo de "María tenía un
    corderito": se conservaron las raíces reales (Do–Fa–Do–Fa–Do–**Sol**–Do),
    que suenan bien bajo la melodía y **caben las tres en una sola posición de
    mano** — Fa2 con el meñique, Do3 con el pulgar, Sol2 con el 4. Por eso la
    digitación es `48→1`, `43→4`, `41→5` y no el `5` suelto de la convención:
    la mano no se mueve ni una vez en toda la pieza. Hay pruebas que fijan las
    tres cosas (una sola versión, máximo una tecla por paso, y que cada nota
    grave lleva siempre el mismo dedo — si cambiara, la mano tendría que
    reacomodarse). El progreso viejo bajo `songs.twinkle` queda huérfano en
    localStorage; es inofensivo (nada lo lee) y no vale la pena migrarlo.
    **"Cumpleaños feliz" sí sale de la posición fija de 5 dedos, a propósito**:
    es la primera pieza de Fragmentos con cambio de posición completo de mano
    (no solo cruce de pulgar). Va en dos posiciones — pulgar en Sol4 (Sol4-Re5)
    para las dos primeras frases, pulgar en Do5 (Do5-Sol5) para el salto agudo
    de "cumpleaños a ti" — con `label` avisando en qué paso se mueve la mano
    ("Mano sube…" / "Mano baja…"), igual que "(cruza)" en `cruce-pulgar`. La
    izquierda se queda simple (Do3 de referencia en cada frase, sin acordes).
    **Bella Ciao se pidió otra vez con una partitura (PDF) y se descartó de
    nuevo**: el PDF era un arreglo avanzado (arpegios, octavas dobladas,
    adornos, "sad and slow" de YouTube) que no calza con el formato de
    Fragmentos aunque se leyera perfecto, y leer los tonos exactos con
    confianza desde una página tan densa no era seguro. Falta una versión de
    **melodía simple** (letra de notas o partitura fácil) antes de agregarla.
    **Cinco piezas infantiles del PDF "Easy Piano Songs for Beginners"** (Angela
    Marshall, 2022) se agregaron como nivel 1–2 de la app: **Hot Cross Buns**
    (tres notas: Do Re Mi, ultra sencilla), **Au Clair de la Lune** (francesa,
    patrón de seis notas que se repite), **Twinkle Twinkle Little Star** (después
    borrada por duplicar a "Estrellita", ver arriba), **Hallelujah Chorus**
    (Händel, nota larga al inicio que marca el tiempo, cinco notas sin La),
    **Jingle Bells** (navideña, comenzando con tres notas repetidas para marcar
    ritmo). Las cinco usan posición de 5 dedos sin cambios, solo una nota de la
    izquierda en cada compás (Do tónica), así que el foco es la melodía sin
    complicación de coordinación.
    **"Aleluya" y "La Colegiala"** salen de tutoriales de YouTube por letras
    (AnthonyCalva), no de partitura. **Esa fuente sí se puede usar con confianza
    para las ALTURAS** porque trae la melodía escrita DOS veces —por nombre de
    nota y por número de tecla— y las dos se pueden cruzar: el video pone el
    mapa (Colegiala `1=Fa 2=Sol 3=La 4=Sib 5=Do 6=Re 7=Mib`; Aleluya
    `1=Do … 6=La`), se traducen los números y tienen que dar exactamente la
    misma lista que las letras. En las dos coincidió nota por nota. **Lo que
    esa fuente NO da es el ritmo**, y eso se dice en el `tip` en vez de
    disimularlo: van con valores parejos para aprender las teclas y el groove se
    saca de la canción. La izquierda (una nota grave por frase) también es
    añadida, no del tutorial. **La Colegiala es la primera pieza con teclas
    negras dentro de la melodía** (Sib y Mib); las dos tienen un cambio de
    posición marcado con `label`, como Cumpleaños feliz y Bella Ciao.
    Ojo con el nombre: `aleluya` (la famosa, tutorial) y `hallelujah`
    (el coro de Händel, del songbook) son piezas distintas y conviven.
    **"Flaca"** (Jarabe de Palo, partitura de itemfunes.com, mismo molde que
    Bella Ciao). El bajo son redondas, una por compás, y dan Sol–Si–Mim–Do–
    Sol–Re–Sol; ese bajo sirvió además para **verificar** la melodía (las notas
    de cada compás caen en su acorde). La derecha repite un molde: corta,
    LARGA, y dos cortas de enlace. Dos posiciones (pulgar en Sol4 y después en
    La4) porque la 2ª mitad sube a Sol5. 56 tiempos = 14 compases justos.
    **"Faded" entra SOLO como estribillo y movido a La menor, a propósito.**
    El PDF (arreglo de Melrose Tran) está en **Re# menor: SEIS sostenidos**,
    con acordes de cuatro notas en la izquierda y pasajes de semicorcheas.
    Se puede leer perfecto y aun así no sirve — es el mismo caso que el primer
    PDF de Bella Ciao. En vez de descartarlo se sacó el gancho y se transportó
    un tritono abajo, con lo que queda en **puras teclas blancas** y en una
    sola posición de mano. La izquierda es la progresión real (Lam–Fa–Do–Sol).
    Si alguna vez se quiere el arreglo completo, hay que volver al PDF: esto
    NO es una transcripción de esa partitura y el `tip` lo dice.
    **"All of Me" (John Legend) sale de UN fotograma de un reel**, no de una
    partitura: un tutorial por números (ponchopianot) donde el overlay dice
    `222 222 111 111` (rojo, izquierda) sobre `444 555 444 333` (blanco,
    derecha), y la foto del teclado tiene 5 teclas marcadas 1-5. **Los números
    son TECLAS, no dedos.** Para saber cuáles, se midieron las teclas negras de
    la foto y se agruparon por los huecos grandes (2+3+2): eso fija dónde está
    cada Do y de ahí sale cada marca. Resultado: `1=Mib 2=Fa 3=Sib 4=Do 5=Reb`.
    - **La verificación que lo confirma**: las cinco caen dentro de **La bemol
      mayor** (el tono original de la canción), y los cuatro pares que arma el
      overlay dan exactamente la progresión del tema: `Fa+Do` = Fam,
      `Fa+Reb` = Reb, `Mib+Do` = Lab, `Mib+Sib` = Mib → **Fam–Reb–Lab–Mib**.
      Si la lectura de la foto estuviera mal, esos pares no darían acordes. Es
      el mismo truco que "el bajo tiene que dar los acordes" de las partituras.
      Hay pruebas que fijan las dos cosas.
    - **Se queda en La bemol a propósito, con teclas negras.** Es el caso
      contrario a "Faded": ahí se transportó porque el arreglo era injugable;
      aquí son cinco teclas en dos posiciones fijas, y transportarlo a Do
      (que daría Lam–Fa–Do–Sol, todo blancas) rompería lo único que Jorge
      quería — que suene como la canción y pueda tocar encima de ella.
      Es la primera pieza con tecla negra **en la izquierda**.
    - **Lo que el reel NO da es el ritmo ni la digitación.** Van tres golpes
      parejos por compás (1+1+2 para llenar el 4/4, porque `SONGS` no tiene
      silencios) y el `tip` dice que el vaivén se saca de la canción — mismo
      criterio que "Aleluya"/"La Colegiala". La digitación es inventada
      (izquierda 3 en Mib y 2 en Fa; derecha 1-2-3 en Sib-Do-Reb), elegida para
      que **ninguna mano se mueva**; hay prueba que lo fija.
    - **Solo hay un fotograma**, así que esto es la vuelta de 4 compases que se
      repite, no la canción entera. Si aparecen más fotogramas del reel se
      puede alargar.
    **Fuente NUEVA y la mejor de las de tutorial: el formato "posiciones de
    dedo".** Jorge encontró después otro tutorial de la misma canción escrito
    así: `Place your right-hand fingers this way: 1:C - 2:F - 3:G#`, una línea
    por acorde, agrupado por secciones (Intro / Verse / Pre-Chorus) con
    `Play this section N times`. **Si vuelve a aparecer un formato así, vale la
    pena pedirlo**: es el único que da NOTAS y DIGITACIÓN a la vez, y la
    digitación es justo lo que en todas las demás piezas hay que inventar.
    - **Sirvió de verificación independiente del fotograma.** Las cuatro líneas
      del Intro (`F+C`, `F+C#`, `D#+C`, `D#+A#`) son **nota por nota** los
      cuatro pares que se habían decodificado midiendo las teclas negras de la
      foto, y en el mismo orden. Dos fuentes distintas, misma respuesta: la
      versión que ya estaba en la app queda confirmada.
    - **Cómo verificar este formato** (igual de barato que "el bajo da los
      acordes"): cada línea tiene que dar un acorde con nombre, y todas las
      notas tienen que caer en una sola tonalidad. Aquí el Verse da
      `Fam – Reb – Lab – Mib` y las siete notas que usa son exactamente la
      escala de **Lab mayor**, el tono original. Ni una se sale. Hay pruebas
      que fijan las dos cosas y la comparación intro/estrofa.
    - **Lo que el formato NO da**, y por eso conviene pedir también las
      imágenes del video: (1) el **ritmo** (ni duraciones ni compases;
      `Play this section 4 times` da la forma, no el vaivén); (2) la **octava**
      —`C` puede ser Do4 o Do5, se deduce de que los dedos suben con las notas
      y de lo que abarca la mano—; y (3) **si la línea se toca en bloque o
      desgranada**: el texto escribe `1:C - 2:D# - 4:G#` igual en los dos
      casos, y en las capturas del video se ve que es una MEZCLA (en el
      Pre-Chorus ese mismo acorde va primero como bloque dos veces y después
      nota a nota).
    **"All of Me · Estrofa" (`all-of-me-2`) sale de ese tutorial.** Mismos
    cuatro acordes que el intro pero completos en la derecha (tres teclas), con
    la **digitación del tutorial, no inventada** (1-2-3 en los tres primeros,
    1-2-4 en el Mib) — es la **primera pieza de la app donde la digitación no
    es invención propia. La izquierda sí es añadida**: la fundamental de cada
    acorde, una por compás y sostenida, que es la textura del ejercicio
    "3 · La izquierda sostiene". Es una entrada aparte y **no** se concatena
    con el intro: son dos arreglos distintos de la misma canción (el intro es
    un intervalo de dos notas, este mete el acorde entero en la derecha), y
    juntarlos bajo una sola pieza mentiría.
    **Una foto NUEVA del mismo video (formato "nota x3", separada por fila —
    una voz por fila) reconfirmó las dos piezas nota por nota Y destapó un
    error real en el intro.** La foto trae, para cada compás, cuántas veces se
    golpea cada nota (x3) y cuántas veces se repite la sección completa (Intro
    ×4, Estrofa ×2) — información que antes no había. Verificación: cada fila
    de la foto, leída columna por columna (una columna = un compás), tiene que
    dar el mismo pitch-class que ya estaba en la app; hay prueba que lo hace
    para las dos piezas y las dos cuadran EXACTO, sin cambiar ni una nota.
    - **El ritmo SÍ hubo que corregirlo, y fue Jorge quien lo notó.** Las dos
      piezas ya usaban tres pulsaciones por compás desde que se
      transcribieron (`dur:[1,1,2]`, negra-negra-blanca), y a primera vista
      parecía coincidir sano con "x3". Pero "x3" no dice "dos golpes y uno
      sostenido el doble" — dice **tres golpes IGUALES**. Corregido a
      `dur:4/3` en los tres (un tresillo por compás: 3 × 4/3 = 4 tiempos
      exactos, sin huecos). Se probó que `4/3` en JS suma exacto en punto
      flotante para 3 y para 12 repeticiones antes de usarlo (hay riesgo real
      de que no cuadre por redondeo; en este caso sí cuadra). Más parejo y
      más movido — que es lo que Jorge pidió al notar que el ritmo se sentía
      plano ("aumentar un poco el ritmo").
    - **El error real: el intro tenía las dos notas repartidas entre las dos
      manos** (Fa/Mib en la izquierda, Do/Reb/Sib en la derecha). Esa mano
      venía de la PRIMERA fuente (el fotograma del reel, que solo daba
      pitches, nunca de qué mano) y nunca se contrastó contra el texto
      completo del tutorial, que siempre dijo *"Place your **right-hand**
      fingers this way: 1:F-3:C…"* — las dos notas en la MISMA mano. La foto
      nueva lo confirma escribiendo "Right hand" sin ninguna mano izquierda.
      **Corregido**: las dos notas del intro van juntas en la derecha, nada en
      la izquierda, con la digitación real del tutorial (pulgar siempre en la
      nota grave — 1 — y la aguda con 3 o 4 según de dónde venga el pulgar:
      **el mismo Do lleva dedo distinto en el compás 1 que en el 3**, porque
      la mano llega desde un lugar distinto — no es un descuido, es lo que
      dice la fuente, y una prueba lo fija en vez de exigir "siempre el mismo
      dedo" como en el resto de Fragmentos). **Moraleja**: verificar solo el
      CONJUNTO de notas (como se hizo la primera vez, comparando sets) no basta
      cuando hay más de una mano — hay que verificar también a qué mano
      pertenece cada una, contra la fuente más completa disponible, no la
      primera que llegó.
    **El Pre-Chorus quedó FUERA a propósito**, aunque el tutorial lo trae. La
    diferencia con Aleluya/La Colegiala (donde solo faltaba el ritmo) es que
    aquí faltan además el bloque-vs-desgranado y el orden dentro de cada
    posición, y las dos capturas que hay solo cubren 2 de las 8 líneas. Lo que
    sí se pudo leer de ellas, por si se retoma: la izquierda es **Sib y luego
    Lab** (o sea `Sibm → Lab`, el ii y el I de Lab mayor), `1:C - 2:C# - 4:F`
    va desgranado subiendo, `3:G# - 4:C - 5:C#` desgranado BAJANDO,
    `1:C - 2:D# - 4:G#` en bloque dos veces y después desgranado subiendo, y
    `1:D# - 2:F - 3:G` desgranado bajando. Falta el ritmo y las otras cuatro
    líneas: hace falta el enlace del video o más fotogramas.
    **"Dragon Ball GT" (Akihito Tokunaga, arreglo de Thiago Marconato)**: 21
    compases, Do mayor, ♩=120, transcrita de la partitura que pasó Jorge como
    PNG. Va en tres entradas (`dbgt`, `dbgt-2`, `dbgt-full`) con el mismo molde
    que el Himno: `DBGT_P1` + `DBGT_P2` y la completa como `concat`.
    - **La imagen era de 900 px: L = 7,75 px.** El detector de píxeles de más
      arriba está calibrado para escaneos a 300 dpi (L ≈ 20-40) y **aquí se
      queda en ~70% de aciertos** por más que se ajusten los umbrales. No
      insistir: a esta resolución el camino que sirve es **recortar compás por
      compás y leer a ojo**, con las líneas guía dibujadas encima.
    - **Lo que SÍ conviene reutilizar del detector**: (1) las líneas del
      pentagrama, sacadas solo de la línea SUPERIOR de cada pentagrama (las de
      en medio se pierden) más `top + k·L`; (2) las **barras de compás**
      (columna oscura que cruza los dos pentagramas, >93% de alto), que dan los
      cortes exactos para recortar; (3) las **guías diatónicas numeradas**
      (`k = (línea_inferior − y)/(L/2)`, dibujadas y rotuladas sobre el
      recorte): con eso cada cabeza se lee contra su número y no a ojo.
      Ampliar ×9 por compás deja la partitura perfectamente legible.
    - **Verificada por TRES vías independientes**, y las tres cuadran:
      1. Las duraciones dan 4 por compás en los 21 compases.
      2. El bajo da la armonía: las redondas de la izquierda bajan una escala
         entera `Do4 Si3 La3 Sol3 Fa3 Mi3 Re3`, que con la melodía arma
         `Do – Sol/Si – Lam – Sol – Fa – Do/Mi – Rem – Mim-Sol`. Una nota mal
         leída rompería esa bajada.
      3. El clímax (compases 19-20) son **octavas exactas** bajando por grados
         (Do Si La Sol Fa Mi Re): si una cabeza estuviera mal, la relación de
         octava no daría 12 semitonos. Hay pruebas que fijan las tres.
    - **Los compases 9-15 son NOTA POR NOTA los 1-7**, así que la Parte 2
      arranca con la mitad ya sabida (mismo regalo que en el Himno). Diverge en
      el 16, que cierra bajando al Si en vez de quedarse en Re.
    - **Silencios y ligaduras, que `SONGS` no tiene.** El compás 5 abre con un
      silencio de negra: en vez de perderlo (que descuadraría la rejilla de
      compases de la cascada) se **alarga a 2 la última nota del compás 4**.
      El Do de la izquierda de los compases 19-20 está ligado: se toca una vez
      y el compás 20 va con `lh:[]` — que es exactamente lo que hace una
      ligadura. El compás 21 es silencio en la derecha: `rh:[]`.
    - **La partitura no trae digitación, así que es inventada** (como en el
      resto de Fragmentos). La derecha usa dos posiciones —pulgar en Re4 para
      los compases 1-2 y en Do4 desde el 3— porque la melodía abarca una octava
      (La3-La4) y no cabe en cinco dedos; los cambios van con `label`. En el
      clímax, pulgar abajo y meñique arriba, que es como se tocan las octavas
      alternadas.
    - **La izquierda va TODA con el pulgar, y eso NO es pereza.** La primera
      versión le puso una digitación "de posición" (5 en Fa3, 4 en Sol3, 3 en
      La3…) y **estaba mal**: en la mano izquierda el pulgar es el dedo de más
      a la DERECHA, así que poner el meñique sobre la nota abre la mano *hacia
      arriba* y el pulgar cae justo sobre las teclas que la derecha necesita
      (Si3 en el compás 4, La3 en el 5). Las manos se chocaban. Con el pulgar
      sobre la nota, el resto de la izquierda queda hacia abajo y libre. Es
      además trivial de recordar, y cada nota es una redonda con el compás
      entero para reposicionarse. Hay pruebas que fijan las dos cosas: todos
      los `lhF` son 1, y en ningún paso la izquierda queda por encima de la
      derecha. **Regla general**: cuando la izquierda sostiene una sola nota
      justo debajo de la melodía, va con el pulgar.
    - **Segunda fuente: la hoja de virtualpiano.net** ("Mi corazón encantado",
      el opening latino) que encontró Jorge después. Es OTRO arreglo, pero
      sirve como verificación independiente y **confirma la transcripción**:
      su melodía es la misma **exactamente una octava arriba**, y bajada 12
      semitonos coincide nota por nota en los compases 1-4, 6 y 7; el bajo
      coincide en 6 de 7 compases. Solo difieren en dos detalles de arreglo
      (la hoja repite el La del compás 5 y armoniza el 7 con Sib en vez de Re).
      Hay pruebas que guardan esa comparación.
    - **La octava de la melodía está como la escribe la partitura**, no como la
      hoja de virtualpiano. Se comprobó ampliando la clave: es una clave de Sol
      normal, sin el 8, así que la lectura es correcta y el arreglo de
      Marconato de verdad va bajo. Subirla una octava sonaría más brillante y
      separaría más las manos, pero empujaría el clímax hasta Do7, que chilla —
      por eso se dejó como está. Si alguna vez se sube, hay que repensar el
      clímax.
    - **La ESTROFA (`dbgt-3`) sale de esa hoja, no de la partitura**, que es
      solo el tema. Jorge la pidió, así que va como pieza aparte y **no** se
      mete en `dbgt-full`: esa sigue siendo el tema completo de la partitura,
      y mezclar dos arreglos distintos bajo la etiqueta "completo" mentiría.
      13 compases, `DBGT_V`.
      - **Está en DO MENOR**, el paralelo del tema (Do mayor). Eso es lo que
        la verifica: cuando la fuente no es una partitura no se puede usar el
        truco de "el bajo da los acordes", pero **sí** se puede exigir que todo
        caiga en una sola tonalidad. Las 13 barras dan Do menor entero salvo
        **un Reb de paso** — una decodificación mal hecha no aterrizaría en un
        tono. Hay prueba que lo fija.
      - Es la primera parte de esta pieza con **teclas negras en la melodía**
        (Mib, Lab, Sib); el tema es todo blancas salvo dos notas de la
        izquierda. Hay prueba que contrasta las dos cosas.
      - **La hoja no da el ritmo.** Los valores siguen su separación por
        tiempos (`|` = un tiempo, notas sueltas dentro de un tiempo = corcheas)
        y cuadran 4 por compás, pero el `tip` dice que el vaivén se saca de la
        canción — mismo criterio que Aleluya/La Colegiala/All of Me.
        Cuidado: esa regla **no es mecánica**. Probada contra el tema, donde sí
        se conoce la respuesta, falla en el compás 5; sirve como guía de forma,
        no como transcripción rítmica.
      - Digitación: derecha con el pulgar en Fa4 (Fa=1 Sol=2 Lab=3 Sib=4 Do=5),
        con dos movimientos marcados (baja al Mib en el compás 7, sube al Sib
        en el 11). La izquierda con el pulgar, igual que el resto de la pieza.
      - La hoja trae además el **estribillo** (sube a Sol5/Fa5, más movido),
        que quedó fuera: no se pidió y es otro salto de dificultad.
    - Las **dos únicas teclas negras** de la pieza (Lab3 y Sib3, compases 17-18)
      están las dos en la izquierda: la melodía es toda de teclas blancas.
    **"Amanecer" es original, escrita para Jorge** (no es de nadie, no hay
    fuente que verificar). Pedido: alegre, moderna, sencilla, 2-3 partes, con
    subidas y bajadas, izquierda menos activa que la derecha. Decisiones:
    Do mayor y la progresión Do–Sol–Lam–Fa **que ya practica en "Los 4
    acordes"**, para que la pieza refuerce algo conocido; la derecha **no mueve
    la mano ni una vez** (pulgar fijo en Do5, los 5 dedos sobre Do Re Mi Fa
    Sol — hay una prueba que lo fija comparando `rhF` con la posición de la
    tecla); el salto más grande es una 3ª. Las tres partes son pregunta (queda
    en Re, en el aire) / respuesta (cierra en Do) / cierre con más movimiento.
    La izquierda va a una nota por compás salvo en la parte 3, donde entra dos
    veces por compás para empujar. 52 tiempos = 13 compases.
    **Cómo transcribir una partitura en PDF (método que funciona, reutilizable).**
    Con "Bella Ciao" y "Espíritu de Dios" se automatizó lo que en "Dios está
    aquí" se hizo a ojo, y sale mucho mejor:
    1. `pdftoppm -r 300 -png` (si el pentagrama es chico, subir a 480 — el
       detector se calibra solo, ver abajo).
    2. **Líneas del pentagrama**: filas con >60% de píxeles oscuros a lo ancho.
       Salen en grupos de 5; cada par de grupos es un sistema (Sol + Fa).
    3. **Cabezas de nota**: dos pasadas. Las *rellenas* son corridas verticales
       oscuras de largo 0.45L–1.4L (L = separación entre líneas); las *huecas*
       son blancos ENCERRADOS (agujeros) — sin esa segunda pasada se pierden
       todas las blancas y redondas. Todos los umbrales se escalan con L, así
       que el mismo código sirve para cualquier resolución o tamaño de página.
       **Cómo separar el agujero de una cabeza de la basura** (esto costó y no
       hay que re-derivarlo): los falsos positivos NO son los silencios sino
       **el hueco entre dos líneas del pentagrama** cerrado por barras de
       compás — un rectángulo casi perfecto (`fill>0.85`) y de alto ≈ el
       espacio entero (`h/L` 0.84–0.93). Una cabeza nunca pasa de `h/L≈0.80`
       y es elíptica (`fill` 0.45–0.80). Reglas: descartar `h>0.90L`, o
       `fill>0.85 y h>0.80L`, o `h<0.20L`, o `w<0.50h` (astilla vertical del
       silencio de negra). **Hay que filtrar CADA hueco AL RECOLECTARLO, no
       después de agrupar**: si no, el hueco entre líneas se fusiona con la
       cabeza vecina, infla la caja y la cabeza real se pierde.
       *(La regla vieja "la cabeza es más ancha que alta" estaba mal: rechaza
       las REDONDAS, cuyo agujero es más alto que ancho —16×19 en Flaca—. Se
       descubrió porque el bajo de Flaca, que son puras redondas, salía vacío.)*
    4. **Altura → nota**: `k = (línea_inferior − y) / (L/2)` y de ahí la letra.
       Descartar lo que caiga a más de 0.25 de una posición (es basura, no nota).
    5. **Barras de compás**: columna oscura de alto completo **que no sobresale
       por arriba** (si sobresale es la plica de una nota grave) **y que sí baja
       hacia el pentagrama de Fa** (en piano la barra cruza los dos).
    6. Ritmo: eso sí a ojo, pero solo hay que mirar plicas/banderas/barras sobre
       un recorte anotado. **La verificación que vale**: sumar las duraciones y
       comprobar que dan 4 por compás. Las dos piezas nuevas cuadran EXACTO
       (Bella 33.5 tiempos = 36 − 2.5 de silencios; Espíritu 62.5 = 68 − 5.5).
       Si no cuadra, hay una nota mal leída — en Bella el descuadre de 0.5
       destapó un par que parecía de semicorcheas y era de corcheas (lo que se
       veía como doble barra era la barra + una línea del pentagrama).
    7. Segunda verificación gratis: **el bajo tiene que dar los acordes**. En
       Espíritu las redondas de la izquierda salieron Si–Mim–Mim–Re–Re–Do–Do–Si,
       idénticas a los cifrados impresos — eso confirma de una que el mapeo de
       alturas es correcto.
    El script quedó en el scratchpad de esa sesión (no en el repo, es de un solo
    uso), pero con estos pasos se rehace en minutos.
    **"Bella Ciao"** (partitura de itemfunes.com) por fin entró: es la versión
    de melodía simple que faltaba las dos veces anteriores. La menor, casi todo
    en blancas. **Dos posiciones de mano**: pulgar en Mi4 y, desde los tres Mi5
    de "bella ciao", pulgar en Do5; los pasos marcados avisan (mismo patrón que
    Cumpleaños feliz). La izquierda alterna La–Mi y al final baja Mi–Re–Do–Si–La.
    **"Espíritu de Dios"** (Ariel Arnhold, itemfunes.com, ♩=70 del original):
    Mi menor, única negra Fa# más un Re# en la entrada. La izquierda son
    **redondas, una por compás** — de lo más cómodo que hay para empezar a
    coordinar manos. El original repite cada mitad; aquí va de corrido una vez
    porque `SONGS` no tiene repeticiones, y los `label` marcan dónde empieza
    cada frase y dónde estaba el "vuelve al principio".
    **"Dios está aquí" pasó por TRES versiones. La de hoy sale de una hoja
    guía con cifrados y es la buena.** El recorrido importa porque deja dos
    lecciones:
    1. Primero se transcribió del PDF de la partitura (método de píxeles). Las
       alturas quedaron bien; el ritmo de 2-3 compases no se pudo cerrar al
       100% (puntillos dobles, semicorcheas agrupadas) y se avisó.
    2. Después Jorge pidió **reemplazarla por la salida cruda de `basic-pitch`**
       sobre el audio de un video, contra la recomendación. Se le midieron las
       pegas antes de cambiarla y decidió igual, así que se puso tal cual.
       **Volvió con "no se escucha nada bien"**, que era exactamente lo
       previsto. Lo que traía, medido, por si alguna vez se vuelve a proponer
       una transcripción automática: la voz superior saltaba
       `Si5 Re4 Re6 La5 Re4 Si5…` (el detector confunde el fundamental con sus
       armónicos), `Re4` aparecía en el 49% de los 160 pasos, 38 pasos con 4+
       notas simultáneas (hasta 6), 17 racimos a ≤2 semitonos en la misma mano,
       notas hasta Mi6, y **96,5 tiempos**, que no divide entre 4 (las líneas de
       compás de la cascada se corrían). **Moraleja: `basic-pitch` sobre una
       grabación con acompañamiento no da una melodía; da armónicos.**
    3. Entonces Jorge pasó **cuatro fotos de una hoja guía**: melodía en clave
       de Sol, letra debajo y **los cifrados impresos encima de cada compás**
       (Do, Sol, Lam, Fa, Do7). Esa es la versión actual.
    Lo que hace especial a esa fuente: **los cifrados vuelven la mano izquierda
    un dato, no un invento.** En las piezas de oído/tutorial la izquierda se
    añade a ojo; aquí se lee. Cómo se transcribió y cómo se verificó:
    - El detector estándar (ver el método más abajo) funciona bien aquí
      (L = 16 px), con **dos fallos conocidos**: las cabezas HUECAS atravesadas
      por una línea adicional (el Do4 con línea adicional, que es justo el final
      de cada frase) se pierden, porque la línea parte el agujero en dos trozos
      de alto < 0.30 L; y los huecos encerrados de la **letra** (las `o`, `a`,
      `e`) entran como cabezas. Los dos se resuelven acotando `k` al rango
      melódico real (aquí −4..9) y leyendo a ojo las pocas huecas perdidas.
    - **Verificación extra que esta hoja regala: la x del cifrado.** Cada
      cifrado se imprime **9 px a la izquierda de la cabeza de su nota**, sin
      una sola excepción en los 24 cifrados. Eso convierte "¿en qué tiempo entra
      este acorde?" en una medición en vez de una interpretación — y de paso
      confirma la lectura de compases, porque el cifrado y la nota tienen que
      caer en el mismo compás. Así salió que el compás 6 lleva **tres** acordes
      (Do en el 1, Sol en el 2, Lam en el 3), que a ojo no se habría visto.
    - Las tres verificaciones de siempre cuadran: duraciones = 4 por compás en
      los 17 compases; cada entrada del bajo cae sobre una nota de su acorde
      (21 de 22; la excepción es el Mi sobre Sol del compás 7, que la hoja
      escribe así); y la melodía es **toda de teclas blancas**, coherente con la
      armadura vacía.
    - **La izquierda: una nota grave por cifrado**, la fundamental. Jorge pidió
      hace tiempo quitar los acordes de Estrellita porque todavía no los domina,
      así que aquí tampoco. Las cuatro notas (Fa2, Sol2, La2, Do3) **caben bajo
      una sola posición** — Fa2(5) Sol2(4) La2(3) Do3(1) — así que la izquierda
      no se mueve en toda la pieza; hay prueba que lo fija.
    - **La derecha tiene dos posiciones y una sola mudanza.** La melodía abarca
      una 7ª (Si3–La4), así que cinco dedos no alcanzan. La solución no fue ir
      saltando: en la estrofa el **pulgar vive en Re4** (Re=1 Mi=2 Fa=3 Sol=4
      La=5) y **baja un paso al Do4 cuando hace falta** — el Do sigue siendo el
      pulgar, solo se desliza. Con eso la estrofa entera se toca sin mover la
      mano. En "me puedes oír" (compás 7) la melodía baja al Si3 y la mano se
      muda de una vez al **pulgar en Si3** (Si=1 Do=2 Re=3 Mi=4), donde **todo
      el coro cabe** y ya no se mueve más. Un `label` marca esa mudanza.
      *Probado también el camino obvio y descartado*: pulgar fijo en Do4 y el
      La4 con el meñique estirado obliga a tocar La4 y Sol4 con el mismo dedo 5,
      y en los compases 3 y 5 van seguidos.
    - **Lo que se pierde y hay que saber**: la hoja trae `‖:` con casillas 1 y 2,
      y `SONGS` no tiene repeticiones, así que va de corrido — se toca la
      estrofa una vez y entra por la casilla 2 directo al coro (16 compases de
      los 17). Los silencios se absorben alargando la nota anterior (convención
      de `SONGS`, mantiene la rejilla de compases de la cascada): en la práctica
      hay que **dejar la tecla pisada** en vez de levantarla. Y el `Do7` del
      compás 4 se toca como Do a secas, porque el Sib que lo distingue está en
      el acorde y acordes todavía no.
    - **Once `label`**: ocho anclas de frase (el pedido original era
      "aprenderla por partes"), la mudanza de mano, el punto donde la hoja
      repetía y el `Fin`.
    **La versión de la partitura y la de `basic-pitch` están las dos en el
    historial de git** — si hay que volver a alguna, se recupera de ahí, no se
    re-transcribe.
  - **Coordinación: `COORD_DRILLS` (grupo `manos`, `coord:true`).** El punto
    ciego que destapó Jorge al decir que las dos manos son su talón de Aquiles:
    **todo lo que la app llamaba "ambas manos" hasta ahora hace lo MISMO con las
    dos a la vez.** Las escalas van en paralelo y `materializeAgilitySteps`
    duplicaba el mismo `deg` en las dos manos con la digitación espejada. Eso es
    lo más fácil que existe a dos manos y, sobre todo, **no es lo que se traba en
    las piezas**: ahí la izquierda sostiene una nota larga mientras la derecha se
    mueve, o entra en otro tiempo. Agregar más ejercicios al unísono habría
    parecido progreso sin arreglar nada.
    - Seis ejercicios, numerados en el nombre (`1 ·` … `6 ·`) porque **el orden
      es la escalera**: espejo (las dos a la vez con el mismo dedo, en
      direcciones opuestas — el más fácil, no hay dos dedos que pensar) →
      alternadas (nunca coinciden) → **la izquierda sostiene** (la textura de
      "Dios está aquí", "Espíritu de Dios" y "Dragon Ball GT": una nota grave
      pisada los cuatro tiempos) → la izquierda en 1 y 3 (tiene que volver a
      entrar con la derecha en marcha) → dos por una → contratiempo.
    - **Formato nuevo, el viejo intacto.** `coord:true` y cada paso lleva `l`/`r`
      (grado de cada mano) y `lf`/`rf` (dedo). Una mano **sin grado** en un paso
      no vuelve a pulsar: sigue pisada — la misma convención de ligadura que usa
      `SONGS`, así que el motor no necesitó cambios. **Ojo: el grado 0 (el Do) es
      falsy**, así que se compara contra `undefined`, nunca con `if(p.l)`; hay
      prueba que lo fija.
    - **La octava se valida por mano** (`shapeDegs(shape, hand)` +
      `shapeOctaveValid(oct, shape, hand)`): en el espejo la izquierda usa grados
      **negativos** (baja del Do3 hasta Fa2), así que el rango de una mano no
      sirve para la otra.
    - **Posición de la izquierda**: en el espejo el **pulgar** va en Do3 y la
      mano baja (Do=1 Si=2 La=3 Sol=4 Fa=5, o sea las dos manos con el mismo
      dedo, que es lo que lo hace fácil); en los otros cinco es la posición
      normal, meñique en Do3 (Do=5 Re=4 Mi=3 Fa=2 Sol=1). Dentro de cada
      ejercicio cada tecla lleva **siempre** el mismo dedo (hay prueba): la mano
      no se mueve, o habría que marcarlo.
    - Todos en teclas blancas y cuadrando en compases de 4, porque la cascada
      dibuja la rejilla de compases y **es ahí donde estos ejercicios sirven**:
      paso a paso solo se aprende el orden de las teclas y el ritmo ES el
      ejercicio. El tip del 6 lo dice explícitamente.
    - **El plan de "Hoy" sube la escalera**: mientras quede un peldaño de
      coordinación sin estrenar, el calentamiento es ese y **en orden**, no el
      "menos practicado" (el 6 no tiene sentido antes del 1). Cuando ya pasó por
      los seis vuelve la rotación normal entre los catorce.
    - **Modo al azar y niveles (`agilRandom`, `agilLevel`, los dos
      persistidos).** Jorge: "está muy lineal, las canciones van saltando de
      teclas". Es el límite de cualquier patrón fijo: a la tercera vuelta la
      mano lo hace sola y ya no se entrena la coordinación, se entrena la
      memoria. **Lo que NO se puede hacer es barajar los pasos**: el esqueleto
      —quién pulsa en qué tiempo— ES el ejercicio, y reordenarlo mata "la
      izquierda sostiene". `randomCoordPattern(shape, nivel)` conserva el ritmo
      y el reparto de manos **exactos** y sortea solo las NOTAS dentro de la
      posición de cinco dedos; hay prueba que compara los dos sorteos y exige
      que el ritmo sea idéntico.
      - **El dedo sale del grado** (`RND_RH[i] → dedo i+1`, `RND_LH[i] → 5-i`),
        que es una biyección: la regla de "cada tecla siempre el mismo dedo" se
        cumple sola con notas sorteadas. Probado sobre 40 sorteos.
      - **El espejo no sortea la izquierda**: vive de que las dos manos usen el
        MISMO dedo, así que la izquierda sigue a la derecha hacia el otro lado
        (`RND_LH_MIRROR`). Hay prueba de que `lf === rf` siempre.
      - **`RND_LEVELS` mueve dos perillas**: cuánto puede saltar la derecha de
        una nota a la siguiente (`rhStep` 1/2/4/4) y entre cuántas notas graves
        elige la izquierda (`lhPool`). Empezar por grados vecinos es lo que hace
        que el nivel 1 sea de verdad un nivel 1: **el salto es lo que
        descoordina, no la nota**.
      - **Solo aplica a los de coordinación** (`agilRandomOn()` mira
        `currentDrillShape.coord`): sortear "Posición de 5 dedos" o "Notas
        repetidas" destruiría el ejercicio, que es justamente una figura fija.
        La barra entera se esconde en el grupo Dedos.
      - **El sorteo es por VUELTA, no por paso**: se hace en
        `rebuildAgilityFragment()`. Dentro de una vuelta el ejercicio tiene que
        quedarse quieto o "Escuchar" y la cascada tocarían otra cosa. Cada
        vuelta nueva trae sorteo nuevo (`onAgilityRoundDone`), y `🎲 Otro
        sorteo` lo fuerza a mano.
      - **Las etiquetas se regeneran.** Las originales nombran dedos y notas
        fijas ("3 y 3", "Cambia la izquierda (Sol)") y al azar mentirían; se
        reemplazan por lo único que sigue siendo cierto en cualquier sorteo:
        quién pulsa en ese paso. El `tip` también avisa y dice que las notas
        fijas que menciona ya no aplican.
      - **Sube de nivel solo con DOS vueltas limpias seguidas**
        (`AGIL_LEVEL_UP`), no con dos vueltas a secas: terminar una vuelta
        siempre se puede si se va despacio, así que la vuelta sola no acredita
        nada — lo que acredita es terminarla sin equivocarse. Nunca baja solo;
        el selector de nivel está a la vista para bajarlo a mano.
    - **Notas equivocadas (`fragMistakes`).** Hacía falta para lo de arriba y no
      existía: una nota mal tocada simplemente no avanzaba y no dejaba rastro.
      `checkFragment(note)` ahora recibe la nota y cuenta las que no están en el
      paso. **Se perdonan las del paso recién acertado** (`fragJustPlayed`):
      entre acertar y dibujar el paso siguiente hay 450 ms y una tecla que venía
      sonando no es un error. Sirve para todos los fragmentos, no solo para los
      ejercicios: el mensaje de fin de pieza ahora dice si salió limpia.
  - **`▶ Escuchar` se puede cortar (`stopFragmentPlayback`).** El mismo botón
    hace las dos cosas: mientras suena dice `■ Detener` (con `.busy`) y volver a
    tocarlo corta. Antes no había salida: una pieza son medio minuto y había que
    esperarla entera para hacer cualquier otra cosa. Dos piezas del mecanismo:
    `playbackToken` (se incrementa al empezar y al cortar; la pasada compara su
    token con el vigente y se sale) y `playbackSleep`/`playbackWake`, que
    **despierta la espera del paso en curso** — sin eso el corte tardaría lo que
    dure la nota que esté sonando, y una redonda a 80 BPM son 3 segundos. El
    `break` del bucle va **después** de soltar las notas del paso, o cortar
    dejaría la tecla sonando y encendida. `startFragmentStep()` llama a
    `stopFragmentPlayback()` de entrada, así que cambiar de pieza, de mano o de
    categoría también corta (antes seguía sonando la anterior encima de la
    nueva); la propia limpieza de `playFragment` llega ahí con `isPlayingBack`
    ya en `false`, así que no se muerde la cola. `enterMode` lo llama también,
    para salir de la práctica. **`playbackToken`/`playbackWake` se declaran
    arriba, junto a `isPlayingBack`**, no al lado de `playFragment`: los usa
    `startFragmentStep`, que corre mucho antes (mismo riesgo de zona muerta
    temporal que tuvo `audioFallback`).
  - **`▶ Escuchar` SOSTIENE la nota de la izquierda mientras la derecha sigue.**
    Una nota grave que dura varios pasos se escribe UNA vez y los pasos
    siguientes van con `lh:[]` (así se escribe una ligadura en `SONGS`).
    `playFragment` soltaba las notas del paso al terminar SU paso, así que el
    bajo de una redonda sonaba lo que dura la primera semicorchea de la derecha
    y la pieza se oía sin fondo. Ahora `heldLh` guarda lo que la izquierda tiene
    pisado y solo se suelta cuando la izquierda vuelve a cambiar (o al terminar
    la pasada, también si se cortó). La derecha sí se suelta paso a paso, salvo
    que la misma nota esté sostenida por la izquierda. Afecta a **todas** las
    piezas con bajo largo (Dragon Ball GT, Espíritu de Dios, Dios está aquí);
    hay prueba que fija el orden exacto de encendidos y apagados.
  - **La cascada también lo dibuja** (ver la sección Cascada): era la única
    práctica que marca tecla sin decir el dedo.
  - **Intervalos y Lectura quedan fuera a propósito.** Intervalos no tiene mano
    fija (`currentHand` no existe ahí): forzar un dedo inventaría una restricción
    que hoy no tiene el ejercicio. Lectura **nunca** marca la tecla objetivo — es
    a propósito (sight-reading, ver más abajo) — así que no hay tecla sobre la
    cual dibujar un número.
- **Categorías de Fragmentos** (`cat` en cada pieza + `SONG_CATS`): con 20
  piezas la fila de sub-pestañas era un scroll horizontal larguísimo donde no
  se encontraba nada. Ahora hay una barra `#fragCatBar` (mismo vocabulario que
  el resto: `.reg-bar` > `.reg-group` > `.reg-picker` en malva `g-type`) que
  filtra la lista. Grupos: `facil | popular | cristiana | clasica | patrones`,
  más `all`. Cosas que dependen de esto:
  - **Agilidad tiene su propia barra** (`#agilGroupBar`, `agilGroup`), no la de
    piezas: `Dedos | Manos juntas` (ver la sección de coordinación). Antes no se
    filtraba porque eran pocos; con los seis de coordinación son catorce y los
    nuevos quedaban escondidos al final del scroll horizontal, que es justo lo
    que Jorge dijo que más le falta. `pickFragmentById()` abre también el grupo
    del ejercicio, por el mismo fallo silencioso que ya tuvo Fragmentos.
  - **`pickFragmentById()` abre la categoría de la pieza antes de buscar el
    botón.** El plan de "Hoy" manda a una pieza concreta; si el filtro vigente
    la escondía, el botón no existía y el enlace de Hoy no hacía NADA (fallo
    silencioso). Hay prueba.
  - `renderSubTabs()` marca la activa comparando con `currentFragment.id`, no
    con `i===0`: al cambiar de categoría la lista se redibuja y la pieza que
    suena puede no ser la primera.
  - Una categoría sin piezas no se dibuja, y `visibleFragments()` cae a la
    lista completa si el filtro quedara vacío: nunca una lista en blanco.
  - La elección se recuerda (`fragCat` en localStorage) y se valida contra
    `SONG_CATS` al cargar, por si algún día se renombra una categoría.
  - **En pantalla angosta la etiqueta va ARRIBA de los botones**
    (`@media max-width:760px`, solo dentro de `#fragCatBar`): con la etiqueta
    al lado, los botones quedaban en una columna estrecha y la fila se partía
    en tres (138 px de alto en 390 px de ancho; así son 94). Medido con
    Chromium, que es lo único que mide diseño — jsdom no.
- **P-45**: el manual numera las octavas una posición abajo (su C3 = C4/Do central);
  `manualToMidi()` hace esa conversión. Mapa extraído del PDF, no adivinar.

## Cascada (`cascadeMode`)
- **`wait` (por defecto, persistido):** el reloj virtual `cascade.t` no puede pasar
  de `cascadeFrontier()` (la nota pendiente más cercana). Se congela en la línea
  hasta que suene la nota correcta. No hay "fallos", solo `wrong` (equivocadas).
- **`timed`:** el reloj avanza siempre; una nota sin tocar pasada la tolerancia
  cuenta como `missed`. Es el examen.
- Reloj propio (`cascade.t += dt`, dt tope 100 ms) en vez de `now - startTime`:
  así se puede congelar, y los tests llaman `cascadeTick(now)` a mano.
- Cada evento lleva `hand` (`lh|rh`); `cascadeHandNotes(step)` respeta el filtro
  de mano. Colores: azul izquierda, dorado derecha (`.fall-note.lh/.rh`,
  `.fall-key.lit-lh`).
- **Número de dedo (`f` en `cascadeHandNotes`, `finger` en el evento).** Jorge
  reportó que se perdía: la cascada era la única práctica que marca tecla y no
  lo mostraba. Va en **dos sitios a propósito**, porque sirven para cosas
  distintas: `.fall-finger` sobre el bloque que cae (se lee por adelantado,
  mientras baja) y `.fall-key-finger` sobre la tecla del mini-teclado al
  encenderse (que es donde ya lo lee en el teclado grande, y no depende del
  alto del bloque). El del bloque se esconde si el bloque mide menos de 13 px
  —notas muy rápidas— y se **fija a `FALL_H - 7`** en vez de centrarse cuando
  el bloque ya cruzó la línea: si no, en una nota larga el número se iba por
  debajo del teclado. Los `<text>` del bloque se crean en `startCascade` y hay
  que **borrarlos junto con su `rect`** (mismo `if` de limpieza) o quedan
  flotando; `startCascade` también los barre con `.fall-finger` al reiniciar.
  `setCascadeKeyLit(note, on, hand, finger)` pone y quita el de la tecla, y
  `clearAllCascadeLights` lo vacía.
- **`FALL_KBH` pasó de 52 a 64 por esto.** Con 52, el número de la tecla blanca
  caía dentro de la franja que tapan las teclas negras (`FALL_FBKH = 30`) y se
  veía espachurrado entre dos negras. Con 64 hay tres bandas limpias: negras
  arriba, dedo en medio, nombre de la nota abajo. Medido en Chromium: el SVG
  pasa de 394 a 411 px de alto y no desborda ni a 390 px de ancho.
- `beats[]`: líneas de pulso (las de compás más marcadas, `BEATS_PER_BAR=4`) y
  clics de metrónomo al cruzar cada pulso (`cascadeClicks`). Cuenta de entrada de
  `COUNT_IN_BEATS=4` pulsos dibujada en `.count-in`.
- Tramo: `cascadeFrom/cascadeTo` (pasos 1-based) + `cascadeLoop`. Los `<select>`
  se rellenan en `refreshCascadeRange()`; el rango se resetea al cambiar de pieza.
- Al abrir la cascada se **esconde el teclado grande** (`#keyboardWrap`) para que
  haya un solo teclado; el mini-teclado se puede tocar con el mouse. Encender y
  apagar pasa SIEMPRE por `openCascade()` / `closeCascade()`, y `enterMode`
  llama a `closeCascade()` al salir de fragmentos/agilidad. Antes apagaba la
  cascada a mano sin devolver el teclado y este quedaba oculto en el resto de
  las prácticas. **No apagar la cascada por fuera de `closeCascade()`.**
- Progreso: `recordCascadeResult(pct, mode)` guarda `best` (a tempo) y `bestWait`
  (espera) por separado.

## Metrónomo
Web Audio con programación por adelantado (`metroScheduler` cada 25 ms, 120 ms de
lookahead). `metroOffsetMs(tPerf)` devuelve el desfase en ms al pulso más cercano
(negativo = adelantado). Escalas "Con metrónomo" clasifican cada nota:
`ok` ≤90 ms, `early/late` hasta 250 ms, `miss` más allá. BPM persiste en localStorage.
**Caja del encabezado simplificada a propósito:** etiqueta `Metrónomo` visible (antes
era solo íconos sin nombre, no se entendía qué era esa fila) + ▶/■ + puntito + – 80
BPM +. **Se quitó el selector de compás** (`4/4 3/4 2/4`): para alguien sin
conocimiento previo una fracción así no dice nada, y solo cambiaba en qué pulso cae
el acento del clic — nada más dependía de él (la cascada usa su propio
`BEATS_PER_BAR=4` fijo, no `metro.meter`). `metro.meter` queda fijo en 4 en el código
en vez de configurable; si algún día hace falta compás real, que sea una opción
explicada, no una fracción suelta en el encabezado sticky.

## Progreso (localStorage `pianoProgress1`)
```
{ v:1, days:{ 'YYYY-MM-DD': {sec, notes, scales, chords, intervals, ear, reading, drills, songs, cascade} },
  scales:{ 'cmajor:rh': {runs, clean, best2, bestTiming, lastDay} }, chords:{ 'C': {runs, inv, lastDay} },
  intervals:{ idx:{runs,lastDay} }, ear:{ idx:{asked,right,lastDay} }, reading:{ levelId:{attempts,first,sumMs,lastDay} },
  drills:{ id:{runs,lastDay} }, songs:{ id:{runs,lastDay} }, cascade:{ id:{runs,best,lastDay} } }
```
- Tiempo de práctica: cada 15 s se suman 15 s si hubo actividad (nota o clic) en el
  último minuto. Un día cuenta como practicado con ≥3 min (racha).
- Plan de "Hoy" (`buildTodayPlan`): **dos bloques a propósito**, marcados con
  `block` y rotulados en pantalla (`.today-block`, `BLOCK_LABELS`).
  `core` = **escalas e intervalos**, que es lo que pidió el profesor de Jorge:
  se lleva los minutos (17 de 30) y es lo que abre el paso siguiente.
  `keep` = lectura, acordes y pieza, más cortos. **No se borran por estar fuera
  del foco**: la lectura sobre todo muere si se deja (a los dos meses no sabe
  leer y cada pieza nueva vuelve a ser memorizar de oído) y cuesta 3 minutos
  mantenerla — foco no es abandono. El calentamiento (`warm`) va primero porque
  va primero en el piano, no por prioridad.
  Detalle de los puntos: escala del día (**mientras la pentatónica de la clase no
  esté dominada manda ella**, que es la tarea; después sigue la progresión de
  mayores donde iba. Sugiere la mano más floja por `scaleMastery`; con las dos
  dominadas propone ambas manos, y el subtítulo dice en qué paso va y cuál es la
  meta de BPM), intervalos exactos y oído **por nivel** de `INTERVAL_STAGES`,
  nivel de lectura vigente, 3 acordes menos practicados (grupo C G F Am Em Dm
  hasta dominarlo), pieza menos hecha.
  **El `go` del paso 2 deja el metrónomo listo** en el BPM de la meta y enciende
  `⏱ Con metrónomo`: si hay que ir a buscarlo a mano, no se usa.
- Exportar/importar JSON desde la pestaña Progreso. **Importar FUSIONA, no pisa**
  (`mergeProgress(progress, p)`, la misma fusión por máximos de la nube). Antes
  hacía `Object.assign(emptyProgress(), p)`: traer el respaldo del otro
  computador borraba lo practicado en este, que es justo el caso de uso. Como la
  fusión es idempotente, importar el mismo archivo dos veces da igual que una.
  Hay una prueba que mete un `File` en el `<input>` y comprueba que lo local
  sobrevive. **Dentro del visor de artifacts un `<a download>` no hace nada** (el visor bloquea descargas): el
  botón intenta primero `claude.use('downloads')` y solo cae al `<a>` fuera del
  visor. Si la capacidad existe pero la descarga se rechaza, NO se cae al `<a>`:
  no arreglaría nada.

### Respaldo automático (`initCloudBackup`, capacidad `db`)
El progreso vivía solo en localStorage y el botón de exportar no funcionaba en
el artifact: limpiar los datos del navegador borraba meses. Si hay
`window.claude`, el mismo objeto `progress` se guarda en `backup/progress` y se
fusiona al abrir; **todo va detrás de guardas**, así que el archivo suelto y
cualquier otro navegador funcionan igual que antes (`cloudState: 'off'`).
- **`mergeProgress` fusiona por MÁXIMO campo a campo, nunca sumando.** Todo el
  esquema son contadores que solo suben o un `lastDay` `'YYYY-MM-DD'` (compara
  bien como texto). Sumar inflaría: sincronizar dos veces lo mismo contaría
  doble. **La fusión tiene que ser idempotente y hay pruebas que lo fijan** —
  un campo nuevo que no sea "máximo" (un promedio, un último valor) rompe eso y
  necesita su propio caso.
- Solo se leen las secciones conocidas (`PROGRESS_SECTIONS` + `days`): lo que
  venga de más en el documento remoto se ignora, y un `v` distinto de 1 se
  descarta entero en vez de pisar el progreso.
- `cloudSave()` tiene 4 s de espera: `saveProgress()` se dispara casi por nota.
- El panel de Progreso dice dónde está guardado (`#cloudState`). No es adorno:
  si Jorge no ve que está respaldado, para el caso no lo está.
- Declarar `db` vuelve el artifact **interno de la organización** (ya no se
  puede compartir públicamente) y el documento es compartido entre viewers, no
  privado por persona: `data/users/{self}` necesitaría la capacidad `user`, que
  esta cuenta no tiene.

## Otras preferencias persistidas
`kbZoom2`, `labelStyle`, `labelsShown` (ahora sí se recuerda; por defecto visible),
`fragCat` (categoría de Fragmentos), `agilGroup` (Dedos / Manos juntas),
`agilRandom` / `agilLevel` (notas al azar y nivel en los ejercicios de coordinación),
`chordReps` (repeticiones de acordes), `chordGroup` (qué acordes: básicos / demás / todos),
`audioFallback` (sonido alternativo, ver más abajo),
`solfaShown`, `cascadeSpeed`, `scaleOpts` (mano/octavas/sentido/dedos/variante menor),
`metroBpm`, `readingLevel`, `handsShown`, `soundTarget`.

## Diseño (jerarquía deliberada)
Regla que manda: el 90% del tiempo Jorge mira **una sola cosa** — qué tecla toca
ahora — desde ~1 m y con las manos en el piano. Todo lo demás es secundario.
- **Encabezado** = barra de herramientas de una fila (identidad + estado MIDI +
  metrónomo + tiempo de hoy). El panel de conexión vive **dentro** del encabezado.
  No volver a poner un hero decorativo alto: costaba 150 px y no informaba nada.
- **Encabezado `position:sticky`**: el metrónomo y el tiempo de hoy no se van al
  hacer scroll. Jorge lo pidió porque la cinta de práctica se los tapaba.
- **`.practice-info.stage`** es el elemento dominante pero **compacto** (~95 px):
  grid de dos columnas, nota grande a la izquierda (`clamp(34px,4.2vw,56px)`),
  a su lado progreso + puntos, texto de mano/dedos y retroalimentación; mini
  pentagramas al lado. No volver a apilar todo en vertical: medía el doble.
- **Estados de botón, con vocabulario separado.** `.active` = interruptor
  encendido (y solo eso). `.busy` = está trabajando AHORA (🔊 Escuchar mientras
  suena, 900 ms, con el texto en "♪ Sonando…"): sin esto el botón no cambiaba un
  pixel y con el volumen bajo parecía roto. `.used` = ya se gastó en esta ronda
  (💡 Pista de lectura, se limpia en `nextReadingNote`). `:disabled` se ve al 40%
  y el hover no lo enciende: un botón agotado (la última pista ya dada) tiene que
  leerse apagado. **Todo botón de acción debe acusar recibo de alguna forma.**
- **Botones interruptor** (`.ghost-btn.active`): relleno dorado tenue + borde
  dorado + punto. Hover es solo un gris leve (antes hover = encendido y no se
  distinguía). Los botones de **acción** (Empezar, Escuchar de nuevo) usan
  `.ghost-btn.primary`, nunca `active`.
- Dos `MutationObserver` adaptan el escenario sin tocar los modos:
  `progressText` ("Nota 3 / 15") se convierte en puntos (`#stepDots`), y
  `targetNoteLabel` se achica solo (`.sm` >12 chars, `.xs` >22) porque algunos
  modos escriben frases ahí. **Modo nuevo no necesita hacer nada para esto.**
- **`.reg-btn.disabled` ya no responde al clic** (`bindPicker` lo ignora). Se veía
  apagado y con cursor de "no", pero aplicaba la opción igual y quedaba apagado Y
  activo a la vez. Cualquier opción que se deshabilite depende de esto.
- **Controles segmentados**: `.reg-bar .reg-picker` y `.hand-picker` son un solo
  bloque con segmentos, no botones sueltos. Los pickers largos (`#chordPicker`,
  `#intervalPicker`, `#funcCatPicker`) quedan fuera a propósito: son listas.
- **Color con significado**: brass = "dónde estoy" (pestaña principal) y "qué toco
  ahora" (escenario). Sub-pestañas activas en **marfil**. Cada grupo de opciones
  tiene su tono apagado, marcado con un punto en la etiqueta (`.reg-label.g-*`):
  mano (`g-hand`: izquierda `--lh` azul, derecha `--rh` dorado, ambas mitad/mitad),
  octava (`g-oct` marfil), sentido (`g-dir` `--sage`), tipo/posición (`g-type`
  `--mauve`). El par mano izquierda/derecha se usa igual en teclas, números de
  dedo, etiquetas `IZQ/DER`, pentagrama y cascada. Nada saturado: Jorge pidió
  sobriedad.
- **Acordes en el pentagrama** (`renderStaff(..., {stack:true})`): las notas van
  en la misma vertical en vez de una tras otra, con **un solo palo** para todas
  (uno por cabeza se ve como una reja) y las segundas corridas a un lado, como se
  escribe de verdad. Lo usa el modo En bloque; sin `stack` el comportamiento es
  el de siempre (notas en fila), que es lo que necesita Lectura.
- **Pentagrama en escalas**: con ambas manos son **dos** pentagramas lado a lado
  (`#miniStaff` = izquierda en clave de Fa, `#miniStaff2` = derecha en clave de
  Sol), cada uno con etiqueta de mano. Apilados no se leían.
- **Mapa de calor**: verde por minutos, rojo apagado (`.heat-cell.missed`) los
  días pasados sin práctica; hoy solo se contornea.
- **Izquierda antes que derecha, siempre.** Selectores de mano (`lh, rh, both`),
  octavas de Agilidad, etiquetas `IZQ/DER`, digitación del consejo de escala,
  pentagramas y texto de los ejercicios: todo se lee en el orden en que se ve el
  teclado. `buildScaleRun` genera `rh` primero por comodidad de cálculo, así que
  lo que se MUESTRA pasa por `leftFirst(notes)`. Hay pruebas que lo fijan.
- **`.reg-group`** envuelve cada etiqueta con su selector dentro de una
  `.reg-bar`. Sin eso, al ajustarse la fila el título se quedaba solo al final y
  sus botones saltaban a la siguiente línea. Un par nuevo va envuelto igual.
  El grupo **sí puede encogerse** (`flex:0 1 auto; min-width:0`) y la etiqueta
  **no** (`flex:0 0 auto`): así lo que se parte es la fila de botones *dentro*
  del bloque segmentado y el título sigue pegado a los suyos. Con el grupo
  rígido, "Ascendente y descendente" sacaba la página entera de la pantalla en
  el teléfono (390 px: 576 px de ancho). jsdom no mide diseño, así que **esto no
  lo cubre ninguna prueba**: al tocar etiquetas largas, medir con Chromium
  `scrollWidth` vs `clientWidth` del `documentElement`.
- **Guía de dedos** (`buildHandSvg(side)` + `#handsBar`): dos manos vistas desde
  arriba, en la misma posición en que Jorge ve las suyas, con los pulgares (1)
  mirándose en el centro. Silueta de una pieza: los rectángulos van dentro de un
  `<g class="hand-body">` con opacidad **de grupo**, si no los solapes se
  oscurecen y se ven tubos sueltos. Vive plegada encima del piano (mismo patrón
  que `C = Do ?`, persiste en `handsShown`): cerrada no ocupa nada y se abre
  justo donde están los números dibujados en las teclas.
- Si se toca tipografía: **subir tamaños, nunca bajarlos** (Jorge es corto de vista).

## Conexión MIDI
`renderConnection()` es el único sitio que pinta el estado. El nombre del piano
se muestra **una sola vez**, en el distintivo del encabezado (`#deviceBadge`, en
verde con `.live`). Antes salía tres veces a la vez — distintivo, texto de estado
y opción del selector — y parecía que hubiera tres pianos. Reglas:
- Conectado: se ocultan `#statusText` y `#connectBtn`; con un solo puerto se
  oculta también toda la caja `#connectionPanel`.
- `#deviceSelect` solo aparece si hay **más de un** puerto. Si varios comparten
  nombre (algunos pianos publican 2-3), se numeran `Nombre · 1`, `· 2`, `· 3`.
- Al reconectar (`onstatechange`) se respeta el puerto ya enganchado si sigue
  presente; si desaparecen todos, se suelta `currentInput` y vuelve el botón.

**El MIDI no funciona dentro del artifact de Claude (ni de ningún iframe).**
El permiso de Web MIDI lo delega la página que envuelve al iframe, y esta app
no la controla — no es un bug que se arregle editando el HTML. `inEmbeddedFrame`
(`window.self !== window.top`) lo detecta al cargar; si `requestMIDIAccess()`
es rechazado estando embebido, `#statusText` dice **"MIDI bloqueado aquí"** en
vez del genérico "Acceso MIDI denegado", con un `title` que explica por qué y
manda a abrir `piano-midi-trainer.html` directo en el navegador. Para conectar
el Yamaha por USB de verdad, Jorge tiene que usar el archivo suelto (o una
copia servida fuera de un iframe) — el artifact sirve para practicar sin el
piano (clic/touch) y para el respaldo de progreso, no para tocar por MIDI.

## Sonido: sale por el piano, no por el computador
El P-45 trae sus propios samples de Yamaha, así que con el piano conectado todo
lo que toca la APP (Escuchar, el oído, los clics en el teclado dibujado) se le
manda por **MIDI out** en vez de sintetizarlo. Es el mejor sonido posible y no
cuesta descargas: el sintetizador Web Audio queda solo para practicar sin piano.
- `usingPiano()` manda: `playNoteSound(note, vel)` sale por `midiNoteOn()` y
  `stopNoteSound()` cierra por el mismo camino (`midiSounding` recuerda cuáles
  salieron por MIDI, así un cambio de ruta a media nota no deja nada colgado).
- **Las notas que toca Jorge (`src:'midi'`) NO se reenvían.** Sonarían dos veces.
- `pickMidiOut()` empareja la salida con la entrada conectada: nombre exacto,
  luego primera palabra, luego la primera de la lista. `refreshMidiOut()` se
  llama en cada `onstatechange`, **después** de decidir la entrada.
- `allNotesOff()` es la red de seguridad contra notas colgadas en el piano
  (note-off de lo pendiente + CC 123). Se llama al cambiar de práctica, al
  cerrar la cascada, al terminar "Escuchar", al apagar el sonido, al cambiar de
  ruta y en `beforeunload`. **Cualquier reproducción nueva debe llamarlo al
  terminar o el piano se queda sonando solo.**
- `#soundOutBtn` solo aparece si hay salida; la elección persiste en
  `soundTarget`. El metrónomo sigue sonando por el computador a propósito.

### `ensureAudioCtx` desbloquea de verdad en iOS, no solo con `resume()`
Reportado: en iPhone (Safari y Chrome — ahí comparten motor WebKit, así que
si falla en los dos es del motor, no del navegador) el toque se registraba
bien (`noteOn` corría, "Sonando: X" salía en pantalla) pero no sonaba nada.
**`audioCtx.resume()` no es suficiente la primera vez en WebKit**: puede
reportar `state:'running'` y aun así la nota agendada no suena — el
navegador exige que se toque un buffer REAL (no silencio programático, un
`AudioBufferSourceNode.start()` de verdad) dentro del MISMO gesto de usuario
para terminar de despertar la salida. `unlockAudioContextIOS(ctx)` hace
justo eso: un buffer de 1 frame, conectado a destino, arrancado — pegado a
la creación del contexto (una sola vez por contexto, no en cada nota; ya
desbloqueado no hace falta repetirlo). Sin este paso el fallo es **silencioso
en todos los sentidos**: no hay excepción, la UI responde normal, y el único
síntoma es que no sale sonido — por eso costó diagnosticarlo por chat en vez
de con el dispositivo en la mano. Probado con un `AudioContext` falso en
jsdom (hay prueba): fija que se agenda un buffer al crear el contexto y que
NO se repite en la siguiente nota.
**Esto NO arregló el caso de Jorge.** Con el desbloqueo puesto, seguía sin
sonar en su iPhone (Safari y Chrome). Se aisló más con una página de prueba
aparte, sin nada del piano: en el MISMO toque, un tono por Web Audio no
sonó y un `<audio>` con un clip grabado sí sonó. Revisó "Protección
avanzada contra rastreo y huella digital" de Safari y Modo Aislado
(Lockdown Mode) — ninguno era la causa. La causa exacta de fondo **quedó
sin identificar** (no hay forma de aislarla más por chat, sin el aparato en
la mano); lo que sí quedó confirmado con certeza, en su teléfono real, es
el patrón: Web Audio en vivo muda, `<audio>` funciona. Ver "Sonido
alternativo" más abajo, que es la solución que sí quedó resuelta.

### Sonido alternativo (`audioFallback`): para cuando Web Audio en vivo no suena
En vez de seguir adivinando la causa de fondo del caso de arriba, se evitó
el camino que falla. Botón `#soundFallbackBtn` en la barra del teclado
("🔈 Sonido alternativo"), apagado por defecto — es un rodeo para un caso
raro, no algo que necesite casi nadie. Con esto encendido:
- `playNoteSoundFallback(note, vel)` reemplaza a `buildVoice` tocando en
  vivo: la nota se renderiza **en silencio** con `OfflineAudioContext`
  (`renderNoteClip`) — eso no pide permiso de altavoz, solo calcula
  números — usando el **mismo** `buildVoice`, y el resultado se convierte
  a WAV (`audioBufferToWavBlob`, cabecera de 44 bytes a mano, sin depender
  de que el navegador sepa codificar nada) y se reproduce con un `<audio>`
  normal — la técnica que **sí** sonó en la prueba aislada.
- **Se cachea por NOTA, no por (nota, velocidad)**: todo lo que toca la
  app desde clic/touch llama a `playNoteSound` sin velocidad (`buildVoice`
  usa 80 fija en ese caso), así que una sola versión por tecla alcanza.
  La primera vez que suena una tecla hay un salto perceptible (hay que
  renderizar); de ahí en adelante es instantáneo.
- **Primera vuelta: sonaba turbio y tardaba mucho — dos causas, las dos en
  `renderNoteClip`, ya corregidas.** (1) Usaba el `noteLife(note)` del
  camino en vivo (hasta 6 s) Y lo mandaba al `send` de reverberación de
  `ensureAudioBus` — una convolución de verdad contra un impulso de 1.5 s,
  cara de calcular, para CADA nota nueva. En un teléfono eso se sentía
  como tardanza real antes del primer sonido, y tanta cola de
  reverberación emborronaba una nota con la siguiente en toque rápido.
  Ahora usa `fallbackRenderBus(octx)`, un bus aparte sin `send` (mismo
  compresor, sin convolver), y la duración se recorta a
  `noteLife(note)*0.45+0.35` con un techo de 2.2 s. Verificado con
  Chromium real: ~108 ms hasta que empieza a sonar una nota nueva (antes,
  con reverberación de 6 s, mucho más). (2) `playNoteSoundFallback` volvía
  a llamar `stopNoteSoundFallback` sobre la MISMA tecla si ya estaba
  "sonando", lo que arrancaba un desvanecido de 160 ms — pero como el
  `<audio>` se **reutiliza** por nota (`noteClipCache`), retocar la tecla
  a mitad de ese desvanecido dejaba el `setInterval` viejo corriendo EN
  PARALELO con la reproducción nueva, bajándole el volumen por detrás y a
  veces pausándola a la mitad: la tecla se sentía "pegada" o muda a
  ratos. `noteClipFade[note]` guarda el id del intervalo activo; tanto
  `playNoteSoundFallback` como `stopNoteSoundFallback` lo cancelan antes
  de arrancar uno nuevo — retocar la tecla nunca deja dos desvanecidos
  compitiendo. Probado con 6 retoques seguidos cada 30 ms en Chromium
  real: nada queda pegado.
- `stopNoteSoundFallback` no tiene envolvente que reprogramar (es un clip
  ya grabado, no una voz en vivo): el corte al soltar la tecla se hace
  bajando `audioEl.volume` a mano en 8 pasos de 20 ms — mismo espíritu que
  el "corta rápido pero no de golpe" del camino en vivo, sin el chasquido
  de un `.pause()` en seco.
- **`warmNoteClips(notes)`**: antes de una pasada con tiempo agendado —
  "Escuchar" en Fragmentos (`playFragment`) y las dos notas del modo de
  oído (`playEarInterval`) — deja pedidas por adelantado TODAS las notas
  que va a necesitar, y espera a que terminen de renderizarse antes de
  arrancar el reloj. Sin esto, la primera vez que sonaba una pieza cada
  nota nueva se renderizaba A MITAD de la reproducción (el tiempo no
  espera a nadie), sonaba tarde y la pieza se oía amontonada — el mismo
  reporte de "pegado" pero en "Escuchar". `playFragment` muestra
  "⏳ Preparando..." mientras dura; piezas ya escuchadas antes no pagan
  este costo (todas sus notas ya están en caché). No hace nada si
  `audioFallback` está apagado.
- `allNotesOff()` llama también a `allNotesOffFallback()`: la red de
  seguridad contra notas colgadas tiene que cubrir este camino igual que
  cubre MIDI, o quedaría sonando algo si el fallback estaba prendido.
- **`ensureAudioBus` pasó de una variable global a un `WeakMap` por
  contexto.** Antes había un solo `audioBus` compartido; cada nota del
  fallback crea su propio `OfflineAudioContext` efímero (uno por nota, de
  usar y tirar), y con la variable única cada render de fondo pisaba el
  bus del contexto EN VIVO — la siguiente nota tocada en vivo sonaba con
  un bus que ya no era el suyo. El WeakMap deja que cada contexto (el
  `audioCtx` en vivo, y cada `OfflineAudioContext` de turno) tenga el suyo
  sin chocar.
- **Solo cubre notas, no el metrónomo.** El metrónomo (`metroClick`) sigue
  tocando en vivo por `audioCtx` a propósito: depende de un scheduler con
  lookahead para caer justo en el pulso (`metroScheduler`), y forzar cada
  clic por un `<audio>` pre-renderizado metería el mismo jitter que un
  metrónomo no se puede permitir. Si algún día hace falta, es un problema
  aparte — no extender este mecanismo ahí sin pensarlo de nuevo.
- Probado con un `OfflineAudioContext`/`Audio` falsos en jsdom (cubre todo
  lo que `buildVoice`/`fallbackRenderBus` tocan): primera vez renderiza,
  segunda vez usa caché, soltar la tecla desvanece y saca de "sonando",
  retocar a mitad de un desvanecido lo cancela (no lo deja competir),
  `warmNoteClips` precalienta sin sonar y no repite notas duplicadas,
  `allNotesOff` también corta el fallback, y la cabecera del WAV mide lo
  que debe. **Además probado con Chromium real** (no fakes): toque táctil
  real de principio a fin, nota entra a `noteClipPlaying`, suena
  (`paused:false`), se desvanece al soltar, y 6 retoques seguidos de la
  misma tecla cada 30 ms no dejan nada pegado — sin errores de consola.
  **Seguía sin poder probarse en el iPhone real de Jorge** en el momento
  de escribir esto (reportó sonido "pegado" y con demora en la primera
  vuelta, ya corregido según lo de arriba); falta su confirmación de que
  esta vuelta sí quedó bien.

### Sintetizador del computador (solo sin piano conectado)
Imita las cuatro cosas que hacen que algo suene a piano y no a órgano:
decae desde el golpe (`noteLife()`: un La0 dura mucho más que un Do8), seis
armónicos con los agudos apagándose antes que el fundamental, inarmonicidad
(los armónicos **no** son múltiplos exactos), y golpe de martillo con un filtro
que se cierra mientras la nota muere. El fundamental son dos osciladores
desafinados unos cents: ese batido es lo que lo hace sonar vivo. Todo generado
al vuelo, cero descargas. `ensureAudioBus()` añade reverberación corta y un
compresor para que un acorde de cuatro notas no sature.
**`buildVoice(ctx, dest, send, note, vel, t0)` recibe el contexto por parámetro
a propósito**: así se puede renderizar en un `OfflineAudioContext` y medir la
forma de onda (decaimiento, pico, registro) en vez de confiar en el oído.
- Canal 1 (`MIDI_OUT_CH = 0`), velocidad fija `MIDI_OUT_VEL`. La velocidad real
  de lo que toca Jorge todavía se ignora: sigue pendiente.

## Cosas ya resueltas — no "arreglar" de nuevo
- **Temporizadores apilados que borraban el mensaje final**
  (`scheduleFragmentStep` / `scheduleChordStep`). Cada acierto agendaba el
  dibujo del paso siguiente con un `setTimeout` suelto (450 ms en fragmentos,
  700 ms en acordes). Tocando más rápido que eso —o sea, tocando normal— se
  apilaban varios y los viejos disparaban DESPUÉS del mensaje de fin de vuelta,
  que se borraba antes de poder leerse. Se descubrió al poner información de
  verdad ahí (la calificación del acorde y el "vuelta limpia" que sube de
  nivel); con el genérico "¡Completaste el fragmento!" pasaba igual y no se
  notaba. Ahora solo puede haber **un** temporizador pendiente por modo, y el
  camino de "terminó" cancela el que hubiera. **Cualquier `setTimeout` nuevo
  que redibuje el paso va por estas funciones, no suelto.**
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
- **Usar la velocidad MIDI**: hoy se lee y se descarta. Serviría para medir la
  uniformidad del toque, que es justo lo que piden "Notas repetidas" y "Arpegio
  de Do" sin poder comprobarlo.
- Mejorar el sintetizador para cuando no hay piano (decaimiento real, más
  armónicos, filtro que se cierra, ruido de martillo).
- Avisar cuando lleve mucho sin respaldo manual (hoy el automático lo cubre
  dentro de claude.ai, pero en el archivo suelto sigue sin red).

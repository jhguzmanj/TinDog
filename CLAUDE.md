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
    practicar una frase sin la otra. **Cumpleaños feliz y Bella Ciao se pidieron
    y quedaron pendientes**: Cumpleaños feliz sale de la posición de 5 dedos (la
    melodía sube hasta una 9ª desde el Do de referencia) y necesitaría un cambio
    de posición de mano que Fragmentos hoy no maneja fuera de Agilidad
    (`cruce-pulgar`); Bella Ciao no se agregó por no poder verificar la melodía
    nota por nota contra una fuente confiable en esa sesión — no adivinar una
    melodía conocida, se nota si está mal.
    **"María tenía un corderito"** se agregó como pieza fácil y segura dentro
    de la pentatónica: usa solo Do Re Mi Sol (ni siquiera necesita el La),
    cabe entera en la posición de 5 dedos y aquí la izquierda solo marca el
    Do en cada compás (no repite el patrón de acorde largo de Estrellita).
    Se eligió sobre Cumpleaños feliz/Bella Ciao por tener rango de mano y
    confianza de transcripción altísimos (melodía de 3-4 notas, ultraconocida).
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
    patrón de seis notas que se repite), **Twinkle Twinkle Little Star** (hexacordio
    ascendente–descendente, melodía más larga pero simétrica), **Hallelujah Chorus**
    (Händel, nota larga al inicio que marca el tiempo, cinco notas sin La),
    **Jingle Bells** (navideña, comenzando con tres notas repetidas para marcar
    ritmo). Las cinco usan posición de 5 dedos sin cambios, solo una nota de la
    izquierda en cada compás (Do tónica), así que el foco es la melodía sin
    complicación de coordinación.
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
       Filtro clave: **el agujero de una cabeza es más ancho que alto**; el de
       un silencio de negra no — sin esa regla los silencios entran como notas.
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
    **"Dios está aquí"** (partitura real de un PDF, Instituto Técnico de Estudios
    Musicales) se transcribió pixel por pixel: se extrajo el PDF a PNG de alta
    resolución (`pdftoppm -r 300`), se detectaron las líneas del pentagrama por
    análisis de columnas oscuras, y se dibujaron líneas de referencia por cada
    posición diatónica (línea/espacio) superpuestas a la imagen para leer cada
    cabeza de nota por su posición Y exacta en vez de a ojo. **Las alturas
    (pitches) tienen alta confianza** con este método. **El ritmo exacto de
    2-3 compases NO se pudo verificar al 100%**: hay una partitura con puntillos
    dobles inusuales, dieciseisavos agrupados, y al menos un compás donde la
    suma de duraciones no cuadraba exactamente a 4/4 por más pixel-forensics
    que se hizo (posible error de lectura en una nota puntillada o silencio no
    detectado). Se optó por una duración razonable en vez de seguir invirtiendo
    tiempo indefinidamente, y el usuario fue avisado y aceptó ese trade-off
    explícitamente. **Dividida en 5 frases con `label`** (Frase 1-4 + Fin) para
    practicar por partes con "Tramo" en cascada, que fue el pedido explícito
    ("agrégamela para aprenderla por partes"). Si al tocarla algo suena raro
    rítmicamente, es la parte a ajustar de oído — las notas (qué tecla tocar)
    deberían estar bien.
  - **Intervalos y Lectura quedan fuera a propósito.** Intervalos no tiene mano
    fija (`currentHand` no existe ahí): forzar un dedo inventaría una restricción
    que hoy no tiene el ejercicio. Lectura **nunca** marca la tecla objetivo — es
    a propósito (sight-reading, ver más abajo) — así que no hay tecla sobre la
    cual dibujar un número.
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

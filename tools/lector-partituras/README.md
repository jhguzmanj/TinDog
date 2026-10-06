# Lector de partituras

Herramienta para **preparar canciones antes de meterlas en `SONGS`** del
`piano-midi-trainer.html`. Se abre `index.html` en el navegador: sin servidor, sin build,
sin dependencias.

El flujo es: transcribir → **escuchar** → corregir de oído → exportar. El objetivo es no
meter en el entrenador notas que nadie ha verificado.

1. Transcribes la partitura al formato de texto de abajo (un archivo por canción en `songs/`).
2. La escuchas: manos separadas, tempo variable, metrónomo, bucle por sección.
3. Corriges lo que suene mal y pulsas *Aplicar cambios*.
4. **Exportar al entrenador**: genera el objeto `{id, cat, name, tip, tempo, steps}` listo
   para pegar en `SONGS`. Si hay una sección en bucle exporta solo esa, que suele ser lo
   que quieres (un riff de 4 compases es mejor ejercicio que la pieza de 40).

La app valida cada compás: si le faltan o le sobran tiempos lo dice con el número de
compás. Es el error de transcripción más común y se caza solo.

## De dónde sale el sonido

Selector **Sonido**, tres caminos:

- **App (sintetizador)** — el de siempre, se genera al vuelo. Es el que responde al
  instante a los cambios de tempo y de manos.
- **Piano por MIDI** — manda la pieza al P-45B y suena con los samples del Yamaha, que
  es el mejor sonido disponible. Al parar se manda note-off de todo + CC 123: sin eso el
  piano se queda sonando solo. El metrónomo sigue saliendo por el computador, igual que
  en el entrenador. **Ojo: Web MIDI no funciona dentro de un iframe**, así que en la
  página publicada de Claude no hay MIDI — hay que abrir este `index.html` directo en
  Chrome o Edge de escritorio. La app lo detecta y lo dice en vez de dejar un botón muerto.
- **Clip (móvil)** — renderiza el tramo a un WAV con `OfflineAudioContext` y lo toca con
  un `<audio>`. Existe porque en el iPhone de Jorge Web Audio **en vivo** se queda mudo
  mientras que un `<audio>` sí suena (está documentado en `CLAUDE.md` del entrenador).
  De paso el tiempo sale perfecto, porque ya no depende de ningún reloj. A cambio, cada
  cambio de tempo, mano o metrónomo obliga a renderizar otra vez: una sección tarda ~0,1 s
  y la pieza entera unos segundos. Con una sección en bucle no se mete cuenta de entrada,
  porque se repetiría en cada vuelta.

## Formato

```
title: Clocks
artist: Coldplay
meter: 4/4
tempo: 80 dotted-quarter      // = negra a 120
tip: texto que viaja al campo tip del entrenador

[A] Riff (c.1-4)
rh: Eb5/8:4 Bb4/8:2 Gb4/8:1 Eb5/8:4 Bb4/8:2 Gb4/8:1 Eb5/8:4 Bb4/8:2 |
rh: Db5/8:3 Bb4/8:2 F4/8:1 Db5/8:3 Bb4/8:2 F4/8:1 Db5/8:3 Bb4/8:2
lh: Eb4/1 | Bb3/1

order: A A
```

| Escribes | Significa |
|---|---|
| `Eb5/8` | mi bemol 5, corchea (`1` redonda, `2` blanca, `4` negra, `8` corchea, `16` semicorchea) |
| `Bb4/2.` | el punto alarga la mitad |
| `Eb5/8:4` | con dedo 4 — viaja a `rhF`/`lhF` y el entrenador lo pinta sobre la tecla |
| `r/4` | silencio de negra |
| `[F3,Ab3,C4]/1:5,3,1` | acorde con su digitación |
| `Db3/1~` | ligadura: se une a la nota siguiente igual |
| `\|` | barra de compás (sirve para validar) |
| `[X] nombre` | abre una sección |
| `order:` | orden real de reproducción; aquí van repeticiones y casillas 1ª/2ª |

El tempo acepta `quarter`, `dotted-quarter`, `half` y `eighth`. Importa:
`80 dotted-quarter` no son 80 negras por minuto, son **120**.

## Qué hace el exportador

El entrenador avanza por **pasos**, no por tiempo: cada paso son las notas que empiezan a
la vez y `dur` es lo que tarda en llegar el siguiente. La mano que no cambia va vacía
(`lh:[]`), que es como se escribe una redonda de la izquierda mientras la derecha hace
ocho corcheas.

**Escribe la digitación completa.** `tests/run.js` exige que toda nota de `SONGS` tenga su
dedo (`lhF`/`rhF` del mismo tamaño que `lh`/`rh`), así que una pieza a medio digitar no
entra. Donde la partitura no trae dedos, pon la digitación estándar y dilo en el `tip`.

También exporta MIDI estándar.

### Botón «JSON para la app»
Genera el JSON que exige la app del piano (el mismo formato de `piezas-json/`) y lo copia
al portapapeles. **No exporta a medias**: si falta un dedo en alguna nota, la tonalidad, el
compositor o la fuente, muestra qué falta en vez de un JSON que la app rechazaría.
- Los dedos se escriben en el texto después de la duración: `Eb5/8:4` es impreso en la
  partitura; `Eb5/8:4?` es propuesto (sale con `fingerSource:"suggested"`). Un acorde lleva
  uno por nota: `[F3,Ab3]/1:5,3`.
- Compositor, tonalidad, fuente y tempo viven en el bloque `spec` de cada archivo de
  `songs/` (no caben en el texto de la partitura). `js/specexport.js` los lee.
- La ortografía es la escrita (`Eb5`, no `D#5`), las ligaduras se unen y los repetidos van
  una sola vez con `order`.
- La prueba que lo fija: exportar las seis piezas y compararlas con `piezas-json/`.
- **Avisos de lo que la app debe saber** (`warnings` y campos propios, no van escondidos en `notes_text`):
  - `ritardando`: `{present, printed, numeric, where, tempoChanges?}`. `quarterBpm` es el tempo
    base y `startBeat`/`durationBeats` están escritos a ese tempo; el ritardando NO está aplicado
    a las notas. Cannon trae los BPM impresos (108→90→70→45); Passacaglia dice "rit. al fine" sin
    números.
  - `arranger`: `null` cuando la partitura no lo trae (Für Elise, Arioso, Passacaglia, Clocks, Piano Finger Exercises),
    con `arrangerNote` explicando qué se miró. **Nunca se inventa.**
  - `checks.chordsVsBass`: la partitura no trae cifrados, así que no juzga armonía en teoría.
    Si la izquierda solo dobla a la derecha (ejercicios en paralelo) se omite. Si el bajo repite un bucle (Cannon: 8 compases), marca los compases donde se aparta de sus
    otras vueltas y pone `doubt:true` en esa nota, con la razón en `doubtReason`.
  - `checks.identicalPassages`: compases idénticos de una misma mano llevan los mismos dedos.
    `suggestedMismatches` debe salir vacío; `printedDifferences` son dedos que la propia
    partitura imprime distintos y se respetan.
- `node scripts/unificar-dedos.js [--write]` iguala los dedos *propuestos* (`?`) en compases
  idénticos; los impresos nunca se tocan. Correrlo al añadir una pieza. **Asume UNA línea `rh:` y
  UNA `lh:` por sección**: reinicia el número de compás en cada línea, así que si una sección se
  parte en varias líneas sus números (y sus «igualados») salen mal. Escribir las secciones en una
  sola línea por mano.
- `spec.bassCheckSkip` (texto, opcional): omite el chequeo del bucle de bajo (`checks.chordsVsBass`)
  y pone ese texto como razón. Es para ejercicios de escalas, donde la izquierda toca la escala y
  no un bajo, y el chequeo marcaría `doubt:true` en notas que son la propia escala.

## Sonido: piano real (muestras)
La casilla **Piano real** (activa por defecto) reproduce grabaciones de un piano de cola en vez del
sintetizador. Sirve en los dos caminos: el en vivo y el **clip** del móvil (se renderiza con
`OfflineAudioContext` y suena por un `<audio>`, que es lo único que funciona en el iPhone).
- Muestras: Salamander Grand Piano V3, © Alexander Holm, **CC BY 3.0** (hay que citarlo: está en
  la pantalla y en la cabecera de `samples/piano.js`). 16 muestras, D#2 a C6, una cada tercera
  menor: cada nota se estira como máximo 1,5 semitonos.
- `samples/piano.js` (4,2 MB, base64) se descarga solo la primera vez que se pide sonido, y solo se
  decodifican las muestras que la pieza usa. Va como `<script>` y no como `fetch` para que
  funcione abriendo el HTML como archivo local.
- Si no se puede descargar, **suena el sintetizador** y la pantalla lo dice; nunca se queda mudo.
- Con piano real el clip es estéreo a 32 kHz (Cannon entero: ~14 MB, ~6 s de render en un equipo
  de escritorio; en el teléfono aún no medido). Sin piano real sigue siendo mono a 22 kHz.
- Regenerar: `npm pack @audio-samples/piano-mp3-velocity8`, descomprimir y
  `node scripts/construir-muestras.js package/audio`.
- Al publicar como artifact, `samples/piano.js` va como archivo de apoyo junto al HTML.

## Añadir una canción

Copia `songs/clocks.js`, cambia el texto y añade el `<script>` en `index.html`. Van en
`.js` y no en `.json` para que funcione abriendo el archivo directamente, sin servidor.

Si la pieza viene de un **MusicXML**, no la escribas a mano ni de memoria: conviértela del XML y
contrasta con el MIDI. Lo que se hizo con las seis piezas de `.mxl` (Beyer, Köhler, Canon, Hanon 2,
Escala de Do y Junior Hanon) y que conviene repetir:
- Leer **todo** del XML: alturas, ritmo, ligaduras, compás, tonalidad, repeticiones y **los dedos
  impresos** (`<fingering>`), que mandan sobre cualquier propuesta. Los créditos y las notas al pie
  (`<credit>`, `<words>`) dicen de dónde sale la pieza; no se atribuye nada que no estén ahí.
- Los dedos que faltan se proponen con `?`, en este orden: (1) compases de la misma *forma*
  (mismos intervalos y ritmo, 4+ notas) copian los impresos del que sí los trae —así un cuaderno de
  Hanon queda con la digitación impresa en todos los compases—; (2) el resto, por posición de mano
  (mover la mano cuesta, el mismo dedo en dos teclas seguidas cuesta más); (3) compases idénticos
  con el mismo anterior y siguiente llevan los mismos dedos, que es lo que pide el exportador.
- Contrastar contra el MIDI **nota por nota** (inicio y altura) y guardar el resultado real en
  `spec.extraChecks.midiCrossCheck`. Las seis dieron 0 diferencias en 4.153 notas. Las duraciones
  del MIDI no sirven para comparar (MuseScore las acorta al 95%, y a 0 en un unísono de las dos manos).
- Cuidado con los textos que describen la pieza: medir antes de afirmar (¿la izquierda son acordes o
  notas sueltas?, ¿qué notas usa?, ¿qué compases se repiten?). La primera versión de estos archivos
  describía de memoria cosas que no estaban en la partitura.
- El tempo por defecto de MuseScore (120) no es una indicación del autor: si el XML no imprime
  `<metronome>`, `tempoSource` es `audio` y `tempoNote` lo dice.

## Estado

Piezas del lector (`songs/`):

- `clocks.js` — Coldplay, arreglo fácil de 22 compases, sacado de las imágenes de la
  partitura (decodificando los PNG, no a ojo). La sección C (c.9-11) es la menos nítida
  en el original: conviene verificarla de oído antes de darla por buena. No hay MusicXML
  ni MIDI de esta pieza, así que es la única sin contraste externo.
- `fur-elise-easy.js` — el tema de 13 compases, **tocado dos veces**: la partitura trae una
  barra de repetición al final (`order: A A`). Dedos: 55 de 61 impresos en la partitura.
- `cannon-in-d.js` / `cannon-in-d-easy.js` — Pachelbel, 49 compases. La fácil es una
  derivación mecánica de la completa (derecha = nota más aguda de cada acorde, izquierda =
  la más grave). El ritardando del final está impreso (♩=90/70/45 en los c.47-49) pero
  el formato de texto no puede escribir cambios de tempo.
- `passacaglia-sample.js` — solo los compases 1-8 de 72, como muestra para escuchar.
  El PDF dice "D'après Handel" y nada más: no se atribuye a ningún arreglista.
- `mozart-arioso.js` — 32 compases, escritos sin barras de repetición (AABB literal).
- `melody-in-g-beyer.js` / `melody-in-f-kohler.js` — Beyer (Op. 101) y Köhler (Op. 190), edición
  de James F. Brigham, dominio público. Del MusicXML + MIDI (0 diferencias). Beyer: 16 compases,
  sin armadura y sin ningún Fa (Sol mayor); Köhler: 32 compases en 3/4, Fa mayor, con Si natural
  (c.14), Fa# (c.19) y Mi bemol (c.27) escritos. En las dos la izquierda son **notas sueltas**.
  Tempo no impreso (el 120 es el del MIDI).
- `canon-in-c.js` — el Canon de Pachelbel en Do mayor, 89 compases, arreglo de «Iori Yagami» (así
  viene en el XML). El archivo subido se llamaba «Johann Sebastian Bach…», que no coincide con la
  música: no se atribuyó a Bach. La izquierda repite 11 veces el mismo arpegio de ocho compases;
  sin dedos impresos, todos propuestos (arpegio 5-3-2-1).
- `hanon-e2.js` — Ejercicio 2 de Hanon, ♩=40 **impreso**. Los dedos impresos están en 8 de sus 15 compases (completos en 4) y el
  resto repite la forma. Es el mismo ejercicio que el nº 2 de `hanon-junior-1.js`.
- `c-major-scale-fingering.js` — escalas de Do mayor en negras con las dos manos y los 250 dedos
  impresos. El título del XML (polaco) dice «mano derecha, redondas», pero la partitura no es eso.
  Usa `spec.bassCheckSkip`.
- `hanon-junior-1.js` — **12** ejercicios de Hanon (el archivo se llama «1 to 20 unfinished» pero solo
  trae 12), 184 compases, 24 secciones (subida y bajada de cada ejercicio). El XML no trae autor ni
  título («Untitled score», «Composer / arranger»): la atribución sale del nombre del archivo.
  1206 dedos impresos de 2776; los demás se copian por forma.
- `sound-of-silence.js` — Simon & Garfunkel, arreglo fácil en Re menor, 16 compases con la
  estrofa repetida (`order: A A B`, 31 compases tocados). Sale de dos imágenes GIF sin
  encabezado (ni título, ni créditos, ni tempo): se usó la versión de dos pentagramas; la de
  tres trae una voz intermedia que no cabe en dos manos. Leída por píxeles + recortes
  ampliados con guías de altura. El tempo (108) es el de la grabación, no impreso. Sin
  MusicXML ni MIDI: como Clocks, no hay contraste externo nota por nota; lo que la sostiene
  es que el bajo da Rem–Do–Rem–Sib–Fa bajo la melodía y que todo cae en Re menor natural.

## Exportar a la app del piano: `piezas-json/`

Una pieza por archivo, en el formato de la especificación de la app ("Piano MIDI
Trainer": notas con `midi`, `name`, `hand`, `finger`, `startBeat`, `durationBeats`, `bar`).
Reglas que se siguieron: las alturas salen de la partitura, el MIDI solo confirma tempo y
ritmo y **si no coinciden gana la partitura**; el dedo es el impreso (`"fingerSource":
"printed"`) o, si falta, uno propuesto (`"suggested"`).

Campos que la especificación no define y se añadieron (la app puede ignorarlos): `id`,
`credit` (créditos tal como están impresos), `tempoNote`, `tempoChanges` (Cannon),
`keyNote` y `checks`. Los `checks` reportan compases completos, tonalidad, cruce de manos,
abertura, y el cruce nota por nota con el MIDI.

Cosas que conviene saber al leerlos:

- `tempoSource` solo admite `printed` o `audio`. Solo Cannon trae tempo impreso; en el resto
  el tempo sale del MIDI (`audio`) o, en Clocks, de lo que indicó Jorge (sin verificar).
- Los dedos `suggested` los propone un algoritmo con las reglas de la especificación; en una
  prueba ciega contra los dedos impresos coincidió en ~73%. En Clocks los dedos de la
  izquierda son los del lector (meñique en los bajos sueltos), que la especificación
  pediría evitar: aparece en `checks.fingers.pinkyKeyToKey`.
- El MIDI de Für Elise trae 58 notas más que la partitura (acordes y octavas graves en la
  izquierda). No se agregaron; están en `checks.midiCrossCheck.onlyInMidi`.
- En Cannon, compás 38, la izquierda queda más aguda que notas de la derecha: así está en
  la partitura (`checks.handsCross`).

Los JSON los generó un script aparte a partir de los `.mxl` y `.mid` originales, que no
están en el repositorio; para regenerarlos hacen falta esos archivos.

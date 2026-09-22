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

También exporta MIDI estándar y un JSON plano (lista de notas con `startBeat`), por si
hacen falta fuera del entrenador.

## Añadir una canción

Copia `songs/clocks.js`, cambia el texto y añade el `<script>` en `index.html`. Van en
`.js` y no en `.json` para que funcione abriendo el archivo directamente, sin servidor.

## Estado

- `songs/clocks.js` — Coldplay, arreglo fácil de 22 compases, sacado de las imágenes de
  la partitura (decodificando los PNG, no a ojo). La sección C (c.9-11) es la menos
  nítida en el original: conviene verificarla de oído antes de darla por buena.

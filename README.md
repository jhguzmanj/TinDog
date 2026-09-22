# Lector de partituras

App web para **escuchar una partitura antes de cargarla en la app de práctica de piano**.
Se abre `index.html` en el navegador: no hay servidor, ni build, ni dependencias.

## Para qué sirve

1. Transcribes la partitura a un formato de texto corto (o parto yo de las imágenes).
2. La escuchas: manos separadas, tempo variable, metrónomo, bucle por sección.
3. Corriges de oído lo que esté mal y le das a *Aplicar cambios*.
4. Exportas **MIDI** o **JSON** para la app de práctica.

La app valida cada compás: si a un compás le faltan o le sobran tiempos, lo dice con
el número de compás. Es el error de transcripción más común y se caza solo.

## Formato

```
title: Clocks
artist: Coldplay
meter: 4/4
tempo: 80 dotted-quarter      // = negra a 120

[A] Riff (c.1-4)
rh: Eb5/8 Bb4/8 Gb4/8 Eb5/8 Bb4/8 Gb4/8 Eb5/8 Bb4/8 |
rh: Db5/8 Bb4/8 F4/8 Db5/8 Bb4/8 F4/8 Db5/8 Bb4/8
lh: Eb4/1 | Bb3/1

order: A A B B
```

| Escribes | Significa |
|---|---|
| `Eb5/8` | mi bemol 5, corchea (`1` redonda, `2` blanca, `4` negra, `8` corchea, `16` semicorchea) |
| `Bb4/2.` | el punto alarga la mitad |
| `r/4` | silencio de negra |
| `[F3,Ab3,C4]/1` | acorde |
| `Db3/1~` | ligadura: se une a la nota siguiente igual |
| `\|` | barra de compás (sirve para validar) |
| `[X] nombre` | abre una sección |
| `order:` | orden real de reproducción; aquí van repeticiones y casillas 1ª/2ª |

El tempo acepta `quarter`, `dotted-quarter`, `half` y `eighth` como unidad. Importa:
`80 dotted-quarter` no es 80 negras por minuto, son **120**.

## Añadir una canción

Crea `songs/<nombre>.js` copiando `songs/clocks.js` y añade el `<script>` en `index.html`.
Van en archivos `.js` y no `.json` para que funcione abriendo el archivo directamente,
sin servidor.

## Estado

- `songs/clocks.js` — Coldplay, arreglo fácil de 22 compases, sacado de las imágenes de
  la partitura. La sección C (c.9-11) es la menos nítida en el original: conviene
  verificarla de oído.

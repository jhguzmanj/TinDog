# Piezas originales en MusicXML

Las 21 piezas que hicimos Jorge y Claude para la app Piano MIDI Trainer, una por archivo:

- **Piezas** (15): Amanecer, Camino de intervalos, Día de lluvia, Suspiro, las cinco melodías de la tarea
  (Pasos y saltos, Paseo cromático, Espejos, Viaje por las quintas, Pentatónica de Do), la melodía pentatónica con
  acordes y los cinco Finales.
- **Ejercicios de pedal** (6): `pedal-1` a `pedal-6`.

Formato: MusicXML 4.0 *partwise*, un piano con dos pentagramas (1 = derecha en clave de Sol, 2 = izquierda en clave de Fa).

## Qué trae cada archivo
- Notas con su altura exacta, ritmo, ligaduras (cuando una nota cruza una barra de compás) y **dedos** (`<fingering>`).
- Tempo (`<sound tempo>` y marca de metrónomo), compás y armadura. *Viaje por las quintas* cambia de armadura en cada compás.
- **Pedal** como `<pedal start/change/stop>` en el pentagrama 2, y los **rótulos** de la app (`c. 5`, "Salto 1"…) como texto.
- Todo está en una sola voz por pentagrama; los rótulos y el pedal van en una voz 3 sin notas (`<forward>`).

## Lo que NO trae (la app nunca lo tuvo)
Dinámicas, ligaduras de expresión, repeticiones, adornos, barras de corcheas (`<beam>`: el programa de partituras las pone solo).

## Cómo leerlo bien
- La izquierda se escribe **sostenida hasta que cambia**, que es como suena en la app.
- Lo que la app llama "silencio" aparece como silencio.
- *Paseo cromático*: sostenidos al subir, bemoles al bajar. *Viaje por las quintas*: G#, D# y A# mayor (nombres del profe) se
  escriben con su armadura real, La♭, Mi♭ y Si♭ (mismas teclas).
- Los nombres de las notas con bemol en la app son sostenidos (`A#` por Si♭); aquí ya vienen deletreados.

## Se generaron y se verificaron
`node tools/export-musicxml.js` los escribe y `node tools/verify-musicxml.js` los vuelve a leer y compara con los datos de
la app (notas, ritmo, dedos, pedal, rótulos, tempo, armadura). `npm test` lo repite y falla si estos archivos quedan viejos.
**No se abrieron en un programa de partituras** (no hay uno en este entorno): si alguno se ve raro en MuseScore o similar,
avisar con el nombre del archivo y el compás.

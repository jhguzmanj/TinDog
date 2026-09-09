# Piano MIDI Trainer

Entrenador de piano de un solo archivo (`piano-midi-trainer.html`) para aprender desde
cero con un Yamaha P-45B conectado por USB (Web MIDI) o con el teclado dibujado.

- Abrir `piano-midi-trainer.html` en Chrome o Edge de escritorio y pulsar **Conectar MIDI**.
- Pestañas: Hoy (plan del día) · Libre · Escalas (mayores/menores, dedos, ambas manos,
  metrónomo) · Acordes (inversiones) · Intervalos (+ oído) · Lectura (pentagrama) ·
  Agilidad · Fragmentos (con cascada) · Progreso · Funciones del P-45.
- El progreso se guarda en el navegador; se puede exportar/importar como JSON.

Pruebas: `npm install && npm test` (jsdom). Guía de mantenimiento en `CLAUDE.md`.

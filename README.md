# Piano MIDI Trainer

Entrenador de piano de un solo archivo (`piano-midi-trainer.html`) para aprender desde
cero con un Yamaha P-45B conectado por USB (Web MIDI) o con el teclado dibujado.

- Abrir `piano-midi-trainer.html` en Chrome o Edge de escritorio y pulsar **Conectar MIDI**.
- Pestañas: Hoy (plan del día) · Escalas · Agilidad (dedos y manos juntas) · Acordes ·
  Intervalos (+ oído) · Lectura (pentagrama) · Piezas (con cascada) · Progreso, y en
  "Más": Tocar libre y Funciones del P-45.
- El progreso se guarda en el navegador; se puede exportar/importar como JSON.

Pruebas: `npm install && npm test` (jsdom). Guía de mantenimiento en `CLAUDE.md`.

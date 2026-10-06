// Hanon, Ejercicio 2 — MusicXML (MuseScore 3.5.0) + MIDI. 15 compases, 4/4, Do mayor, ♩ = 40 impreso.
// Son corcheas sueltas: la derecha sube y baja un patrón de ocho notas y la izquierda lo toca una octava abajo.
// Dedos: impresos donde la partitura los trae; en los compases de la misma forma que no los traen se copian los impresos.

const HANON_E2 = {
  "id": "hanon-e2",
  "cat": "patrones",
  "name": "Hanon · Ejercicio 2",
  "artist": "Charles-Louis Hanon",
  "tip": "Ejercicio de Hanon en corcheas, las dos manos a la vez con las mismas notas (la izquierda una octava abajo): el patrón de ocho notas sube un grado por compás hasta el compás 7 y después baja. La digitación impresa es 1-2-5-4-3-4-3-2 (derecha) y 5-3-1-2-3-2-3-4 (izquierda) en la subida, y se repite en cada compás; la partitura la imprime solo en los primeros. Tempo impreso ♩ = 40.",
  "tempo": "40 quarter",
  "spec": {
    "title": "Hanon · Ejercicio 2",
    "composer": "Charles-Louis Hanon",
    "credit": "EJERCICIO 2 — HANON (tal como está impreso)",
    "source": "partitura MusicXML (MuseScore 3.5.0, 15 compases) + MIDI; alturas, ritmo, tempo y dedos impresos del MusicXML, contrastados nota por nota con el MIDI",
    "key": {
      "tonic": "C",
      "mode": "major"
    },
    "tempoSource": "printed",
    "tempoNote": "Impreso ♩ = 40 en el compás 1 (y el MIDI trae el mismo 40). Es un tempo de estudio lento: 80 corcheas por minuto.",
    "notes_text": [
      "la derecha y la izquierda tocan las mismas notas con una octava de diferencia (Do4 y Do3 al empezar); no hay cruce de manos",
      "la partitura imprime los dedos completos en los compases 1, 2, 8 y 15 y solo las primeras notas en el 3, el 4, el 9 y el 14; el resto es la misma forma desplazada un grado y lleva la misma digitación (marcada con ?)",
      "es el mismo ejercicio que el nº 2 del archivo Junior Hanon (c.17-31 de hanon-junior-1): mismas notas y mismos dedos"
    ],
    "allowedChromatics": [],
    "fingersDetail": "70 de 226 dedos impresos en la partitura (siempre mandan); 155 copiados de un compás de la misma forma que sí los imprime; 1 propuestos y marcados con ? en el texto",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 226,
        "matched": 226,
        "midiNotesInWindow": 226,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationRatioMidiOverScore": [
          0.95,
          0.95
        ],
        "midiTempoEvents": [
          [
            0,
            40.0
          ]
        ],
        "detail": "las 226 notas del MIDI coinciden en tiempo y altura con las 226 que se pulsan en la partitura (las colas de ligadura no cuentan); tempo del MIDI: 40.0"
      }
    },
    "arrangerNote": "Solo aparece «HANON» como autor; el MusicXML (MuseScore 3.5.0) no trae arreglista ni derechos. No se inventó."
  },
  "text": `title: Hanon · Ejercicio 2
artist: Charles-Louis Hanon
meter: 4/4
tempo: 40 quarter
key: Do mayor
tip: Ejercicio de Hanon en corcheas, las dos manos a la vez con las mismas notas (la izquierda una octava abajo): el patrón de ocho notas sube un grado por compás hasta el compás 7 y después baja. La digitación impresa es 1-2-5-4-3-4-3-2 (derecha) y 5-3-1-2-3-2-3-4 (izquierda) en la subida, y se repite en cada compás; la partitura la imprime solo en los primeros. Tempo impreso ♩ = 40.

[A] Subida (c.1-7)
rh: C4/8:1 E4/8:2 A4/8:5 G4/8:4 F4/8:3 G4/8:4 F4/8:3 E4/8:2 | D4/8:1 F4/8:2 B4/8:5 A4/8:4 G4/8:3 A4/8:4 G4/8:3 F4/8:2 | E4/8:1 G4/8:2 C5/8:5 B4/8:4? A4/8:3? B4/8:4? A4/8:3? G4/8:2? | F4/8:1 A4/8:2 D5/8:5? C5/8:4? B4/8:3? C5/8:4? B4/8:3? A4/8:2? | G4/8:1 B4/8:2 E5/8:5? D5/8:4? C5/8:3? D5/8:4? C5/8:3? B4/8:2? | A4/8:1? C5/8:2? F5/8:5? E5/8:4? D5/8:3? E5/8:4? D5/8:3? C5/8:2? | B4/8:1? D5/8:2? G5/8:5? F5/8:4? E5/8:3? F5/8:4? E5/8:3? D5/8:2?
lh: C3/8:5 E3/8:3 A3/8:1 G3/8:2 F3/8:3 G3/8:2 F3/8:3 E3/8:4 | D3/8:5 F3/8:3 B3/8:1 A3/8:2 G3/8:3 A3/8:2 G3/8:3 F3/8:4 | E3/8:5 G3/8:3 C4/8:1? B3/8:2? A3/8:3? B3/8:2? A3/8:3? G3/8:4? | F3/8:5 A3/8:3 D4/8:1? C4/8:2? B3/8:3? C4/8:2? B3/8:3? A3/8:4? | G3/8:5? B3/8:3? E4/8:1? D4/8:2? C4/8:3? D4/8:2? C4/8:3? B3/8:4? | A3/8:5? C4/8:3? F4/8:1? E4/8:2? D4/8:3? E4/8:2? D4/8:3? C4/8:4? | B3/8:5? D4/8:3? G4/8:1? F4/8:2? E4/8:3? F4/8:2? E4/8:3? D4/8:4?

[B] Bajada (c.8-15)
rh: G5/8:5 D5/8:2 B4/8:1 C5/8:2 D5/8:3 C5/8:2 D5/8:3 E5/8:4 | F5/8:5 C5/8:2 A4/8:1 B4/8:2? C5/8:3? B4/8:2? C5/8:3? D5/8:4? | E5/8:5? B4/8:2? G4/8:1? A4/8:2? B4/8:3? A4/8:2? B4/8:3? C5/8:4? | D5/8:5? A4/8:2? F4/8:1? G4/8:2? A4/8:3? G4/8:2? A4/8:3? B4/8:4? | C5/8:5? G4/8:2? E4/8:1? F4/8:2? G4/8:3? F4/8:2? G4/8:3? A4/8:4? | B4/8:5? F4/8:2? D4/8:1? E4/8:2? F4/8:3? E4/8:2? F4/8:3? G4/8:4? | A4/8:5 E4/8:2 C4/8:1? D4/8:2? E4/8:3? D4/8:2? E4/8:3? F4/8:4? | C4/1:1?
lh: G4/8:1 D4/8:3 B3/8:5 C4/8:4 D4/8:3 C4/8:4 D4/8:3 E4/8:2 | F4/8:1 C4/8:3 A3/8:5 B3/8:4? C4/8:3? B3/8:4? C4/8:3? D4/8:2? | E4/8:1? B3/8:3? G3/8:5? A3/8:4? B3/8:3? A3/8:4? B3/8:3? C4/8:2? | D4/8:1? A3/8:3? F3/8:5? G3/8:4? A3/8:3? G3/8:4? A3/8:3? B3/8:2? | C4/8:1? G3/8:3? E3/8:5? F3/8:4? G3/8:3? F3/8:4? G3/8:3? A3/8:2? | B3/8:1? F3/8:3? D3/8:5? E3/8:4? F3/8:3? E3/8:4? F3/8:3? G3/8:2? | A3/8:1 E3/8:3 C3/8:5? D3/8:4? E3/8:3? D3/8:4? E3/8:3? F3/8:2? | C3/1:1

order: A B
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(HANON_E2);

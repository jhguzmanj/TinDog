// Melody in F — Louis Köhler, Op. 190 (Die allerleichtesten Übungsstücke). Edición: James F. Brigham, dominio público (CC0).
// Fuentes: MusicXML (MuseScore Studio 4.6.5) + MIDI. 32 compases, 3/4, Fa mayor.
// Tempo: la partitura no imprime ninguno; el MIDI trae 120 (valor por defecto de MuseScore).

const MELODY_IN_F_KOHLER = {
  "id": "melody-in-f-kohler",
  "cat": "facil",
  "name": "Melody in F",
  "artist": "Louis Köhler",
  "tip": "Vals lento en 3/4, Fa mayor: la derecha lleva la melodía sobre todo en blancas con puntillo y la izquierda acompaña con tres negras sueltas por compás (Fa–La–Do en el primero), sin acordes. Trae tres alteraciones escritas: un Si natural (c.14), un Fa# (c.19) y un Mi bemol (c.27). Los dedos son los de la partitura donde los trae y propuestos donde no. Sin tempo impreso: empieza despacio.",
  "tempo": "120 quarter",
  "spec": {
    "title": "Melody in F",
    "composer": "Louis Köhler",
    "credit": "Melody in F — Louis Köhler (1820–1886), Op. 190 — Edited by James F. Brigham (tal como está impreso; dominio público, Creative Commons Zero 1.0)",
    "source": "partitura MusicXML (MuseScore Studio 4.6.5, 32 compases) + MIDI; alturas, ritmo y dedos impresos del MusicXML, contrastados nota por nota con el MIDI. Fuente original impresa: Köhler, «Die allerleichtesten Übungsstücke», Op. 190, Moscú: A. Gutheil (ca. 1880) (IMSLP). El archivo original se llama «grade-1-piano-exam-pieces-2025-2026»",
    "key": {
      "tonic": "F",
      "mode": "major"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto (fijos, sin cambios), que es el valor por defecto de MuseScore: no es una indicación del autor. Para aprender, baja la velocidad.",
    "notes_text": [
      "compás de 3/4; cada ocho compases la derecha descansa un compás entero (c.8, 16, 24 y 32) y esos silencios marcan el final de la frase",
      "alteraciones escritas en la partitura: Si natural en el compás 14 (becuadro impreso, la derecha; es el único Si natural), Fa# en el compás 19 (sostenido impreso) y Mi bemol en el compás 27 (bemol impreso); el Si bemol es de la armadura",
      "sin barras de repetición ni indicaciones de tempo"
    ],
    "allowedChromatics": [
      "B",
      "F#",
      "Eb"
    ],
    "fingersDetail": "84 de 129 dedos impresos en la partitura (siempre mandan); 0 copiados de un compás de la misma forma que sí los imprime; 45 propuestos y marcados con ? en el texto",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 129,
        "matched": 129,
        "midiNotesInWindow": 129,
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
            120.0
          ]
        ],
        "detail": "las 129 notas del MIDI coinciden en tiempo y altura con las 129 que se pulsan en la partitura (las colas de ligadura no cuentan); tempo del MIDI: 120.0"
      }
    },
    "arrangerNote": "Impreso solo «Edited by James F. Brigham»: es el editor del nuevo grabado, no un arreglista. No se inventó ningún arreglista."
  },
  "text": `title: Melody in F
artist: Louis Köhler
meter: 3/4
tempo: 120 quarter
key: Fa mayor (un bemol)
tip: Vals lento en 3/4, Fa mayor: la derecha lleva la melodía sobre todo en blancas con puntillo y la izquierda acompaña con tres negras sueltas por compás (Fa–La–Do en el primero), sin acordes. Trae tres alteraciones escritas: un Si natural (c.14), un Fa# (c.19) y un Mi bemol (c.27). Los dedos son los de la partitura donde los trae y propuestos donde no. Sin tempo impreso: empieza despacio.

[A] Frase 1 (c.1-8)
rh: A4/2.:3 | A4/2:3? A4/4:3? | C5/2.:5 | A4/2.:3 | F4/2.:1 | G4/2.:2? | A4/2.:3 | r/2.
lh: F3/4:5 A3/4:3 C4/4:1 | F3/4:5? A3/4:3? C4/4:1? | F3/4:5? A3/4:3? C4/4:1? | F3/4:5? A3/4:3? C4/4:1? | D3/4:5 F3/4:3 A3/4:1 | E3/4:5 G3/4:3 C4/4:1 | F3/4:5 A3/4:3 C4/4:1 | F3/4:5? A3/4:3? C4/4:1?

[B] Frase 2 (c.9-16)
rh: A4/2.:1 | A4/2:3? A4/4:3? | C5/2.:3 | A4/2.:1 | F5/2.:5 | B4/2.:1 | C5/2.:2 | r/2.
lh: F3/4:5? A3/4:3? C4/4:1? | F3/4:5? A3/4:3? C4/4:1? | F3/4:5? A3/4:3? C4/4:1? | F3/4:5? A3/4:3? C4/4:1? | F3/4:5 A3/4:3 D4/4:1 | G3/4:5 D4/4:2 F4/4:1 | E4/4:2 D4/4:3 C4/4:1 | Bb3/4:2 A3/4:3 G3/4:4

[C] Frase 3 (c.17-24)
rh: A4/2.:3 | A4/2:3? A4/4:3? | C5/2.:5 | Bb4/2.:4 | Bb4/2.:4? | A4/2.:3 | G4/2.:2 | r/2.
lh: F3/4:5 A3/4:3 C4/4:1 | F3/4:5? A3/4:3? C4/4:1? | F#3/4:5 A3/4:3 D4/4:1 | G3/4:4 Bb3/4:2 D4/4:1 | E3/4:5 G3/4:3 C4/4:1 | F3/4:5 A3/4:3 C4/4:1 | E3/4:5 G3/4:3 C4/4:1 | Bb3/4:2 A3/4:3 G3/4:4

[D] Frase 4 (c.25-32)
rh: A4/2.:3 | A4/2:3? A4/4:3? | C5/2.:5 | Bb4/2.:4 | A4/2:3 F4/4:1 | G4/4:2 A4/4:3? G4/4:2? | F4/2.:1 | r/2.
lh: F3/4:5 A3/4:3 C4/4:1 | F3/4:5? A3/4:3? C4/4:1? | Eb3/4:4 F3/4:3 A3/4:1 | D3/4:5 F3/4:3 Bb3/4:1 | C3/4:5 F3/4:2 A3/4:1 | C3/4:5? C4/4:1? Bb3/4:2? | A3/4:3 C4/4:1 A3/4:3 | F3/2.:5

order: A B C D
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(MELODY_IN_F_KOHLER);

// Melody in G — Ferdinand Beyer (Vorschule im Klavierspiel, Op. 101). Edición: James F. Brigham, dominio público (CC0).
// Fuentes: MusicXML (MuseScore 4.5.2) + MIDI. 16 compases, 4/4, sin armadura (Sol mayor sin Fa).
// La izquierda son notas sueltas (sin acordes), como en la fuente.
// Tempo: la partitura no imprime ninguno; el MIDI trae 120 (valor por defecto de MuseScore).

const MELODY_IN_G_BEYER = {
  "id": "melody-in-g-beyer",
  "cat": "facil",
  "name": "Melody in G",
  "artist": "Ferdinand Beyer",
  "tip": "Melodía de una sola línea con acompañamiento sencillo: la derecha se queda toda en la posición de cinco dedos Sol–La–Si–Do–Re (blancas, negras y una redonda) y la izquierda toca notas sueltas, sin acordes. Los dedos son los de la partitura donde los trae y propuestos donde no. Sin tempo impreso: empieza mucho más despacio de lo que suena por defecto.",
  "tempo": "120 quarter",
  "spec": {
    "title": "Melody in G",
    "composer": "Ferdinand Beyer",
    "credit": "Melody in G — Ferdinand Beyer (1803–1863), de «Vorschule im Klavierspiel», Op. 101 — Edited by James F. Brigham (tal como está impreso; dominio público, Creative Commons Zero 1.0)",
    "source": "partitura MusicXML (MuseScore 4.5.2, 16 compases) + MIDI; alturas, ritmo y dedos impresos del MusicXML, contrastados nota por nota con el MIDI. Fuente original impresa: Beyer, Vorschule im Klavierspiel Op. 101, Leipzig: Edition Peters nº 2721 [1895] (IMSLP). El archivo original se llama «initial-grade-piano-exam-pieces-2025-2026»",
    "key": {
      "tonic": "G",
      "mode": "major"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto (fijos, sin cambios), que es el valor por defecto de MuseScore: no es una indicación del autor. Para aprender, baja la velocidad.",
    "notes_text": [
      "no lleva barras de repetición ni indicaciones de tempo; los compases 9-13 repiten literalmente los 1-5 en las dos manos y del 14 al 16 la pieza se cierra con material nuevo",
      "solo usa Sol, La, Si, Do y Re: no hay ningún Mi ni Fa en toda la pieza",
      "en el compás 4 y el 12 la derecha sostiene una redonda (Sol) mientras la izquierda sigue con negras",
      "la partitura imprime dedos solo en algunas notas (inicio de cada posición); el resto son propuestos con las mismas reglas que el resto de piezas"
    ],
    "allowedChromatics": [],
    "fingersDetail": "18 de 95 dedos impresos en la partitura (siempre mandan); 5 copiados de un compás de la misma forma que sí los imprime; 72 propuestos (posición de cinco dedos; la mano solo se mueve donde la partitura imprime un dedo que lo exige) y marcados con ? en el texto",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 95,
        "matched": 95,
        "midiNotesInWindow": 95,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationRatioMidiOverScore": [
          0.95,
          1.0
        ],
        "midiTempoEvents": [
          [
            0,
            120.0
          ]
        ],
        "detail": "las 95 notas del MIDI coinciden en tiempo y altura con las 95 que se pulsan en la partitura (las colas de ligadura no cuentan); tempo del MIDI: 120.0"
      }
    },
    "arrangerNote": "Impreso solo «Edited by James F. Brigham»: es el editor del nuevo grabado, no un arreglista. No se inventó ningún arreglista.",
    "keyNote": "La armadura impresa está vacía, pero la pieza solo usa Sol, La, Si, Do y Re y termina en Sol: es Sol mayor sin ningún Fa (no hay ni Fa ni Fa#)."
  },
  "text": `title: Melody in G
artist: Ferdinand Beyer
meter: 4/4
tempo: 120 quarter
key: Sol mayor (la partitura no lleva armadura y nunca usa Fa)
tip: Melodía de una sola línea con acompañamiento sencillo: la derecha se queda toda en la posición de cinco dedos Sol–La–Si–Do–Re (blancas, negras y una redonda) y la izquierda toca notas sueltas, sin acordes. Los dedos son los de la partitura donde los trae y propuestos donde no. Sin tempo impreso: empieza mucho más despacio de lo que suena por defecto.

[A] Frase 1 (c.1-4)
rh: B4/2:3 C5/2:4? | D5/2:5? C5/2:4? | B4/2:3? A4/2:2? | G4/1:1?
lh: G3/4:5 D4/4:1 A3/4:5 D4/4:1? | B3/4:3 D4/4:1? A3/4:4? D4/4:1? | G3/4:5? D4/4:1? C4/4:2 D4/4:1? | B3/4:3? D4/4:1? B3/4:3? D4/4:1?

[B] Frase 2 (c.5-8)
rh: A4/2:2? G4/2:1? | A4/2:2? G4/2:1? | C5/2:4 B4/2:3? | A4/4:2 D5/4:5? C5/4:4? A4/4:2?
lh: C4/4:2? D4/4:1? B3/4:3? D4/4:1? | C4/4:2? D4/4:1? B3/4:3? D4/4:1? | A3/4:4? D4/4:1? G3/4:5? B3/4:3? | D4/1:1?

[C] Frase 3 (c.9-12)
rh: B4/2:3? C5/2:4? | D5/2:5? C5/2:4? | B4/2:3? A4/2:2? | G4/1:1?
lh: G3/4:5? D4/4:1? A3/4:5? D4/4:1? | B3/4:3? D4/4:1? A3/4:4? D4/4:1? | G3/4:5? D4/4:1? C4/4:2? D4/4:1? | B3/4:3? D4/4:1? B3/4:3? D4/4:1?

[D] Frase 4 (c.13-16)
rh: A4/2:2? G4/2:1? | C5/2:4? B4/2:3? | A4/4:2 C5/4:4 B4/4:3 A4/4:2 | G4/4:1 B4/4:3? G4/2:1?
lh: C4/4:2? D4/4:1? B3/4:3? D4/4:1? | A3/4:4? D4/4:1? G3/4:5? B3/4:3? | C4/4:2 A3/4:4 D4/4:1 C4/4:2 | B3/4:3 D4/4:1? G3/2:5?

order: A B C D
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(MELODY_IN_G_BEYER);

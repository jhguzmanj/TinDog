// Piano Finger Exercises - Leanne Lawrence (MuseScore 2.0.3)
// Fuentes: PDF + MusicXML + MIDI. 14 compases, Do mayor, 4/4, tres ejercicios en la posición de
// cinco dedos (Do a Sol): escala en corcheas/semicorcheas, arpegios rotos y terceras.
// El XML y el MIDI coinciden nota por nota (358 notas tocadas en el MIDI, 0 diferencias).
//
// Las dos manos tocan las MISMAS notas, la izquierda una octava abajo (Do3 a Sol3).
// La partitura NO imprime dedos (ni el PDF ni el XML): todos son propuestos. Se usa la posición
// fija de cinco dedos, el mismo dedo por tecla:
//   derecha  Do=1 Re=2 Mi=3 Fa=4 Sol=5      izquierda  Do=5 Re=4 Mi=3 Fa=2 Sol=1
//
// REPETICIONES: la partitura tiene una barra de repetición hacia atrás al final del c.5 y otra al
// final del c.9, y NINGUNA de inicio. MuseScore lo interpreta como "vuelve al c.1" las dos veces y
// el MIDI toca A A B A B C (28 compases). Lo evidente es que cada ejercicio se repite una vez
// (A A B B C, 23 compases): falta la barra de inicio en el c.6. Se entrega A A B B C y queda dicho
// en notes_text y en el cruce con el MIDI. Para volver a la versión del MIDI: order: A A B A B C.

const PIANO_FINGER_EXERCISES = {
  id: 'piano-finger-exercises',
  cat: 'patrones',
  name: 'Piano Finger Exercises',
  artist: 'Leanne Lawrence',
  tip: 'Tres ejercicios en la posición de cinco dedos (Do a Sol), las dos manos a la vez con las mismas notas: escala, arpegios rotos y terceras. La partitura no trae dedos: son propuestos (derecha Do=1 … Sol=5; izquierda Do=5 … Sol=1). Cada ejercicio se repite una vez.',
  tempo: '120 quarter',
  spec: {
    "title": "Piano Finger Exercises",
    "composer": "Leanne Lawrence",
    "credit": "Piano Finger Exercises — Leanne Lawrence (título del PDF; en el MusicXML la obra se llama \"First Finger Exercise\")",
    "arrangerNote": "Solo aparece el compositor (Leanne Lawrence); ni el PDF ni el MusicXML (MuseScore 2.0.3) traen arreglista ni derechos. No se inventó.",
    "source": "partitura PDF + MusicXML (14 compases) + MIDI; alturas y ritmo del MusicXML, contrastados nota por nota con el MIDI; sin dedos impresos",
    "key": {
      "tonic": "C",
      "mode": "major"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto (fijos, sin cambios), no de una grabación.",
    "notes_text": [
      "las dos manos tocan las mismas notas, la izquierda una octava abajo; no hay cruce de manos",
      "la partitura imprime \"legato - staccato\" sobre los compases 1 y 6 y \"staccato\" sobre el 10 (los acordes llevan punto de staccato); startBeat/durationBeats son los valores escritos, la app no representa articulación. En el MIDI los acordes del ejercicio 3 suenan ~50 % de su valor y el resto ~95 %",
      "bajo la escala de los compases 1-2 el PDF imprime los nombres de nota (c d e f g f e d); es texto de ayuda, no cambia las notas",
      "REPETICIONES: barras de repetición hacia atrás al final de los compases 5 y 9, sin ninguna de inicio. Se entrega order = [A,A,B,B,C]: cada ejercicio dos veces, que es lo que la partitura quiere decir. El MIDI toca A A B A B C (MuseScore vuelve al compás 1 también en la segunda barra); si la app prefiere igualar el MIDI, basta cambiar order"
    ],
    "allowedChromatics": [],
    "fingersDetail": "todos propuestos (la partitura no trae dedos): posición fija de cinco dedos, el mismo dedo en la misma tecla; derecha Do=1 Re=2 Mi=3 Fa=4 Sol=5, izquierda Do=5 Re=4 Mi=3 Fa=2 Sol=1; en las terceras cada acorde conserva los dedos de sus teclas (Do-Mi 1-3, Re-Fa 2-4, Mi-Sol 3-5 en la derecha)",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "midiPlaybackOrder": ["A", "A", "B", "A", "B", "C"],
        "deliveredOrder": ["A", "A", "B", "B", "C"],
        "orderDiffersFromMidi": true,
        "scoreOnsets": 358,
        "matched": 358,
        "midiNotesInWindow": 358,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationRatioMidiOverScore": [0.5, 0.95],
        "durationDetail": "el MIDI toca cada nota al 95 % de su valor (legato) y los acordes con punto de staccato al 50 %; no son diferencias de lectura",
        "midiTempoEvents": [[0, 120], [20, 120], [56, 120]],
        "detail": "las 358 notas del MIDI (179 por mano) coinciden en tiempo y altura con la partitura leída en el orden del MIDI (A A B A B C, 28 compases); en el orden entregado (A A B B C, 23 compases) hay 292"
      }
    }
  },
  text: `title: Piano Finger Exercises
artist: Leanne Lawrence
meter: 4/4
tempo: 120 quarter
key: Do mayor

[A] Escala de cinco dedos, legato - staccato (c.1-5)
rh: C4/4:1? D4/4:2? E4/4:3? F4/4:4? | G4/4:5? F4/4:4? E4/4:3? D4/4:2? | C4/8:1? D4/8:2? E4/8:3? F4/8:4? G4/8:5? F4/8:4? E4/8:3? D4/8:2? | C4/16:1? D4/16:2? E4/16:3? F4/16:4? G4/16:5? F4/16:4? E4/16:3? D4/16:2? C4/16:1? D4/16:2? E4/16:3? F4/16:4? G4/16:5? F4/16:4? E4/16:3? D4/16:2? | C4/1:1? |
lh: C3/4:5? D3/4:4? E3/4:3? F3/4:2? | G3/4:1? F3/4:2? E3/4:3? D3/4:4? | C3/8:5? D3/8:4? E3/8:3? F3/8:2? G3/8:1? F3/8:2? E3/8:3? D3/8:4? | C3/16:5? D3/16:4? E3/16:3? F3/16:2? G3/16:1? F3/16:2? E3/16:3? D3/16:4? C3/16:5? D3/16:4? E3/16:3? F3/16:2? G3/16:1? F3/16:2? E3/16:3? D3/16:4? | C3/1:5? |

[B] Arpegios rotos, legato - staccato (c.6-9)
rh: C4/8:1? E4/8:3? C4/8:1? E4/8:3? C4/8:1? E4/8:3? C4/4:1? | E4/8:3? G4/8:5? E4/8:3? G4/8:5? E4/8:3? G4/8:5? E4/4:3? | C4/8:1? E4/8:3? G4/8:5? E4/8:3? C4/8:1? E4/8:3? G4/8:5? E4/8:3? | C4/1:1? |
lh: C3/8:5? E3/8:3? C3/8:5? E3/8:3? C3/8:5? E3/8:3? C3/4:5? | E3/8:3? G3/8:1? E3/8:3? G3/8:1? E3/8:3? G3/8:1? E3/4:3? | C3/8:5? E3/8:3? G3/8:1? E3/8:3? C3/8:5? E3/8:3? G3/8:1? E3/8:3? | C3/1:5? |

[C] Terceras, staccato (c.10-14)
rh: [C4,E4]/4:1?,3? [C4,E4]/4:1?,3? [D4,F4]/4:2?,4? [D4,F4]/4:2?,4? | [E4,G4]/4:3?,5? [E4,G4]/4:3?,5? [D4,F4]/4:2?,4? [D4,F4]/4:2?,4? | [C4,E4]/4:1?,3? [D4,F4]/4:2?,4? [E4,G4]/4:3?,5? [D4,F4]/4:2?,4? | [C4,E4]/4:1?,3? [D4,F4]/4:2?,4? [E4,G4]/4:3?,5? [D4,F4]/4:2?,4? | [C4,E4]/1:1?,3? |
lh: [C3,E3]/4:5?,3? [C3,E3]/4:5?,3? [D3,F3]/4:4?,2? [D3,F3]/4:4?,2? | [E3,G3]/4:3?,1? [E3,G3]/4:3?,1? [D3,F3]/4:4?,2? [D3,F3]/4:4?,2? | [C3,E3]/4:5?,3? [D3,F3]/4:4?,2? [E3,G3]/4:3?,1? [D3,F3]/4:4?,2? | [C3,E3]/4:5?,3? [D3,F3]/4:4?,2? [E3,G3]/4:3?,1? [D3,F3]/4:4?,2? | [C3,E3]/1:5?,3? |

order: A A B B C
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(PIANO_FINGER_EXERCISES);

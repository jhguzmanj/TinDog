// Canon in C — Canon de Pachelbel en Do mayor, arreglo de Iori Yagami (nombre tal como viene en el MusicXML).
// Fuentes: MusicXML (MuseScore 3.6.2) + MIDI. 89 compases, 4/4. Sin dedos impresos: todos propuestos.
// La izquierda son arpegios de negras sueltas (no acordes en bloque) y repiten el mismo bucle de ocho compases.

const CANON_IN_C = {
  "id": "canon-in-c",
  "cat": "clasica",
  "name": "Canon in C",
  "artist": "Pachelbel / arr. Iori Yagami",
  "tip": "Canon de Pachelbel en Do mayor (89 compases): la izquierda toca el mismo arpegio de ocho compases (Do–Sol–Lam–Mim–Fa–Do–Fa–Sol) una y otra vez, notas sueltas de negra (salvo el acorde final), y la derecha va cambiando de ritmo encima: redondas, terceras, blancas, negras y corcheas. Cada vuelta de ocho compases es una sección para practicar por separado. La partitura no trae dedos: todos son propuestos. Sin tempo impreso: empieza despacio.",
  "tempo": "120 quarter",
  "spec": {
    "title": "Canon in C",
    "composer": "Johann Pachelbel",
    "credit": "Canon in C — Iori Yagami (tal como está impreso en el MusicXML; es un arreglo del Canon de Pachelbel)",
    "source": "partitura MusicXML (MuseScore 3.6.2, 89 compases) + MIDI; alturas y ritmo del MusicXML, contrastados nota por nota con el MIDI; sin dedos impresos",
    "key": {
      "tonic": "C",
      "mode": "major"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto (fijos, sin cambios), que es el valor por defecto de MuseScore: no es una indicación del autor. Para aprender, baja la velocidad.",
    "notes_text": [
      "sin barras de repetición, armadura ni indicaciones de tempo; 89 compases = 11 vueltas de ocho compases (c.1-88) más un compás final",
      "el bajo repite once veces el mismo bucle de ocho compases (idéntico en todas las vueltas); la derecha cambia de ritmo y de notas en cada vuelta: redondas, terceras, blancas, negras y corcheas",
      "las ligaduras (c.49-50, 52-54 y 55-56) y los silencios (c.52, 54, 55 y 56) están solo en la derecha; la izquierda no tiene ningún silencio; el compás 89 es un acorde de tres notas en cada mano",
      "el nombre del archivo subido atribuye la pieza a J. S. Bach, pero la música es el Canon de Pachelbel; el XML solo nombra a Iori Yagami (como arreglista)"
    ],
    "allowedChromatics": [],
    "fingersDetail": "0 de 677 dedos impresos en la partitura (siempre mandan); 0 copiados de un compás de la misma forma que sí los imprime; 677 propuestos con el modelo de posición de mano y marcados con ? en el texto",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 677,
        "matched": 677,
        "midiNotesInWindow": 677,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationRatioMidiOverScore": [
          0.5,
          0.95
        ],
        "midiTempoEvents": [
          [
            0,
            120.0
          ]
        ],
        "detail": "las 677 notas del MIDI coinciden en tiempo y altura con las 677 que se pulsan en la partitura (las colas de ligadura no cuentan); tempo del MIDI: 120.0"
      }
    },
    "arranger": "Iori Yagami",
    "arrangerNote": "El MusicXML trae «Iori Yagami» en el campo compositor y nada más. Se toma como autor del arreglo porque la música es el Canon de Pachelbel (progresión Do–Sol–Lam–Mim–Fa–Do–Fa–Sol, inconfundible). El nombre del archivo subido dice «Johann Sebastian Bach»: no coincide con la música, así que no se atribuyó a Bach."
  },
  "text": `title: Canon in C
artist: Pachelbel / arr. Iori Yagami
meter: 4/4
tempo: 120 quarter
key: Do mayor
tip: Canon de Pachelbel en Do mayor (89 compases): la izquierda toca el mismo arpegio de ocho compases (Do–Sol–Lam–Mim–Fa–Do–Fa–Sol) una y otra vez, notas sueltas de negra (salvo el acorde final), y la derecha va cambiando de ritmo encima: redondas, terceras, blancas, negras y corcheas. Cada vuelta de ocho compases es una sección para practicar por separado. La partitura no trae dedos: todos son propuestos. Sin tempo impreso: empieza despacio.

[A] Vuelta 1 (c.1-8)
rh: E5/1:4? | D5/1:3? | C5/1:2? | B4/1:1? | A4/1:2? | G4/1:1? | A4/1:2? | B4/1:3?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[B] Vuelta 2 (c.9-16)
rh: [C5,E5]/1:3?,5? | [B4,D5]/1:2?,4? | [A4,C5]/1:1?,3? | [G4,B4]/1:3?,5? | [F4,A4]/1:2?,4? | [E4,G4]/1:1?,3? | [F4,A4]/1:2?,4? | [G4,B4]/1:3?,5?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[C] Vuelta 3 (c.17-24)
rh: C4/2:1? E4/2:3? | G4/2:5? F4/2:4? | E4/2:3? C4/2:1? | E4/2:3? D4/2:2? | C4/2:1? A4/2:5? | C4/2:1? G4/2:4? | F4/2:3? A4/2:5? | G4/2:4? F4/2:3?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[D] Vuelta 4 (c.25-32)
rh: E4/2:2? C4/2:1? | D4/2:2? B4/2:3? | C5/2:1? E5/2:3? | G5/2:5? G4/2:1? | A4/2:2? F4/2:1? | G4/2:3? E4/2:2? | C4/2:1? C5/2:4? | D5/2:5? C5/4:4? B4/4:3?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[E] Vuelta 5 (c.33-40)
rh: C5/4:4? B4/4:3? C5/2:4? | B4/4:3? G4/4:2? D4/4:1? E4/4:2? | C4/4:1? C5/4:4? B4/4:3? A4/4:2? | B4/4:1? E5/4:2? G5/4:4? A5/4:5? | F5/4:3? E5/4:2? D5/4:1? F5/4:4? | E5/4:3? D5/4:2? C5/4:1? B4/4:2? | A4/4:1? G4/4:2? F4/4:1? E4/4:2? | D4/4:1? F4/4:4? E4/4:3? D4/4:2?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[F] Vuelta 6 (c.41-48)
rh: C4/4:1? D4/4:2? E4/4:3? F4/4:4? | G4/4:5? D4/4:1? G4/4:4? F4/4:3? | E4/4:2? A4/4:5? G4/4:4? F4/4:3? | G4/4:5? F4/4:4? E4/4:3? D4/4:2? | C4/2:1? A4/4:3? B4/4:4? | C5/4:5? B4/4:4? A4/4:3? G4/4:2? | F4/4:1? E4/4:2? D4/4:1? A4/4:2? | G4/4:1? A4/4:2? G4/4:1? G4/4:1?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[G] Vuelta 7 (c.49-56)
rh: E5/2:4? E5/8:4? D5/8:3? C5/8:2? D5/8:3?~ | D5/4.:3? E5/8:4? F5/8:5? E5/8:4? D5/8:3? E5/8:4? | C5/4:2? C5/4:2? B4/4:1? C5/4:2? | B4/8:1? G4/8:2?~ G4/8:2? E4/4:1? r/8 r/4 | A4/4.:2? B4/4:3? C5/4:4? G4/8:1?~ | G4/2..:1? r/8 | A4/4.:2? r/8 G4/4:1? A4/8:2? B4/8:3?~ | B4/4.:3? r/8 r/2
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[H] Vuelta 8 (c.57-64)
rh: G5/4:5? E5/8:3? F5/8:4? G5/4:5? E5/8:3? F5/8:4? | G5/8:5? G4/8:1? A4/8:2? B4/8:1? C5/8:2? D5/8:3? E5/8:4? F5/8:5? | E5/4:4? C5/8:2? D5/8:3? E5/4:4? E4/8:1? F4/8:2? | G4/8:3? A4/8:4? G4/8:3? F4/8:2? G4/8:3? E4/8:1? F4/8:2? G4/8:3? | F4/4:2? A4/8:5? G4/8:4? F4/4:3? E4/8:2? D4/8:1? | E4/8:3? D4/8:2? C4/8:1? D4/8:2? E4/8:3? F4/8:1? G4/8:2? A4/8:3? | F4/4:1? A4/8:3? G4/8:2? A4/4:3? B4/8:4? C5/8:5? | G4/8:2? A4/8:1? B4/8:2? C5/8:1? D5/8:2? E5/8:3? F5/8:4? G5/8:5?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[I] Vuelta 9 (c.65-72)
rh: [E5,G5]/4:3?,5? [C5,E5]/8:1?,3? [D5,F5]/8:2?,4? [E5,G5]/4:3?,5? [C5,E5]/8:1?,3? [D5,F5]/8:2?,4? | [D5,G5]/8:2?,5? G4/8:1? A4/8:2? B4/8:1? C5/8:2? D5/8:3? E5/8:4? F5/8:5? | [C5,E5]/4:2?,4? [A4,C5]/8:1?,3? [B4,D5]/8:2?,4? [C5,E5]/4:3?,5? E4/8:1? F4/8:2? | G4/8:3? A4/8:4? G4/8:2? F4/8:1? G4/8:2? C5/8:5? B4/8:4? C5/8:5? | A4/4:3? C5/8:5? B4/8:4? A4/4:3? G4/8:2? F4/8:1? | G4/8:3? F4/8:2? E4/8:1? F4/8:2? G4/8:3? A4/8:1? B4/8:2? C5/8:3? | A4/4:1? C5/8:3? B4/8:2? C5/4:3? B4/8:2? A4/8:1? | B4/8:2? C5/8:3? D5/8:4? C5/8:3? B4/8:2? C5/8:3? A4/8:1? B4/8:2?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[J] Vuelta 10 (c.73-80)
rh: [C5,E5]/1:3?,5? | [B4,D5]/1:2?,4? | [A4,C5]/1:1?,3? | [G4,B4]/1:3?,5? | [F4,A4]/1:2?,4? | [E4,G4]/1:1?,3? | [F4,A4]/1:2?,4? | [G4,B4]/1:3?,5?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[K] Vuelta 11 (c.81-88)
rh: E5/4:2? E5/8:2? F5/8:3? G5/2:4? | G5/8:4? A5/8:5? G5/8:4? F5/8:3? E5/8:2? F5/8:4? E5/8:3? D5/8:2? | C5/4:1? C5/8:1? D5/8:2? E5/2:3? | E5/8:3? F5/8:4? E5/8:3? D5/8:2? C5/8:1? D5/8:2? C5/8:1? B4/8:2? | A4/4:1? A4/8:1? B4/8:2? C5/2:3? | G4/2:1? E4/2:2? | C4/2:1? C5/2:4? | [B4,D5]/2:3?,5? [G4,B4]/2:1?,3?
lh: C3/4:5? E3/4:3? G3/4:2? C4/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1? | A2/4:5? C3/4:3? E3/4:2? A3/4:1? | E2/4:5? G2/4:3? B2/4:2? E3/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | C3/4:5? E3/4:3? G3/4:2? C4/4:1? | F2/4:5? A2/4:3? C3/4:2? F3/4:1? | G2/4:5? B2/4:3? D3/4:2? G3/4:1?

[L] Final (c.89)
rh: [E4,G4,C5]/1:1?,2?,4?
lh: [C2,G2,E3]/1:5?,2?,1?

order: A B C D E F G H I J K L
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(CANON_IN_C);

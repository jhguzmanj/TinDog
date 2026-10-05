window.SONGS = window.SONGS || [];
window.SONGS.push({
  id: 'canon-c-bach',
  spec: {
    "title": "Canon in C",
    "composer": "Johann Sebastian Bach / Iori Yagami (arr.)",
    "credit": "Arreglo moderno de Canon, versión simplificada",
    "source": "Arreglo digital",
    "key": {
      "tonic": "C",
      "mode": "major"
    },
    "tempoSource": "standard",
    "tempoNote": "quarter note = 120",
    "notes_text": [
      "89 measures, 4/4 time",
      "Classic canon with harmonic progression",
      "Right hand: melody",
      "Left hand: harmonic support (block chords)"
    ],
    "fingersDetail": "Fingering proposed based on standard positions.",
    "allowedChromatics": []
  },
  text: `
title: Canon in C
artist: Bach / Iori Yagami (arr.)
key: C major
meter: 4/4
tempo: 120 quarter
source: Canon in C (Pachelbel-style progression)
tip: Classic canon with familiar harmonic progression. Block chords in the left hand support a flowing melody.

[A] Canon Theme (m.1-16)
rh: E5/4:5 | D5/4:4 | C5/4:3 | B4/4:2 | A4/4:1 | G4/4:5 | A4/4:2 | B4/4:3 |
rh: C5/4:1 | D5/4:2 | E5/4:3 | E5/2:3 C5/2:1 | B4/4:2 | A4/4:1 | G4/4:5 | G4/1:5

lh: [C3,E3,G3,C4]/4:5,3,1,1 | [G2,B2,D3,G3]/4:5,3,1,1 | [A2,C3,E3,A3]/4:5,3,1,1 | [E2,G2,B2,E3]/4:5,3,1,1 |
lh: [F2,A2,C3,F3]/4:5,3,1,1 | [C3,E3,G3,C4]/4:5,3,1,1 | [F2,A2,C3,F3]/4:5,3,1,1 | [G2,B2,D3,G3]/4:5,3,1,1 |
lh: [C3,E3,G3,C4]/4:5,3,1,1 | [D3,F3,A3,D4]/4:5,3,1,1 | [E3,G3,B3,E4]/4:5,3,1,1 | [E3,G3,B3,E4]/2:5,3,1,1 [C3,E3,G3,C4]/2:5,3,1,1 |
lh: [B2,D3,G3,B3]/4:5,3,1,1 | [A2,C3,F3,A3]/4:5,3,1,1 | [G2,B2,D3,G3]/4:5,3,1,1 | [C3,E3,G3,C4]/1:5,3,1,1

order: A
`.trim(),
});

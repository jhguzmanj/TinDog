// Cannon in D - Johann Pachelbel
// Transcribed from MusicXML + cross-validated note-by-note against the MIDI file
// (both sources agree exactly). 49 measures, D major, 4/4, tempo marking 108.
// The MIDI reveals a real ritardando in the last measures (108->90->70->45 BPM)
// that isn't representable in the text notation format (no per-measure tempo).
//
// IMPORTANT: this arrangement has 2-3 note chords in BOTH hands from measure 17
// on - it's meaningfully harder than the "easy" pieces in this project, which
// deliberately avoid chords (see Estrellita, Dios está aquí). Categorized
// accordingly, not as 'facil'.

const CANNON_IN_D = {
  id: 'cannon-in-d',
  cat: 'clasica',
  name: 'Cannon in D',
  artist: 'Johann Pachelbel',
  tip: 'Tiene acordes de 2-3 notas en ambas manos desde el compás 17 - más avanzada que el resto del catálogo. El original trae un ritardando real al final (el MIDI baja de 108 a 45 BPM en los últimos compases) que aquí no se puede escribir; tocarlo más lento a mano en esos compases.',
  tempo: '108 quarter',
  spec: {
    "title": "Cannon in D",
    "composer": "Pachelbel",
    "arranger": "Arnav",
    "credit": "Cannon in D — Originally composed by Johann Pachelbel — Arranged by Arnav (tal como está impreso)",
    "source": "partitura PDF + MusicXML (49 compases); alturas del MusicXML, cruzadas nota por nota con el MIDI",
    "key": {
      "tonic": "D",
      "mode": "major"
    },
    "tempoSource": "printed",
    "tempoNote": "♩=108 impreso en el compás 1; el ritardando final también está impreso (ver tempoChanges)",
    "tempoChanges": [
      {
        "bar": 47,
        "beat": 0,
        "quarterBpm": 90.0
      },
      {
        "bar": 48,
        "beat": 0,
        "quarterBpm": 70.0
      },
      {
        "bar": 49,
        "beat": 0,
        "quarterBpm": 45.0
      }
    ],
    "notes_text": [
      "ritardando impreso: ♩=90 en el compás 47, ♩=70 en el 48 y ♩=45 en el 49 (tempoChanges); la especificación solo tiene un quarterBpm, así que el ritardando queda aquí y en tempoChanges"
    ],
    "allowedChromatics": []
  },
  text: `title: Cannon in D
artist: Johann Pachelbel
meter: 4/4
tempo: 108 quarter
key: Re mayor (2 sostenidos)

[A] Bajo y primer arpegio (c.1-8)
rh: r/4 F#4/4:1? A4/4:3? D5/4:5? | r/4 E4/4:1? A4/4:3? C#5/4:5? | r/4 D4/4:1? F#4/4:3? B4/4:5? | r/4 C#4/4:1? F#4/4:4? A4/4:5? | r/4 B3/4:1? D4/4:3? G4/4:5? | r/4 A3/4:1? D4/4:3? F#4/4:5? | r/4 B3/4:1? D4/4:2? G4/4:5? | r/4 C#4/4:1? E4/4:2? A4/4:4? |
lh: D4/1:1? | A3/1:4? | B3/1:2? | F#3/1:4? | G3/1:3? | D3/1:5? | G3/1:4? | A3/1:3? |

[B] La derecha sostiene, la izquierda arpegia (c.9-16)
rh: F#5/1:5? | E5/1:4? | D5/1:3? | C#5/1:3? | B4/1:2? | A4/1:1? | B4/1:3? | C#5/1:5? |
lh: D4/4:5? F#4/4:4? A4/4:3? D5/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? | B3/4:5? D4/4:4? F#4/4:3? B4/4:1? | F#3/4:5? C#4/4:4? F#4/4:2? A4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | D3/4:5? F#3/4:4? A3/4:3? D4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? |

[C] Melodía con acordes (c.17-32)
rh: [D4,D5]/4:1?,5? C#5/4:4? D5/4:5? F#4/4:1? | [D4,D5]/4:1?,5? A4/4:5? E4/4:2? F#4/4:3? | [D4,D5]/4:1?,5? D5/4:5? C#5/4:4? B4/4:3? | [C#4,C#5]/4:1?,5? F#5/4:3? A5/4:4? B5/4:5? | [G4,G5]/4:1?,5? F#5/4:5? E5/4:4? G5/4:5? | [F#4,F#5]/4:1?,5? E5/4:5? D5/4:4? C#5/4:3? | [B3,B4]/4:1?,5? A4/4:5? G4/4:3? F#4/4:2? | [E4,E5]/4:3?,5? G4/4:3? F#4/4:2? E4/4:1? | [D4,D5]/4:1?,5? E4/4:2? F#4/4:3? G4/4:1? | [A4,A5]/4:4?,5? E4/4:1? A4/4:4? G4/4:2? | [F#4,F#5]/4:3?,5? B4/4:4? A4/4:2? G4/4:1? | [A4,A5]/4:4?,5? G4/4:1? F#4/4:3? E4/4:2? | [D4,D5]/4:3?,5? B3/4:1? B4/4:4? C#5/4:5? | [D4,D5]/4:1?,5? C#5/4:5? B4/4:4? A4/4:3? | G4/4:2? F#4/4:2? E4/4:1? B4/4:5? | A4/4:3? B4/4:4? A4/2:1? |
lh: [D2,A2,D3]/1:5?,3?,1? | [A2,E3,A3]/1:5?,2?,1? | [B2,F#3,B3]/1:5?,2?,1? | [F#2,C#3,F#3]/1:5?,3?,1? | [G2,D3,G3]/1:5?,2?,1? | [D2,A2,D3]/1:5?,3?,1? | [G2,D3,F#3]/1:5?,2?,1? | [A2,E3,A3]/1:5?,2?,1? | [D2,A2,D3]/1:5?,3?,1? | [A2,E3,A3]/1:5?,2?,1? | [F#2,C#3,F#3]/1:5?,3?,1? | [G2,D3,F#3]/1:5?,2?,1? | [B2,F#3,B3]/1:5?,2?,1? | [G2,D3,G3]/1:5?,2?,1? | [D2,A2,D3]/1:5?,3?,1? | [A2,E3,A3]/1:5?,2?,1? |

[D] Variación en corcheas (c.33-40)
rh: A5/4:5? F#5/8:4? G5/8:1? A5/4:2? F#5/8:1? G5/8:3? | A5/8:5? A4/8:1? B4/8:2? C#5/8:3? D5/8:1? E5/8:2? F#5/8:3? G5/8:4? | F#5/4:3? D5/8:1? E5/8:3? F#5/4:5? F#4/8:1? G4/8:2? | A4/8:3? B4/8:4? A4/8:2? G4/8:1? A4/8:2? F#4/8:1? G4/8:2? A4/8:3? | G4/4:1? B4/8:4? A4/8:3? G4/4:2? F#4/8:2? E4/8:1? | F#4/8:3? E4/8:2? D4/8:1? E4/8:2? F#4/8:3? G4/8:1? A4/8:2? B4/8:3? | G4/4:1? B4/8:3? A4/8:1? B4/4:2? C#5/8:3? D5/8:4? | A4/8:1? B4/8:2? C#5/8:3? D5/8:1? E5/8:2? F#5/8:3? G5/8:4? A5/8:5? |
lh: [D4,F#4]/1:3?,1? | [A3,C#4]/1:5?,3? | [G3,B3]/1:5?,3? | [F#3,A3]/1:5?,3? | [G3,B3]/1:5?,3? | [D4,F#4]/1:3?,1? | [G3,B3]/1:5?,3? | [A3,C#4]/1:5?,3? |

[E] Acordes sostenidos (c.41-48)
rh: [D5,F#5]/1:1?,3? | [C#5,E5]/1:3?,5? | [B4,D5]/1:3?,5? | [A4,C#5]/1:2?,5? | [G4,B4]/1:1?,3? | [F#4,A4]/1:1?,2? | [G4,B4]/2:1?,3? [C#5,E5]/2:3?,5? | [A4,C#5]/2:1?,3? [C#5,E5]/2:3?,5? |
lh: D4/4:5? F#4/4:4? A4/4:3? D5/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? | B3/4:5? D4/4:4? F#4/4:3? B4/4:1? | F#3/4:5? C#4/4:4? F#4/4:2? A4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | D3/4:5? F#3/4:4? A3/4:3? D4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? |

[F] Acorde final (c.49)
rh: [D5,F#5,A5]/1:1?,3?,5? |
lh: [D3,F#3,A3,D4]/1:5?,4?,2?,1? |

order: A B C D E F
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(CANNON_IN_D);

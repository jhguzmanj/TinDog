// Cannon in D (Easy) - Johann Pachelbel
// Simplified from cannon-in-d.js: every 2-3 note chord reduced to one note per
// hand, same convention the project already uses (Estrellita, Dios está aquí).
// Rule applied mechanically, not by ear: right hand keeps the HIGHEST note of
// each chord (the melody line usually rides on top), left hand keeps the
// LOWEST note (the real bass - same as every other easy piece here). This is
// an arrangement choice, not something from a source - the full version with
// real chords is cannon-in-d.js, for when chords aren't new anymore.
// Same 49 measures, same notes/rhythm otherwise - nothing else changed.

const CANNON_IN_D_EASY = {
  id: 'cannon-in-d-easy',
  cat: 'facil',
  name: 'Cannon in D (Fácil)',
  artist: 'Johann Pachelbel',
  tip: 'Versión sin acordes de la pieza completa (cannon-in-d): una sola nota por mano todo el tiempo. Cuando domines esta, la versión con acordes reales está en el catálogo con el mismo nombre sin "(Fácil)".',
  tempo: '108 quarter',
  spec: {
    "title": "Cannon in D (Fácil)",
    "composer": "Pachelbel",
    "arranger": "Arnav (versión simplificada mecánicamente, ver source)",
    "credit": "Cannon in D — Originally composed by Johann Pachelbel — Arranged by Arnav (tal como está impreso)",
    "source": "derivada de cannon-in-d: en cada acorde la derecha conserva la nota MÁS AGUDA y la izquierda la MÁS GRAVE; se quitaron 69 notas, ritmo y compases idénticos. Es una decisión de arreglo, no algo que diga la partitura",
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
      "ritardando impreso: ♩=90 en el compás 47, ♩=70 en el 48 y ♩=45 en el 49 (tempoChanges); la especificación solo tiene un quarterBpm, así que el ritardando queda aquí y en tempoChanges",
      "versión sin acordes: 69 notas de la partitura original no están aquí (por eso el MIDI tiene más notas: midiCrossCheck en modo \"subset\")"
    ],
    "allowedChromatics": [],
    "extraChecks": {
      "simplification": {
        "rule": "derecha = nota más aguda de cada acorde; izquierda = más grave",
        "removedNotes": 69,
        "keptNotes": 259
      }
    }
  },
  text: `title: Cannon in D (Fácil)
artist: Johann Pachelbel
meter: 4/4
tempo: 108 quarter
key: Re mayor (2 sostenidos)

[A] Bajo y primer arpegio (c.1-8)
rh: r/4 F#4/4:1? A4/4:3? D5/4:5? | r/4 E4/4:1? A4/4:3? C#5/4:5? | r/4 D4/4:1? F#4/4:3? B4/4:5? | r/4 C#4/4:1? F#4/4:4? A4/4:5? | r/4 B3/4:1? D4/4:3? G4/4:5? | r/4 A3/4:1? D4/4:3? F#4/4:5? | r/4 B3/4:1? D4/4:2? G4/4:5? | r/4 C#4/4:1? E4/4:2? A4/4:4? |
lh: D4/1:1? | A3/1:4? | B3/1:2? | F#3/1:4? | G3/1:3? | D3/1:5? | G3/1:4? | A3/1:3? |

[B] La derecha sostiene, la izquierda arpegia (c.9-16)
rh: F#5/1:5? | E5/1:4? | D5/1:3? | C#5/1:3? | B4/1:2? | A4/1:1? | B4/1:2? | C#5/1:3? |
lh: D4/4:5? F#4/4:4? A4/4:3? D5/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? | B3/4:5? D4/4:4? F#4/4:3? B4/4:1? | F#3/4:5? C#4/4:4? F#4/4:2? A4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | D3/4:5? F#3/4:4? A3/4:3? D4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? |

[C] Melodía (c.17-32)
rh: D5/4:4? C#5/4:3? D5/4:5? F#4/4:1? | D5/4:5? A4/4:3? E4/4:1? F#4/4:2? | D5/4:5? D5/4:5? C#5/4:2? B4/4:1? | C#5/4:2? F#5/4:3? A5/4:4? B5/4:5? | G5/4:3? F#5/4:2? E5/4:1? G5/4:4? | F#5/4:3? E5/4:2? D5/4:1? C#5/4:4? | B4/4:3? A4/4:2? G4/4:1? F#4/4:1? | E5/4:5? G4/4:3? F#4/4:2? E4/4:1? | D5/4:5? E4/4:1? F#4/4:2? G4/4:3? | A5/4:5? E4/4:1? A4/4:4? G4/4:2? | F#5/4:5? B4/4:3? A4/4:2? G4/4:1? | A5/4:5? G4/4:3? F#4/4:2? E4/4:1? | D5/4:5? B3/4:1? B4/4:3? C#5/4:4? | D5/4:5? C#5/4:4? B4/4:3? A4/4:3? | G4/4:2? F#4/4:2? E4/4:1? B4/4:5? | A4/4:3? B4/4:4? A4/2:1? |
lh: D2/1:5? | A2/1:2? | B2/1:1? | F#2/1:4? | G2/1:3? | D2/1:5? | G2/1:2? | A2/1:1? | D2/1:5? | A2/1:1? | F#2/1:4? | G2/1:3? | B2/1:1? | G2/1:3? | D2/1:5? | A2/1:3? |

[D] Variación en corcheas (c.33-40)
rh: A5/4:5? F#5/8:4? G5/8:1? A5/4:2? F#5/8:1? G5/8:3? | A5/8:5? A4/8:1? B4/8:2? C#5/8:3? D5/8:1? E5/8:2? F#5/8:3? G5/8:4? | F#5/4:3? D5/8:1? E5/8:3? F#5/4:5? F#4/8:1? G4/8:2? | A4/8:3? B4/8:4? A4/8:2? G4/8:1? A4/8:2? F#4/8:1? G4/8:2? A4/8:3? | G4/4:1? B4/8:4? A4/8:3? G4/4:2? F#4/8:2? E4/8:1? | F#4/8:3? E4/8:2? D4/8:1? E4/8:2? F#4/8:3? G4/8:1? A4/8:2? B4/8:3? | G4/4:1? B4/8:3? A4/8:1? B4/4:2? C#5/8:3? D5/8:4? | A4/8:1? B4/8:2? C#5/8:3? D5/8:1? E5/8:2? F#5/8:3? G5/8:4? A5/8:5? |
lh: D4/1:1? | A3/1:3? | G3/1:4? | F#3/1:5? | G3/1:4? | D4/1:1? | G3/1:5? | A3/1:4? |

[E] Melodía sostenida (c.41-48)
rh: F#5/1:3? | E5/1:2? | D5/1:1? | C#5/1:3? | B4/1:2? | A4/1:1? | B4/2:2? E5/2:5? | C#5/2:2? E5/2:3? |
lh: D4/4:5? F#4/4:4? A4/4:3? D5/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? | B3/4:5? D4/4:4? F#4/4:3? B4/4:1? | F#3/4:5? C#4/4:4? F#4/4:2? A4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | D3/4:5? F#3/4:4? A3/4:3? D4/4:1? | G3/4:5? B3/4:4? D4/4:3? G4/4:1? | A3/4:5? C#4/4:4? E4/4:3? A4/4:1? |

[F] Nota final (c.49)
rh: A5/1:5? |
lh: D3/1:5? |

order: A B C D E F
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(CANNON_IN_D_EASY);

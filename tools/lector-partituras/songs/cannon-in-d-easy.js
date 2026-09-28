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
  text: `title: Cannon in D (Fácil)
artist: Johann Pachelbel
meter: 4/4
tempo: 108 quarter
key: Re mayor (2 sostenidos)

[A] Bajo y primer arpegio (c.1-8)
rh: r/4 F#4/4 A4/4 D5/4 | r/4 E4/4 A4/4 C#5/4 | r/4 D4/4 F#4/4 B4/4 | r/4 C#4/4 F#4/4 A4/4 | r/4 B3/4 D4/4 G4/4 | r/4 A3/4 D4/4 F#4/4 | r/4 B3/4 D4/4 G4/4 | r/4 C#4/4 E4/4 A4/4 |
lh: D4/1 | A3/1 | B3/1 | F#3/1 | G3/1 | D3/1 | G3/1 | A3/1 |

[B] La derecha sostiene, la izquierda arpegia (c.9-16)
rh: F#5/1 | E5/1 | D5/1 | C#5/1 | B4/1 | A4/1 | B4/1 | C#5/1 |
lh: D4/4 F#4/4 A4/4 D5/4 | A3/4 C#4/4 E4/4 A4/4 | B3/4 D4/4 F#4/4 B4/4 | F#3/4 C#4/4 F#4/4 A4/4 | G3/4 B3/4 D4/4 G4/4 | D3/4 F#3/4 A3/4 D4/4 | G3/4 B3/4 D4/4 G4/4 | A3/4 C#4/4 E4/4 A4/4 |

[C] Melodía (c.17-32)
rh: D5/4 C#5/4 D5/4 F#4/4 | D5/4 A4/4 E4/4 F#4/4 | D5/4 D5/4 C#5/4 B4/4 | C#5/4 F#5/4 A5/4 B5/4 | G5/4 F#5/4 E5/4 G5/4 | F#5/4 E5/4 D5/4 C#5/4 | B4/4 A4/4 G4/4 F#4/4 | E5/4 G4/4 F#4/4 E4/4 | D5/4 E4/4 F#4/4 G4/4 | A5/4 E4/4 A4/4 G4/4 | F#5/4 B4/4 A4/4 G4/4 | A5/4 G4/4 F#4/4 E4/4 | D5/4 B3/4 B4/4 C#5/4 | D5/4 C#5/4 B4/4 A4/4 | G4/4 F#4/4 E4/4 B4/4 | A4/4 B4/4 A4/2 |
lh: D2/1 | A2/1 | B2/1 | F#2/1 | G2/1 | D2/1 | G2/1 | A2/1 | D2/1 | A2/1 | F#2/1 | G2/1 | B2/1 | G2/1 | D2/1 | A2/1 |

[D] Variación en corcheas (c.33-40)
rh: A5/4 F#5/8 G5/8 A5/4 F#5/8 G5/8 | A5/8 A4/8 B4/8 C#5/8 D5/8 E5/8 F#5/8 G5/8 | F#5/4 D5/8 E5/8 F#5/4 F#4/8 G4/8 | A4/8 B4/8 A4/8 G4/8 A4/8 F#4/8 G4/8 A4/8 | G4/4 B4/8 A4/8 G4/4 F#4/8 E4/8 | F#4/8 E4/8 D4/8 E4/8 F#4/8 G4/8 A4/8 B4/8 | G4/4 B4/8 A4/8 B4/4 C#5/8 D5/8 | A4/8 B4/8 C#5/8 D5/8 E5/8 F#5/8 G5/8 A5/8 |
lh: D4/1 | A3/1 | G3/1 | F#3/1 | G3/1 | D4/1 | G3/1 | A3/1 |

[E] Melodía sostenida (c.41-48)
rh: F#5/1 | E5/1 | D5/1 | C#5/1 | B4/1 | A4/1 | B4/2 E5/2 | C#5/2 E5/2 |
lh: D4/4 F#4/4 A4/4 D5/4 | A3/4 C#4/4 E4/4 A4/4 | B3/4 D4/4 F#4/4 B4/4 | F#3/4 C#4/4 F#4/4 A4/4 | G3/4 B3/4 D4/4 G4/4 | D3/4 F#3/4 A3/4 D4/4 | G3/4 B3/4 D4/4 G4/4 | A3/4 C#4/4 E4/4 A4/4 |

[F] Nota final (c.49)
rh: A5/1 |
lh: D3/1 |

order: A B C D E F
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(CANNON_IN_D_EASY);

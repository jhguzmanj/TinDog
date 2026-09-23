// Für Elise (Easy Version) - Beethoven
// Extracted from MuseScore PDF + visual verification
// 19 measures, 3/4 time, A minor key signature
// RH melody + LH accompaniment (simple sustained notes)

const FUR_ELISE_EASY = {
  id: 'fur-elise-easy',
  cat: 'clasica',
  name: 'Für Elise (Fácil)',
  artist: 'Ludwig van Beethoven',
  tip: 'Melodía muy famosa de Beethoven. La izquierda sostiene notas largas (blancas). Derecha arranca rápido con corcheas E D# E D# E B D C.',
  tempo: '80 quarter',
  text: `title: Für Elise
artist: Ludwig van Beethoven
meter: 3/4
tempo: 80 quarter

[A] Tema Principal (c.1-10)
rh: r/2 E5/8:4 D#5/8:3 | r/2. E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | r/2.
rh: A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | A3/2:5 r/4
rh: B4/4:1 r/8 E4/8:1 G#4/8:2 B4/8:3 | E3/2:5 r/4
rh: C5/4:2 r/8 E4/8:1 E5/8:4 D#5/8:3 | A3/2:5 r/4
rh: E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | r/2.
rh: A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | A3/2:5 r/4
rh: B4/4:1 r/8 E4/8:1 C5/8:3 B4/8:2 | E3/2:5 r/4
rh: A4/4:1 r/8 B4/8:2 C5/8:3 D5/8:4 | A3/2:5 r/4

lh: r/2 | A3/2:5 | r/4 r/8 A3/2:5 |
lh: E3/2:5 | A3/2:5 | r/2 | A3/2:5 | r/4 r/8 E3/2:5 | A3/2:5 |

[B] Variación (c.11-19)
rh: E5/4:4 r/8 G4/8:1 F5/8:4 E5/8:3 | C4/2:2 r/4
rh: D5/4:3 r/8 F4/8:1 E5/8:4 D5/8:3 | B3/2:5 r/4
rh: C5/4:2 r/8 E4/8:1 D5/8:3 C5/8:2 | A3/2:5 r/4
rh: B4/2:2 r/4 | G#3/2:3 r/4
rh: E5/8:4 D#5/8:3 E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | A3/2:5 r/4
rh: B4/4:1 r/8 E4/8:1 G#4/8:2 B4/8:3 | E3/2:5 r/4
rh: C5/4:2 r/8 E4/8:1 E5/8:4 D#5/8:3 | A3/2:5 r/4
rh: E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | A3/2:5 r/4
rh: B4/4:1 r/8 E4/8:1 C5/8:3 B4/8:2 | E3/2:5 r/4
rh: A4/2:1 | A3/2:5 E4/2:1 | A1/4:5

lh: r/2 | C4/2:5 r/4 | B3/2:5 r/4 | A3/2:5 r/4 | r/2 | A3/2:5 | r/4 r/8 E3/2:5 | A3/2:5 | r/4 r/8 A3/2:5 | r/2 | A3/2:5 E4/2:1 | A1/4:5 |

order: A B
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(FUR_ELISE_EASY);

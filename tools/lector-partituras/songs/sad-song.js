// Sad Song - Julie A. Lind (2020, PianoSongDownload.com)
// Transcribed visually from PDF - RHYTHM confident (measures validated), PITCHES need ear verification
// Simple beginner piece, C major, echo pattern: RH plays a note, LH answers an octave below
// 8 measures, 4/4, "With emotion" mp

const SAD_SONG = {
  id: 'sad-song',
  cat: 'facil',
  name: 'Sad Song',
  artist: 'Julie A. Lind',
  tip: 'Pieza de eco: la derecha toca y la izquierda responde una octava abajo. PENDIENTE VERIFICAR DE OÍDO (ritmo confiable, notas exactas por confirmar).',
  tempo: '80 quarter',
  text: `title: Sad Song
artist: Julie A. Lind
meter: 4/4
tempo: 80 quarter

[A] Tema
rh: r/2 D5/2:2 | C5/4 B4/4 A4/2 | r/2 E5/4 F5/4 | G5/4 r/4 r/2 |
rh: r/2 D5/2:2 | C5/4 B4/4 A4/2 | E5/4 D5/4 C5/4 r/4 | r/1 |

lh: C4/2:3 r/2 | r/1 | A3/4 B3/4 r/2 | r/4 D4/4:1 E4/2 |
lh: C4/2:3 r/2 | r/1 | E4/4 D4/4 r/2 | C4/2 C4/2 |

order: A
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(SAD_SONG);

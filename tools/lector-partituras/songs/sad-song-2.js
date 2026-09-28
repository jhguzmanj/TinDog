// Sad Song 2 - Julie A. Lind (2021, PianoSongDownload.com)
// Transcribed visually from PDF - RHYTHM confident, PITCHES need ear verification
// Same melodic idea as Sad Song but hands take turns (RH plays the phrase alone,
// then LH answers it alone) instead of overlapping in echo. Has a repeat at the end.
// The curved arcs in the score are phrasing slurs (play legato), not ties -
// they don't change which notes sound, so they're not encoded as "~" here.
// 8 measures, 4/4, "Slowly with expression" mp

const SAD_SONG_2 = {
  id: 'sad-song-2',
  cat: 'facil',
  name: 'Sad Song 2',
  artist: 'Julie A. Lind',
  tip: 'Continuación de Sad Song: primero toca sola la derecha, luego responde sola la izquierda. Los arcos de la partitura son de fraseo (legato), no ligaduras. PENDIENTE VERIFICAR DE OÍDO.',
  tempo: '70 quarter',
  text: `title: Sad Song 2
artist: Julie A. Lind
meter: 4/4
tempo: 70 quarter

[A] Frase (mano derecha)
rh: D5/2:1 C5/2 | B4/4 A4/4 G4/2 | E5/4 D5/4 C5/4 r/4 | B4/2 A4/2 |
lh: r/1 | r/1 | r/2 r/4 D4/4:1 | r/1 |

[B] Respuesta (mano izquierda)
rh: r/1 | r/1 | r/1 | r/1 |
lh: D4/2 C4/2 | B3/4 A3/4 G4/2 | r/4 A4/4 G4/4 F4/4 | C4/2 C4/2 |

order: A B
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(SAD_SONG_2);

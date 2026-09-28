// Für Elise (Easy Version) - Beethoven
// Replaced with a better source: MuseScore MusicXML + cross-validated against
// the MIDI file (uploaded as "Lettre à Elise", the French name for the same
// piece - Beethoven never named it "Für Elise" himself, both are editorial).
// 13 measures, the full main theme (the "A" section of the rondo form),
// 0 duration validation errors.
//
// This REPLACES the old visual-only transcription, which had the notes right
// but the rhythm wrong: the left hand came in during measure 1, when it
// actually stays silent through measures 1-2 and enters in measure 3 - that
// mismatch is what caused the 18 validation errors the old version never
// resolved. Confirmed note-by-note against this file's own history in git if
// ever needed. The old version also had an extra "Variación" section beyond
// measure 13 that had no reliable source behind it (a guessed continuation of
// the same theme) - dropped rather than kept alongside a real transcription.

const FUR_ELISE_EASY = {
  id: 'fur-elise-easy',
  cat: 'clasica',
  name: 'Für Elise (Fácil)',
  artist: 'Ludwig van Beethoven',
  tip: 'El tema principal completo, la parte más famosa de la pieza. La izquierda no entra hasta el compás 3 (los dos primeros son solo la derecha).',
  tempo: '120 quarter',
  text: `title: Für Elise
artist: Ludwig van Beethoven
meter: 3/4
tempo: 120 quarter

[A] Tema Principal
rh: r/2 E5/8:4 D#5/8:3 | E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | B4/4:1 r/8 E4/8:1 G#4/8:2 B4/8:3 | C5/4:2 r/8 E4/8:1 E5/8:4 D#5/8:3 | E5/8:4 D#5/8:3 E5/8:4 B4/8:2 D5/8:3 C5/8:2 | A4/4:1 r/8 C4/8:1 E4/8:2 A4/8:3 | B4/4:1 r/8 E4/8:1 C5/8:3 B4/8:2 | A4/4:1 r/8 B4/8:2 C5/8:3 D5/8:4 | E5/4:4 r/8 G4/8:1 F5/8:4 E5/8:3 | D5/4:3 r/8 F4/8:1 E5/8:4 D5/8:3 | C5/4:2 r/8 E4/8:1 D5/8:3 C5/8:2 | B4/2.:2 |

lh: r/2. | r/2. | A3/2:5 r/4 | E3/2:5 r/4 | A3/2:5 r/4 | r/2. | A3/2:5 r/4 | E3/2:5 r/4 | A3/2:5 r/4 | C4/2:5 r/4 | B3/2:5 r/4 | A3/2:5 r/4 | G#3/2.:3 |

order: A
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(FUR_ELISE_EASY);

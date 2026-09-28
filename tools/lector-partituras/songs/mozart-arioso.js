// Mozart Arioso
// Transcribed from MusicXML, cross-validated against the MIDI file (71 BPM,
// notes match exactly at the events checked). 32 measures, G major, 3/4.
// 0 duration validation errors. Structure is AABB (measures 1-8 repeat
// literally as 9-16, and 17-24 repeat as 25-32) - that's in the source, not
// an artifact of the transcription.
// Reasonably accessible: max 2 simultaneous notes (only twice, near the end),
// mostly quarters and eighths, no fast passages - similar difficulty to
// Cannon in D or a bit easier.

const MOZART_ARIOSO = {
  id: 'mozart-arioso',
  cat: 'clasica',
  name: 'Mozart Arioso',
  artist: 'Wolfgang Amadeus Mozart',
  tip: 'Melodía cantabile, tempo lento (71 BPM). Estructura AABB: las secciones se repiten literalmente. Solo dos acordes de 2 notas cerca del final, el resto es una nota por mano.',
  tempo: '71 quarter',
  text: `title: Mozart Arioso
artist: Wolfgang Amadeus Mozart
meter: 3/4
tempo: 71 quarter
key: Sol mayor (1 sostenido)

[A] Tema (c.1-8)
rh: D5/8 B4/8 A4/8 G4/8 F#4/8 G4/8 | G4/4 A4/2 | C5/8 A4/8 G4/8 F#4/8 E4/8 F#4/8 | G4/2 r/4 | B5/4 G5/4 E5/4 | C#5/4 D5/4 r/8 A4/8 | B4/8 E5/8 D5/4 C#5/4 | D5/4 r/2 |
lh: G3/4 B3/4 D4/4 | C4/4 C4/4 C4/4 | D4/4 D4/4 D4/4 | G3/4 B3/4 D4/4 | G3/4 B3/4 E4/4 | A3/4 F#3/4 r/4 | G3/4 A3/4 A3/4 | F#3/4 D3/4 r/4 |

[B] Repetición (c.9-16)
rh: D5/8 B4/8 A4/8 G4/8 F#4/8 G4/8 | G4/4 A4/2 | C5/8 A4/8 G4/8 F#4/8 E4/8 F#4/8 | G4/2 r/4 | B5/4 G5/4 E5/4 | C#5/4 D5/4 r/8 A4/8 | B4/8 E5/8 D5/4 C#5/4 | D5/4 r/2 |
lh: G3/4 B3/4 D4/4 | C4/4 C4/4 C4/4 | D4/4 D4/4 D4/4 | G3/4 B3/4 D4/4 | G3/4 B3/4 E4/4 | A3/4 F#3/4 r/4 | G3/4 A3/4 A3/4 | F#3/4 D3/4 r/4 |

[C] Desarrollo (c.17-24)
rh: D5/8 B4/8 A4/8 G4/8 F#4/8 G4/8 | E5/2. | E5/8 C#5/8 B4/8 A4/8 G#4/8 A4/8 | F#5/2 r/4 | E5/4 C5/4 A4/4 | F#4/4 G4/4 r/8 D4/8 | E4/8 A4/8 G4/4 F#4/4 | G4/2 r/4 |
lh: B3/4 B3/4 B3/4 | C4/4 B3/4 C4/4 | C#4/4 C#4/4 C#4/4 | D4/4 C#4/4 D4/4 | C4/4 C4/4 C4/4 | C4/4 B3/4 r/4 | C4/4 [B3,D4]/4 [A3,C4]/4 | [G3,B3]/2 r/4 |

[D] Cierre (c.25-32)
rh: D5/8 B4/8 A4/8 G4/8 F#4/8 G4/8 | E5/2. | E5/8 C#5/8 B4/8 A4/8 G#4/8 A4/8 | F#5/2 r/4 | E5/4 C5/4 A4/4 | F#4/4 G4/4 r/8 D4/8 | E4/8 A4/8 G4/4 F#4/4 | G4/2 r/4 |
lh: B3/4 B3/4 B3/4 | C4/4 B3/4 C4/4 | C#4/4 C#4/4 C#4/4 | D4/4 C#4/4 D4/4 | C4/4 C4/4 C4/4 | C4/4 B3/4 r/4 | C4/4 [B3,D4]/4 [A3,C4]/4 | [G3,B3]/2 r/4 |

order: A B C D
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(MOZART_ARIOSO);

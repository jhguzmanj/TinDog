// Passacaglia (Handel-Halvorsen) - Sample/preview only
// Extracted from MusicXML, tempo cross-checked against the MIDI (120 BPM).
// This is ONLY the opening 8 measures, as a listening preview - NOT meant to
// be practiced yet. The full piece is 72 measures and 776 notes, 84% of them
// straight eighth notes at speed, with the right hand jumping constantly
// between a fixed high note (C6) and a descending melodic line underneath.
// That's a genuinely advanced technique (fast alternating leaps, sustained
// speed) - much harder than anything else in this catalog, including
// Cannon in D. Full transcription deliberately deferred until it's relevant.

const PASSACAGLIA_SAMPLE = {
  id: 'passacaglia-sample',
  cat: 'clasica',
  name: 'Passacaglia (muestra)',
  artist: 'Handel-Halvorsen',
  tip: 'SOLO los primeros 8 compases, para escuchar cómo suena - no para practicar todavía. La pieza completa (72 compases) es de nivel muy avanzado: la derecha salta sin parar entre una nota aguda fija y una melodía que baja debajo. Mucho más difícil que Cannon in D.',
  tempo: '120 quarter',
  text: `title: Passacaglia (muestra, c.1-8)
artist: Handel-Halvorsen
meter: 4/4
tempo: 120 quarter
source: MusicXML + MIDI (120 BPM confirmado)

[A] Apertura
rh: C5/8 C6/8 B5/8 C6/8 A5/8 C6/8 G5/8 C6/8 | F5/8 C6/8 E5/8 C6/8 D5/8 C6/8 C5/8 C6/8 | B4/8 B5/8 A5/8 B5/8 G5/8 B5/8 F5/8 B5/8 | E5/8 B5/8 D5/8 B5/8 C5/8 B5/8 B4/8 B5/8 | A4/8 A5/8 G5/8 A5/8 F5/8 A5/8 E5/8 A5/8 | D5/8 A5/8 C5/8 A5/8 B4/8 A5/8 A4/8 A5/8 | A5/4 G#5/8 F#5/8 G#5/4. A5/8 | A5/1 |

lh: A3/1 | D3/1 | G3/1 | C3/1 | F3/1 | D3/1 | E3/1 | A3/1 |

order: A
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(PASSACAGLIA_SAMPLE);

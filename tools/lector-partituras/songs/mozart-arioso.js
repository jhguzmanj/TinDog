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
  spec: {
    "title": "Arioso",
    "composer": "Mozart",
    "credit": "Arioso — Mozart — Pianolessen.eu (tal como está impreso)",
    "source": "partitura PDF + MusicXML (32 compases); alturas y dedos impresos del MusicXML, ritmo y tempo confirmados con el MIDI",
    "key": {
      "tonic": "G",
      "mode": "major"
    },
    "tempoSource": "audio",
    "arrangerNote": "Impreso solo \"Pianolessen.eu\" (título y pie de página; en el MusicXML es el campo de derechos). Es la fuente, no un arreglista con nombre; el MusicXML (MuseScore 3.3.4, 2019-12-27) no trae más. No se inventó.",
    "tempoNote": "Impreso solo \"Adagio\", sin número. Los 71 salen del MIDI adjunto (70.9998 en el XML), no de una grabación.",
    "notes_text": [
      "\"Adagio\" impreso. La partitura está escrita sin barras de repetición: los compases 9-16 repiten literalmente los 1-8 y los 25-32 los 17-24, y así se entregan (order A B C D)"
    ],
    "allowedChromatics": [
      "C#",
      "G#"
    ],
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 194,
        "matched": 194,
        "midiNotesInWindow": 194,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationDisagreementCount": 0,
        "durationDisagreements": [],
        "durationComparisonSkippedSamePitchOverlap": 0,
        "midiTempoEvents": [
          [
            0.0,
            71.0
          ]
        ]
      }
    }
  },
  text: `title: Mozart Arioso
artist: Wolfgang Amadeus Mozart
meter: 3/4
tempo: 71 quarter
key: Sol mayor (1 sostenido)

[A] Tema (c.1-8)
rh: D5/8:5 B4/8:3 A4/8:2 G4/8:1 F#4/8:2 G4/8:3 | G4/4:2 A4/2:3? | C5/8:5 A4/8:4 G4/8:3 F#4/8:2 E4/8:1 F#4/8:2 | G4/2:3? r/4 | B5/4:5 G5/4:3? E5/4:1 | C#5/4:2 D5/4:3 r/8 A4/8:1 | B4/8:2? E5/8:5? D5/4:3? C#5/4:2? | D5/4:3? r/2 |
lh: G3/4:5 B3/4:3? D4/4:1? | C4/4:2? C4/4:2? C4/4:2? | D4/4:1? D4/4:1? D4/4:1? | G3/4:5? B3/4:3? D4/4:1? | G3/4:5 B3/4:3 E4/4:1 | A3/4:4 F#3/4:5? r/4 | G3/4:2 A3/4:1? A3/4:1? | F#3/4:3 D3/4:5 r/4 |

[B] Repetición (c.9-16)
rh: D5/8:5 B4/8:3 A4/8:2 G4/8:1 F#4/8:2 G4/8:3 | G4/4:2 A4/2:3? | C5/8:5 A4/8:4 G4/8:3 F#4/8:2 E4/8:1 F#4/8:2 | G4/2:3? r/4 | B5/4:5 G5/4:3? E5/4:1 | C#5/4:2 D5/4:3 r/8 A4/8:1 | B4/8:2? E5/8:5? D5/4:3? C#5/4:2? | D5/4:3? r/2 |
lh: G3/4:5 B3/4:3? D4/4:1? | C4/4:2? C4/4:2? C4/4:2? | D4/4:1? D4/4:1? D4/4:1? | G3/4:5? B3/4:3? D4/4:1? | G3/4:5 B3/4:3 E4/4:1 | A3/4:4 F#3/4:5? r/4 | G3/4:2 A3/4:1? A3/4:1? | F#3/4:3 D3/4:5 r/4 |

[C] Desarrollo (c.17-24)
rh: D5/8:5 B4/8:3 A4/8:2? G4/8:1? F#4/8:2 G4/8:1 | E5/2.:5? | E5/8:5 C#5/8:3 B4/8:2? A4/8:1? G#4/8:2 A4/8:1 | F#5/2:5 r/4 | E5/4:5 C5/4:3 A4/4:1 | F#4/4:2 G4/4:3 r/8 D4/8:1 | E4/8:2? A4/8:5? G4/4:3? F#4/4:1? | G4/2:2? r/4 |
lh: B3/4:2 B3/4:2? B3/4:2? | C4/4:1? B3/4:2? C4/4:2? | C#4/4:2 C#4/4:2? C#4/4:2? | D4/4:1 C#4/4:2? D4/4:1? | C4/4:2? C4/4:2? C4/4:1? | C4/4:1? B3/4:2? r/4 | C4/4:2 [B3,D4]/4:3?,1? [A3,C4]/4:4?,2? | [G3,B3]/2:5?,2? r/4 |

[D] Cierre (c.25-32)
rh: D5/8:5 B4/8:3 A4/8:2? G4/8:1? F#4/8:2 G4/8:1 | E5/2.:5? | E5/8:5 C#5/8:3 B4/8:2? A4/8:1? G#4/8:2 A4/8:1 | F#5/2:5 r/4 | E5/4:5 C5/4:3 A4/4:1 | F#4/4:2 G4/4:3 r/8 D4/8:1 | E4/8:2? A4/8:5? G4/4:3? F#4/4:1? | G4/2:2? r/4 |
lh: B3/4:2 B3/4:2? B3/4:2? | C4/4:1? B3/4:2? C4/4:2? | C#4/4:2 C#4/4:2? C#4/4:2? | D4/4:1 C#4/4:2? D4/4:1? | C4/4:2? C4/4:2? C4/4:1? | C4/4:1? B3/4:2? r/4 | C4/4:2 [B3,D4]/4:3?,1? [A3,C4]/4:4?,2? | [G3,B3]/2:5?,2? r/4 |

order: A B C D
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(MOZART_ARIOSO);

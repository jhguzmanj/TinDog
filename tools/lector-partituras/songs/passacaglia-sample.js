// Passacaglia (d'après Handel) - Sample/preview only
// Attribution: the PDF prints "Passacaglia / D'après Handel" and nothing else.
// An earlier version of this file said "Handel-Halvorsen"; the Halvorsen part
// was a guess from the musical pattern, not something in the source.
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
  artist: "D'après Handel",
  tip: 'SOLO los primeros 8 compases, para escuchar cómo suena - no para practicar todavía. La pieza completa (72 compases) es de nivel muy avanzado: la derecha salta sin parar entre una nota aguda fija y una melodía que baja debajo. Mucho más difícil que Cannon in D.',
  tempo: '120 quarter',
  spec: {
    "title": "Passacaglia",
    "composer": "Händel",
    "credit": "D'après Handel (tal como está impreso; el arreglista no aparece)",
    "source": "partitura PDF + MusicXML (MuseScore 4.5), compases 1-8 de 72; alturas y dedos impresos del MusicXML, ritmo y tempo confirmados con el MIDI adjunto",
    "key": {
      "tonic": "A",
      "mode": "minor"
    },
    "tempoSource": "audio",
    "arrangerNote": "La partitura imprime \"D'après Handel\" y nada más; el MusicXML (MuseScore 4.5, 2025-04-29) no trae arreglista ni derechos. No se inventó: falta el dato de la página de origen.",
    "tempoNote": "La partitura no imprime tempo (solo \"rit. al fine\"). Los 120 salen del MIDI adjunto, no de una grabación.",
    "ritardando": {
      "present": true,
      "printed": true,
      "numeric": false,
      "where": "\"rit. al fine\" impreso en el c.6 de esta muestra (y en 14, 22, 30, 46 y 70 de la pieza completa)",
      "detail": "la partitura no da porcentajes ni BPM, y el MIDI adjunto no baja el tempo; por eso no hay tempoChanges. La app decide cuánto frenar; a los 120 la muestra suena sin ritardando"
    },
    "notes_text": [
      "solo los compases 1-8 de 72 (muestra). \"rit. al fine\" impreso en el compás 6 (y en 14, 22, 30, 46 y 70); el MIDI no baja el tempo"
    ],
    "allowedChromatics": [
      "F#",
      "G#"
    ],
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 62,
        "matched": 62,
        "midiNotesInWindow": 62,
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
            120.0
          ]
        ]
      }
    }
  },
  text: `title: Passacaglia (muestra, c.1-8)
artist: D'après Handel
meter: 4/4
tempo: 120 quarter
source: MusicXML + MIDI (120 BPM confirmado)

[A] Apertura
rh: C5/8:1 C6/8:5 B5/8:4 C6/8:5 A5/8:3 C6/8:5 G5/8:2 C6/8:5 | F5/8:1 C6/8:5 E5/8:1 C6/8:5 D5/8:1 C6/8:5 C5/8:1 C6/8:5 | B4/8:1 B5/8:5 A5/8:4 B5/8:5 G5/8:3 B5/8:5 F5/8:2 B5/8:5 | E5/8:1 B5/8:5 D5/8:1 B5/8:5 C5/8:1 B5/8:5 B4/8:1 B5/8:5 | A4/8:1 A5/8:5 G5/8:4 A5/8:5 F5/8:3 A5/8:5 E5/8:2 A5/8:5 | D5/8:1 A5/8:5 C5/8:1 A5/8:5 B4/8:1 A5/8:5 A4/8:1 A5/8:5 | A5/4:5 G#5/8:4 F#5/8:3 G#5/4.:4 A5/8:5 | A5/1:5 |

lh: A3/1:1 | D3/1:4 | G3/1:1 | C3/1:5 | F3/1:2 | D3/1:4 | E3/1:3 | A3/1:1 |

order: A
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(PASSACAGLIA_SAMPLE);

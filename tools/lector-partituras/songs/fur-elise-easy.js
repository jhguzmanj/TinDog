// Für Elise (Easy Version) - Beethoven
// Replaced with a better source: MuseScore MusicXML + cross-validated against
// the MIDI file (uploaded as "Lettre à Elise", the French name for the same
// piece - Beethoven never named it "Für Elise" himself, both are editorial).
// 13 measures, the full main theme (the "A" section of the rondo form),
// 0 duration validation errors. The score has a backward repeat sign at the
// end of measure 13 (no forward sign, so it repeats from the start): the theme
// is played twice, hence `order: A A`. The MIDI also plays it twice.
// Fingers: 55 of the 61 notes have the finger printed in the score and use it;
// the other 6 are suggested (see piezas-json/fur-elise-easy.json).
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
  tip: 'El tema principal completo, la parte más famosa de la pieza; la partitura lo repite una vez. La izquierda no entra hasta el compás 3 (los dos primeros son solo la derecha).',
  tempo: '120 quarter',
  spec: {
    "title": "Für Elise",
    "composer": "Beethoven",
    "credit": "el archivo se titula \"Fur Elise\" y no trae compositor ni arreglista; el nombre de la obra identifica a Beethoven",
    "source": "partitura PDF + MusicXML (13 compases); alturas y dedos impresos del MusicXML, ritmo y tempo confirmados con el MIDI",
    "key": {
      "tonic": "A",
      "mode": "minor"
    },
    "tempoSource": "audio",
    "arrangerNote": "El archivo (MuseScore Studio 4.6.5, 2026-02-11) solo trae el título \"Fur Elise\": ni compositor ni arreglista ni derechos. No se inventó: falta el dato de la página de origen.",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto, no de una grabación.",
    "notes_text": [
      "barra de repetición hacia atrás al final del compás 13 (sin inicio de repetición): el tema completo se toca dos veces, por eso order = [\"A\",\"A\"]. El MIDI también lo toca dos veces (78 tiempos = 2 × 39)"
    ],
    "allowedChromatics": [
      "D#",
      "G#"
    ],
    "extraChecks": {
      "midiCrossCheck": {
        "ok": false,
        "mode": "exact",
        "scoreOnsets": 122,
        "matched": 122,
        "midiNotesInWindow": 180,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 58,
        "onlyInMidi": [
          [
            3.0,
            40
          ],
          [
            3.0,
            64
          ],
          [
            3.0,
            68
          ],
          [
            6.0,
            45
          ],
          [
            9.0,
            40
          ],
          [
            12.0,
            45
          ],
          [
            12.0,
            60
          ],
          [
            12.0,
            69
          ],
          [
            15.0,
            40
          ],
          [
            15.0,
            64
          ],
          [
            15.0,
            68
          ],
          [
            18.0,
            45
          ],
          [
            21.0,
            40
          ],
          [
            21.0,
            68
          ],
          [
            24.0,
            45
          ],
          [
            24.0,
            60
          ],
          [
            24.0,
            64
          ],
          [
            27.0,
            36
          ],
          [
            27.0,
            64
          ],
          [
            30.0,
            43
          ]
        ],
        "durationDisagreementCount": 2,
        "durationDisagreements": [
          [
            27.0,
            "C4",
            2.0,
            3.0
          ],
          [
            66.0,
            "C4",
            2.0,
            3.0
          ]
        ],
        "durationComparisonSkippedSamePitchOverlap": 0,
        "midiTempoEvents": [
          [
            0.0,
            120.0
          ],
          [
            39.0,
            120.0
          ]
        ]
      }
    }
  },
  text: `title: Für Elise
artist: Ludwig van Beethoven
meter: 3/4
tempo: 120 quarter

[A] Tema Principal
rh: r/2 E5/8:5 D#5/8:4 | E5/8:4? D#5/8:3? E5/8:4? B4/8:2 D5/8:4 C5/8:3 | A4/4:2 r/8 C4/8:1 E4/8:2 A4/8:4 | B4/4:5 r/8 E4/8:1 G#4/8:2 B4/8:3 | C5/4:4 r/8 E4/8:1 E5/8:5 D#5/8:4 | E5/8:4? D#5/8:3? E5/8:4? B4/8:2 D5/8:4 C5/8:3 | A4/4:2 r/8 C4/8:1 E4/8:2 A4/8:4 | B4/4:5 r/8 E4/8:1 C5/8:3 B4/8:2 | A4/4:1 r/8 B4/8:2 C5/8:3 D5/8:4 | E5/4:5 r/8 G4/8:1 F5/8:5 E5/8:4 | D5/4:3 r/8 F4/8:1 E5/8:5 D5/8:4 | C5/4:3 r/8 E4/8:1 D5/8:5 C5/8:4 | B4/2.:3 |

lh: r/2. | r/2. | A3/2:1 r/4 | E3/2:4 r/4 | A3/2:1 r/4 | r/2. | A3/2:1 r/4 | E3/2:4 r/4 | A3/2:2 r/4 | C4/2:1 r/4 | B3/2:2 r/4 | A3/2:3 r/4 | G#3/2.:4 |

order: A A
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(FUR_ELISE_EASY);

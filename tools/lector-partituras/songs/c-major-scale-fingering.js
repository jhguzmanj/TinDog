// Escala de Do mayor con digitación — Rafał Piwowarczuk. MusicXML (MuseScore 3.6.2) + MIDI. 40 compases, 4/4.
// Son negras con las dos manos y los 250 dedos son los impresos (el título del XML, en polaco, habla de mano derecha y redondas, pero no es lo que trae).
// Tempo: no impreso; el MIDI trae 120 (valor por defecto de MuseScore).

const C_MAJOR_SCALE_FINGERING = {
  "id": "c-major-scale-fingering",
  "cat": "patrones",
  "name": "Escala de Do mayor (con dedos)",
  "artist": "Rafał Piwowarczuk",
  "tip": "Escala de Do mayor en negras con la digitación impresa (derecha 1-2-3-1-2-3-4-5 y izquierda 5-4-3-2-1-3-2-1 subiendo), en cinco tandas: una mano y después la otra, manos en movimiento contrario, manos en paralelo a una octava y, al final, dos octavas con las dos manos. Todos los dedos son los impresos. Sin tempo impreso: empieza muy despacio.",
  "tempo": "120 quarter",
  "spec": {
    "title": "C Major Scale (con dedos)",
    "composer": "Rafał Piwowarczuk",
    "credit": "C MAJOR SCALE — Rafal Piwowarczuk — «Subscribe to my YouTube channel: Rafal Piwowarczuk - Piano, Keyboard & Organ Music» (tal como está impreso; el título del MusicXML está en polaco: «Część 2, Lekcja 7a - Ćwiczenia na prawą rękę (całe nuty)»)",
    "source": "partitura MusicXML (MuseScore 3.6.2, 40 compases) + MIDI; alturas, ritmo y dedos impresos del MusicXML (los 250 dedos), contrastados nota por nota con el MIDI. El título en polaco habla de «mano derecha, notas enteras», pero la partitura son negras con las dos manos",
    "key": {
      "tonic": "C",
      "mode": "major"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. Los 120 salen del MIDI adjunto (fijos, sin cambios), que es el valor por defecto de MuseScore: no es una indicación del autor. Para aprender, baja la velocidad.",
    "notes_text": [
      "la partitura imprime «Right hand fingering» en el compás 1 y «Left hand fingering» en el compás 5",
      "compases 1-16: una mano toca mientras la otra descansa (silencio de redonda); 17-24: manos en movimiento contrario; 25-32: manos en paralelo a una octava; 33-40: dos octavas, derecha Do4-Do6 e izquierda Do2-Do4",
      "el compás 40 es una redonda en cada mano (Do4 con el 1 y Do2 con el 5)"
    ],
    "allowedChromatics": [],
    "fingersDetail": "250 de 250 dedos impresos en la partitura (siempre mandan); 0 copiados de un compás de la misma forma que sí los imprime; 0 propuestos y marcados con ? en el texto",
    "extraChecks": {
      "midiCrossCheck": {
        "ok": true,
        "mode": "exact",
        "scoreOnsets": 250,
        "matched": 250,
        "midiNotesInWindow": 250,
        "onlyInScoreCount": 0,
        "onlyInScore": [],
        "onlyInMidiCount": 0,
        "onlyInMidi": [],
        "durationRatioMidiOverScore": [
          0.95,
          0.95
        ],
        "midiTempoEvents": [
          [
            0,
            120.0
          ]
        ],
        "detail": "las 250 notas del MIDI coinciden en tiempo y altura con las 250 que se pulsan en la partitura (las colas de ligadura no cuentan); tempo del MIDI: 120.0. 4 nota(s) salen con duración 0 en el MIDI (c.18 rh C4, c.19 rh C4, c.22 rh C4, c.23 rh C4): en todas la otra mano toca la misma nota a la vez (unísono) y el MIDI las pisa; no es una diferencia de lectura"
      }
    },
    "arrangerNote": "Solo aparece el autor (Rafal Piwowarczuk); el MusicXML (MuseScore 3.6.2) no trae arreglista. No se inventó.",
    "bassCheckSkip": "Ejercicio de escalas: la izquierda no hace de bajo, toca la escala (sola, en contrario o en paralelo con la derecha). Comparar «bajos» entre vueltas marcaría como dudas notas que son la propia escala, así que no se aplica."
  },
  "text": `title: C Major Scale (con dedos)
artist: Rafał Piwowarczuk
meter: 4/4
tempo: 120 quarter
key: Do mayor
tip: Escala de Do mayor en negras con la digitación impresa (derecha 1-2-3-1-2-3-4-5 y izquierda 5-4-3-2-1-3-2-1 subiendo), en cinco tandas: una mano y después la otra, manos en movimiento contrario, manos en paralelo a una octava y, al final, dos octavas con las dos manos. Todos los dedos son los impresos. Sin tempo impreso: empieza muy despacio.

[A] Una mano y después la otra (c.1-8)
rh: C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5 | C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | r/1 | r/1 | r/1 | r/1
lh: r/1 | r/1 | r/1 | r/1 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5 | C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1

[B] Una mano y después la otra, empezando bajando (c.9-16)
rh: C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5 | r/1 | r/1 | r/1 | r/1
lh: r/1 | r/1 | r/1 | r/1 | C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5

[C] Manos juntas en movimiento contrario (c.17-24)
rh: C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5 | C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5
lh: C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5 | C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5

[D] Manos juntas en paralelo, una octava (c.25-32)
rh: C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5 | C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | C5/4:5 B4/4:4 A4/4:3 G4/4:2 | F4/4:1 E4/4:3 D4/4:2 C4/4:1 | C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:5
lh: C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5 | C4/4:1 B3/4:2 A3/4:3 G3/4:1 | F3/4:2 E3/4:3 D3/4:4 C3/4:5 | C3/4:5 D3/4:4 E3/4:3 F3/4:2 | G3/4:1 A3/4:3 B3/4:2 C4/4:1

[E] Dos octavas, manos juntas (c.33-40)
rh: C4/4:1 D4/4:2 E4/4:3 F4/4:1 | G4/4:2 A4/4:3 B4/4:4 C5/4:1 | D5/4:2 E5/4:3 F5/4:1 G5/4:2 | A5/4:3 B5/4:4 C6/4:5 B5/4:4 | A5/4:3 G5/4:2 F5/4:1 E5/4:3 | D5/4:2 C5/4:1 B4/4:4 A4/4:3 | G4/4:2 F4/4:1 E4/4:3 D4/4:2 | C4/1:1
lh: C2/4:5 D2/4:4 E2/4:3 F2/4:2 | G2/4:1 A2/4:3 B2/4:2 C3/4:1 | D3/4:4 E3/4:3 F3/4:2 G3/4:1 | A3/4:3 B3/4:2 C4/4:1 B3/4:2 | A3/4:3 G3/4:1 F3/4:2 E3/4:3 | D3/4:4 C3/4:1 B2/4:2 A2/4:3 | G2/4:1 F2/4:2 E2/4:3 D2/4:4 | C2/1:5

order: A B C D E
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(C_MAJOR_SCALE_FINGERING);

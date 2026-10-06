// The Sound of Silence - Paul Simon (Simon & Garfunkel)
// Fuente: dos imágenes GIF de una misma partitura que pasó Jorge, SIN título, créditos ni tempo
// impresos. Una trae tres pentagramas (melodía + un acompañamiento de corcheas en clave de Sol +
// bajo) y la otra dos (melodía + bajo). Se transcribe la de DOS: es la versión para dos manos; el
// pentagrama del medio es otra voz que no cabe en dos manos junto con las otras dos.
//
// Cómo se leyó: líneas del pentagrama y barras de compás detectadas por píxeles (L = 11,75 px),
// cada compás recortado y ampliado ×4 con guías rotuladas (Do4, Re4…), y leído contra ellas.
// El acorde del c.1 se midió: ocupa y 161-184, dos cabezas sobre las líneas de Fa3 y Re3.
// Verificaciones: (1) las duraciones suman 4 negras en los 16 compases de las dos manos (lo comprueba
// el lector); (2) el bajo da la armonía de la canción — Rem, Do, Rem, Sib, Fa — bajo la melodía
// de cada compás (Re-Fa-La sobre Re; Do-Mi-Sol sobre Do; Re/Do sobre Sib; Fa-La-Do sobre Fa);
// (3) todas las notas son de Re menor natural (un bemol, ninguna alteración accidental).
//
// REPETICIÓN: barra de repetición hacia atrás al final del c.15 y ninguna de inicio → se vuelve al
// c.1. El c.16 (silencio en la derecha, Re3 blanca en la izquierda) es el final tras la repetición.
// Se entrega order A A B.
//
// Dedos: la partitura no imprime ninguno, todos son propuestos (?). Cambios de posición de la
// derecha: pulgar en Re4 (c.1-2) → Do4 (c.3-4) → Fa4 (c.5-9) → Do5 (c.10-12, entra en el Re5
// repetido del c.10) → Fa4 (c.13-14) → Re4 (desde el Mi4 del c.14, que viene tras un silencio).

const SOUND_OF_SILENCE = {
  id: 'sound-of-silence',
  cat: 'popular',
  name: 'The Sound of Silence',
  artist: 'Simon & Garfunkel',
  tip: 'Re menor (un bemol), arreglo fácil a dos manos: melodía en la derecha y un bajo de negras y corcheas en la izquierda. La estrofa se toca dos veces. La partitura no trae dedos: todos son propuestos. La derecha se mueve en los silencios y en notas repetidas: pulgar en Re (c.1-2), en Do (c.3-4), en Fa (c.5-9), en Do agudo desde el Re repetido del c.10, y de vuelta a Fa en el c.13. El tempo es el de la grabación (~108, variable): bájalo para aprender.',
  tempo: '108 quarter',
  spec: {
    "title": "The Sound of Silence",
    "composer": "Paul Simon",
    "credit": "La partitura no imprime título, autor ni arreglista: es una imagen sin encabezado. Canción de Paul Simon, grabada por Simon & Garfunkel.",
    "arrangerNote": "Las imágenes no traen ningún crédito (ni título, ni arreglista, ni editorial). No se inventó.",
    "source": "dos imágenes GIF de la misma partitura (versión de 3 pentagramas y de 2); se transcribe la de 2 pentagramas, leída compás por compás sobre recortes ampliados con guías de altura; sin dedos impresos, sin MusicXML ni MIDI",
    "key": {
      "tonic": "D",
      "mode": "minor"
    },
    "tempoSource": "audio",
    "tempoNote": "La partitura no imprime tempo. 108 es el de la grabación original de Simon & Garfunkel según bases de datos de tempo (106-112 según la fuente; la grabación no lleva metrónomo y el tempo varía). La grabación está en Mib menor; este arreglo, en Re menor.",
    "notes_text": [
      "barra de repetición al final del c.15 sin barra de inicio: la estrofa (c.1-15) se toca dos veces y después el c.16; order = [A, A, B]",
      "ligaduras impresas: Re5 c.9→10, Do5 c.11→12 y Re4 dentro del c.15; se unen en una sola nota",
      "la otra imagen trae además un pentagrama intermedio (acompañamiento de corcheas en clave de Sol) que no se incluye: con la melodía y el bajo ya ocupa las dos manos"
    ],
    "allowedChromatics": [],
    "fingersDetail": "todos propuestos (la partitura no trae dedos). Derecha: tríada rota 1-3-5 y el 4 en la nota larga (c.1-4); 1-2-4 y el 5 en el Re5 con el pulgar en Fa4 (c.5-9); pulgar en Do5 para Re-Mi-Fa (c.10-12), con el La4 final del c.12 cruzando el 3 por encima del pulgar. Izquierda: [Re3,Fa3] 3-1; pulgar en Re3 para Do-Sol y Re-La (c.2-5 y 14-16); pulgar en Do3 para Sib-Fa (c.6-11); pulgar en La2 para Fa-Mi-Re (c.12-13)"
  },
  text: `title: The Sound of Silence
artist: Simon & Garfunkel
meter: 4/4
tempo: 108 quarter
key: Re menor (1 bemol)
tip: Re menor (un bemol), arreglo fácil a dos manos: melodía en la derecha y bajo en la izquierda. La estrofa se toca dos veces. Dedos propuestos (la partitura no trae): la derecha se mueve en los silencios y en notas repetidas — pulgar en Re (c.1-2), en Do (c.3-4), en Fa (c.5-9), en Do agudo desde el Re repetido del c.10, y de vuelta a Fa en el c.13. Tempo de la grabación (~108, variable): bájalo para aprender.

[A] Estrofa (c.1-15, se toca dos veces)
rh: r/4 D4/8:1? D4/8:1? F4/8:3? F4/8:3? A4/8:5? A4/8:5? | G4/1:4? | r/8 C4/8:1? C4/8:1? C4/8:1? E4/8:3? E4/8:3? G4/8:5? G4/8:5? | F4/1:4? | r/8 F4/8:1? F4/8:1? F4/8:1? A4/8:2? A4/8:2? C5/8:4? C5/8:4? | D5/2:5? C5/2:4? | r/4 F4/8:1? F4/8:1? A4/8:2? A4/8:2? C5/8:4? C5/8:4? | D5/2:5? C5/2:4? | r/4 F4/8:1? F4/8:1? D5/8:5? D5/4.:5?~ | D5/4:5? D5/8:2? E5/8:3? F5/8:4? F5/4.:4? | E5/8:3? D5/4.:2? C5/2:1?~ | C5/4:1? D5/8:2? C5/8:1? A4/2:3? | r/2 r/8 F4/8:1? F4/8:1? F4/8:1? | C5/2.:5? r/8 E4/8:2? | F4/8:3? D4/4.:1?~ D4/2:1? |
lh: [D3,F3]/1:3?,1? | C3/4:2? C3/8:2? G2/8:5? C3/4:2? C3/8:2? G2/8:5? | C3/2:2? G2/4:5? C3/4:2? | D3/4:1? D3/8:1? A2/8:4? D3/4:1? D3/8:1? A2/8:4? | D3/2:1? D3/4:1? C3/4:2? | Bb2/4:3? Bb2/4:3? F2/4:5? F2/8:5? C3/8:1? | F2/4:5? F2/4:5? C3/4:1? F2/4:5? | Bb2/4:2? Bb2/4:2? F2/4:5? F2/8:5? C3/8:1? | F2/4:5? A2/4:3? Bb2/4:2? F2/4:5? | Bb2/4:2? F2/4:5? Bb2/4:2? F2/4:5? | Bb2/4:2? F2/8:5? Bb2/8:2? F2/4:5? F2/4:5? | F2/4:3? F2/4:3? F2/4:3? F2/8:3? E2/8:4? | D2/4:5? D2/8:5? E2/8:4? F2/2:3? | C3/4:2? C3/4:2? C3/4:2? C3/4:2? | D3/4:1? D3/8:1? A2/8:4? D3/4:1? D3/8:1? A2/8:4? |

[B] Final (c.16)
rh: r/1 |
lh: D3/2:1? r/2 |

order: A A B
`
};

window.SONGS = window.SONGS || [];
window.SONGS.push(SOUND_OF_SILENCE);

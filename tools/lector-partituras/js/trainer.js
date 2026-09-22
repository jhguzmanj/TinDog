// Convierte la línea de tiempo al formato de SONGS del piano-midi-trainer:
// pasos {lh, lhF, rh, rhF, dur} donde dur va en negras y la mano que no cambia
// va vacía. Los dedos solo salen si la partitura los trae escritos.

function buildSteps(timeline, from, to) {
  const notes = timeline.notes.filter(n => n.start >= from - 1e-9 && n.start < to - 1e-9);
  const onsets = [...new Set(notes.map(n => Math.round(n.start * 1e6) / 1e6))].sort((a, b) => a - b);

  return onsets.map((t, i) => {
    const next = i + 1 < onsets.length ? onsets[i + 1] : to;
    const at = hand => notes
      .filter(n => n.hand === hand && Math.abs(n.start - t) < 1e-6)
      .sort((a, b) => a.midi - b.midi);
    const lh = at('lh'), rh = at('rh');
    return {
      lh: lh.map(n => n.midi), lhF: lh.map(n => n.finger).filter(f => f != null),
      rh: rh.map(n => n.midi), rhF: rh.map(n => n.finger).filter(f => f != null),
      dur: Math.round((next - t) * 1e4) / 1e4,
    };
  });
}

function stepToJs(s) {
  const part = (hand, notes, fingers) => {
    const head = `${hand}:[${notes.join(',')}]`;
    return fingers.length === notes.length && notes.length
      ? `${head}, ${hand}F:[${fingers.join(',')}]`
      : head;
  };
  return `{${part('lh', s.lh, s.lhF)}, ${part('rh', s.rh, s.rhF)}, dur:${s.dur}}`;
}

function exportTrainer(song, timeline, { from = 0, to = timeline.quarters, idSuffix = '', label = '' } = {}) {
  const steps = buildSteps(timeline, from, to);
  const lines = [];
  for (let i = 0; i < steps.length; i += 3) {
    lines.push('      ' + steps.slice(i, i + 3).map(stepToJs).join(', ') + ',');
  }
  const base = (song.meta.title || 'cancion').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const title = song.meta.title + (label ? ` · ${label}` : '');

  return [
    '  {',
    `    id:'${base}${idSuffix}',`,
    `    cat:'popular',`,
    `    name:'${title.replace(/'/g, "\\'")}',`,
    `    tip:'${(song.meta.tip || '').replace(/'/g, "\\'")}',`,
    `    tempo:${Math.round(song.quarterBpm)},`,
    '    steps:[',
    ...lines,
    '    ]',
    '  },',
  ].join('\n');
}

window.TrainerExport = { exportTrainer, buildSteps };

// Exportación a MIDI tipo 1 (una pista por mano).

const PPQ = 480;

function varLen(value) {
  const bytes = [value & 0x7f];
  value >>= 7;
  while (value > 0) { bytes.unshift((value & 0x7f) | 0x80); value >>= 7; }
  return bytes;
}

function chunk(id, data) {
  const len = data.length;
  return [...id].map(c => c.charCodeAt(0))
    .concat([(len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255], data);
}

function track(events, name) {
  const data = [];
  const nameBytes = [...name].map(c => c.charCodeAt(0));
  data.push(0, 0xff, 0x03, nameBytes.length, ...nameBytes);
  let last = 0;
  for (const ev of events) {
    data.push(...varLen(Math.max(0, Math.round(ev.tick - last))), ...ev.bytes);
    last = ev.tick;
  }
  data.push(0, 0xff, 0x2f, 0x00);
  return chunk('MTrk', data);
}

function exportMidi(timeline, { quarterBpm = 100, beatsPerBar = 4, title = 'song' } = {}) {
  const usPerQuarter = Math.round(60000000 / quarterBpm);
  const meta = [
    0, 0xff, 0x51, 0x03, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255,
    0, 0xff, 0x58, 0x04, beatsPerBar, 2, 24, 8,
    0, 0xff, 0x2f, 0x00,
  ];

  const tracks = [chunk('MThd', [0, 1, 0, 3, (PPQ >> 8) & 255, PPQ & 255]), chunk('MTrk', meta)];

  ['rh', 'lh'].forEach((hand, i) => {
    const events = [];
    for (const n of timeline.notes.filter(n => n.hand === hand)) {
      const on = Math.round(n.start * PPQ);
      const off = Math.round((n.start + n.dur) * PPQ) - 4;
      events.push({ tick: on, bytes: [0x90 | i, n.midi, hand === 'rh' ? 92 : 78] });
      events.push({ tick: Math.max(on + 1, off), bytes: [0x80 | i, n.midi, 0] });
    }
    events.sort((a, b) => a.tick - b.tick || (a.bytes[0] & 0xf0) - (b.bytes[0] & 0xf0));
    tracks.push(track(events, hand === 'rh' ? 'Mano derecha' : 'Mano izquierda'));
  });

  return new Blob([new Uint8Array(tracks.flat())], { type: 'audio/midi' });
}

function exportJson(song, timeline) {
  return new Blob([JSON.stringify({
    title: song.meta.title || '',
    artist: song.meta.artist || '',
    key: song.meta.key || '',
    meter: song.meta.meter || '4/4',
    quarterBpm: song.quarterBpm,
    tempoMark: `${song.tempoValue} ${song.tempoUnit}`,
    bars: timeline.bars,
    order: song.order,
    notes: timeline.notes.map(n => ({
      midi: n.midi,
      name: window.Notation.midiToName(n.midi),
      hand: n.hand,
      startBeat: +n.start.toFixed(4),
      durationBeats: +n.dur.toFixed(4),
      bar: n.bar,
    })),
  }, null, 2)], { type: 'application/json' });
}

window.MidiExport = { exportMidi, exportJson };

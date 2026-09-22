// Interfaz: transporte, rollo de piano, teclado y editor.

const $ = id => document.getElementById(id);
const player = new Player();

let song = null, timeline = null, position = null, loopBlock = null, original = '';

const el = {
  select: $('song-select'), editor: $('editor'), errors: $('errors'), info: $('song-info'),
  blocks: $('blocks'), roll: $('roll'), keys: $('keys'), now: $('now'),
  play: $('btn-play'), tempo: $('tempo'), tempoLabel: $('tempo-label'),
};

// ---------- carga ----------

function loadSongs() {
  (window.SONGS || []).forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = (/title:\s*(.*)/.exec(s.text) || [, s.id])[1];
    el.select.appendChild(opt);
  });
  selectSong(0);
}

function selectSong(index) {
  const entry = (window.SONGS || [])[index];
  if (!entry) return;
  original = entry.text;
  el.editor.value = entry.text;
  apply();
}

function apply() {
  player.stop();
  song = Notation.parseSong(el.editor.value);
  timeline = Notation.buildTimeline(song);
  loopBlock = null;
  position = null;

  player.quarterBpm = song.quarterBpm;
  player.beatsPerBar = song.beatsPerBar;

  el.errors.innerHTML = song.errors.length
    ? song.errors.map(e => `<div>⚠ ${e}</div>`).join('')
    : `<div class="ok">✓ ${timeline.bars} compases, ${timeline.notes.length} notas, sin errores de duración</div>`;

  el.info.innerHTML = [
    `<b>${song.meta.artist || ''}</b>`,
    `tono: <b>${song.meta.key || '—'}</b>`,
    `compás: <b>${song.meta.meter || '4/4'}</b>`,
    `tempo escrito: <b>${song.tempoValue} ${song.tempoUnit.replace('dotted-quarter', 'negra con puntillo').replace('quarter', 'negra')}</b>`,
    `= <b>negra ${Math.round(song.quarterBpm)}</b>`,
    song.meta.notes ? `<br>${song.meta.notes}` : '',
  ].filter(Boolean).join(' · ');

  renderBlocks();
  resize();
  updateTempoLabel();
}

// ---------- bloques / bucle ----------

let blockButtons = [];
function renderBlocks() {
  el.blocks.innerHTML = '';
  blockButtons = timeline.blocks.map((b, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${b.id} · c.${b.firstBar}`;
    btn.title = `${b.name} (repetir solo esta parte)`;
    btn.onclick = () => {
      loopBlock = loopBlock === i ? null : i;
      const playing = player.playing;
      player.stop();
      if (playing) startPlay();
      renderBlocks();
    };
    if (loopBlock === i) btn.classList.add('looped');
    el.blocks.appendChild(btn);
    return btn;
  });
}

function highlightBlocks() {
  timeline.blocks.forEach((b, i) => {
    const on = position !== null && position >= b.start && position < b.end;
    blockButtons[i].classList.toggle('on', on);
  });
}

// ---------- transporte ----------

function startPlay() {
  player.gains.rh = $('mute-rh').checked ? 1 : 0;
  player.gains.lh = $('mute-lh').checked ? 1 : 0;
  player.metronome = $('metronome').checked;
  player.loop = loopBlock === null ? null : {
    start: timeline.blocks[loopBlock].start, end: timeline.blocks[loopBlock].end,
  };
  const from = player.loop ? player.loop.start : 0;
  player.start(timeline, from, $('countin').checked ? song.beatsPerBar : 0);
  el.play.textContent = 'Detener';
}

el.play.onclick = () => {
  if (player.playing) { player.stop(); } else { startPlay(); }
};

player.onStop = () => { el.play.textContent = 'Reproducir'; };
player.onPosition = p => { position = p; };

el.tempo.oninput = () => {
  player.rate = el.tempo.value / 100;
  updateTempoLabel();
};
function updateTempoLabel() {
  const bpm = Math.round(song.quarterBpm * el.tempo.value / 100);
  el.tempoLabel.textContent = `${el.tempo.value}% · negra ${bpm}`;
}

['mute-rh', 'mute-lh', 'metronome'].forEach(id => {
  $(id).onchange = () => {
    player.gains.rh = $('mute-rh').checked ? 1 : 0;
    player.gains.lh = $('mute-lh').checked ? 1 : 0;
    player.metronome = $('metronome').checked;
  };
});

$('btn-apply').onclick = apply;
$('btn-reset').onclick = () => { el.editor.value = original; apply(); };
el.select.onchange = () => selectSong(+el.select.value);

$('btn-midi').onclick = () => download(
  MidiExport.exportMidi(timeline, {
    quarterBpm: song.quarterBpm, beatsPerBar: song.beatsPerBar, title: song.meta.title,
  }), `${slug(song.meta.title)}.mid`);

$('btn-json').onclick = () => download(MidiExport.exportJson(song, timeline), `${slug(song.meta.title)}.json`);

function slug(s) { return (s || 'cancion').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- dibujo ----------

function range() {
  let lo = 127, hi = 0;
  for (const n of timeline.notes) { lo = Math.min(lo, n.midi); hi = Math.max(hi, n.midi); }
  return [Math.floor(lo / 12) * 12, Math.ceil((hi + 1) / 12) * 12 - 1];
}

function setup(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  return ctx;
}

function drawRoll() {
  const c = el.roll, ctx = setup(c);
  const W = c.clientWidth, H = c.clientHeight, pad = 18;
  const [lo, hi] = range();
  const x = q => pad + (q / timeline.quarters) * (W - pad * 2);
  const y = m => H - pad - ((m - lo) / (hi - lo + 1)) * (H - pad * 2);
  const rowH = Math.max(3, (H - pad * 2) / (hi - lo + 1));

  ctx.strokeStyle = '#242a38';
  ctx.fillStyle = '#8b93a5';
  ctx.font = '11px system-ui';
  for (const b of timeline.blocks) {
    ctx.beginPath(); ctx.moveTo(x(b.start), 6); ctx.lineTo(x(b.start), H - 6); ctx.stroke();
    const label = `${b.id} · c.${b.firstBar}`;
    if (x(b.end) - x(b.start) > ctx.measureText(label).width + 8) ctx.fillText(label, x(b.start) + 4, 14);
  }
  if (loopBlock !== null) {
    const b = timeline.blocks[loopBlock];
    ctx.fillStyle = 'rgba(110,168,254,.10)';
    ctx.fillRect(x(b.start), 6, x(b.end) - x(b.start), H - 12);
  }

  for (const n of timeline.notes) {
    const active = position !== null && position >= n.start && position < n.start + n.dur;
    ctx.fillStyle = n.hand === 'rh'
      ? (active ? '#cfe2ff' : '#6ea8fe')
      : (active ? '#ffd9b0' : '#f0a868');
    const w = Math.max(2, x(n.start + n.dur) - x(n.start) - 1);
    ctx.fillRect(x(n.start), y(n.midi) - rowH, w, Math.max(2.5, rowH - 1));
  }

  if (position !== null) {
    ctx.strokeStyle = '#7ee0a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x(position), 4); ctx.lineTo(x(position), H - 4); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

const BLACK = [1, 3, 6, 8, 10];
function drawKeys() {
  const c = el.keys, ctx = setup(c);
  const W = c.clientWidth, H = c.clientHeight;
  const [lo, hi] = range();
  const whites = [];
  for (let m = lo; m <= hi; m++) if (!BLACK.includes(m % 12)) whites.push(m);
  const kw = W / whites.length;

  const active = new Map();
  if (position !== null) {
    for (const n of timeline.notes) {
      if (position >= n.start && position < n.start + n.dur) active.set(n.midi, n.hand);
    }
  }
  const color = hand => (hand === 'rh' ? '#6ea8fe' : '#f0a868');

  whites.forEach((m, i) => {
    ctx.fillStyle = active.has(m) ? color(active.get(m)) : '#eceef4';
    ctx.fillRect(i * kw, 0, kw - 1, H);
    if (m % 12 === 0) {
      ctx.fillStyle = '#8b93a5';
      ctx.font = '10px system-ui';
      ctx.fillText(Notation.midiToName(m), i * kw + 2, H - 4);
    }
  });
  whites.forEach((m, i) => {
    const up = m + 1;
    if (up > hi || !BLACK.includes(up % 12)) return;
    ctx.fillStyle = active.has(up) ? color(active.get(up)) : '#181c26';
    ctx.fillRect(i * kw + kw * 0.62, 0, kw * 0.72, H * 0.62);
  });
}

function drawNow() {
  if (position === null) { el.now.textContent = ''; return; }
  const block = timeline.blocks.find(b => position >= b.start && position < b.end);
  const sounding = timeline.notes
    .filter(n => position >= n.start && position < n.start + n.dur)
    .map(n => Notation.midiToName(n.midi));
  const bar = block
    ? block.firstBar + Math.floor((position - block.start) / song.meterQuarters)
    : '—';
  el.now.innerHTML = `Compás <b>${bar}</b> · sección <b>${block ? block.name : '—'}</b> · sonando <b>${sounding.join(' ') || '—'}</b>`;
}

function frame() {
  if (timeline) { drawRoll(); drawKeys(); drawNow(); highlightBlocks(); }
  requestAnimationFrame(frame);
}

function resize() { if (timeline) { drawRoll(); drawKeys(); } }
window.addEventListener('resize', resize);

loadSongs();
requestAnimationFrame(frame);

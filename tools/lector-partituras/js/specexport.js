// Exporta una pieza al JSON que pide la app del piano (mismo formato que piezas-json/).
//
// Regla de fondo: si falta algo que la app exige (un dedo en cada nota, la tonalidad, el
// compositor, la fuente) NO se exporta a medias: se devuelven los errores para mostrarlos.
// Un JSON incompleto que la app rechaza es peor que ningún JSON.
//
// Los metadatos que el texto de la partitura no puede llevar (compositor, tonalidad, de dónde
// salió, si el tempo estaba impreso...) viven en `spec` dentro del archivo de cada pieza.

const SpecExport = (() => {
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const round4 = x => Math.round(x * 1e4) / 1e4;

  function pcOfName(name) {
    let i = 1, alt = 0;
    while (name[i] === '#' || name[i] === 'b') { alt += name[i] === '#' ? 1 : -1; i++; }
    return (((LETTER_PC[name[0]] + alt) % 12) + 12) % 12;
  }

  function soundingChecks(notes) {
    const times = [...new Set(notes.map(n => round4(n.startBeat)))].sort((a, b) => a - b);
    const cross = [], shared = [];
    let span = 0;
    for (const t of times) {
      const snd = { rh: [], lh: [] };
      for (const n of notes) {
        if (n.startBeat - 1e-9 <= t && t < n.startBeat + n.durationBeats - 1e-9) snd[n.hand].push(n);
      }
      if (snd.rh.length && snd.lh.length) {
        const loR = snd.rh.reduce((a, b) => (b.midi < a.midi ? b : a));
        const hiL = snd.lh.reduce((a, b) => (b.midi > a.midi ? b : a));
        const rec = { beat: t, lh: hiL.name, rh: loR.name };
        if (hiL.midi > loR.midi) cross.push(rec);
        else if (hiL.midi === loR.midi) shared.push(rec);
      }
      for (const h of ['rh', 'lh']) {
        if (snd[h].length) {
          const ms = snd[h].map(n => n.midi);
          span = Math.max(span, Math.max(...ms) - Math.min(...ms));
        }
      }
    }
    return { cross, shared, span };
  }

  function positionSpan(notes) {
    const by = {};
    for (const n of notes) {
      const k = `${n.bar}|${n.hand}`;
      const cur = by[k] || (by[k] = [999, -1]);
      cur[0] = Math.min(cur[0], n.midi);
      cur[1] = Math.max(cur[1], n.midi);
    }
    const over = Object.entries(by).filter(([, [lo, hi]]) => hi - lo > 12)
      .map(([k, [lo, hi]]) => `c.${k.split('|')[0]} ${k.split('|')[1]}: ${hi - lo}`).sort();
    return {
      maxSemitones: Math.max(...Object.values(by).map(([lo, hi]) => hi - lo)), barsOverOneOctave: over,
      detail: 'informativo: de la nota más grave a la más aguda que toca esa mano en el compás; pasar de una octava implica mover la mano dentro del compás',
    };
  }

  const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // El bajo de cada compás: la nota más grave de la primera entrada de la izquierda.
  function barBass(notes) {
    const by = {};
    for (const n of notes) if (n.hand === 'lh') (by[n.bar] = by[n.bar] || []).push(n);
    const bass = {};
    for (const [bar, ns] of Object.entries(by)) {
      const first = Math.min(...ns.map(n => n.startBeat));
      bass[bar] = ns.filter(n => n.startBeat === first).reduce((a, b) => (b.midi < a.midi ? b : a));
    }
    return bass;
  }

  // La partitura no trae cifrados, así que no se juzga la armonía "en teoría" (con melodías
  // con notas de paso eso da falsos positivos por todas partes). Se hace algo más estrecho y
  // comprobable: si el bajo de la pieza repite un bucle (Cannon: 8 compases), se marcan los
  // compases donde se aparta de lo que hace en las demás vueltas.
  function bassLoopCheck(notes, bars, midiVerified) {
    const bass = barBass(notes);
    const spelled = {};                                   // pc -> nombre escrito en la pieza (F#, no Gb)
    Object.values(bass).forEach(n => { spelled[n.midi % 12] = spelled[n.midi % 12] || n.name.replace(/\d+$/, ''); });
    const pc = b => (bass[b] ? bass[b].midi % 12 : null);
    let best = null;
    for (let P = 2; P <= Math.floor(bars / 3); P++) {
      let match = 0, total = 0;
      for (let b = 1; b + P <= bars; b++) {
        if (pc(b) === null || pc(b + P) === null) continue;
        total++; if (pc(b) === pc(b + P)) match++;
      }
      if (total < 2 * P) continue;
      const rate = match / total;
      if (!best || rate > best.rate * 1.1) best = { P, rate, total };   // el período fundamental, no sus múltiplos
    }
    if (!best || best.rate < 0.6) {
      return { skipped: true, detail: 'la partitura no trae cifrados impresos y el bajo no repite un bucle detectable; no se inventó ninguna progresión' };
    }
    const flagged = [];
    for (let b = 1; b <= bars; b++) {
      if (pc(b) === null) continue;
      const votes = {}; let members = 0;
      for (let k = ((b - 1) % best.P) + 1; k <= bars; k += best.P) if (pc(k) !== null) { votes[pc(k)] = (votes[pc(k)] || 0) + 1; members++; }
      const [top, cnt] = Object.entries(votes).sort((x, y) => y[1] - x[1])[0];
      if (+top !== pc(b) && cnt >= 3 && cnt > members / 2) {
        flagged.push({ bar: b, bass: bass[b].name, expected: spelled[+top] || PC_NAMES[+top], support: `${cnt} de ${members} vueltas`, midi: bass[b].midi, startBeat: bass[b].startBeat });
      }
    }
    return {
      ok: flagged.length === 0, period: best.P, loopMatch: Math.round(best.rate * 100) / 100, flagged,
      detail: `sin cifrados impresos: se compara el bajo de cada compás con el bucle de ${best.P} compases que la propia pieza repite. Detecta desvíos respecto a sí misma, no armonía teórica; las notas marcadas también llevan doubt:true. ${midiVerified ? 'Están así en la partitura y en el MIDI (no es error de lectura)' : 'No hay MIDI para contrastarlas (podría ser error de lectura)'}: variación del arreglo o error del arreglo`,
    };
  }

  // Los mismos pasajes (mismas notas, mismo lugar, misma duración Y el mismo compás anterior y
  // siguiente dentro de la sección) llevan los mismos dedos. El contexto importa: una redonda suelta
  // "se repite" en cien sitios y forzarle el mismo dedo en todos empeora la digitación.
  // Solo se exige donde el dedo es una propuesta: si la partitura imprime dedos distintos en dos
  // pasajes idénticos, eso está en la partitura y se lista aparte, sin tocarlo.
  // scripts/unificar-dedos.js es quien los iguala; esto comprueba que quedó hecho.
  function identicalPassages(notes, barQuarters, sections) {
    const secOf = bar => sections.findIndex(s => bar >= s.fromBar && bar <= s.toBar);
    const out = { groups: 0, suggestedMismatches: [], printedDifferences: [] };
    for (const hand of ['rh', 'lh']) {
      const by = {};
      for (const n of notes) if (n.hand === hand) (by[n.bar] = by[n.bar] || []).push(n);
      for (const ns of Object.values(by)) ns.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
      const sigOf = (bar, ns) => ns.map(n => `${n.midi}@${round4(n.startBeat - (bar - 1) * barQuarters)}x${n.durationBeats}`).join(' ');
      const sigAt = (bar, sec) => (by[bar] && secOf(bar) === sec ? sigOf(bar, by[bar]) : null);
      const groups = {};
      for (const [b, ns] of Object.entries(by)) {
        const bar = +b, sec = secOf(bar);
        const key = `${sigAt(bar - 1, sec)}<${sigOf(bar, ns)}>${sigAt(bar + 1, sec)}`;
        (groups[key] = groups[key] || []).push({ bar, s: ns });
      }
      for (const g of Object.values(groups)) {
        if (g.length < 2) continue;
        out.groups++;
        for (let i = 0; i < g[0].s.length; i++) {
          if (new Set(g.map(m => m.s[i].finger)).size === 1) continue;
          const sug = g.some(m => m.s[i].fingerSource === 'suggested');
          const rec = { hand, note: g[0].s[i].name, bars: g.map(m => m.bar), fingers: g.map(m => m.s[i].finger) };
          (sug ? out.suggestedMismatches : out.printedDifferences).push(rec);
        }
      }
    }
    return out;
  }

  // Devuelve { ok: true, doc } o { ok: false, errors: [...] }.
  function build(song, entry) {
    const errors = [];
    const spec = entry && entry.spec;
    if (song.errors.length) {
      errors.push(`La partitura tiene ${song.errors.length} error(es) de compás o de formato; corrígelos antes de exportar. Primero: ${song.errors[0]}`);
    }
    if (!spec) {
      errors.push('Esta pieza no tiene "spec" (compositor, tonalidad, fuente, tempo) en su archivo de songs/.');
    } else {
      if (!spec.composer) errors.push('Falta el compositor (spec.composer).');
      if (!spec.source) errors.push('Falta de dónde salió la pieza (spec.source).');
      if (!spec.key || !spec.key.tonic || !SCALES[spec.key.mode]) errors.push('Falta la tonalidad (spec.key con tonic y mode "major" o "minor").');
      if (spec.tempoSource !== 'printed' && spec.tempoSource !== 'audio') errors.push('spec.tempoSource debe ser "printed" o "audio".');
    }
    if (errors.length) return { ok: false, errors };

    const notes = [], sections = [], dangling = [];
    let offset = 0, barOffset = 0;
    for (const sec of song.sections) {
      const from = offset;
      for (const hand of ['rh', 'lh']) {
        const open = {};
        for (const ev of sec.parsed[hand].events) {
          ev.pitches.forEach((midi, i) => {
            const start = offset + ev.start;
            const prev = open[midi];
            if (prev && Math.abs(prev.startBeat + prev.durationBeats - start) < 1e-6) {
              prev.durationBeats += ev.dur;
              if (!ev.tie) delete open[midi];
              return;
            }
            const note = {
              midi, name: ev.names[i], hand, startBeat: start, durationBeats: ev.dur, bar: barOffset + ev.bar,
              finger: ev.fingers ? ev.fingers[i] : null,
              fingerSource: ev.fingers ? (ev.suggested[i] ? 'suggested' : 'printed') : null,
              _sec: sec.id,
            };
            notes.push(note);
            if (ev.tie) open[midi] = note; else delete open[midi];
          });
        }
        for (const m of Object.keys(open)) dangling.push(`c.${open[m].bar} ${hand} ${open[m].name}`);
      }
      offset += sec.quarters;
      sections.push({ id: sec.id, fromBar: barOffset + 1, toBar: barOffset + sec.bars,
                      label: sec.name.replace(/\s*\(c\.[^)]*\)\s*$/, '') });
      barOffset += sec.bars;
    }

    const missing = notes.filter(n => n.finger == null);
    if (missing.length) {
      const sample = missing.slice(0, 4).map(n => `c.${n.bar} ${n.hand === 'rh' ? 'derecha' : 'izquierda'} ${n.name}`).join(', ');
      errors.push(`Faltan dedos en ${missing.length} de ${notes.length} notas (por ejemplo: ${sample}). La app exige un dedo del 1 al 5 en cada nota: escríbelo después de la duración (Eb5/8:4) o con ? si es una propuesta (Eb5/8:4?).`);
    }
    if (dangling.length) errors.push(`Ligaduras sin nota siguiente: ${dangling.join(', ')}.`);
    if (errors.length) return { ok: false, errors };

    notes.sort((a, b) => a.startBeat - b.startBeat || (a.hand === 'lh' ? -1 : 1) - (b.hand === 'lh' ? -1 : 1) || a.midi - b.midi);
    const doubtSections = spec.doubtSections || {};
    for (const n of notes) {
      if (doubtSections[n._sec]) { n.doubt = true; n.doubtReason = doubtSections[n._sec]; }
      delete n._sec;
      n.startBeat = round4(n.startBeat);
      n.durationBeats = round4(n.durationBeats);
    }
    const mcc = spec.extraChecks && spec.extraChecks.midiCrossCheck;
    const midiVerified = !!(mcc && !mcc.skipped && mcc.onlyInScoreCount === 0);
    const bassLoop = bassLoopCheck(notes, barOffset, midiVerified);
    for (const f of bassLoop.flagged || []) {
      const n = notes.find(x => x.hand === 'lh' && x.bar === f.bar && x.midi === f.midi && x.startBeat === f.startBeat);
      if (n) {
        n.doubt = true;
        n.doubtReason = `bajo ${f.bass} en el c.${f.bar}: en las demás vueltas del bucle de ${bassLoop.period} compases aquí va ${f.expected} (${f.support}); ${midiVerified ? 'la partitura y el MIDI coinciden con la nota tal como está' : 'sin MIDI para contrastar'}`;
      }
      delete f.midi; delete f.startBeat;
    }

    // ---- chequeos (los que pide la especificación) ----
    const keyPcs = new Set(SCALES[spec.key.mode].map(i => (pcOfName(spec.key.tonic) + i) % 12));
    const allowed = new Set((spec.allowedChromatics || []).map(pcOfName));
    const chromatic = notes.filter(n => !keyPcs.has(pcOfName(n.name)))
      .map(n => ({ bar: n.bar, name: n.name, accidental: allowed.has(pcOfName(n.name)) ? 'escrita' : null }));
    const { cross, shared, span } = soundingChecks(notes);
    const pinky = [];
    for (const h of ['rh', 'lh']) {
      const seq = notes.filter(n => n.hand === h).sort((a, b) => a.startBeat - b.startBeat);
      for (let i = 1; i < seq.length; i++) {
        const a = seq[i - 1], b = seq[i];
        if (a.startBeat !== b.startBeat && a.finger === 5 && b.finger === 5 && a.midi !== b.midi &&
            (a.fingerSource === 'suggested' || b.fingerSource === 'suggested')) {
          pinky.push(`c.${a.bar} ${h} ${a.name}→${b.name}`);
        }
      }
    }
    const nSug = notes.filter(n => n.fingerSource === 'suggested').length;
    const fingers = {
      printed: notes.filter(n => n.fingerSource === 'printed').length, suggested: nSug, missing: 0,
      detail: spec.fingersDetail || '"suggested" = propuesto con las reglas de la especificación (posición fija, mismo dedo por tecla, sin mover el meñique); donde la partitura imprime dedo, gana la partitura',
      pinkyKeyToKey: { count: pinky.length, where: pinky.slice(0, 10),
                       detail: 'la especificación pide evitar mover el meñique de tecla en tecla; en estos pasajes la propuesta no lo logró (solo notas con dedo propuesto)' },
    };
    if (nSug && !spec.fingersDetail) {
      fingers.suggesterBlindTest = 'prueba ciega del proponedor: ignorando los dedos impresos de Arioso, Für Elise y Passacaglia, coincide exactamente con 190 de 261 (73%); las diferencias suelen ser un dedo corrido. Son sugerencias, no digitación de maestro';
    }
    const notesText = [...(spec.notes_text || [])];
    if (cross.length) {
      const bars = [...new Set(cross.map(c => Math.floor(c.beat / (song.beatsPerBar * 4 / song.beatUnit)) + 1))].sort((a, b) => a - b);
      notesText.push(`cruce de manos en el/los compás(es) [${bars.join(', ')}]: la izquierda queda más aguda que notas de la derecha; así lo escribe la partitura (no se corrigió)`);
    }
    const idp = identicalPassages(notes, song.meterQuarters, sections);
    const checks = {
      barDurations: { ok: true, detail: `notas + silencios = ${song.beatsPerBar * 4 / song.beatUnit} tiempos en cada compás y mano (validado por el parser del lector)`, bars: barOffset, failures: {} },
      inKey: { ok: chromatic.every(c => c.accidental), detail: 'notas de la escala de la tonalidad; las cromáticas listadas deben estar verificadas contra la partitura (spec.allowedChromatics); una nota fuera de la escala y de esa lista marca ok:false', chromatic },
      chordsVsBass: bassLoop,
      handsCross: { ok: cross.length === 0, crossings: cross, sharedPitchCount: shared.length, sharedPitch: shared.slice(0, 8),
                    detail: 'cruce = la izquierda suena más aguda que la derecha; "sharedPitch" = misma nota en las dos manos a la vez (unísono)' },
      handSpanPerInstant: { ok: span <= 12, maxSemitones: span, detail: 'nota más grave a más aguda que una mano tiene sonando a la vez' },
      handPositionSpanPerBar: positionSpan(notes),
      midiCrossCheck: { skipped: true, detail: `el lector no tiene el MIDI; el cruce nota por nota con el MIDI original está en piezas-json/${entry.id}.json` },
      ...(spec.extraChecks || {}),
      identicalPassages: { ok: idp.suggestedMismatches.length === 0, ...idp,
        detail: 'compases idénticos de una misma mano llevan los mismos dedos. suggestedMismatches = dedo propuesto que difiere (debe estar vacío); printedDifferences = la propia partitura imprime dedos distintos en pasajes idénticos y se respeta' },
      fingers,
      doubtNotes: notes.filter(n => n.doubt).length,
    };

    const doc = { id: entry.id, title: spec.title || song.meta.title, composer: spec.composer };
    // El arreglista nunca se inventa: si la partitura no lo trae, va null y con la razón.
    doc.arranger = spec.arranger || null;
    if (spec.arrangerNote) doc.arrangerNote = spec.arrangerNote;
    if (spec.credit) doc.credit = spec.credit;
    doc.source = spec.source;
    doc.key = spec.key;
    if (spec.keyNote) doc.keyNote = spec.keyNote;
    Object.assign(doc, { meter: song.meta.meter || '4/4', pickupBeats: 0, quarterBpm: song.quarterBpm, tempoSource: spec.tempoSource });
    if (spec.tempoNote) doc.tempoNote = spec.tempoNote;
    if (spec.tempoChanges) doc.tempoChanges = spec.tempoChanges;
    const rit = spec.ritardando || { present: false };
    const warnings = [];
    if (rit.present) {
      warnings.push(`ritardando ${rit.numeric ? 'impreso con números' : 'impreso sin números'} (${rit.where}): quarterBpm es el tempo BASE y startBeat/durationBeats están escritos a ese tempo; el ritardando no está aplicado a las notas` +
                    (rit.numeric ? ' (ver ritardando.tempoChanges)' : ''));
    }
    if (!doc.arranger) warnings.push('arreglista desconocido: la partitura no lo imprime y el archivo no lo trae (arranger: null)');
    if (checks.doubtNotes) warnings.push(`${checks.doubtNotes} nota(s) con doubt:true (ver notes[].doubtReason)`);
    if (!checks.identicalPassages.ok) warnings.push('hay pasajes idénticos con dedos propuestos distintos (checks.identicalPassages)');
    if (!checks.inKey.ok) warnings.push('hay notas fuera de la tonalidad que no están verificadas (checks.inKey)');
    Object.assign(doc, { ritardando: rit, bars: barOffset, notes, sections, order: song.order, notes_text: notesText, warnings, checks });
    return { ok: true, doc, warnings: checks.inKey.ok ? [] : ['Hay notas fuera de la tonalidad que no están verificadas (ver checks.inKey).'] };
  }

  // Igual que piezas-json/: una nota por línea, para que se pueda leer y comparar.
  function format(doc) {
    const lines = ['{'];
    const keys = Object.keys(doc);
    keys.forEach((k, i) => {
      const comma = i < keys.length - 1 ? ',' : '';
      if (k === 'notes') {
        lines.push('  "notes": [');
        doc.notes.forEach((n, j) => lines.push('    ' + JSON.stringify(n) + (j < doc.notes.length - 1 ? ',' : '')));
        lines.push('  ]' + comma);
      } else {
        lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(doc[k], null, 2).replace(/\n/g, '\n  ')}${comma}`);
      }
    });
    lines.push('}');
    return lines.join('\n') + '\n';
  }

  return { build, format };
})();

window.SpecExport = SpecExport;

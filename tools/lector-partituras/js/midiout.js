// Salida MIDI: manda la pieza al piano (P-45B) en vez de sintetizarla.
// Los samples del Yamaha son mejores que cualquier cosa que genere el navegador.
//
// Web MIDI NO funciona dentro de un iframe (el artifact publicado): el permiso
// lo delega la página que envuelve, y esta app no la controla. Ahí se detecta y
// se dice, en vez de dejar un botón que no hace nada.

const VELOCITY = { rh: 92, lh: 78 };

class MidiOut {
  constructor() {
    this.access = null;
    this.port = null;
    this.sounding = new Set();
    this.embedded = window.self !== window.top;
  }

  get available() { return !!navigator.requestMIDIAccess; }

  async connect() {
    if (!this.available) {
      return { ok: false, reason: 'Este navegador no tiene Web MIDI (en iPhone no existe; usa Chrome o Edge de escritorio).' };
    }
    try {
      // Si el permiso queda colgado (el navegador no pregunta ni responde) hay
      // que salir: si no, el estado se queda en "Buscando el piano…" para siempre.
      this.access = await Promise.race([
        navigator.requestMIDIAccess({ sysex: false }),
        new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000)),
      ]);
    } catch {
      return {
        ok: false,
        reason: this.embedded
          ? 'MIDI bloqueado aquí: esta página va dentro de un iframe y el permiso lo decide quien la envuelve, no esta app. Abre tools/lector-partituras/index.html directo en Chrome o Edge de escritorio.'
          : 'El navegador no dio acceso a MIDI (lo negaste o no respondió al permiso). Vuelve a elegir "Piano por MIDI" y acepta el aviso.',
      };
    }
    this.access.onstatechange = () => { if (this.onPorts) this.onPorts(this.ports()); };
    const ports = this.ports();
    if (!ports.length) return { ok: false, reason: 'No hay ninguna salida MIDI conectada. Enchufa el piano por USB y enciéndelo.' };
    this.use(ports[0].id);
    return { ok: true, ports };
  }

  ports() {
    if (!this.access) return [];
    const seen = {};
    return [...this.access.outputs.values()].map(p => {
      seen[p.name] = (seen[p.name] || 0) + 1;
      return { id: p.id, name: seen[p.name] > 1 ? `${p.name} · ${seen[p.name]}` : p.name };
    });
  }

  use(id) {
    this.allNotesOff();
    this.port = this.access ? this.access.outputs.get(id) : null;
    return this.port;
  }

  // `when` viene en tiempo de AudioContext; Web MIDI quiere performance.now().
  // Con 200 ms de lookahead la deriva entre los dos relojes es inapreciable.
  note(midi, when, durSeconds, hand, ctx) {
    if (!this.port) return;
    const at = performance.now() + (when - ctx.currentTime) * 1000;
    this.port.send([0x90, midi, VELOCITY[hand] || 80], Math.max(0, at));
    this.port.send([0x80, midi, 0], Math.max(0, at + durSeconds * 1000));
    this.sounding.add(midi);
  }

  // Red de seguridad: sin esto el piano se queda sonando solo al parar.
  allNotesOff() {
    if (!this.port) return;
    for (const n of this.sounding) this.port.send([0x80, n, 0]);
    this.sounding.clear();
    this.port.send([0xb0, 123, 0]);
  }
}

window.MidiOut = MidiOut;

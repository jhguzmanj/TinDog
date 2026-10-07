#!/usr/bin/env python3
"""Genera las muestras de piano que van incrustadas en piano-midi-trainer.html.

Fuente: Salamander Grand Piano V3, de Alexander Holm (CC BY 3.0), en la copia
que distribuye Tone.js (github.com/Tonejs/audio, carpeta salamander/): 30
notas, una cada 3 semitonos, de La0 (MIDI 21) a Do8 (MIDI 108).

Cada nota se recorta (las graves duran más), se pasa a mono, se le baja el final
para que no corte de golpe, se iguala su volumen y se comprime a MP3 de 48 kbps.
Salida: una línea por nota, "MIDI base64". Esa salida va dentro del
<script type="text/plain" id="pianoSamples"> del HTML.

Uso:  pip install imageio-ffmpeg numpy
      python3 tools/build-piano-samples.py RAW_DIR SALIDA.txt
donde RAW_DIR trae los MP3 originales (A0.mp3, C1.mp3, Ds1.mp3, Fs1.mp3, ...).
"""
import base64, subprocess, sys, os
import numpy as np
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
NAMES = ['A0','C1','Ds1','Fs1','A1','C2','Ds2','Fs2','A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4',
         'A4','C5','Ds5','Fs5','A5','C6','Ds6','Fs6','A6','C7','Ds7','Fs7','A7','C8']
PC = {'C':0,'Cs':1,'D':2,'Ds':3,'E':4,'F':5,'Fs':6,'G':7,'Gs':8,'A':9,'As':10,'B':11}

def midi_of(name):
    pc = name[:-1]; octv = int(name[-1])
    return 12 * (octv + 1) + PC[pc]

def length_for(m):          # segundos que se guardan: las cuerdas graves suenan más
    if m <= 40: return 5.0
    if m <= 60: return 4.0
    if m <= 84: return 3.0
    return 2.2

def decode(path):
    p = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()

def encode(x):
    p = subprocess.run([FF, '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return p.stdout

def main(raw, out):
    lines, total = [], 0
    for n in NAMES:
        m = midi_of(n)
        x = decode(os.path.join(raw, n + '.mp3'))
        # arranca donde empieza la nota (se descarta el silencio previo, <30 ms)
        on = int(np.argmax(np.abs(x) > 0.01 * np.max(np.abs(x))))
        x = x[max(0, on - int(0.004 * SR)):]
        x = x[:int(length_for(m) * SR)]
        fade = int(0.7 * SR)
        x[-fade:] *= np.linspace(1, 0, fade) ** 2
        # mismo volumen en toda la escala: RMS de los primeros 0.5 s
        rms = np.sqrt(np.mean(x[:int(0.5 * SR)] ** 2))
        g = 0.09 / max(rms, 1e-6)
        peak = np.max(np.abs(x)) * g
        if peak > 0.9: g *= 0.9 / peak
        x = x * g
        mp3 = encode(x)
        total += len(mp3)
        lines.append('%d %s' % (m, base64.b64encode(mp3).decode()))
        print(n, m, '%.1fs' % (len(x) / SR), '%.0f KB' % (len(mp3) / 1024))
    open(out, 'w').write('\n'.join(lines) + '\n')
    print('total mp3: %.0f KB, base64: %.0f KB' % (total / 1024, total * 4 / 3 / 1024))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

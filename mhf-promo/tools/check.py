#!/usr/bin/env python3
"""Prüft die fertige MP4: Format, Farbraum, Lautheit, True Peak, Kontaktbogen, Sprach-Zeitplan, QR-Code."""
import json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP4 = os.path.join(ROOT, 'out', 'mhf-promo.mp4')
cfg = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./config.js')))"], cwd=ROOT))
T = json.load(open(os.path.join(ROOT, 'build', 'timings.json')))
report = []


def say(s=''):
    print(s); report.append(s)


p = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4]))
v = next(s for s in p['streams'] if s['codec_type'] == 'video')
a = next(s for s in p['streams'] if s['codec_type'] == 'audio')
say(f"Video: {v['width']}x{v['height']} {v['codec_name']} {v['pix_fmt']} {v['r_frame_rate']} fps, Farbmatrix {v.get('color_space')}, Primaries {v.get('color_primaries')}, Transfer {v.get('color_transfer')}, Range {v.get('color_range')}")
say(f"Audio: {a['codec_name']} {a['sample_rate']} Hz {a['channels']} Kanäle, Dauer {float(p['format']['duration']):.2f} s")

r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', MP4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
sm = r[r.rindex('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', sm).group(1))
TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', sm).group(1))
LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', sm).group(1))
say(f"Lautheit: {I:.1f} LUFS (Ziel {cfg['audio']['loudnessLUFS']}), True Peak {TP:.2f} dBFS (Grenze -1.0), LRA {LRA:.1f} LU")
ok = abs(I - cfg['audio']['loudnessLUFS']) <= 1.0 and TP < -1.0 and v['width'] == cfg['format']['width'] and v['height'] == cfg['format']['height'] and v.get('color_space') == 'bt709'
say('Technik-Check: ' + ('bestanden' if ok else 'NICHT bestanden'))

# Kontaktbogen: ein Bild pro 2 s
out = os.path.join(ROOT, 'out', 'kontaktbogen.png')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', MP4, '-vf', 'fps=1/2,scale=216:-1,tile=10x2:padding=6:color=0x222222', '-frames:v', '1', out], check=True)
say(f'Kontaktbogen: {out}')

# Sprach-Zeitplan gegen die echte Tonspur: Pegel im Sprechfenster vs. davor
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
sr = 16000
say('\nSprach-Zeitplan (Soll-Text) und Pegel in der fertigen Tonspur')
say('Hinweis: Es gibt lokal keine deutsche Spracherkennung. Der Text stammt aus config.js, der Pegel zeigt, ob die Zeile hörbar ist.')
for line in cfg['voice']['lines']:
    for c in line['chunks']:
        k = f"{line['id']}.{c['id']}"
        s, e = T['chunks'][k]['start'], T['chunks'][k]['end']
        seg = x[int(s * sr):int(e * sr)]
        rms = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        say(f"  {s:6.2f}-{e:6.2f} s  {rms:6.1f} dBFS  {c['say']}")

# Stille am Anfang und zwischen den Zeilen
say('\nBewusste Stille (Pegel unter -50 dBFS):')
win = int(0.1 * sr)
lv = [20 * np.log10(np.sqrt(np.mean(x[i:i + win] ** 2)) + 1e-9) for i in range(0, len(x) - win, win)]
runs, st = [], None
for i, l in enumerate(lv + [0]):
    if l < -50 and st is None: st = i
    if l >= -50 and st is not None:
        if (i - st) >= 8: runs.append((st / 10, i / 10))
        st = None
for a_, b_ in runs: say(f'  {a_:5.1f} s bis {b_:5.1f} s')

# QR-Code im Schlussbild lesbar?
try:
    import cv2
    t = T['total'] - 1.2
    png = os.path.join(ROOT, 'build', 'qr_check.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', MP4, '-frames:v', '1', png], check=True)
    img = cv2.imread(png)
    txt, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    say(f"\nQR-Code im Video gelesen: {txt!r} ({'stimmt' if txt == cfg['qr']['url'] else 'ABWEICHUNG'})")
except ImportError:
    say('\nQR-Check übersprungen (opencv fehlt)')

open(os.path.join(ROOT, 'out', 'pruefbericht.txt'), 'w').write('\n'.join(report) + '\n')

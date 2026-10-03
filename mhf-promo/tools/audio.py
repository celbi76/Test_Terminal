#!/usr/bin/env python3
"""Erzeugt Sprache (espeak-ng + MBROLA), Musik und Effekte lokal, mischt und normalisiert.
Schreibt build/timings.json (Zeiten für die Animation) und build/audio.wav."""
import json, os, re, subprocess, sys, wave, math, shutil
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build')
os.makedirs(BUILD, exist_ok=True)
os.makedirs(os.path.join(BUILD, 'voice'), exist_ok=True)

cfg = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./config.js')))"], cwd=ROOT))
SR = cfg['audio']['sampleRate']
V = cfg['voice']
rng = np.random.default_rng(7)


def db(x):
    return 10 ** (x / 20.0)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kw)


def read_wav(path):
    with wave.open(path, 'rb') as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    assert sw == 2
    a = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    return a, sr


def resample_to_sr(path_in, path_out):
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path_in, '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_s16le', path_out])


def synth(text, out_wav, lang='de', voice=None):
    tmp = out_wav + '.raw.wav'
    if lang == 'en':
        cmd = ['espeak-ng', '-v', V['enVoice'], '-s', str(V['enSpeed']), '-p', str(V['enPitch']), '-w', tmp, text]
    else:
        cmd = ['espeak-ng', '-v', voice or V['voice'], '-s', str(V['speed']), '-p', str(V['pitch']), '-w', tmp, text]
    run(cmd)
    resample_to_sr(tmp, out_wav)
    os.remove(tmp)
    a, _ = read_wav(out_wav)
    return a


def trim(a, thr=0.006, pad=0.02):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(pad * SR))
    e = min(len(a), idx[-1] + int(pad * SR))
    return a[s:e]


def highpass(a, fc=70):
    # FFT-Hochpass, sanft
    n = len(a)
    X = np.fft.rfft(a)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X, n).astype(np.float32)


def fft_band(a, lo, hi):
    n = len(a)
    X = np.fft.rfft(a)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, n).astype(np.float32)


def make_ir(seconds=1.1):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 5.2)
    ir = fft_band(ir.astype(np.float32), 200, 5500)
    ir[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))


IR = make_ir()


def reverb(a, wet):
    n = len(a) + len(IR)
    nfft = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(a, nfft) * np.fft.rfft(IR, nfft), nfft)[:n].astype(np.float32)
    out = np.zeros(n, np.float32)
    out[:len(a)] += a * (1 - wet)
    out += y * wet * 0.9
    return out


def rms_norm(a, target_db=-20):
    r = np.sqrt(np.mean(a ** 2)) + 1e-9
    return a * (db(target_db) / r)


# ---------- Sprache ----------
def resolve(spec, T):
    if isinstance(spec, (int, float)):
        return float(spec)
    ref = spec['ref']
    base = T['chunks'][ref][spec.get('edge', 'start')]
    return base + spec.get('offset', 0.0)


def build_voice():
    T = {'chunks': {}, 'lines': {}, 'cues': {}}
    voice_events = []  # (start_sample, audio)
    for line in V['lines']:
        lid = line['id']
        at = resolve(line['at'], T)
        override = os.path.join(ROOT, 'assets', 'voice', lid + '.wav')
        if os.path.exists(override):
            tmp = os.path.join(BUILD, 'voice', lid + '_own.wav')
            resolve_wav = tmp
            resample_to_sr(override, resolve_wav)
            a, _ = read_wav(resolve_wav)
            a = trim(a)
            total_chars = sum(len(c['say']) for c in line['chunks'])
            t = at
            for c in line['chunks']:
                d = len(a) / SR * len(c['say']) / total_chars
                T['chunks'][f"{lid}.{c['id']}"] = {'start': t, 'end': t + d}
                t += d
            voice_events.append((int(at * SR), a))
            T['lines'][lid] = {'start': at, 'end': at + len(a) / SR}
            continue
        t = at
        first = True
        for c in line['chunks']:
            wavp = os.path.join(BUILD, 'voice', f"{lid}_{c['id']}.wav")
            a = synth(c['say'], wavp, lang=c.get('lang', 'de'))
            a = trim(a)
            a = highpass(a)
            a = rms_norm(a, -22) * db(V['gainDb'])
            a = reverb(a, V['reverbWet'])
            if not first:
                t += V['gap']
            t += c.get('pauseBefore', 0.0)
            first = False
            dur = len(a) / SR - len(IR) / SR * 0  # inkl. Hall
            speech_dur = len(trim(read_wav(wavp)[0])) / SR
            T['chunks'][f"{lid}.{c['id']}"] = {'start': t, 'end': t + speech_dur}
            voice_events.append((int(t * SR), a))
            t += speech_dur
        T['lines'][lid] = {'start': at, 'end': t}
    for name, spec in cfg['cues'].items():
        T['cues'][name] = resolve(spec, T)
    return T, voice_events


def build_samples():
    out = os.path.join(ROOT, 'out', 'stimmen')
    os.makedirs(out, exist_ok=True)
    txt = 'Wenn Arbeit krank macht, braucht es Dialog. Donnerstag, fünfter November, Hellraum Galerie, Stäfa.'
    for v in V['samplesVoices']:
        p = os.path.join(out, f'probe_{v}.wav')
        tmp = p + '.tmp.wav'
        run(['espeak-ng', '-v', v, '-s', str(V['speed']), '-p', str(V['pitch']), '-w', tmp, txt])
        resample_to_sr(tmp, p)
        os.remove(tmp)


# ---------- Synthese ----------
def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR * decay).astype(np.float32)


def place(buf, a, t, gain=1.0, pan=0.0):
    s = int(t * SR)
    if s >= buf.shape[1]:
        return
    e = min(buf.shape[1], s + len(a))
    seg = a[:e - s] * gain
    l = math.cos((pan + 1) * math.pi / 4)
    r = math.sin((pan + 1) * math.pi / 4)
    buf[0, s:e] += seg * l * math.sqrt(2)
    buf[1, s:e] += seg * r * math.sqrt(2)


def tone_tick(f=1500, d=0.03):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * env_exp(n, 140)
    nz = rng.standard_normal(n).astype(np.float32) * env_exp(n, 400) * 0.35
    return (x + nz).astype(np.float32)


def sfx_boom():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    f = 42 + 70 * np.exp(-t * 14)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_exp(n, 2.4)
    nz = fft_band(rng.standard_normal(n).astype(np.float32), 0, 400) * env_exp(n, 7) * 1.4
    return (x + nz).astype(np.float32)


def sfx_glitch(d=0.55):
    n = int(d * SR)
    out = np.zeros(n, np.float32)
    k = 0
    while k < n:
        L = min(int(rng.uniform(0.004, 0.03) * SR), n - k)
        if rng.random() < 0.7:
            seg = rng.standard_normal(L).astype(np.float32)
            q = int(rng.integers(3, 12))
            seg = np.repeat(seg[::q], q)[:L]
            out[k:k + len(seg)] += seg * rng.uniform(0.2, 0.8)
        k += L + int(rng.uniform(0.002, 0.05) * SR)
    out *= np.linspace(1, 0.15, n).astype(np.float32)
    return fft_band(out, 400, 9000)


def sfx_bloom():
    # tiefer Schlag plus kurze helle Welle, die den Klang öffnet
    a = sfx_boom() * 0.9
    n = int(1.2 * SR)
    nz = fft_band(rng.standard_normal(n).astype(np.float32), 1500, 9000)
    nz *= np.exp(-np.arange(n) / SR * 3.2).astype(np.float32) * 0.25
    out = np.zeros(max(len(a), n), np.float32)
    out[:len(a)] += a
    out[:n] += nz
    return out


def sfx_hit():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for f, g in [(110, 1.0), (164.81, 0.6), (220, 0.5), (329.63, 0.35)]:
        out += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)).astype(np.float32) * g
    out *= env_exp(n, 1.7)
    out[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    b = np.zeros(n, np.float32)
    bb = sfx_boom()[:n]
    b[:len(bb)] = bb
    return out / 2.2 + b * 0.5


def swell(d):
    n = int(d * SR)
    nz = fft_band(rng.standard_normal(n).astype(np.float32), 800, 8000)
    env = (np.linspace(0, 1, n) ** 3).astype(np.float32)
    return nz * env


CHORDS = [
    [110.0, 164.81, 220.0, 261.63, 329.63, 493.88],   # Am9
    [87.31, 130.81, 174.61, 261.63, 329.63, 392.00],  # Fmaj9 ohne Quinte
    [130.81, 196.00, 261.63, 329.63, 392.00, 587.33], # Cadd9
    [98.00, 146.83, 196.00, 293.66, 392.00, 493.88],  # G6/9
]
PENTA = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 659.25, 587.33]


def pad_voice(f, n, detune):
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for h in range(1, 7):
        out += (np.sin(2 * np.pi * f * (1 + detune) * h * t + h) / h ** 1.6).astype(np.float32)
    return out


def build_music(total, t0, T, names0):
    n = int(total * SR)
    beat = 60.0 / cfg['audio']['bpm']
    tr = cfg['audio']['tracks']
    stems = {k: np.zeros((2, n), np.float32) for k in ['pad', 'bass', 'bells', 'hat']}
    # Pad: Akkord alle 4 Schläge, 0.5 s Überblendung
    bar = 4 * beat
    k = 0
    t = t0
    fade_out_start = total - cfg['audio']['musicFadeOut'] - 0.2
    while t < total:
        ch = CHORDS[k % len(CHORDS)]
        L = int((bar + 0.6) * SR)
        seg = np.zeros(L, np.float32)
        for i, f in enumerate(ch):
            seg += pad_voice(f, L, 0.0015) * (1.0 if i < 3 else 0.6)
        e = np.ones(L, np.float32)
        fi = int(0.6 * SR)
        e[:fi] = np.linspace(0, 1, fi)
        e[-fi:] = np.minimum(e[-fi:], np.linspace(1, 0, fi))
        seg *= e / 6.0
        lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.19 * np.arange(L) / SR + k)
        place(stems['pad'], seg * lfo, t, 1.0, pan=-0.15)
        place(stems['pad'], pad_voice(ch[2], L, -0.002) * e / 8.0 * lfo, t, 1.0, pan=0.2)
        t += bar
        k += 1
    # Bass-Puls auf jedem Schlag, Hi-Hat auf den Offbeats ab "names0"
    t = t0
    ramp_end = t0 + 3.0
    while t < total:
        L = int(0.5 * SR)
        tt = np.arange(L) / SR
        f = 48 + 60 * np.exp(-tt * 38)
        kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
        g = 0.55 + 0.45 * min(1.0, (t - t0) / 3.0)
        place(stems['bass'], kick.astype(np.float32), t, g)
        if t > names0 - 0.01:
            hl = int(0.05 * SR)
            hat = fft_band(rng.standard_normal(hl).astype(np.float32), 6000, 0) * env_exp(hl, 90)
            place(stems['hat'], hat.astype(np.float32), t + beat / 2, 0.8, pan=0.3)
        t += beat
    # Glocken, Achtel-Muster, ab einem Takt nach Start
    step = beat / 2
    t = t0 + bar
    i = 0
    pattern = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
    while t < total:
        if pattern[i % len(pattern)]:
            f = PENTA[(i * 3 + i // 4) % len(PENTA)]
            L = int(1.6 * SR)
            tt = np.arange(L) / SR
            bell = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.76 * tt) + 0.2 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 3.2)
            place(stems['bells'], bell.astype(np.float32), t, 0.5, pan=-0.5 if (i // 2) % 2 else 0.5)
        t += step
        i += 1
    # Ende: Ausblenden
    fo = np.ones(n, np.float32)
    s = int(fade_out_start * SR)
    fo[s:] = np.linspace(1, 0, n - s) ** 1.5
    # Einblenden der Musik am Start (kurzer Anlauf)
    out = np.zeros((2, n), np.float32)
    for k_, st in stems.items():
        out += st * db(tr[k_]) * fo
    return out


def build_tension(total, t_end):
    # leise Spannung vor "Dialog.": tiefer Ton und Rauschen steigen an, klingen nach dem Einsatz aus
    n = int(total * SR)
    out = np.zeros((2, n), np.float32)
    s0, e0 = int(0.5 * SR), int(t_end * SR)
    e1 = e0 + int(0.8 * SR)
    L = e1 - s0
    t = np.arange(L) / SR
    env = np.concatenate([np.linspace(0, 1, e0 - s0) ** 2.2, np.linspace(1, 0, e1 - e0)]).astype(np.float32)
    drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 55.4 * t) + 0.25 * np.sin(2 * np.pi * 110 * t)
             + 0.12 * np.sin(2 * np.pi * 164.81 * t)).astype(np.float32) * 0.35
    nz = fft_band(rng.standard_normal(L).astype(np.float32), 300, 2500) * 0.35
    sig = (drone + nz) * env
    out[0, s0:e1] += sig
    out[1, s0:e1] += sig * 0.97
    return out


def duck_envelope(voice_mix, n):
    a = np.abs(voice_mix.mean(axis=0))
    win = int(0.03 * SR)
    kernel = np.ones(win, np.float32) / win
    e = np.convolve(a, kernel, mode='same')
    active = (e > 0.004).astype(np.float32)
    # Haltezeit und Release
    atk = 1 - math.exp(-1 / (cfg['audio']['duckAttack'] * SR))
    rel = 1 - math.exp(-1 / (cfg['audio']['duckRelease'] * SR))
    env = np.zeros(n, np.float32)
    v = 0.0
    # blockweise, damit die Python-Schleife kurz bleibt
    B = 64
    for i in range(0, n, B):
        tgt = active[i:i + B].max() if i < len(active) else 0.0
        c = atk if tgt > v else rel
        v += (tgt - v) * (1 - (1 - c) ** B)
        env[i:i + B] = v
    return env


def main():
    T, voice_events = build_voice()
    a = cfg['audio']
    last_end = max(l['end'] for l in T['lines'].values())
    total = math.ceil((last_end + cfg['format']['tail']) * cfg['format']['fps']) / cfg['format']['fps']
    assert total <= cfg['format']['maxDuration'], f'Video zu lang: {total:.2f}s'
    T['total'] = total
    T['lastVoiceEnd'] = last_end
    t_music = resolve(a['musicStart'], T)
    T['musicStart'] = t_music
    n = int(total * SR)

    voice = np.zeros((2, n), np.float32)
    for s, au in voice_events:
        e = min(n, s + len(au))
        if s < n:
            voice[0, s:e] += au[:e - s]
            voice[1, s:e] += au[:e - s]
    voice *= db(a['tracks']['voice']) if V.get('enabled', True) else 0.0   # Stimme aus: Zeiten bleiben, Ton fällt weg

    music = build_music(total, t_music, T, T['cues']['names0'])
    music += build_tension(total, t_music) * db(a['tracks']['tension'])
    env = duck_envelope(voice, n)
    music *= (1 - env * (1 - db(a['duckDb'])))[None, :]

    fx = np.zeros((2, n), np.float32)
    sf = a['sfx']
    for lid in a['tickLines']:
        for cid in [c['id'] for c in next(l for l in V['lines'] if l['id'] == lid)['chunks']]:
            key = f'{lid}.{cid}'
            if key in a['tickSkip']:
                continue
            place(fx, tone_tick(1500), T['chunks'][key]['start'], db(sf['tick']))
    for ev in a['events']:
        if 'cue' in ev:
            t = T['cues'][ev['cue']]
        else:
            t = T['chunks'][ev['ref']][ev.get('edge', 'start')] + ev.get('offset', 0)
        ty = ev['type']
        if ty == 'glitch':
            place(fx, sfx_glitch(), t, db(sf['glitch']))
        elif ty == 'boom':
            place(fx, sfx_boom(), t, db(sf['boom']))
        elif ty == 'bloom':
            place(fx, swell(0.55), t - 0.55, db(sf['bloom'] - 8))
            place(fx, sfx_bloom(), t, db(sf['bloom']))
        elif ty == 'nameTick':
            place(fx, tone_tick(900, 0.05), t, db(sf['nameTick']))
        elif ty == 'hit':
            place(fx, sfx_hit(), t, db(sf['hit']))

    mix = voice + music + fx
    peak = np.max(np.abs(mix))
    mix = mix / max(1.0, peak / 0.9)   # nur gegen Übersteuern vor dem Normalisieren
    T['audioEvents'] = {'ticks': True}
    pre = os.path.join(BUILD, 'mix_pre.wav')
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
    with wave.open(pre, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    # Lautheit in zwei Durchgängen auf -16 LUFS, True Peak begrenzen
    I, TP = a['loudnessLUFS'], a['truePeakDb']
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', pre, '-af', f'loudnorm=I={I}:TP={TP}:LRA=20:print_format=json', '-f', 'null', '-'])
    txt = r.stderr.decode()
    j = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
    flt = (f"loudnorm=I={I}:TP={TP}:LRA=20:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
           f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
           f"alimiter=limit={db(TP - 0.3):.4f}:level=disabled")
    final = os.path.join(BUILD, 'audio.wav')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af', flt, '-ar', str(SR), '-c:a', 'pcm_s24le', final])

    # Regelschleife: Lautheit und True Peak nach AAC-Kodierung messen und nachstellen
    def measure(path):
        tmp = os.path.join(BUILD, 'measure.m4a')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-c:a', 'aac', '-b:a', '256k', tmp])
        r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
        sm = r[r.rindex('Summary:'):]
        return float(re.search(r'I:\s+(-?[\d.]+) LUFS', sm).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', sm).group(1))
    for _ in range(4):
        li, tp = measure(final)
        print(f'  Regelschleife: {li:.2f} LUFS, True Peak {tp:.2f} dBFS')
        gain = I - li
        if abs(gain) <= 0.15 and tp <= -1.2:
            break
        # Pegel nachstellen, Spitzen mit Limiter unterhalb der Grenze halten
        gain = min(gain, -1.2 - tp) if tp + gain > -1.2 and False else gain
        adj = os.path.join(BUILD, 'audio_adj.wav')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', final, '-af', f'volume={gain:.3f}dB,alimiter=limit={db(-1.8):.4f}:level=disabled:attack=2:release=60', '-c:a', 'pcm_s24le', adj])
        os.replace(adj, final)

    json.dump(T, open(os.path.join(BUILD, 'timings.json'), 'w'), indent=1, ensure_ascii=False)
    # QR-Matrix
    import qrcode
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(cfg['qr']['url']); q.make(fit=True)
    json.dump(q.get_matrix(), open(os.path.join(BUILD, 'qr.json'), 'w'))
    build_samples()
    print(f"Dauer {total:.2f}s, letzte Stimme endet {last_end:.2f}s, Musik ab {t_music:.2f}s")
    for k, v in T['chunks'].items():
        print(f"  {k:6s} {v['start']:6.2f} - {v['end']:6.2f}")
    print('  cues', {k: round(v, 2) for k, v in T['cues'].items()})


if __name__ == '__main__':
    main()

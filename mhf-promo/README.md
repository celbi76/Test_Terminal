# Promo-Video 3. MentalHealth Forum Stäfa (5. November 2026)

Ergebnis: `out/mhf-promo.mp4` (1080 x 1920, 30 fps, H.264, bt709, rund 38 s, -16 LUFS).
Alles ist im Code gezeichnet. Einziges Foto: dein Flyer, verpixelt und farbreduziert (Hintergrund).

## Neu rendern
Voraussetzungen: ffmpeg, Node 22 mit Playwright und Chromium, Python 3 mit numpy, pillow, qrcode, opencv-python-headless, espeak-ng mit MBROLA-Stimmen (mbrola-de2 u. a.).

    ./build.sh

Das erzeugt Ton (`tools/audio.py`), Bilder und MP4 (`tools/render.js`) und den Prüfbericht (`tools/check.py`, Ausgabe in `out/pruefbericht.txt` und `out/kontaktbogen.png`).
Einzelbilder zum schnellen Testen: `node tools/render.js --stills 5.7,12,34` (Ergebnis in `build/stills/`). Mit `--safe` wird der 15-Prozent-Rahmen eingezeichnet.

## Was du wo änderst (alles in `config.js`)
- Texte im Bild: `text`. Schriftgrössen: `sizes`. Farben: `colors`. Schrift: `fonts`.
- Gesprochener Text: `voice.lines[].chunks[].say`. Schreibweise für die Aussprache darf vom Bildtext abweichen.
- Timing: `voice.lines[].at` (Zahl oder Bezug auf ein Wort der Vorzeile) und `cues`. Bild und Soundeffekte folgen den berechneten Wortzeiten automatisch.
- Stimme: `voice.voice` (mb-de2, mb-de4, mb-de6, mb-de8), `speed`, `pitch`. Hörproben: `out/stimmen/`.
- Lautstärke: `audio.tracks` (Stimme, Pad, Bass, Glocken, Hi-Hat), `audio.sfx` (Klick, Schlag, Glitch, Hit), `audio.duckDb` (Musik unter Sprache), `audio.loudnessLUFS`, `audio.truePeakDb`.
- Mosaik (verpixelter Flyer): `mosaic` (Blockgrössen, Helligkeit `gain`, Abdunklung `dim`).
- QR-Code: `qr.url`.

## Eigene Stimme statt Computerstimme
Sprich jede Zeile als Datei `assets/voice/v1.wav` bis `v6.wav` ein (Text siehe `voice.lines`, v6 ohne "Offen für alle"). Die Datei ersetzt die ganze Zeile. Bildtexte verteilen sich dann nach Zeichenanzahl über die Dauer der Aufnahme. Danach `./build.sh`.

## Aktualisierung vor dem Posten
Die Seite braucht keine Tageszahl, das Video bleibt bis zum 5. November gültig. Preise und Zeiten stehen in `text.s5` und `text.s6`.

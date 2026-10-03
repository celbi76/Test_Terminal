# Protokoll

## Werkzeuge und Einschränkungen
- Verfügbar: ffmpeg (libx264, aac), Node 22, Playwright mit Chromium, Python mit numpy und pillow, espeak-ng.
- Sprachausgabe: espeak-ng mit MBROLA-Stimmen (mb-de2) nach apt-Installation. Kein API-Key, daher keine Cloud-Stimme. Klingt synthetisch.
- Stimmvergleich: drei Stimmen (mb-de2, mb-de4, mb-de6) als Hörproben in `out/stimmen/`. Ich kann nicht hören und habe keine Spracherkennung, daher habe ich mb-de2 als gängigste männliche MBROLA-Stimme gesetzt, nicht nach Gehör gewählt. Bitte anhören.
- Spracherkennung: nicht verfügbar. faster-whisper ist installiert, das Modell lässt sich wegen gesperrter Hosts (huggingface) nicht laden. Es gibt kein deutsches pocketsphinx-Modell. Ersatz: Soll-Text mit Zeitstempeln und Pegel pro Zeile aus der fertigen Tonspur (`out/pruefbericht.txt`). Ob Namen und Marke richtig klingen, ist damit nicht geprüft.
- Logo und Porträts: Website-Medien nicht herunterladbar (Proxy). Verwendet wird allein der Flyer. Das Logo ist eine Wortmarke in Bai Jamjuree, nicht das Originallogo.
- Schreibweise: "MentalHealth Forum" überall im Bild. Im gesprochenen Text steht "Mentalhelth Forum" als Aussprachehilfe.

## Freigegebene Fakten (Flyer und Website)
3. MentalHealth Forum Stäfa. Stop Silence. Burnout, wenn Arbeit krank macht, braucht es Dialog. Podiumsgespräch mit Betroffenen, Experten und Führungskräften. Donnerstag, 5. November 2026, 19 bis 21 Uhr. Hellraum Galerie, Bergstrasse 1, 8712 Stäfa, beim Bahnhof. Michel Bamert (Einführung und Moderation), Melanie Sudan (Expertin für berufliche Reintegration), Bettina Wolgensinger (Perspektive aus eigener Erfahrung), Marcel Biegger (Führungsperson im Gesundheitswesen). Offen für alle. Abendkasse sFr. 15.-. Website: Psychische Gesundheit wird oft verdrängt oder tabuisiert. Der Wochentag Donnerstag stammt von der Eventseite der Website.

## Iteration 0: Aufbau
Sprache zuerst gerendert, Bild und Effekte hängen an den gemessenen Wortzeiten (`build/timings.json`).
Erste Dauer 47,9 s, zu lang. Ursache: Sprechtempo 128, ausgeschriebene Jahreszahl im Sprechtext.
Änderung: Tempo 160, Sprechtext "Donnerstag, 5. November.", Zeile "Offen für alle" nur im Bild, kürzere Pausen. Dauer 38,0 s.

## Iteration 1: erster kompletter Render
Befunde aus Kontaktbogen und Prüfbericht:
- Mosaik zu hell an manchen Blöcken, weisse Schrift dort schwach. Änderung: Mosaikfarben auf 50 % Helligkeit, Abdunklung 20 %.
- Satz am Anfang nutzte nur die linke Bildhälfte. Änderung: Schrift 140 auf 164 Pixel.
- Rollen der Gäste (36 px) zu klein fürs Handy. Änderung: 40 px, Namen 74 px, QR-Beschriftung 36 px.
- Mitten im Video fehlte die Zuordnung. Änderung: kleine Kennzeile "3. MentalHealth Forum Stäfa" oben ab "Dialog.".
- Schlag auf "Burnout." und Einsatz bei "Dialog." lagen mit -9,6 und -11,4 dBFS deutlich über dem Sprachpegel (-18 dBFS) und deckten das Wort ab. Änderung: Schlag -10 dB, Einsatz -11 dB, Abschluss-Akkord -13 dB.
- Namen erschienen 0,3 s vor dem Szenenwechsel auf das Datum. Änderung: Datum startet 1,4 s nach dem letzten Namen.

## Iteration 2: Ergebnis
- 1080 x 1920, 30 fps, H.264 yuv420p, bt709 (Matrix, Primaries, Transfer), Range tv.
- Lautheit -16,0 LUFS, True Peak -1,6 dBFS, LRA 4,2 LU.
- QR-Code im Schlussbild mit OpenCV gelesen, stimmt mit der Event-URL überein.
- Wichtige Inhalte im Rahmen 15 % bis 85 % der Höhe (Rahmen in Stills mit `--safe` geprüft). Nur Farbstreifen und Mosaik laufen darüber hinaus.

## Iteration 3: Stimme entfernt (Auftrag: Stimme ist nicht brauchbar)
- `voice.enabled: false`. Die Sprachtexte bleiben für die Zeiten der Bildwechsel, sie werden nicht mehr gemischt. Bild unverändert.
- Neu: Spur "tension" (tiefer Ton und Rauschen steigen ab 0,5 s bis "Dialog." an, klingen danach aus), damit die ersten 10 s ohne Stimme nicht leer wirken. Klicks begleiten weiterhin jeden neuen Text, Musik setzt bei "Dialog." ein.
- Befund: loudnorm lieferte -15,5 LUFS und True Peak -0,9 dBFS nach AAC. Änderung: Regelschleife in `tools/audio.py` misst nach der AAC-Kodierung und stellt nach. Ergebnis -16,0 LUFS, True Peak -2,2 dBFS.
- Der Hinweis zur Stimme weiter oben gilt nur noch für `voice.enabled: true`.

## Zweitversion "foto" (Auftrag: mehr Fotorealismus)
- Hintergrund war zu abstrakt. Neu: `assets/flyer_clean.png` aus deinem Flyer. Die weisse Schrift und der QR-Code sind per Inpainting (OpenCV, Top-Hat-Maske) entfernt, es wird nichts erzeugt. Das Foto ist eine Unterführung mit Bewegungsunschärfe, keine Gesichter.
- Das Mosaik löst sich bei "Dialog." in zehn Stufen auf und geht in das scharfe Foto über. Danach Zoom 12 % und Drift, Filmkorn, weicher Textschatten.
- Befund beim ersten Test: Nebentexte (grau) auf hellem Fensterbereich schwer lesbar. Änderung: hellere Nebenfarbe, Abdunklung 0,30, Textschatten 30 px.
- Einschränkung: Das Foto hat 1240 x 1748 Pixel und ist selbst unscharf. Mehr Schärfe geht damit nicht. Für echten Fotorealismus bräuchte es ein hochauflösendes Foto von dir.
- Rendern dauert wegen des Korns länger (rund 8 Minuten). Erste Kodierung mit crf 14 ergab 341 MB. Änderung: crf 21 und Bitratengrenze 4 Mbit/s, Ergebnis 19 MB (die 43-MB-Datei liess sich nicht in den Chat hochladen) bei gleichem Technik-Check (1080 x 1920, bt709, -16,0 LUFS, True Peak -2,2 dBFS, QR lesbar).

## Offen, nur von dir prüfbar
- Ton anhören: Musik, Klicks, Schlag auf "Burnout." und Einsatz bei "Dialog.". Ich habe keine Möglichkeit zu hören und prüfe nur Pegel.
- Michel Bamert und Melanie Sudan sind genannt, wie auf dem Flyer.

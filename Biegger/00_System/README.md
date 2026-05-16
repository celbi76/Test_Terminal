---
title: Second Brain – Systemübersicht
tags: [system, meta, para, zettelkasten, claude-ai]
erstellt: 2026-05-16
aktualisiert: 2026-05-16
typ: system
---

# Second Brain – Systemübersicht

> *"Your mind is for having ideas, not holding them."* – David Allen

Willkommen in deinem persönlichen Wissensmanagementsystem. Dieses System kombiniert drei bewährte Methoden zu einem leistungsstarken Ganzen: **PARA**, **Zettelkasten** und **KI-gestützte Wissensverarbeitung mit Claude**.

---

## Die drei Säulen dieses Systems

### 1. PARA-Methode (Tiago Forte)

PARA steht für **P**rojekte, **A**reas (Bereiche), **R**essourcen und **A**rchiv. Es ist ein Organisationssystem, das auf Handlungsrelevanz basiert – nicht auf Themen oder Kategorien.

| Ordner | Inhalt | Zeitlicher Horizont |
|--------|--------|---------------------|
| `01_Inbox` | Ungefilterte Erfassung | Sofort → täglich verarbeiten |
| `02_Projekte` | Aktive Vorhaben mit klarem Ziel | Wochen bis Monate |
| `03_Bereiche` | Verantwortungsbereiche ohne Enddatum | Dauerhaft |
| `04_Ressourcen` | Referenzmaterial nach Thema | Bei Bedarf |
| `05_Archiv` | Abgeschlossenes, inaktives Material | Dauerhaft, selten abgerufen |

**Der entscheidende Unterschied zu klassischen Systemen:** Du sortierst nicht nach Thema, sondern nach *Handlungsrelevanz*. Ein Artikel über Ernährung gehört in ein Projekt (wenn du gerade eine Diät planst), in einen Bereich (wenn Gesundheit ein dauerhafter Verantwortungsbereich ist) oder in Ressourcen (als Referenz für später).

### Schlüsselfragen für die Ablage

- **Ist es zeitgebunden und ergebnisbezogen?** → `02_Projekte`
- **Ist es ein dauerhafter Lebensbereich?** → `03_Bereiche`
- **Ist es ein Thema, das mich interessiert?** → `04_Ressourcen`
- **Ist es eine destillierte Erkenntnis?** → `06_Zettelkasten`
- **Weiss ich noch nicht wohin?** → `01_Inbox` ← immer korrekt

### 2. Zettelkasten-Methode (Niklas Luhmann)

Der Zettelkasten ist kein Ablagesystem, sondern ein **Denkpartner**. Jede Notiz ist:

- **Atomar** – ein einziger, vollständig ausgedrückter Gedanke
- **Autonom** – verständlich ohne Kontext anderer Notizen
- **Vernetzt** – explizit verknüpft mit verwandten Gedanken

Der Zettelkasten lebt in `06_Zettelkasten/` und folgt dem Prinzip: **Schreibe für dein zukünftiges Ich**, das den Ursprungskontext vergessen hat.

**Zettel-Typen in diesem System:**

| Typ | Symbol | Beschreibung |
|-----|--------|-------------|
| Flüchtige Notiz | F | Rohe Ideen aus der Inbox – temporär, werden verarbeitet |
| Literaturnotiz | L | Was du aus einer Quelle gelernt hast – in eigenen Worten |
| Permanente Notiz | P | Dein eigener Gedanke, deine eigene Einsicht – das Herzstück |
| MOC | M | Übersichtskarten, die verwandte Zettel zusammenführen |

**Verlinkungsstrategie – frage dich immer:**
1. *Welche bestehenden Notizen beleuchten diesen Gedanken aus einem anderen Winkel?*
2. *Was widerspricht diesem Gedanken?*
3. *Was setzt dieser Gedanke voraus?*
4. *Was folgt logisch aus diesem Gedanken?*

### 3. Claude AI Integration

Claude ist dein eingebetteter Denkpartner. Er hilft dir:

- Rohe Notizen in atomare Zettel umzuwandeln
- Verbindungen zwischen scheinbar unzusammenhängenden Ideen zu finden
- Komplexe Texte zu verarbeiten und zu destillieren
- Wöchentliche Reviews zu strukturieren
- Schreibblockaden zu überwinden
- Eigene Annahmen kritisch zu hinterfragen

Alle Claude-Prompts findest du in [[Claude_Prompts]].

---

## Workflow: Wie das System zusammenarbeitet

```
ERFASSEN         VERARBEITEN        DESTILLIEREN       AUSDRÜCKEN
    |                  |                  |                  |
Inbox  ──────────► PARA-Ordner ──────► Zettelkasten ──────► Output
    |               (täglich)          (wöchentlich)      (Projekte)
    |                  |                  |
    └── Claude ────────┴───── Claude ─────┘
        beim Sortieren         beim Verknüpfen
```

### Täglicher Workflow (10–15 Minuten)

1. **Morgens:** Tagesnotiz öffnen (Template: [[Templates/Tagesnotiz]]), Tagesplan skizzieren
2. **Tagsüber:** Alles in die `01_Inbox` werfen – ohne Nachdenken
3. **Abends:** Inbox verarbeiten (verarbeiten, nicht nur lesen)
   - Was gehört wohin? (PARA entscheiden)
   - Was wird ein Zettel? (Zettelkasten)
   - Claude-Fragen für komplexe Stücke notieren

### Wöchentlicher Workflow (30–45 Minuten)

1. Alle Tagesnotizen der Woche durchsehen
2. Zettelkasten-Verbindungen prüfen und ergänzen
3. Projekte reviewen (Fortschritt? Blockaden? Abzuschliessen?)
4. Bereiche checken (Alles im Lot? Nachholbedarf?)
5. MOC-Index aktualisieren: [[MOC_Index]]
6. Claude Weekly Review Prompt anwenden (siehe [[Claude_Prompts]])

### Monatlicher Workflow (1–2 Stunden)

1. Projekte: Abschliessen oder archivieren
2. Ressourcen: Veraltetes archivieren
3. Zettelkasten: Neue MOCs erstellen wo verdichtet genug
4. System-Review: Was funktioniert? Was reibt? Was soll sich ändern?

---

## Ordnerstruktur

```
Biegger/
├── 00_System/              ← Meta-Ebene (du bist hier)
│   ├── README.md           ← Diese Datei
│   ├── Claude_Prompts.md   ← KI-Prompts Bibliothek
│   └── Templates/
│       ├── Tagesnotiz.md   ← Tägliche Notiz
│       ├── Zettel.md       ← Atomare Notiz
│       ├── Projekt.md      ← Projektvorlage
│       └── Meeting.md      ← Besprechungsnotiz
│
├── 01_Inbox/               ← Alles rein, kein Nachdenken
├── 02_Projekte/            ← Aktive Vorhaben
├── 03_Bereiche/            ← Dauerhafte Verantwortungsbereiche
├── 04_Ressourcen/          ← Referenzmaterial nach Thema
├── 05_Archiv/              ← Abgeschlossenes Material
├── 06_Zettelkasten/        ← Dein Denknetz
└── MOC_Index.md            ← Startseite / Dashboard
```

---

## Tagging-Konvention

Konsistente Tags machen das System durchsuchbar. Halte dich an diese Konventionen:

```
Status-Tags:
  #status/roh          → Frisch erfasst, noch nicht verarbeitet
  #status/verarbeitet  → In Zettel oder PARA-Ordner überführt
  #status/archiv       → Nicht mehr aktiv, aber aufbewahrt

Typ-Tags:
  #typ/zettel          → Atomare permanente Notiz
  #typ/literaturnotiz  → Notiz zu einer externen Quelle
  #typ/moc             → Map of Content / Überblickskarte
  #typ/projekt         → Projektnotiz
  #typ/meeting         → Besprechungsprotokoll
  #typ/tagesnotiz      → Tägliche Reflexion

Inhalts-Tags (nach eigenen Bereichen anpassen):
  #lernen              → Lernbezogenes
  #arbeit              → Berufliches
  #idee                → Ideen und Einfälle
  #frage               → Offene Fragen, noch ungeklärt
  #einsicht            → Wichtige Erkenntnisse, Aha-Momente
```

---

## Empfohlene Obsidian-Plugins

| Plugin | Zweck |
|--------|-------|
| **Templater** | Dynamische Templates mit Datum, Variablen |
| **Dataview** | Automatische Listen, Abfragen, Dashboards |
| **Calendar** | Tägliche Notizen im Kalenderformat |
| **Graph View** | Wissensvisualisierung als Netz |
| **QuickAdd** | Schnelle Erfassung in die Inbox |
| **Kanban** | Projektboards für visuelle Planung |

---

## Regeln für ein gesundes Second Brain

1. **Alles rein, nichts löschen** – die Inbox ist heilig, das Archiv auch
2. **Eigene Worte** – Verstehen, nicht kopieren. Immer paraphrasieren.
3. **Verlinken beim Schreiben** – nicht als nachträgliche Aufgabe
4. **Regelmässig reviewen** – wöchentlich ist besser als täglich oder nie
5. **Perfektion ist der Feind des Guten** – eine unvollkommene Notiz ist besser als keine
6. **Claude fragen, wenn blockiert** – KI als Denkwerkzeug, nicht als Denkersatz

---

## Navigation

- [[MOC_Index]] – Hauptdashboard und Einstiegspunkt
- [[Claude_Prompts]] – KI-Prompts für alle Situationen
- [[Templates/Tagesnotiz]] – Vorlage für Tagesnotizen
- [[Templates/Zettel]] – Vorlage für atomare Notizen
- [[Templates/Projekt]] – Vorlage für Projekte
- [[Templates/Meeting]] – Vorlage für Meetings

---

#system #meta #para #zettelkasten #readme

*Zuletzt aktualisiert: 2026-05-16*

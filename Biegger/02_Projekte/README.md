---
title: Projekte – Aktive Vorhaben mit Ziel und Deadline
tags: [projekte, para, system]
erstellt: 2026-05-16
typ: system
---

# Projekte – Aktive Vorhaben mit Ziel und Deadline

> *"A project is a series of tasks linked to a goal, with a deadline."* – Tiago Forte

Der Projekte-Ordner enthält alle aktiven Vorhaben, an denen du gerade arbeitest. Jedes Projekt hat ein **klares Ziel** und ein **Enddatum** (auch wenn du das Enddatum noch nicht kennst – dann schätze es).

---

## Was ist ein Projekt?

Ein Projekt ist eine **zeitlich begrenzte Anstrengung** mit einem **definierten Ergebnis**. Wenn du nicht sagen kannst, wann ein Projekt "fertig" ist, ist es wahrscheinlich kein Projekt, sondern ein Bereich.

**Tests zur Unterscheidung:**

| Frage | Projekt | Bereich |
|-------|---------|---------|
| Hat es ein klares Ende? | Ja | Nein |
| Kann ich es als "fertig" markieren? | Ja | Nein |
| Hat es ein spezifisches Ergebnis? | Ja | Nein |
| Ist es eine dauernde Verantwortung? | Nein | Ja |

**Beispiele für Projekte:**
- Website redesignen (fertig wenn live)
- Buch lesen und zusammenfassen (fertig wenn Zettel geschrieben)
- Präsentation vorbereiten (fertig wenn gehalten)
- Wohnung renovieren (fertig wenn abgenommen)
- Artikel schreiben (fertig wenn publiziert)
- Bewerbung einreichen (fertig wenn abgeschickt)

**Keine Projekte (das sind Bereiche):**
- "Gesundheit verbessern" → Bereich "Gesundheit"
- "Lesen" → Bereich "Lesen & Lernen"
- "Gute Führungskraft sein" → Bereich "Führung"

---

## Ordnerstruktur empfohlen

```
02_Projekte/
├── README.md                          ← Diese Datei
├── [Projektname-1]/
│   ├── Projekt_[Name].md             ← Projektnotiz (mit Template)
│   ├── Meetings/
│   └── Ressourcen/
├── [Projektname-2]/
│   └── Projekt_[Name].md
└── _Archiviert/                       ← Abgeschlossene Projekte (vor Archiv)
```

Alternativ (für einfachere Struktur):
```
02_Projekte/
├── README.md
├── Projekt_[Name1].md
├── Projekt_[Name2].md
└── Projekt_[Name3].md
```

---

## Projekt-Lebenszyklus

```
IDEE ──► PLANUNG ──► AKTIV ──► ABSCHLUSS ──► ARCHIV
  |                     |           |
Inbox             02_Projekte   05_Archiv
```

### Phase 1: Idee
- Notiz in der Inbox: "Projekt-Idee: [Name]"
- Noch keine eigene Datei nötig

### Phase 2: Planung
- Projekt-Datei erstellen (Template: [[Templates/Projekt]])
- Ziel definieren, Meilensteine skizzieren
- Status: `geplant`

### Phase 3: Aktiv
- Regelmässig bearbeiten
- Wöchentlicher Review-Eintrag im Projekt
- Status: `aktiv`

### Phase 4: Abschluss
- Letzte Aufgaben abarbeiten
- Abschluss-Reflexion schreiben (Was lief gut? Was würde ich ändern?)
- Relevante Erkenntnisse in den Zettelkasten überführen
- Status: `abgeschlossen`

### Phase 5: Archiv
- Projektordner nach `05_Archiv/Projekte/` verschieben
- Tags auf `#status/archiv` setzen

---

## Wöchentliches Projekt-Review

Führe jede Woche einen Review für jedes aktive Projekt durch:

**Für jedes Projekt frage dich:**
1. Was habe ich diese Woche bei diesem Projekt erreicht?
2. Was steht als nächstes an?
3. Gibt es Blockaden? Wenn ja, wie löse ich sie?
4. Ist die Deadline noch realistisch?
5. Sollte dieses Projekt pausiert oder archiviert werden?

**Claude-Prompt für Projekt-Review:**
```
Hier ist mein Projektstatus für [PROJEKTNAME]:

Ziel: [Ziel]
Deadline: [Datum]
Letzter Stand: [Was bisher erreicht wurde]
Aktuelle Blockaden: [Was nicht läuft]
Nächste geplante Schritte: [Was als nächstes ansteht]

Bitte hilf mir:
1. Den Fortschritt realistisch einzuschätzen
2. Mögliche blinde Flecken zu identifizieren
3. Die nächste beste Massnahme zu benennen
4. Falls hinter dem Zeitplan: Optionen zur Kurskorrektur vorzuschlagen
```

---

## Aktuelle Projekte

> *Dataview-Abfrage für Obsidian (Plugin erforderlich):*

```dataview
TABLE deadline, status, priorität
FROM "02_Projekte"
WHERE typ = "projekt" AND status = "aktiv"
SORT deadline ASC
```

---

## Projektanzahl begrenzen

**Faustregel:** Maximal **5–7 aktive Projekte** gleichzeitig. Bei mehr verlierst du den Überblick und die Energie verteilt sich zu dünn.

Wenn du mehr Ideen für Projekte hast, als du aktiv bearbeiten kannst: Erstelle eine "Projekt-Warteschlange" in den Ressourcen oder in einem separaten Bereich.

---

## Verbindungen

- [[MOC_Index]] – Dashboard
- [[00_System/README]] – Systemübersicht
- [[00_System/Templates/Projekt]] – Projekt-Template
- [[03_Bereiche/README]] – Unterschied Projekte vs. Bereiche
- [[05_Archiv/README]] – Wohin abgeschlossene Projekte wandern

---

#projekte #para #system

*Zuletzt aktualisiert: 2026-05-16*

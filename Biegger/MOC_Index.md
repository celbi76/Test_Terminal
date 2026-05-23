---
title: MOC Index – Second Brain Dashboard
tags: [moc, dashboard, index, system]
erstellt: 2026-05-16
aktualisiert: 2026-05-16
typ: moc
---

# Second Brain – Dashboard

> *Willkommen. Dies ist dein Startpunkt. Alles beginnt hier.*

---

## Schnellzugriff

| Aktion | Link |
|--------|------|
| Neue Tagesnotiz | [[00_System/Templates/Tagesnotiz]] |
| In Inbox werfen | [[01_Inbox/README\|→ Inbox öffnen]] |
| Neuen Zettel erstellen | [[00_System/Templates/Zettel]] |
| Neues Projekt starten | [[00_System/Templates/Projekt]] |
| Claude-Prompts öffnen | [[00_System/Claude_Prompts]] |
| System-Dokumentation | [[00_System/README]] |

---

## Systemzustand – Wöchentlicher Check

> *Diesen Bereich einmal pro Woche ausfüllen*

**Letzte Aktualisierung:** 2026-05-16  
**Inbox-Status:** Leer / Klein / Mittel / Gross  
**Zettelkasten-Aktivität diese Woche:** neue Zettel  
**Aktive Projekte:**  
**Wochenfazit:**

---

## PARA-Navigation

### Inbox
[[01_Inbox/README|01 Inbox]] – Alles ungefilterte Material landet hier zuerst

### Aktive Projekte
[[02_Projekte/README|02 Projekte]] – Zeitgebundene Vorhaben mit klarem Ziel

> *Dataview-Block (Obsidian-Plugin erforderlich):*
> ```dataview
> TABLE deadline AS "Deadline", status AS "Status", priorität AS "Prio"
> FROM "02_Projekte"
> WHERE typ = "projekt" AND status = "aktiv"
> SORT deadline ASC
> ```

**Manuell gepflegte Projektliste:**
- 

### Bereiche
[[03_Bereiche/README|03 Bereiche]] – Dauerhafte Verantwortungsbereiche

**Meine Bereiche:**
- [ ] Gesundheit
- [ ] Beruf
- [ ] Familie & Beziehungen
- [ ] Finanzen
- [ ] Lernen
- [ ] Kreativität
- [ ] 

### Ressourcen
[[04_Ressourcen/README|04 Ressourcen]] – Thematisches Referenzmaterial

**Aktive Themensammlungen:**
- 
- 

### Archiv
[[05_Archiv/README|05 Archiv]] – Abgeschlossenes, inaktives Material

---

## Zettelkasten

[[06_Zettelkasten/README|Zettelkasten-Übersicht]] – Dein Denknetz aus atomaren, vernetzten Ideen

### Maps of Content (MOCs)

> *Erstelle für jedes Hauptthema eine MOC – hier verlinken:*

- [[06_Zettelkasten/README|Zettelkasten Übersicht]] ← Startpunkt
- *Füge hier deine MOCs ein, sobald sie entstehen*

### Letzte Zettel

> *Dataview (manuell oder mit Plugin):*
> ```dataview
> TABLE erstellt AS "Erstellt"
> FROM "06_Zettelkasten"
> WHERE typ = "zettel"
> SORT erstellt DESC
> LIMIT 10
> ```

---

## Wissensbereiche und Themen

> *Trage hier deine wichtigsten Wissensfelder ein – mit Links zu MOCs oder Ressourcen*

### Methodik & Werkzeuge
- [[00_System/README|Second Brain System]]
- [[06_Zettelkasten/README|Zettelkasten-Methode]]

### [Dein Bereich 1]
- 

### [Dein Bereich 2]
- 

### [Dein Bereich 3]
- 

---

## Aktuelle Fokusthemen

> *Was beschäftigt mich gerade intellektuell am meisten? (monatlich aktualisieren)*

1. 
2. 
3. 

**Offene Fragen, die mich beschäftigen:**
- ?
- ?
- ?

---

## Wöchentliches Review – Checkliste

> *Jeden Sonntag oder Montag durchgehen*

### Diese Woche verarbeitet:
- [ ] Inbox geleert
- [ ] Neue Tagesnotizen gesichtet
- [ ] Neue Zettel geschrieben und verlinkt
- [ ] Projekte aktualisiert
- [ ] MOC-Index aktualisiert (diese Seite)

### Fragen für den Review:
1. Was habe ich diese Woche gelernt?
2. Welche Idee war am interessantesten?
3. Welches Projekt hat Fortschritt gemacht?
4. Was nehme ich nächste Woche in Angriff?

### Claude Weekly Review Prompt:
```
Wochenreview KW [X]: Meine Notizen und Erkenntnisse der Woche:
[Tagesnotizen der Woche einfügen]

Fragen: 1) Wichtigste Erkenntnisse? 2) Muster? 3) Zettel-Kandidaten? 
4) Nächste Woche: Die 3 wichtigsten Hebel?
```

---

## Tagesnotizen – Letzter Monat

> *Dataview (Plugin erforderlich):*
> ```dataview
> LIST
> FROM "01_Inbox" OR "03_Bereiche"
> WHERE typ = "tagesnotiz"
> SORT datum DESC
> LIMIT 30
> ```

**Schnell-Links aktuelle Woche:**
- [[Tagesnotiz – Heute]]
- 

---

## Zitate und Lieblingsgedanken

> *Lass dich inspirieren – trage hier besonders treffende Gedanken ein*

> *"Schreibe, um zu denken – nicht um aufzuzeichnen, was du bereits gedacht hast."*

> *"Die Unfähigkeit, eine unfertige Notiz zu tolerieren, verhindert gute Notizen."* – Sönke Ahrens

> *"Knowledge is only a rumor until it's in the muscle."* – Papua New Guinea Sprichwort

---

## Systemgesundheit

> *Monatlich aktualisieren*

| Metrik | Stand | Ziel |
|--------|-------|------|
| Zettel gesamt | | wächst |
| Aktive Projekte | | max. 7 |
| Inbox-Rückstand | | 0 (wöchentlich) |
| Letzte System-Review | 2026-05-16 | monatlich |

---

## Bücher und Medien

### Gerade am Lesen / Hören
- 

### Als nächstes
- 
- 

### Abgeschlossen (mit Notizen)
- 

---

## Notizen zur Systempflege

> *Ideen, wie du das System verbessern kannst*

- 
- 

---

## Navigation

| Bereich | Link | Beschreibung |
|---------|------|-------------|
| System | [[00_System/README]] | Methodologie und Anleitung |
| Prompts | [[00_System/Claude_Prompts]] | KI-Prompt-Bibliothek |
| Inbox | [[01_Inbox/README]] | Ungefilterte Erfassung |
| Projekte | [[02_Projekte/README]] | Aktive Vorhaben |
| Bereiche | [[03_Bereiche/README]] | Verantwortungsfelder |
| Ressourcen | [[04_Ressourcen/README]] | Thematisches Wissen |
| Archiv | [[05_Archiv/README]] | Abgeschlossenes |
| Zettelkasten | [[06_Zettelkasten/README]] | Dein Denknetz |

---

#moc #dashboard #index #system

*Zuletzt aktualisiert: 2026-05-16*

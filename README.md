# WhatChanged?

**Zeig mir nur, was anders ist.**

WhatChanged? V0.1.1 vergleicht zwei Textversionen oder lokal extrahierten PDF-Text im Browser. Alt steht links, Neu rechts; auf kleinen Bildschirmen stehen die eindeutig beschrifteten Seiten untereinander. Entfernte, hinzugefügte und plausibel geänderte Zeilen werden mit unverändertem Kontext gezeigt. Geänderte Zeilen enthalten Wort-/Tokenmarkierungen.

Keine Zusammenfassung mit künstlicher Intelligenz, keine Interpretation von Bedeutung, rechtlichen Fristen, Risiko, Wichtigkeit oder Konsequenzen. Kein visuell exakter PDF-Vergleich.

## Lokal starten

Node.js **22.12 oder neuer** (getestet mit 24.18.0), npm und ein moderner Browser:

```sh
npm ci
npm run dev
```

Die im Terminal angezeigte lokale Adresse öffnen. Der Entwicklungsserver öffnet keinen Browser automatisch und bindet nur an `127.0.0.1`.

```sh
npm test
npm run build
npm run test:browser
```

`npm test` führt die reinen Logiktests mit Nodes eingebautem Test Runner aus. `npm run build` erzeugt `dist/`. `npm run test:browser` prüft diesen Build in echtem, headless Google Chrome über Playwright; dafür muss Chrome installiert sein. Port 48173 muss frei sein. Die Browserprüfung öffnet kein sichtbares Browserfenster. Screenshots und Testberichte bleiben lokal in ignorierten Ordnern.

Es gibt **keine konfigurierte Bereitstellung**, keine GitHub Pages und keine Hosting-/Deployment-Workflows.

## Bedienung

1. Auf jeder Seite Text eingeben oder genau eine PDF auswählen/ablegen.
2. **Änderungen zeigen** wählen, sobald beide Seiten nutzbaren Text enthalten.
3. Belegte Wertänderungen über ihre Schaltflächen im Diff aufrufen. **Vorherige Änderung**, **Nächste Änderung**, **K** und **J** navigieren zwischen Änderungen. Tastenkürzel greifen nicht in Eingabefeldern.

Ein geladener PDF-Text ist schreibgeschützt; **Leeren** gibt die Seite für eine neue Eingabe frei. Änderungen an Eingaben verwerfen den alten Vergleich. Nichts wird stillschweigend abgeschnitten.

## Änderungen exportieren (V0.1.1)

**Änderungen exportieren** bietet lokale Downloads als Markdown, CSV und Text. Enthalten sind ausschließlich bereits berechnete Wertänderungen sowie geänderte, hinzugefügte und entfernte Textblöcke. Unveränderte Zeilen werden nicht als eigene Einträge exportiert. Es gibt keine neue Interpretation oder Rangfolge.

Die Einträge folgen der Reihenfolge der Diff-Zeilen; belegte Wertänderungen stehen jeweils vor dem zugehörigen vollständigen Textblock. Beide teilen dieselbe vorhandene Änderungs-ID. Vorhandene Quelltexte und Zeilenpositionen werden als Kontext erhalten. Fehlende Felder bleiben leer bzw. werden in Markdown/Text ausgelassen. Mehrzeilige Inhalte und Unicode bleiben erhalten. Markdown verwendet geschützte Codeblöcke; CSV ist UTF-8 mit Komma-Trennung, festen Spalten und korrekt maskierten Anführungszeichen/Zeilenumbrüchen.

Für CSV gilt eine zusätzliche, deterministische Schutzregel für Tabellenprogramme: Beginnt ein Datenfeld oder eine darin eingebettete Zeile nach ASCII-Leer- oder Steuerzeichen mit `=`, `+`, `-` oder `@`, stellt der Exporter dem gesamten Feld ein wörtliches Apostroph voran. Das gilt einheitlich für alle sechs Datenspalten und damit auch für negative Zahlen, Kontext und Änderungs-IDs. Der ursprüngliche Inhalt folgt unverändert auf das Apostroph; anschließend greifen die normalen CSV-Anführungs- und Escape-Regeln. Ein vorangestelltes Nicht-Whitespace-Unicodezeichen beendet die Präfixprüfung. Diese beschriebene Transformation reduziert das Risiko einer Formelinterpretation beim Öffnen in üblichen Tabellenprogrammen, beansprucht aber kein universelles Verhalten aller Programme. Markdown- und Text-Export wenden diese Regel nicht an.

Ohne Vergleich, ohne Änderungen und nach jeder Eingabeänderung ist der Export gesperrt. Downloads entstehen ausschließlich per lokalem Blob/Object-URL, das anschließend freigegeben wird. Es gibt keine Übertragung und keine zusätzliche Speicherung durch die Anwendung; die heruntergeladene Datei speichert der Browser auf ausdrücklichen Klick. Dateinamen verwenden nur das UTC-Exportdatum, etwa `WhatChanged-Aenderungen-2026-09-09.csv`, keine Dokumentinhalte. Das Exportmenü lässt sich per Tab/Enter bedienen und mit Escape schließen.

## Datenschutz

Text und PDF-Dateien bleiben im Arbeitsspeicher des Browsers. PDF.js bekommt lokale Dateibytes; weder Text noch PDFs werden an Server übertragen. Keine Konten, Analyse, Telemetrie, Cookies, localStorage, sessionStorage, IndexedDB, Service Worker oder sonstige Persistenz. Keine Zwischenablage-API, weder Lesen noch Schreiben. Einfügen ist die normale Browseraktion im Textfeld.

Der Browser lädt Anwendungscode und PDF.js-Ressourcen vom selben Ursprung. `predev`/`prebuild` kopieren CMaps, Standardfonts, WASM, Farbprofile und PDF.js-Lizenz aus der installierten Abhängigkeit in `public/pdfjs/`; Vite bündelt den PDF.js-Code und Worker. Es gibt keine externen Fonts/CDNs und keine PDF-Verarbeitungsdienste. npm benötigt beim Installieren Zugriff auf die Paketregistrierung; das ist keine Dokumentverarbeitung. Vites Entwicklungsverbindung dient nur der lokalen Entwicklung. Die Produktionsanwendung hat kein Backend.

Pasted HTML wird ausschließlich über Textknoten dargestellt. Dokumentinhalt wird niemals als HTML interpretiert. Die Anwendung enthält außerdem eine Content Security Policy.

## Vergleichsregeln und Belege

`src/core.js` enthält reine, vom DOM unabhängige Logik. `src/limits.js` prüft Grenzen vor teuren Vergleichen.

- Normalisierung: CRLF/CR werden LF, geschützte Leerzeichen U+00A0 und schmale geschützte Leerzeichen U+202F werden normale Leerzeichen; abschließende Leerzeichen/Tabs einer Zeile entfallen. Interne Leerzeichen, Tabs, Unicode, Satzzeichen, Bindestriche, Reihenfolge und Zeilenstruktur bleiben erhalten. `ab c` und `a bc` sind verschieden. Es gibt keine weitere Gleichsetzung von Leerraum.
- **Ein Textblock entspricht einer Zeile**, einschließlich Leerzeilen. Es werden keine Absätze geraten oder Zeilen zusammengezogen. Ein Absatz aus mehreren Zeilen kann mehrere Blöcke zählen.
- Strukturelles LCS ermittelt identische Zeilen. Bei gleichwertigen Pfaden wird zuerst entfernt. Verschiebungen erscheinen als Entfernen plus Hinzufügen; wiederholte Zeilen können mehrere gleichwertige Zuordnungen haben.
- Innerhalb eines Änderungsbereichs werden höchstens 10 alte mit 10 neuen Zeilen auf Ähnlichkeit geprüft. Ein Paar erreicht den Schwellwert entweder durch identische Nichtwert-Vorlagen und gleiche Wertkategorien/Einheiten oder durch mindestens **0,60 Multimengen-Dice-Ähnlichkeit** der unveränderten, groß-/kleinschreibungssensitiven Worttokens (`2 × gemeinsame Tokens / Summe aller Tokens`). Mindestens ein gemeinsames Token muss einen Buchstaben enthalten. Leere Zeilen werden nicht gepaart.
- Paare müssen auf beiden Seiten der **eindeutig beste Treffer** sein und die Reihenfolge erhalten. Gleichstände, unpassende Zeilen und größere Bereiche bleiben entfernt/hinzugefügt. Das ist eine deterministische Heuristik, kein Beweis semantischer Identität.
- Ein zweites begrenztes LCS markiert Unterschiede innerhalb gepaarter Zeilen. Alle Markierungen erhalten die vollständige normalisierte Zeichenfolge einschließlich Zwischenräumen.

### Wertänderungen

Der Scanner liest **vollständige entsprechende Zeilen**, nicht einzelne Diff-Tokens. Unterstützt werden:

| Kategorie | Beispiele |
| --- | --- |
| `currency` – Betrag geändert | `450 € → 520 €`, `450,00 EUR → 520,00 EUR`, `$100 → $125` |
| `duration` – Zeit-/Dauerangabe geändert | `14 Tage → 30 Tage`, `12 Monate → 24 Monate` |
| `date` – Datumsangabe geändert | `01.10.2026 → 15.10.2026`, `2026-10-01 → 2026-10-15` |
| `number` – Zahl geändert | `Version 12 → Version 13` |

Nach Ersetzung jeder vollständigen Wertangabe durch Kategorie und unveränderte Einheit müssen die restlichen Zeichen der beiden Zeilen exakt übereinstimmen. Anzahl und Reihenfolge der Wertangaben müssen gleich sein. Nur dann werden unterschiedliche Werte an den entsprechenden Positionen berichtet. `14 → 30` allein ist eine Zahl, keine Dauer; geänderte Einheiten wie `14 Tage → 30 Monate` werden nicht als gesicherte Wertpaare berichtet. Zusätzliche Text-/Satzzeichenänderungen können dazu führen, dass eine sichtbare Wertänderung nur als normaler Textdiff erscheint.

Währungen: €, EUR, USD, GBP, CHF, $, £; Präfixe $, €, £. Deutsche Dauerwörter: Sekunde, Minute, Stunde, Tag, Woche, Monat, Jahr und die im Scanner explizit hinterlegten Plural-/Dativformen. Datumsformen: `DD.MM.YYYY` und `YYYY-MM-DD`; Erkennung ist syntaktisch, keine Kalenderprüfung. Keine Umrechnung oder Gleichsetzung von Einheiten, Datumsformaten oder Zahlenformaten.

Jeder Befund enthält `oldValue`, `newValue`, `category`, `changeId` sowie `source` mit beiden normalisierten vollständigen Zeilen und exakten Zeichenbereichen. Die UI zeigt die Werte und führt zur belegenden Diff-Zeile. Unsichere Zuordnungen erzeugen keine Wertbehauptung. Die Zahl der Wertänderungen ist eine Teilmenge der geänderten Blöcke, kein zusätzlicher Blockzähler.

## PDF-Extraktion und Grenzen

PDF.js extrahiert Seite für Seite in Dokumentreihenfolge. Die Anwendung respektiert explizite Zeilenenden, trennt anhand vertikaler Positionsänderungen und fügt bei deutlichen horizontalen Lücken ein Leerzeichen ein. Seiten werden durch einen Zeilenumbruch getrennt. Textstücke werden nicht neu sortiert, Bindestriche nicht entfernt, Absätze nicht rekonstruiert. Im PDF kodierte Lesereihenfolge, Spalten, Tabellen, Schriftkodierungen und Layout können von der sichtbaren Seite abweichen. Nur der extrahierte Text wird verglichen.

| Grenze pro Eingabeseite | Wert |
| --- | --- |
| Textlänge, auch nach PDF-Extraktion | 50.000 UTF-16-Codeeinheiten |
| Zeilen einschließlich Leerzeilen | 500 |
| Länge einer Zeile | 1.000 UTF-16-Codeeinheiten |
| PDF-Dateigröße, geprüft vor Dateilesen/PDF.js | 10 MiB (10.485.760 Bytes) |
| PDF-Seiten | 50 |
| Extrahierte Elemente je PDF-Seite | 20.000 |
| Zeitbudget je PDF-Extraktion | 20 Sekunden |
| LCS-Arbeit für einen ganzen Vergleich | 2.000.000 Matrixzellen insgesamt |

Die LCS-Matrizen sind explizit begrenzt und verwenden 16-Bit-Einträge. Das Arbeitsbudget wird vor jeder Matrixallokation geprüft; bei Überschreitung wird der gesamte Vergleich mit einer verständlichen Fehlermeldung abgelehnt. Alle Textgrenzen werden vor dem strukturellen Vergleich geprüft, bei PDF-Text zusätzlich während der Extraktion. Eine kleine, ungewöhnlich komplexe Datei kann trotzdem das Zeit-/Arbeitsbudget überschreiten. Der Zeitwächter beendet die PDF.js-Aufgabe; er ist keine Garantie gegen jeden Fehler eines Browsers oder PDF-Parsers.

Leere, ungültige und textlose PDFs führen zu einer Fehlermeldung. Passwortgeschützte PDFs werden nicht unterstützt. Kein OCR und keine Erkennung von Bildänderungen. Keine DOCX-Dateien, Bilder, URLs, Stapelverarbeitung, Cloud-Speicher, Konten oder Historie. Kein Unified Diff und keine Scroll-Synchronisation.

## Aufbau und Abhängigkeiten

- `src/core.js`: Normalisierung, begrenzter Diff, Ähnlichkeitsregel, Werte und Zusammenfassungszähler.
- `src/limits.js`: zentrale Größenlimits.
- `src/export.js`: reine Serialisierung des vorhandenen Ergebnisses als Markdown/CSV/Text.
- `src/pdf.js`: lokale, abbrechbare PDF.js-Extraktion.
- `src/main.js`, `src/style.css`, `index.html`: semantische deutsche Oberfläche, sichere Darstellung, Tastatur und Responsive Layout.
- `tests/core.test.js`: automatisierte reine Logiktests.
- `tests/browser.spec.js`, `tests/pdf-fixture.js`: echte Chrome-Prüfungen mit reproduzierbaren lokalen PDFs.

Einzige Laufzeitabhängigkeit: `pdfjs-dist` für PDF-Text. Vite dient dem lokalen Build samt Worker/Assets, Playwright ausschließlich den Browserprüfungen. Kein UI-Framework und kein zusätzlicher Diff- oder Test-Framework für die Kernlogik.

MIT für den Anwendungscode; PDF.js und seine gebündelten Ressourcen behalten ihre jeweiligen Lizenzen. Siehe `LICENSE` und die beim Build mitkopierten Drittanbieter-Lizenzdateien.

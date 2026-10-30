# Stadtleben

Ein browserbasiertes Open-World-Alltagsspiel im Stil von GTA RP – nur ohne Waffen, ohne Verbrechen und ohne Held:innenrolle. Du lebst als Privatperson in einer deutschen Kleinstadt, gehst arbeiten, kümmerst dich um Hunger, Energie und Laune und entscheidest selbst, wie dein Tag aussieht.

Das Spiel läuft komplett im Browser, benötigt keinen Build-Schritt und kommt ohne externe Laufzeit-Abhängigkeiten aus. Grafik, Soundkulisse und Interface werden mit Canvas 2D, HTML und CSS erzeugt.

## Sofort spielen

Im Projektordner einen einfachen lokalen Server starten:

```bash
python3 -m http.server 3002
```

Danach `http://localhost:3002/` öffnen. Ein direkter Dateiaufruf über `file://` funktioniert ebenfalls, der lokale Server ist aber empfehlenswert.

## Steuerung

### Tastatur (Desktop)

| Taste | Aktion |
| --- | --- |
| `WASD` / Pfeiltasten | Laufen bzw. fahren |
| `Shift` | Rennen |
| `E` | Interagieren (Auto ein-/aussteigen, Tür, Tresen, Bank …) |
| `P` | Handy öffnen/schließen |
| `Esc` | Handy, Dialog oder Schicht schließen |
| `Leertaste` | Im Café-Shift einen Kaffee servieren |

### Touch (Handy/Tablet)

- **Joystick links unten**: Laufen und lenken.
- **Aktionsknopf rechts unten**: Kontextaktion ausführen (z. B. „Nach Hause“, „Einsteigen“, „Kaffee“).
- **Handy-Symbol oben rechts**: Handy mit Nachrichten, Jobs, Karte und Konto öffnen.
- **Neigung**: Optional in den Einstellungen oder auf dem Startbildschirm aktivieren. Unter iOS wird die Berechtigung für Bewegungsdaten erst nach einem Tippen auf den Schalter angefragt. Die Neigung bleibt standardmäßig aus.

## Was du tun kannst

- **Arbeiten**: Kurier-Touren mit drei Stopps, Taxi-Fahrten mit Fahrgast und Ziel oder eine Café-Schicht, bei der du Bestellungen richtig servierst.
- **Bedürfnisse managen**: Hunger, Energie und Laune sinken über den Tag. Essen, Kaffee, Schlafen, Sport, Schwimmen oder ein Kinobesuch helfen.
- **Stadtleben**: Café, Supermarkt, Apotheke, Fitnessstudio, Schwimmbad, Kino, Hotel und der Brunnenplatz sind begehbare Orte mit eigenen Aktionen.
- **Soziales**: Nora schreibt dir eine Nachricht. Triff sie, wenn du möchtest – oder lass es bleiben.
- **Unterwegs sein**: Zu Fuß oder mit dem Auto. Tanken ist nicht nötig, Unfälle mit Passant:innen gibt es nicht.
- **Zeit erleben**: Ein Tag dauert 24 Spielstunden, die Uhr läuft beschleunigt. Nachts ändern sich Licht, Stimmung und Aktivitäten.

Waffen kommen weder im Gameplay noch in der Geschichte vor.

## Speichern

Der Fortschritt wird automatisch im `localStorage` unter `stadtleben.save.v1` gespeichert, unter anderem beim Schließen des Tabs und nach wichtigen Aktionen. Beim nächsten Besuch heißt der Startknopf **„Weiterleben“**.

Über **„Neues Leben beginnen“** auf dem Startbildschirm lässt sich der Spielstand nach einer Sicherheitsabfrage löschen.

## Projektstruktur

```
index.html        Markup, HUD, Handy, Dialoge und Startbildschirm
styles.css        Layout, responsive Anpassungen und Animationen
game.js           Weltgenerierung, Simulation, Rendering, Eingaben und Speicherung
assets/fonts/     Lokale Schriften Outfit und Fraunces
```

Es gibt keine Installation, keinen Bundler und keine Server-Logik. Die Seite ist eine klassische statische Web-App.

## Technische Hinweise

- Optimiert für Hochformat auf dem Handy, funktioniert aber auch im Querformat und auf dem Desktop.
- Die Karte wird statisch vorgerendert; Fahrzeuge, Passant:innen, Bäume, Licht und Partikel werden dynamisch gezeichnet.
- Die Spielzeit läuft mit zwei Spielminuten pro realer Sekunde und pausiert, solange Handy, Dialog oder Café-Schicht geöffnet sind.
- Optionaler Ton wird erst nach der ersten Interaktion initialisiert.

---

Ursprünglich erstellt mit [OMGithub](https://omgithub.com/gwatch639-dotcom/PlayGround).

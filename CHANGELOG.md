# Changelog

Tutte le modifiche rilevanti di questo progetto verranno documentate in questo file.

Il formato si ispira a [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il versioning segue [SemVer](https://semver.org/lang/it/).

## [1.1.0] - 2026-02-13
### Aggiunto
- Modalità scura automatica tramite `prefers-color-scheme: dark`
- Annullamento eliminazione e svuotamento con Ctrl+Z (stack fino a 50 operazioni)
- Notifica toast "Salvato" a ogni salvataggio
- Messaggio stato vuoto quando non ci sono candidature
- Colonna "Stato" con menu a tendina (In attesa, Colloquio, Offerta, Rifiutato, Ritirato)
- Content Security Policy via meta tag
- Icone SVG accessibili con `aria-label` al posto degli emoji Unicode
- Sincronizzazione automatica tra tab tramite evento `storage`
- Versionamento schema dati in localStorage (`{ version, rows }`)
- Limite dimensione file di importazione (max 5 MB)
- Gestione errore `FileReader.onerror` durante l'importazione
- Feedback utente su errore `QuotaExceededError` di localStorage

### Corretto
- Bug debounce condiviso: timer separati per riga evitano perdita dati su modifiche rapide
- Tasto Invio nelle celle non inserisce più `<div>` o `<br>` indesiderati
- Sostituzione `document.execCommand` deprecato con Selection/Range API per incolla
- Sanitizzazione input tramite regex invece di `innerHTML` (previene mutation XSS)

### Modificato
- Aggiornamento DOM mirato (`appendRowToDOM`/`removeRowFromDOM`) invece di re-render completo
- Logica normalizzazione righe estratta in `normalizeRow()`/`normalizeRows()`
- Click handler icone usa `closest('[data-action]')` per compatibilità con SVG figli
- Retrocompatibilità importazione: accetta sia array semplice che formato versionato

## [1.0.0] - 2025-10-04
### Aggiunto
- Pagina HTML statica (`index.html`) con tabella e template di riga per il tracker candidature
- Stili base (`style.css`) per layout responsive e azioni principali
- Script client-side (`script.js`) con persistenza in `localStorage`, gestione righe, import/export JSON e controlli di sicurezza basilari

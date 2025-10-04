# Guida alla contribuzione

Grazie per il tuo interesse a migliorare Application Tracker! Segui queste indicazioni per facilitare la revisione delle proposte di modifica.

## Prima di iniziare
- Apri una issue descrivendo problema o feature se non esiste già.
- Se vuoi proporre una nuova funzionalità, prepara uno schizzo dell'interfaccia o un mockup per agevolare la discussione.

## Come contribuire
1. Forka il repository e crea un branch descrittivo (es. `feature/export-csv`).
2. Lavora sui file esistenti (`index.html`, `style.css`, `script.js`). Evita dipendenze esterne a meno che non siano state concordate.
3. Testa le modifiche in almeno un browser moderno con dati reali e verifica:
   - aggiunta/eliminazione/duplicazione righe
   - salvataggio automatico nel `localStorage`
   - import/export di file JSON
4. Aggiorna la documentazione quando serve (`README.md`, `CHANGELOG.md`).
5. Invia una pull request chiara, collegando l'eventuale issue.

## Stile del codice
- Mantieni l'interfaccia e le stringhe in italiano.
- Usa JavaScript vanilla; se introduci utility aggiuntive motivane l'uso nella PR.
- Prediligi funzioni piccole e pure; evita side-effect non necessari.
- Segui la struttura e la nomenclatura esistente per classi CSS e dataset.

## Commit e PR
- Scrivi messaggi di commit brevi e all'imperativo (es. "Aggiungi controllo import JSON").
- Una PR dovrebbe essere limitata a un singolo argomento; evita modifiche lump sum non correlate.
- Descrivi passi di test eseguiti e, se possibile, allega screenshot o file JSON di esempio.

## Codice di condotta
Comportati in modo rispettoso verso la community. Feedback costruttivi e collaborativi sono sempre apprezzati.

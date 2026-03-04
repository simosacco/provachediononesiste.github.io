# CloudBoard Ultra ☁️

CloudBoard Ultra è una web application real-time che funge da bacheca virtuale e sistema di Q&A, costruita con architettura Serverless.

## Caratteristiche Principali
- **Sincronizzazione Real-Time**: Sfrutta Firebase Firestore per aggiornare le note istantaneamente su tutti i client connessi.
- **Sistema di Ruoli**: Gestione avanzata per l'Admin (Owner) tramite chiave protetta.
- **Notifiche Push via Email**: Integrazione con EmailJS per notificare l'Owner su eventi specifici (modifica note, nuovi commenti).
- **Protezione per Nota**: Ogni post è crittografato da una password creata dall'autore per impedirne la modifica/cancellazione da terzi non autorizzati.

## Architettura Tecnica
- **Frontend**: HTML5 Semantico, CSS3 (Custom Variables, Flexbox, Glassmorphism), Vanilla JavaScript ES6+.
- **Backend/Database**: Google Firebase (Firestore Database).
- **Servizi Esterni**: EmailJS SDK.

## Installazione & Deploy
Questo progetto è statico e non richiede Node.js o build tools. Può essere ospitato su qualsiasi server statico (es. GitHub Pages, Vercel, Netlify).
1. Clona la repository.
2. Apri `index.html` nel browser.
# Userbot Centralizzato per Telegram e WhatsApp

Questo è un userbot avanzato e centralizzato progettato per funzionare con Telegram e WhatsApp. È costruito con un'architettura a plugin, che ne consente un' facile estendibilità, e sfrutta Redis per caching e persistenza dei dati.

## Funzionalità Principali

- **Routing Multi-piattaforma**: Gestisce senza problemi le chat tra Telegram e WhatsApp.
- **Inoltro Cross-Platform**: Inoltra automaticamente i messaggi tra le piattaforme.
- **Supporto Media Completo**: Gestisce immagini, documenti, audio e video.
- **Architettura a Plugin**: Estendi le funzionalità del bot senza modificare il core del sistema.
- **Persistenza Avanzata**: Utilizza Redis per il caching e PostgreSQL per la persistenza dei dati a lungo termine.
- **Dockerizzato**: Facile da deployare e scalare con Docker.

## Architettura

Il sistema è composto dai seguenti componenti principali:

- **Adapter (Telegram/WhatsApp)**: Si interfacciano con le piattaforme di messaggistica.
- **Router Core**: Normalizza e instrada i messaggi in arrivo.
- **Plugin System**: Applica la logica di business tramite una serie di plugin.
- **Storage Layer**: Gestisce la persistenza dei dati utilizzando Redis e PostgreSQL.

Per una visione più dettagliata, consulta il documento di [architettura](./docs/architecture.md).

## Guida Introduttiva

Segui questi passaggi per mettere in funzione il bot.

### Prerequisiti

- Node.js v20+
- Docker & Docker Compose
- Un account API di Telegram ([registrazione](https://my.telegram.org))
- Un dispositivo WhatsApp per l'accoppiamento iniziale

### Installazione

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/yourusername/userbot.git
    cd userbot
    ```

2.  **Configura le variabili d'ambiente:**
    Copia il file `.env.example` in `.env` e modifica le variabili di conseguenza.
    ```bash
    cp .env.example .env
    nano .env
    ```

3.  **Avvia i servizi con Docker:**
    ```bash
    docker-compose up -d --build
    ```

Per istruzioni più dettagliate, consulta la [guida all'installazione](./docs/setup.md).

## Sviluppo di Plugin

L'userbot è progettato per essere estensibile tramite plugin. Per creare il tuo plugin, consulta la [documentazione sui plugin](./docs/plugins.md).

## Comandi Disponibili

- `/start`: Mostra un messaggio di benvenuto.
- `/help`: Mostra l'elenco dei comandi disponibili.
- `/status`: Mostra lo stato del sistema.

## Testing

Per eseguire i test, lancia il seguente comando:

```bash
npm test
```

## Documentazione

La documentazione completa del progetto è disponibile nella directory [`docs`](./docs). La documentazione viene compilata e distribuita automaticamente come sito GitHub Pages tramite una GitHub Action ogni volta che viene effettuato un push sui rami `main` e `develop`.

### Attivazione di GitHub Pages

Perché la documentazione sia visibile online, devi attivare GitHub Pages nelle impostazioni del tuo repository su GitHub:

1.  Vai alla pagina principale del tuo repository su GitHub.
2.  Clicca su **Settings** (Impostazioni).
3.  Nel menu a sinistra, clicca su **Pages**.
4.  Alla voce **Source**, seleziona il branch `gh-pages` e la cartella `/(root)`.
5.  Clicca su **Save**.

La documentazione sarà disponibile all'indirizzo `https://<your-username>.github.io/<repository-name>/`.
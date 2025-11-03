# Guida all'Installazione

## Prerequisiti
- Node.js v20+
- Docker & Docker Compose
- Account Telegram API ([registrazione](https://my.telegram.org))
- Dispositivo WhatsApp per pairing iniziale

## Configurazione Iniziale
1. Clona il repository:
```bash
git clone https://github.com/yourusername/userbot.git
cd userbot
```

2. Configura le variabili d'ambiente:
```bash
cp .env.example .env
nano .env
```

3. Avvia i servizi con Docker:
```bash
docker-compose up -d --build
```

## Configurazione Avanzata
### Routing Cross-Platform
Modifica `src/index.ts` per configurare le regole di inoltro:
```ts
forwarder.addRule({
  fromPlatform: "telegram",
  toPlatform: "whatsapp",
  chatMap: { 
    "YOUR_TELEGRAM_CHAT_ID": ["whatsapp_group_id@g.us"]
  }
});
```

### Plugin Personalizzati
Crea un nuovo plugin in `src/plugins/`:
```ts
// src/plugins/customPlugin.ts
export class CustomPlugin implements Plugin {
  async processMessage(context: MessageContext) {
    if (context.text.includes("aiuto")) {
      context.text = "Ecco i comandi disponibili: /start, /help";
    }
  }
}
```
Poi registralo in `src/index.ts`:
```ts
pluginManager.register(new CustomPlugin());
```

## Deployment Produzione
Per un deployment robusto:
```yaml
# docker-compose.prod.yml
version: '3.9'
services:
  userbot:
    image: your-registry/userbot:latest
    env_file: .env.prod
    restart: unless-stopped
    depends_on:
      - redis
      - postgres
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis-/data
    restart: unless-stopped
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: userbot
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  redis-
  pg
```

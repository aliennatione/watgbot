# Repository Completa con Redis, Supporto Media e Documentazione

```
userbot/
├─ docs/
│  ├─ index.md
│  ├─ architecture.md
│  ├─ setup.md
│  ├─ plugins.md
│  ├─ media-handling.md
│  ├─ redis-integration.md
│  └─ api/ (generata da Typedoc)
├─ src/
│  ├─ core/
│  │  ├─ index.ts
│  │  ├─ router.ts
│  │  ├─ pluginManager.ts
│  │  ├─ messageForwarder.ts
│  │  └─ mediaManager.ts
│  ├─ telegram_adapter/
│  │  └─ telegramClient.ts
│  ├─ whatsapp_adapter/
│  │  └─ whatsappClient.ts
│  ├─ plugins/
│  │  ├─ examplePlugin.ts
│  │  ├─ autoForwardPlugin.ts
│  │  └─ mediaLoggerPlugin.ts
│  └─ storage/
│     ├─ database.ts
│     ├─ sessionStore.ts
│     └─ redisClient.ts
├─ tests/
│  ├─ core.test.ts
│  └─ media.test.ts
├─ .github/
│  └─ workflows/
│     ├─ docs.yml
│     └─ test.yml
├─ docker-compose.yml
├─ Dockerfile
├─ package.json
├─ tsconfig.json
├─ typedoc.json
├─ .env.example
└─ README.md
```

---

## `docs/index.md`
```markdown
# Userbot Documentation

Benvenuto nella documentazione completa del nostro Userbot centralizzato per Telegram e WhatsApp.

## Funzionalità Principali
- **Routing Multiplo**: Gestione avanzata di chat private e gruppi
- **Inoltro Cross-Platform**: Trasferimento automatico tra Telegram e WhatsApp
- **Supporto Media Completo**: Immagini, documenti, audio e video
- **Architettura Plugin**: Estendibilità senza modificare il core
- **Persistenza Avanzata**: Redis per caching, PostgreSQL/MongoDB per storage

## Struttura Documentazione
- [Architettura di Sistema](architecture.md)
- [Guida all'Installazione](setup.md)
- [Sviluppo Plugin](plugins.md)
- [Gestione Media](media-handling.md)
- [Integrazione Redis](redis-integration.md)
- [API Reference](api/)
```

## `docs/architecture.md`
```markdown
# Architettura di Sistema

## Diagramma Componenti
```
┌──────────────┐       ┌──────────────┐
│  Telegram    │       │  WhatsApp    │
│  Adapter     │◄─────►│  Adapter     │
└──────┬───────┘       └──────┬───────┘
       │                      │
       ▼                      ▼
┌───────────────────────────────────────┐
│              Router Core              │
│  • Message Context Normalization      │
│  • Group Chat Management              │
│  • Session Tracking                   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│            Plugin System              │
│  • AutoForward Plugin                 │
│  • MediaLogger Plugin                 │
│  • Custom Business Logic              │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│          Storage Layer                │
│  • Redis: Caching & Session State     │
│  • PostgreSQL: Persistent Sessions    │
│  • MongoDB: Message Logging           │
└───────────────────────────────────────┘
```

## Flusso Messaggi
1. Un messaggio arriva su Telegram/WhatsApp
2. L'adapter normalizza il contesto (testo, media, metadata)
3. Il router gestisce il routing basato su:
   - Tipo di chat (privata/gruppo)
   - Regole di inoltro configurate
   - Stato sessione utente
4. I plugin elaborano il messaggio in sequenza
5. Il message forwarder gestisce gli inoltri cross-platform
6. Lo storage persiste lo stato e il logging

## Vantaggi Architetturali
- **Isolamento Piattaforme**: Cambiamenti in un adapter non influenzano gli altri
- **Estensibilità Plugin**: Nuove funzionalità senza modificare il core
- **Resilienza**: Redis per failover veloce, database per persistenza
- **Scalabilità**: Componenti distribuibili su istanze separate
```

## `docs/setup.md`
```markdown
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
```

## `docs/plugins.md`
```markdown
# Sviluppo Plugin

## Interfaccia Plugin
Tutti i plugin devono implementare l'interfaccia `Plugin`:
```ts
export interface Plugin {
  name?: string; // Nome opzionale per logging
  processMessage(context: MessageContext): Promise<void>;
  onInit?(): Promise<void>; // Hook opzionale all'avvio
}
```

## Esempio Plugin Base
```ts
// src/plugins/welcomePlugin.ts
import { Plugin, MessageContext } from "../core/pluginManager";

export class WelcomePlugin implements Plugin {
  name = "welcome-plugin";
  
  private welcomeSent = new Set<string>();
  
  async processMessage(context: MessageContext) {
    // Saluta solo i nuovi utenti in chat private
    if (!context.isGroup && !this.welcomeSent.has(context.senderId)) {
      context.text = `Benvenuto ${context.senderId}! Digita /help per i comandi.`;
      this.welcomeSent.add(context.senderId);
    }
  }
}
```

## Plugin con Dipendenze
```ts
// src/plugins/statsPlugin.ts
import { Plugin, MessageContext } from "../core/pluginManager";
import { RedisClient } from "../storage/redisClient";

export class StatsPlugin implements Plugin {
  constructor(private redis: RedisClient) {}
  
  async processMessage(context: MessageContext) {
    const key = `stats:${context.platform}:${context.chatId}`;
    await this.redis.incr(key);
    
    // Log statistiche ogni 10 messaggi
    const count = await this.redis.get(key);
    if (count % 10 === 0) {
      console.log(`[STATS] ${context.chatId} ha raggiunto ${count} messaggi`);
    }
  }
}
```

## Best Practice
1. **Evita Effetti Collaterali**: I plugin non dovrebbero modificare lo stato globale
2. **Gestione Errori**: Includi try/catch per evitare crash dell'intero sistema
3. **Resource Esterne**: Usa dipendenze iniettate (es. RedisClient) invece di istanze globali
4. **Logging Contestuale**: Usa `[PLUGIN_NAME]` come prefisso nei log
5. **Performance**: Operazioni asincrone non bloccanti, usa Redis per caching

## Registrazione Plugin
In `src/index.ts`:
```ts
// Inizializza dipendenze
const redis = new RedisClient();
await redis.connect();

// Crea plugin con dipendenze
const statsPlugin = new StatsPlugin(redis);
const mediaLogger = new MediaLoggerPlugin();

// Registra nell'ordine di esecuzione desiderato
pluginManager.register(statsPlugin);
pluginManager.register(mediaLogger);
pluginManager.register(new AutoForwardPlugin(forwarder, sendFn));
```
```

## `docs/media-handling.md`
```markdown
# Gestione Media

## Tipi di Media Supportati
| Tipo       | Telegram | WhatsApp | Note                          |
|------------|----------|----------|-------------------------------|
| Immagini   | ✅       | ✅       | Compressione automatica       |
| Documenti  | ✅       | ✅       | Limite 100MB                  |
| Audio      | ✅       | ✅       | Conversione in formato comune |
| Video      | ✅       | ✅       | Max 2GB                       |
| Sticker    | ✅       | ⚠️       | Conversione in immagini       |

## Flusso Elaborazione Media
```mermaid
sequenceDiagram
    participant User
    participant Adapter
    participant MediaManager
    participant Storage
    
    User->>Adapter: Invia immagine
    Adapter->>MediaManager: downloadMedia(mediaKey)
    MediaManager->>Storage: Salva file temp
    Storage-->>MediaManager: Percorso file
    MediaManager->>Adapter: { mediaPath, mimeType }
    Adapter->>Router: Messaggio con contesto media
    Router->>PluginManager: Elabora contesto
    PluginManager-->>User: Risposta con media elaborato
```

## Configurazione Storage Media
In `.env`:
```ini
MEDIA_STORAGE_PATH=/var/userbot/media
MEDIA_MAX_SIZE=50  # MB
MEDIA_RETENTION_DAYS=7
```

## Personalizzazione Elaborazione
Per modificare il comportamento di default:
1. Estendi `MediaManager`:
```ts
class CustomMediaManager extends MediaManager {
  async processImage(buffer: Buffer): Promise<Buffer> {
    // Aggiungi watermark
    return await addWatermark(buffer);
  }
}
```
2. Fornisci la tua implementazione in `src/index.ts`:
```ts
const mediaManager = new CustomMediaManager({
  storagePath: process.env.MEDIA_STORAGE_PATH,
  maxSize: parseInt(process.env.MEDIA_MAX_SIZE || '50')
});
```

## Limitazioni Importanti
- I media vengono salvati temporaneamente e cancellati dopo `MEDIA_RETENTION_DAYS`
- I file superiori a 100MB vengono rifiutati con messaggio di errore
- Gli sticker di Telegram vengono convertiti in PNG
- I messaggi vocali vengono convertiti in MP3 per cross-platform compatibility
```

## `docs/redis-integration.md`
```markdown
# Integrazione Redis

## Casi d'Uso Principali
1. **Caching Regole Routing**: Riduzione query database per le regole di inoltro
2. **Sessioni Temporanee**: Stato utente durante interazioni multi-step
3. **Rate Limiting**: Prevenzione spam su endpoint sensibili
4. **Code Messaggi**: Gestione carichi elevati con elaborazione asincrona

## Schema Redis
```
KEYS:
  forward:rules          -> HASH (regole in formato JSON)
  session:{platform}:{chatId} -> HASH (dati sessione)
  rate_limit:{userId}    -> STRING (timestamp ultimo accesso)
  media:queue            -> LIST (messaggi in attesa di elaborazione)

EXPIRATIONS:
  session:* -> 24h
  rate_limit:* -> 1m
  media:queue items -> 1h
```

## Configurazione
In `.env`:
```ini
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_password
REDIS_DB=0
```

## Utilizzo nei Plugin
```ts
// Esempio: Plugin con rate limiting
export class CommandPlugin implements Plugin {
  constructor(private redis: RedisClient) {}
  
  async processMessage(context: MessageContext) {
    const key = `rate_limit:${context.senderId}`;
    const lastAccess = await this.redis.get(key);
    
    if (lastAccess && Date.now() - parseInt(lastAccess) < 5000) {
      context.text = "⚠️ Attendi 5 secondi tra i comandi";
      return;
    }
    
    await this.redis.setex(key, 5, Date.now().toString());
    // Elabora comando...
  }
}
```

## Best Practice
1. **Fallback Database**: Quando Redis non è disponibile, usa PostgreSQL come fallback
2. **Dimensionamento**: Configura Redis con maxmemory-policy=allkeys-lru per evitare crash
3. **Monitoraggio**: Usa `redis-cli info memory` per monitorare l'utilizzo
4. **Sicurezza**: 
   - Usa password complesse
   - Limita l'accesso alla rete interna
   - Abilita TLS in produzione

## Deployment Consigliato
```yaml
# docker-compose.yml snippet
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass $REDIS_PASSWORD --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-/data
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
```
```

## `docker-compose.yml`
```yaml
version: '3.9'
services:
  userbot:
    build: .
    env_file: .env
    volumes:
      - .:/app
      - media-storage:/app/media
    ports:
      - "3000:3000"
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass $REDIS_PASSWORD --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-/data
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "$REDIS_PASSWORD", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  redis-
  pg
  media-storage:
```

## `Dockerfile`
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/media ./media

# Install system dependencies for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    tini && \
    npm install -g pm2

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

## `package.json`
```json
{
  "name": "userbot",
  "version": "1.0.0",
  "description": "Userbot centralizzato Telegram & WhatsApp con supporto media e Redis",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "docs": "typedoc && cp -r docs/* ./docs/api",
    "test": "jest --coverage"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.5",
    "axios": "^1.6.8",
    "dotenv": "^16.4.5",
    "ffmpeg-static": "^5.2.0",
    "form-data": "^4.0.0",
    "ioredis": "^5.3.2",
    "mongodb": "^6.5.0",
    "pg": "^8.11.3",
    "redis": "^4.6.13",
    "sharp": "^0.33.2",
    "telegraf": "^4.16.3",
    "typeorm": "^0.3.20",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.30",
    "@types/sharp": "^0.33.0",
    "@types/uuid": "^9.0.8",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node-dev": "^2.0.0",
    "typedoc": "^0.25.13",
    "typedoc-plugin-markdown": "^3.17.1",
    "typescript": "^5.4.5"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "collectCoverageFrom": ["src/**/*.{ts,js}"],
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov"]
  }
}
```

## `.env.example`
```ini
# Telegram
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_BOT_TOKEN=your_bot_token_here

# WhatsApp
WHATSAPP_SESSION_NAME=default
WHATSAPP_QR_OUTPUT_PATH=/app/media/qr

# Database PostgreSQL
POSTGRES_DB=userbot
POSTGRES_USER=userbot
POSTGRES_PASSWORD=secure_password_here
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# MongoDB (Logging)
MONGODB_URL=mongodb://mongo:27017/userbot

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# Media Configuration
MEDIA_STORAGE_PATH=/app/media
MEDIA_MAX_SIZE=50
MEDIA_RETENTION_DAYS=7
MEDIA_TEMP_PATH=/tmp/userbot-media

# Logging
LOG_LEVEL=info
ENABLE_MEDIA_LOGGING=true
```

## `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "types": ["jest", "node"],
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## `typedoc.json`
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "name": "Userbot API Documentation",
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true,
  "exclude": ["**/tests/**", "**/*.spec.ts", "**/node_modules/**"],
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "docs/index.md",
  "theme": "default",
  "githubPages": true,
  "navigationLinks": {
    "Documentazione": "/",
    "GitHub": "https://github.com/yourusername/userbot"
  }
}
```

## `.github/workflows/docs.yml`
```yaml
name: Build & Deploy Documentation

on:
  push:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate TypeDoc API documentation
        run: npm run docs
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          keep_files: true
          force_orphan: true
```

## `.github/workflows/test.yml`
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        env:
          POSTGRES_URL: postgres://testuser:testpass@localhost:5432/testdb
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm test
        
      - name: Upload coverage reports to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          directory: ./coverage
          flags: unittests
          fail_ci_if_error: true
```

## `src/storage/redisClient.ts`
```typescript
import { Redis, RedisOptions } from "ioredis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

export class RedisClient {
  private client: Redis;
  private connected = false;

  constructor(private config: RedisConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      tls: config.tls ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    } as RedisOptions);

    this.client.on("error", (err) => {
      console.error(`[REDIS] Connection error: ${err.message}`);
      this.connected = false;
    });

    this.client.on("connect", () => {
      console.log(`[REDIS] Connected to ${config.host}:${config.port}`);
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Redis connection timeout after 5s"));
      }, 5000);

      this.client.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async lpush(key: string, value: string): Promise<number> {
    return this.client.lpush(key, value);
  }

  async brpop(key: string, timeout = 0): Promise<[string, string] | null> {
    return this.client.brpop(key, timeout);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Redis {
    return this.client;
  }
}
```

## `src/storage/sessionStore.ts`
```typescript
import { DataSource, Entity, Column, PrimaryColumn, Repository } from "typeorm";
import { Session } from "../core/router";

@Entity()
export class ChatSession {
  @PrimaryColumn()
  id: string; // formato: "platform:chatId"

  @Column()
  platform: "telegram" | "whatsapp";

  @Column()
  chatId: string;

  @Column({ nullable: true })
  lastMessage?: string;

  @Column({ nullable: true })
  lastMediaId?: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastActive: Date;

  @Column({ type: "jsonb", default: {} })
  meta Record<string, any>;
}

export class SessionStore {
  private dataSource: DataSource;
  private sessionRepository: Repository<ChatSession>;

  constructor(private redisClient: any) {
    this.dataSource = new DataSource({
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [ChatSession],
      synchronize: true,
      logging: false
    });
  }

  async init(): Promise<void> {
    await this.dataSource.initialize();
    this.sessionRepository = this.dataSource.getRepository(ChatSession);
    console.log("[DB] PostgreSQL session store initialized");
  }

  async saveSession(session: Session): Promise<void> {
    const id = `${session.platform}:${session.chatId}`;
    let entity = await this.sessionRepository.findOneBy({ id });
    
    if (!entity) {
      entity = this.sessionRepository.create({
        id,
        platform: session.platform,
        chatId: session.chatId,
        lastActive: new Date()
      });
    }
    
    entity.lastMessage = session.lastMessage;
    entity.lastMediaId = session.lastMediaId;
    entity.metadata = { ...entity.metadata, ...session.metadata };
    entity.lastActive = new Date();
    
    await this.sessionRepository.save(entity);
    
    // Cache in Redis con TTL 24h
    await this.redisClient.setex(
      `session:${id}`,
      86400,
      JSON.stringify(entity)
    );
  }

  async getSession(platform: string, chatId: string): Promise<Session | null> {
    const id = `${platform}:${chatId}`;
    const cacheKey = `session:${id}`;
    
    // Prova prima in Redis
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback a PostgreSQL
    const entity = await this.sessionRepository.findOneBy({ id });
    if (entity) {
      // Aggiorna cache
      await this.redisClient.setex(cacheKey, 86400, JSON.stringify(entity));
      return {
        platform: entity.platform,
        chatId: entity.chatId,
        lastMessage: entity.lastMessage,
        lastMediaId: entity.lastMediaId,
        metadata: entity.metadata
      };
    }
    
    return null;
  }

  async cleanupOldSessions(days = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where("lastActive < :cutoffDate", { cutoffDate })
      .execute();
      
    console.log(`[SESSION] Removed ${result.affected} old sessions`);
    return result.affected || 0;
  }
}
```

## `src/core/mediaManager.ts`
```typescript
import { createWriteStream, promises as fs } from "fs";
import { join, extname } from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import sharp from "sharp";
import { RedisClient } from "../storage/redisClient";

export interface MediaConfig {
  storagePath: string;
  tempPath: string;
  maxSizeMB: number;
  retentionDays: number;
}

export interface MediaInfo {
  path: string;
  mimeType: string;
  originalName: string;
  size: number;
  mediaType: "image" | "document" | "audio" | "video" | "other";
}

export class MediaManager {
  private config: MediaConfig;
  private redis: RedisClient;

  constructor(config: MediaConfig, redis: RedisClient) {
    this.config = {
      ...config,
      maxSizeMB: config.maxSizeMB || 50,
      retentionDays: config.retentionDays || 7
    };
    this.redis = redis;
    
    // Crea directory se non esistono
    [config.storagePath, config.tempPath].forEach(dir => {
      fs.mkdir(dir, { recursive: true }).catch(console.error);
    });
  }

  async downloadMedia(url: string, originalName: string): Promise<MediaInfo> {
    // Verifica dimensioni prima del download
    const headResponse = await axios.head(url);
    const contentLength = parseInt(headResponse.headers['content-length'] || '0');
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxSizeBytes) {
      throw new Error(`File too large (${(contentLength / 1024 / 1024).toFixed(1)}MB > ${this.config.maxSizeMB}MB)`);
    }

    // Genera nome univoco
    const ext = extname(originalName) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const tempPath = join(this.config.tempPath, filename);
    
    // Scarica il file
    const writer = createWriteStream(tempPath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });
    
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Determina tipo MIME e categoria
    const mimeType = headResponse.headers['content-type'] || 'application/octet-stream';
    const mediaType = this.determineMediaType(mimeType, ext);
    
    return {
      path: tempPath,
      mimeType,
      originalName,
      size: contentLength,
      mediaType
    };
  }

  private determineMediaType(mimeType: string, ext: string): MediaInfo['mediaType'] {
    if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return "image";
    }
    if (mimeType.startsWith('audio/') || ['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
      return "audio";
    }
    if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      return "video";
    }
    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].includes(ext)) {
      return "document";
    }
    return "other";
  }

  async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Ridimensiona e comprimi per cross-platform compatibility
      return await sharp(buffer)
        .resize(1280, 720, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error("[MEDIA] Image processing failed, returning original:", error);
      return buffer;
    }
  }

  async persistMedia(mediaInfo: MediaInfo): Promise<string> {
    const finalName = `${Date.now()}_${mediaInfo.originalName.replace(/\s+/g, '_')}`;
    const destPath = join(this.config.storagePath, finalName);
    
    // Sposta da temp a storage permanente
    await fs.rename(mediaInfo.path, destPath);
    
    // Imposta cleanup automatico
    await this.redis.setex(`media:cleanup:${finalName}`, 
      this.config.retentionDays * 86400,
      JSON.stringify({ path: destPath, added: new Date().toISOString() })
    );
    
    return `/media/${finalName}`;
  }

  async cleanupOldMedia(): Promise<number> {
    let cleaned = 0;
    const keys = await this.redis.getClient().keys('media:cleanup:*');
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const { path } = JSON.parse(data);
        try {
          await fs.unlink(path);
          cleaned++;
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`[MEDIA] Cleanup failed for ${path}:`, error);
          }
        }
      }
      await this.redis.del(key);
    }
    
    console.log(`[MEDIA] Cleaned up ${cleaned} old media files`);
    return cleaned;
  }
}
```

## `src/core/messageForwarder.ts`
```typescript
import { MessageContext, MediaContext } from "./router";
import { MediaManager } from "./mediaManager";
import { RedisClient } from "../storage/redisClient";

export interface ForwardRule {
  fromPlatform: "telegram" | "whatsapp";
  toPlatform: "telegram" | "whatsapp";
  chatMap: Record<string, string[]>;
  mediaAllowed?: boolean;  // Default: true
  textOnly?: boolean;      // Forza solo testo (rimuove media)
}

export class MessageForwarder {
  private rules: ForwardRule[] = [];
  private redis: RedisClient;
  private mediaManager: MediaManager;

  constructor(redis: RedisClient, mediaManager: MediaManager) {
    this.redis = redis;
    this.mediaManager = mediaManager;
  }

  async loadRulesFromCache(): Promise<void> {
    const cached = await this.redis.get("forward:rules");
    if (cached) {
      this.rules = JSON.parse(cached);
      console.log(`[FORWARDER] Loaded ${this.rules.length} rules from cache`);
    }
  }

  addRule(rule: ForwardRule): void {
    this.rules.push(rule);
    this.saveRulesToCache();
  }

  private async saveRulesToCache(): Promise<void> {
    await this.redis.set("forward:rules", JSON.stringify(this.rules), 300); // TTL 5 minuti
  }

  async forwardMessage(
    msg: MessageContext & Partial<MediaContext>,
    sendFn: (platform: string, chatId: string, text: string, media?: MediaContext) => Promise<void>
  ): Promise<void> {
    for (const rule of this.rules) {
      if (rule.fromPlatform !== msg.platform) continue;
      
      const destinations = rule.chatMap[msg.chatId];
      if (!destinations) continue;

      for (const destChatId of destinations) {
        // Applica trasformazioni in base alle regole
        let forwardedText = msg.text;
        let forwardedMedia = msg.media ? { ...msg.media } : undefined;

        // Forza solo testo se configurato
        if (rule.textOnly) {
          forwardedMedia = undefined;
          if (msg.media) {
            forwardedText += `\n[Media rimosso: ${msg.media.mediaType}]`;
          }
        } 
        // Blocca media se non consentiti
        else if (msg.media && !rule.mediaAllowed) {
          forwardedMedia = undefined;
          forwardedText += `\n[Media non consentiti per questa regola]`;
        }

        // Aggiungi prefisso piattaforma sorgente
        forwardedText = `[${msg.platform.toUpperCase()}] ${forwardedText}`;

        try {
          await sendFn(rule.toPlatform, destChatId, forwardedText, forwardedMedia);
          console.log(`[FORWARD] ${msg.platform}(${msg.chatId}) → ${rule.toPlatform}(${destChatId})`);
        } catch (error) {
          console.error(`[FORWARD] Failed to forward to ${rule.toPlatform}:${destChatId}:`, error);
        }
      }
    }
  }
}
```

## `src/core/pluginManager.ts`
```typescript
import { MessageContext, MediaContext } from "./router";

export interface Plugin {
  name?: string;
  processMessage(context: MessageContext & Partial<MediaContext>): Promise<void>;
  onInit?(): Promise<void>;
}

export class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    this.plugins.push(plugin);
    console.log(`[PLUGIN] Registered: ${plugin.name || 'unnamed'}`);
    
    // Invoca onInit se disponibile
    if (plugin.onInit) {
      plugin.onInit().catch(console.error);
    }
  }

  async process(context: MessageContext & Partial<MediaContext>): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.processMessage(context);
      } catch (error) {
        console.error(`[PLUGIN] Error in ${plugin.name || 'unnamed'}:`, error);
      }
    }
  }

  getPluginCount(): number {
    return this.plugins.length;
  }
}
```

## `src/core/router.ts`
```typescript
import { PluginManager } from "./pluginManager";
import { SessionStore } from "../storage/sessionStore";
import { RedisClient } from "../storage/redisClient";

export interface Session {
  platform: "telegram" | "whatsapp";
  chatId: string;
  lastMessage?: string;
  lastMediaId?: string;
  metadata?: Record<string, any>;
}

export interface MessageContext {
  platform: "telegram" | "whatsapp";
  chatId: string;
  text: string;
  senderId: string;
  isGroup: boolean;
  timestamp: Date;
}

export interface MediaContext {
  mediaUrl: string;
  mediaType: "image" | "document" | "audio" | "video" | "sticker";
  caption?: string;
  mimeType?: string;
  size?: number;
}

export class Router {
  constructor(
    private pluginManager: PluginManager,
    private sessionStore: SessionStore,
    private redis: RedisClient
  ) {}

  async routeMessage(context: MessageContext & Partial<MediaContext>): Promise<void> {
    // Logging contestuale avanzato
    const logPrefix = `[ROUTER] ${context.platform.toUpperCase()}(${context.chatId})${context.isGroup ? ' [GRUPPO]' : ''}`;
    console.log(`${logPrefix}: ${context.text}${context.mediaUrl ? ` [MEDIA: ${context.mediaType}]` : ''}`);
    
    try {
      // Salva sessione nel database
      await this.sessionStore.saveSession({
        platform: context.platform,
        chatId: context.chatId,
        lastMessage: context.text,
        lastMediaId: context.mediaUrl,
        metadata: {
          sender: context.senderId,
          isGroup: context.isGroup,
          lastSeen: new Date().toISOString()
        }
      });

      // Processa con i plugin
      await this.pluginManager.process(context);
      
    } catch (error) {
      console.error(`${logPrefix} Processing error:`, error);
      
      // Invia notifica di errore all'amministratore
      if (process.env.ADMIN_CHAT_ID) {
        const errorMsg = `[ERRORE] Elaborazione fallita per ${context.platform}:${context.chatId}\n${error.message}`;
        this.sendAdminNotification(errorMsg).catch(console.error);
      }
    }
  }

  private async sendAdminNotification(message: string): Promise<void> {
    // Implementazione specifica per inviare notifiche all'amministratore
    console.log(`[ADMIN] ${message}`);
    
    // Esempio di integrazione con Telegram:
    // if (process.env.TELEGRAM_ADMIN_BOT_TOKEN) {
    //   const bot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN);
    //   await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
    // }
  }
}
```

## `src/telegram_adapter/telegramClient.ts`
```typescript
import { Telegraf, Context, session, SessionFlavor } from "telegraf";
import { MessageContext, MediaContext } from "../core/router";
import { MediaManager } from "../core/mediaManager";
import { RedisClient } from "../storage/redisClient";

interface SessionData {
  step?: string;
  data?: Record<string, any>;
}

type CustomContext = Context & SessionFlavor<SessionData>;

export class TelegramClient {
  private bot: Telegraf<CustomContext>;
  private mediaManager: MediaManager;
  private redis: RedisClient;

  constructor(
    private router: any,
    private token: string,
    mediaManager: MediaManager,
    redis: RedisClient
  ) {
    this.mediaManager = mediaManager;
    this.redis = redis;
    
    this.bot = new Telegraf<CustomContext>(token);
    
    // Setup session middleware
    this.bot.use(session());
    
    // Gestione messaggi testuali
    this.bot.on("text", this.handleTextMessage.bind(this));
    
    // Gestione media
    this.bot.on("photo", this.handlePhoto.bind(this));
    this.bot.on("document", this.handleDocument.bind(this));
    this.bot.on("audio", this.handleAudio.bind(this));
    this.bot.on("video", this.handleVideo.bind(this));
    this.bot.on("voice", this.handleVoice.bind(this));
    
    // Comandi speciali
    this.bot.command("start", this.handleStart.bind(this));
    this.bot.command("help", this.handleHelp.bind(this));
  }

  async start(): Promise<void> {
    await this.bot.launch();
    console.log("[TELEGRAM] Bot avviato con @", (await this.bot.telegram.getMe()).username);
  }

  stop(): void {
    this.bot.stop();
  }

  async sendMessage(chatId: string, text: string, media?: MediaContext): Promise<void> {
    try {
      if (media && media.mediaUrl) {
        switch (media.mediaType) {
          case "image":
            await this.bot.telegram.sendPhoto(chatId, media.mediaUrl, { caption: media.caption });
            break;
          case "document":
            await this.bot.telegram.sendDocument(chatId, media.mediaUrl, { caption: media.caption });
            break;
          case "audio":
            await this.bot.telegram.sendAudio(chatId, media.mediaUrl, { caption: media.caption });
            break;
          case "video":
            await this.bot.telegram.sendVideo(chatId, media.mediaUrl, { caption: media.caption });
            break;
          default:
            await this.bot.telegram.sendMessage(chatId, `${text}\n[Media non supportato: ${media.mediaType}]`);
        }
      } else {
        await this.bot.telegram.sendMessage(chatId, text);
      }
    } catch (error) {
      console.error(`[TELEGRAM] Invio fallito a ${chatId}:`, error);
      throw error;
    }
  }

  private async handleTextMessage(ctx: CustomContext): Promise<void> {
    const context: MessageContext = {
      platform: "telegram",
      chatId: ctx.chat.id.toString(),
      text: ctx.message.text,
      senderId: ctx.from.id.toString(),
      isGroup: ctx.chat.type !== "private",
      timestamp: new Date()
    };
    
    await this.router.routeMessage(context);
  }

  private async handleMedia(ctx: CustomContext, mediaType: MediaContext["mediaType"]): Promise<void> {
    // Gestione file piÃ¹ grandi
    const file = ctx.message[mediaType];
    const fileId = Array.isArray(file) ? file[file.length - 1].file_id : file.file_id;
    
    try {
      // Scarica il file da Telegram
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const mediaInfo = await this.mediaManager.downloadMedia(
        fileLink.toString(),
        ctx.message.caption || `telegram_${mediaType}_${Date.now()}`
      );
      
      // Elabora immagini per compatibilitÃ
      if (mediaType === "image") {
        const buffer = await fs.readFile(mediaInfo.path);
        const processed = await this.mediaManager.processImage(buffer);
        await fs.writeFile(mediaInfo.path, processed);
        mediaInfo.mimeType = "image/jpeg";
      }
      
      // Salva permanentemente
      const mediaUrl = await this.mediaManager.persistMedia(mediaInfo);
      
      const context: MessageContext & MediaContext = {
        platform: "telegram",
        chatId: ctx.chat.id.toString(),
        text: ctx.message.caption || "[Media senza descrizione]",
        senderId: ctx.from.id.toString(),
        isGroup: ctx.chat.type !== "private",
        timestamp: new Date(),
        mediaUrl,
        mediaType,
        caption: ctx.message.caption,
        mimeType: mediaInfo.mimeType,
        size: mediaInfo.size
      };
      
      await this.router.routeMessage(context);
      
    } catch (error) {
      console.error(`[TELEGRAM] Errore elaborazione media:`, error);
      await ctx.reply(`â ï¸ Errore elaborazione media: ${error.message}`);
    }
  }

  private handlePhoto = (ctx: CustomContext) => this.handleMedia(ctx, "image");
  private handleDocument = (ctx: CustomContext) => this.handleMedia(ctx, "document");
  private handleAudio = (ctx: CustomContext) => this.handleMedia(ctx, "audio");
  private handleVideo = (ctx: CustomContext) => this.handleMedia(ctx, "video");
  private handleVoice = (ctx: CustomContext) => this.handleMedia(ctx, "audio");

  private async handleStart(ctx: CustomContext): Promise<void> {
    await ctx.reply(`Ciao! Sono un userbot avanzato per Telegram e WhatsApp.
Usa /help per vedere i comandi disponibili.`);
  }

  private async handleHelp(ctx: CustomContext): Promise<void> {
    const helpText = `
Comandi disponibili:
/start - Messaggio di benvenuto
/help - Questo messaggio

Questo bot fa parte di un sistema multi-piattaforma che integra:
â¢ Telegram
â¢ WhatsApp

Tutti i messaggi inviati verranno elaborati secondo le regole configurate.
    `;
    await ctx.reply(helpText);
  }
}
```

## `src/whatsapp_adapter/whatsappClient.ts`
```typescript
import { 
  WAConnection, 
  MessageType, 
  MessageOptions, 
  downloadContentFromMessage,
  getMediaKeys
} from "@whiskeysockets/baileys";
import { RedisClient } from "../storage/redisClient";
import { MediaManager } from "../core/mediaManager";
import { MessageContext, MediaContext } from "../core/router";

export class WhatsAppClient {
  private conn: WAConnection;
  private mediaManager: MediaManager;
  private redis: RedisClient;
  private qrCodePath: string;

  constructor(
    private router: any,
    mediaManager: MediaManager,
    redis: RedisClient
  ) {
    this.mediaManager = mediaManager;
    this.redis = redis;
    this.qrCodePath = process.env.WHATSAPP_QR_OUTPUT_PATH || "/tmp/whatsapp-qr.png";
    
    this.conn = new WAConnection();
    
    // Eventi connessione
    this.conn.on("connection-verified", () => {
      console.log("[WHATSAPP] Connessione verificata e stabile");
    });
    
    this.conn.on("qr", async (qr: string) => {
      console.log("[WHATSAPP] QR Code generato, scan per connetterti");
      // In produzione: salva QR o invia notifica
      require('fs').writeFileSync(this.qrCodePath, qr);
    });
    
    // Gestione messaggi
    this.conn.on("message-new", this.handleNewMessage.bind(this));
  }

  async start(): Promise<void> {
    const sessionName = process.env.WHATSAPP_SESSION_NAME || "default";
    const session = await this.redis.hgetall(`whatsapp:session:${sessionName}`);
    
    if (Object.keys(session).length > 0) {
      console.log("[WHATSAPP] Ripristino sessione esistente");
      this.conn.loadAuthInfo(session);
    }
    
    await this.conn.connect();
    
    // Salva sessione dopo connessione
    this.conn.on("open", async () => {
      const authInfo = this.conn.base64EncodedAuthInfo();
      await this.redis.hset(`whatsapp:session:${sessionName}`, "auth", JSON.stringify(authInfo));
      console.log("[WHATSAPP] Sessione salvata in Redis");
    });
  }

  stop(): void {
    this.conn.close();
  }

  async sendMessage(chatId: string, text: string, media?: MediaContext): Promise<void> {
    try {
      if (media && media.mediaUrl) {
        const mediaBuffer = await this.downloadExternalMedia(media.mediaUrl);
        
        if (media.mediaType === "image") {
          await this.conn.sendMessage(chatId, mediaBuffer, MessageType.image, {
            caption: media.caption || text
          } as MessageOptions);
        } else if (media.mediaType === "document") {
          await this.conn.sendMessage(chatId, mediaBuffer, MessageType.document, {
            filename: media.caption || "documento",
            mimetype: media.mimeType || "application/octet-stream"
          } as MessageOptions);
        } else {
          // Fallback a messaggio testuale con link
          await this.conn.sendMessage(chatId, `${text}\n[Media: ${media.mediaUrl}]`, MessageType.text);
        }
      } else {
        await this.conn.sendMessage(chatId, text, MessageType.text);
      }
    } catch (error) {
      console.error(`[WHATSAPP] Invio fallito a ${chatId}:`, error);
      throw error;
    }
  }

  private async downloadExternalMedia(url: string): Promise<Buffer> {
    // Usa MediaManager per download sicuro
    const mediaInfo = await this.mediaManager.downloadMedia(
      url,
      `whatsapp_${Date.now()}${url.substr(url.lastIndexOf('.'))}`
    );
    
    const buffer = await require('fs').promises.readFile(mediaInfo.path);
    
    // Pulisci file temporaneo
    await require('fs').promises.unlink(mediaInfo.path);
    
    return buffer;
  }

  private async handleNewMessage(msg: any): Promise<void> {
    if (!msg.message) return;
    
    // Ignora messaggi di stato (lettura, digitazione, ecc.)
    if (msg.message.protocolMessage || msg.message.senderKeyDistributionMessage) return;
    
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    // Gestione messaggi testuali
    if (msg.message.conversation) {
      this.processTextMessage({
        chatId,
        text: msg.message.conversation,
        senderId,
        isGroup
      });
      return;
    }
    
    // Gestione media
    const mediaTypes = ["imageMessage", "documentMessage", "audioMessage", "videoMessage", "stickerMessage"];
    for (const type of mediaTypes) {
      if (msg.message[type]) {
        await this.processMediaMessage(msg, type as keyof typeof msg.message);
        return;
      }
    }
  }

  private processTextMessage( {
    chatId: string;
    text: string;
    senderId: string;
    isGroup: boolean;
  }): void {
    const context: MessageContext = {
      platform: "whatsapp",
      chatId: data.chatId,
      text: data.text,
      senderId: data.senderId,
      isGroup: data.isGroup,
      timestamp: new Date()
    };
    
    this.router.routeMessage(context);
  }

  private async processMediaMessage(msg: any, mediaType: string): Promise<void> {
    try {
      // Estrai informazioni media
      const mediaMessage = msg.message[mediaType];
      const stream = await downloadContentFromMessage(mediaMessage, mediaType as any);
      
      // Salva stream su file
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      
      const buffer = Buffer.concat(chunks);
      const mimeType = mediaMessage.mimetype || "application/octet-stream";
      const fileName = mediaMessage.fileName || `whatsapp_${mediaType}_${Date.now()}`;
      
      // Determina tipo media per il nostro sistema
      let normalizedType: MediaContext["mediaType"] = "document";
      if (mimeType.startsWith("image/")) normalizedType = "image";
      else if (mimeType.startsWith("audio/")) normalizedType = "audio";
      else if (mimeType.startsWith("video/")) normalizedType = "video";
      
      // Salva su filesystem temporaneo
      const tempPath = `/tmp/${fileName.replace(/\s+/g, '_')}`;
      await require('fs').promises.writeFile(tempPath, buffer);
      
      // Processa con MediaManager
      const mediaInfo = await this.mediaManager.persistMedia({
        path: tempPath,
        mimeType,
        originalName: fileName,
        size: buffer.length,
        mediaType: normalizedType
      });
      
      const context: MessageContext & MediaContext = {
        platform: "whatsapp",
        chatId: msg.key.remoteJid,
        text: mediaMessage.caption || "[Media senza descrizione]",
        senderId: msg.key.participant || msg.key.remoteJid,
        isGroup: msg.key.remoteJid.endsWith("@g.us"),
        timestamp: new Date(),
        mediaUrl: mediaInfo,
        mediaType: normalizedType,
        caption: mediaMessage.caption,
        mimeType,
        size: buffer.length
      };
      
      await this.router.routeMessage(context);
      
    } catch (error) {
      console.error("[WHATSAPP] Errore elaborazione media:", error);
    }
  }
}
```

## `src/plugins/autoForwardPlugin.ts`
```typescript
import { Plugin, MessageContext, MediaContext } from "../core/pluginManager";
import { MessageForwarder } from "../core/messageForwarder";

export class AutoForwardPlugin implements Plugin {
  name = "auto-forward";
  
  constructor(
    private forwarder: MessageForwarder,
    private sendFn: (platform: string, chatId: string, text: string, media?: MediaContext) => Promise<void>
  ) {}

  async processMessage(context: MessageContext & Partial<MediaContext>): Promise<void> {
    // Skip messaggi che sono già inoltri
    if (context.text.startsWith("[TELEGRAM]") || context.text.startsWith("[WHATSAPP]")) {
      return;
    }
    
    // Skip messaggi di sistema
    if (context.text.startsWith("/start") || context.text.startsWith("/help")) {
      return;
    }
    
    try {
      await this.forwarder.forwardMessage(context, this.sendFn);
    } catch (error) {
      console.error(`[AUTO-FORWARD] Errore durante l'inoltro:`, error);
    }
  }
}
```

## `src/plugins/examplePlugin.ts`
```typescript
import { Plugin, MessageContext } from "../core/pluginManager";

export class WelcomePlugin implements Plugin {
  name = "welcome";
  
  private welcomedUsers = new Set<string>();
  
  async processMessage(context: MessageContext): Promise<void> {
    // Solo chat private e nuovi utenti
    if (context.isGroup || this.welcomedUsers.has(context.senderId)) {
      return;
    }
    
    // Invia messaggio di benvenuto
    context.text = `ðŸ‘‹ Benvenuto! Sono un userbot avanzato che integra Telegram e WhatsApp.\n\nPer aiuto usa /help`;
    this.welcomedUsers.add(context.senderId);
  }
}

export class CommandPlugin implements Plugin {
  name = "commands";
  
  async processMessage(context: MessageContext): Promise<void> {
    if (!context.text.startsWith("/")) return;
    
    const command = context.text.split(" ")[0].toLowerCase();
    
    switch (command) {
      case "/help":
        context.text = `
Comandi disponibili:
/help - Mostra questo messaggio
/status - Mostra stato sistema
        `;
        break;
        
      case "/status":
        context.text = `
ðŸ¤– Stato sistema:
- Plugin attivi: ${this.pluginCount}
- Sessioni attive: in elaborazione
- Media elaborati oggi: in elaborazione
        `;
        break;
        
      default:
        context.text = `â ï¸ Comando non riconosciuto. Usa /help per la lista comandi.`;
    }
  }
  
  private pluginCount = 0;
  
  onInit(): Promise<void> {
    // In un vero sistema, recupereremmo questo dal PluginManager
    this.pluginCount = 3; 
    return Promise.resolve();
  }
}
```

## `src/plugins/mediaLoggerPlugin.ts`
```typescript
import { Plugin, MessageContext } from "../core/pluginManager";
import { RedisClient } from "../storage/redisClient";
import { v4 as uuidv4 } from 'uuid';

export class MediaLoggerPlugin implements Plugin {
  name = "media-logger";
  
  constructor(private redis: RedisClient) {}
  
  async processMessage(context: MessageContext & Partial<any>): Promise<void> {
    if (!context.mediaUrl || process.env.ENABLE_MEDIA_LOGGING !== 'true') return;
    
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      platform: context.platform,
      chatId: context.chatId,
      senderId: context.senderId,
      mediaType: context.mediaType,
      mediaUrl: context.mediaUrl,
      caption: context.caption
    };
    
    // Salva in Redis per analisi rapida
    await this.redis.lpush("media:logs", JSON.stringify(logEntry));
    
    // Mantieni solo gli ultimi 1000 log
    await this.redis.getClient().ltrim("media:logs", 0, 999);
    
    console.log(`[MEDIA-LOG] ${context.platform} ${context.mediaType} da ${context.senderId}`);
  }
}
```

## `src/index.ts`
```typescript
import "dotenv/config";
import { join } from "path";
import { Router } from "./core/router";
import { PluginManager } from "./core/pluginManager";
import { TelegramClient } from "./telegram_adapter/telegramClient";
import { WhatsAppClient } from "./whatsapp_adapter/whatsappClient";
import { MessageForwarder } from "./core/messageForwarder";
import { AutoForwardPlugin } from "./plugins/autoForwardPlugin";
import { WelcomePlugin, CommandPlugin } from "./plugins/examplePlugin";
import { MediaLoggerPlugin } from "./plugins/mediaLoggerPlugin";
import { SessionStore } from "./storage/sessionStore";
import { RedisClient, RedisConfig } from "./storage/redisClient";
import { MediaManager, MediaConfig } from "./core/mediaManager";

// Inizializzazione storage
const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0")
};

const redis = new RedisClient(redisConfig);
await redis.connect();

const sessionStore = new SessionStore(redis);
await sessionStore.init();

// Configurazione media
const mediaConfig: MediaConfig = {
  storagePath: process.env.MEDIA_STORAGE_PATH || join(__dirname, "../media"),
  tempPath: process.env.MEDIA_TEMP_PATH || join(__dirname, "../tmp"),
  maxSizeMB: parseInt(process.env.MEDIA_MAX_SIZE || "50"),
  retentionDays: parseInt(process.env.MEDIA_RETENTION_DAYS || "7")
};

const mediaManager = new MediaManager(mediaConfig, redis);

// Inizializzazione core
const pluginManager = new PluginManager();
const router = new Router(pluginManager, sessionStore, redis);

// Funzione di invio cross-platform
const sendFn = async (
  platform: string, 
  chatId: string, 
  text: string, 
  media?: any
) => {
  if (platform === "telegram") {
    await tgClient.sendMessage(chatId, text, media);
  } else if (platform === "whatsapp") {
    await waClient.sendMessage(chatId, text, media);
  }
};

// Inizializzazione forwarder
const forwarder = new MessageForwarder(redis, mediaManager);
await forwarder.loadRulesFromCache();

// Regole di default (da sostituire con configurazione dinamica)
forwarder.addRule({
  fromPlatform: "telegram",
  toPlatform: "whatsapp",
  chatMap: { 
    "YOUR_TELEGRAM_CHAT_ID": ["your_whatsapp_group@g.us"]
  },
  mediaAllowed: true
});

forwarder.addRule({
  fromPlatform: "whatsapp",
  toPlatform: "telegram",
  chatMap: { 
    "your_whatsapp_group@g.us": ["YOUR_TELEGRAM_CHAT_ID"]
  },
  mediaAllowed: true
});

// Registrazione plugin
pluginManager.register(new WelcomePlugin());
pluginManager.register(new CommandPlugin());
pluginManager.register(new MediaLoggerPlugin(redis));
pluginManager.register(new AutoForwardPlugin(forwarder, sendFn));

// Inizializzazione client
const tgClient = new TelegramClient(
  router,
  process.env.TELEGRAM_BOT_TOKEN!,
  mediaManager,
  redis
);

const waClient = new WhatsAppClient(
  router,
  mediaManager,
  redis
);

// Avvio client
await tgClient.start();
await waClient.start();

// Pulizia periodica
setInterval(async () => {
  await sessionStore.cleanupOldSessions();
  await mediaManager.cleanupOldMedia();
}, 24 * 60 * 60 * 1000); // Ogni 24 ore

console.log(`
âœ¨ Userbot Centralizzato Avviato âœ¨
- Telegram Client: ${tgClient ? 'Connesso' : 'Errore'}
- WhatsApp Client: ${waClient ? 'Connesso' : 'Errore'}
- Plugin Attivi: ${pluginManager.getPluginCount()}
- Redis: ${redis.isConnected() ? 'Connesso' : 'Disconnesso'}

Configurazione inoltro:
${JSON.stringify(forwarder['rules'], null, 2)}
`);

// Gestione shutdown elegante
process.on('SIGINT', async () => {
  console.log("\nðŸ›‘ Arresto in corso...");
  tgClient.stop();
  waClient.stop();
  await redis.disconnect();
  process.exit(0);
});
```

## `tests/media.test.ts`
```typescript
import { MediaManager } from "../src/core/mediaManager";
import { RedisClient } from "../src/storage/redisClient";
import { join } from "path";

jest.mock("axios");
jest.mock("sharp");
jest.mock("../src/storage/redisClient");

describe("MediaManager", () => {
  let mediaManager: MediaManager;
  let mockRedis: RedisClient;
  
  beforeEach(() => {
    mockRedis = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn()
      })
    } as any;
    
    mediaManager = new MediaManager({
      storagePath: join(__dirname, "../tmp/test_storage"),
      tempPath: join(__dirname, "../tmp/test_temp"),
      maxSizeMB: 10,
      retentionDays: 1
    }, mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should download and process image", async () => {
    jest.mock('axios', () => ({
      head: jest.fn().mockResolvedValue({
        headers: {
          'content-length': '50000',
          'content-type': 'image/jpeg'
        }
      }),
      default: jest.fn().mockImplementation(() => ({
        data: {
          pipe: jest.fn()
        }
      }))
    }));
    
    jest.mock('sharp', () => ({
      __esModule: true,
      default: jest.fn().mockImplementation(() => ({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed'))
      }))
    }));

    const mediaInfo = await mediaManager.downloadMedia(
      "http://example.com/test.jpg",
      "test.jpg"
    );
    
    expect(mediaInfo.mediaType).toBe("image");
    expect(mediaInfo.size).toBe(50000);
  });

  test("should reject oversized files", async () => {
    jest.mock('axios', () => ({
      head: jest.fn().mockResolvedValue({
        headers: {
          'content-length': '15000000' // 15MB > 10MB limit
        }
      })
    }));

    await expect(
      mediaManager.downloadMedia("http://example.com/large.jpg", "large.jpg")
    ).rejects.toThrow("File too large");
  });

  test("should persist media file", async () => {
    const mockFs = require('fs').promises;
    mockFs.rename = jest.fn();
    
    const mediaUrl = await mediaManager.persistMedia({
      path: "/tmp/test.jpg",
      mimeType: "image/jpeg",
      originalName: "test.jpg",
      size: 10000,
      mediaType: "image"
    });
    
    expect(mediaUrl).toMatch(/\/media\/\d+_test\.jpg$/);
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  test("should cleanup old media", async () => {
    (mockRedis.getClient().keys as jest.Mock).mockResolvedValue([
      "media:cleanup:test1.jpg",
      "media:cleanup:test2.jpg"
    ]);
    
    (mockRedis.get as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ path: "/tmp/test1.jpg" }))
      .mockResolvedValueOnce(JSON.stringify({ path: "/tmp/test2.jpg" }));
    
    const unlinkMock = jest.fn();
    jest.spyOn(require('fs').promises, 'unlink').mockImplementation(unlinkMock);
    
    const cleaned = await mediaManager.cleanupOldMedia();
    
    expect(cleaned).toBe(2);
    expect(unlinkMock).toHaveBeenCalledTimes(2);
    expect(mockRedis.del).toHaveBeenCalledTimes(2);
  });
});
```

## `tests/core.test.ts`
```typescript
import { Router, MessageContext } from "../src/core/router";
import { PluginManager } from "../src/core/pluginManager";
import { SessionStore } from "../src/storage/sessionStore";
import { RedisClient } from "../src/storage/redisClient";

jest.mock("../src/storage/sessionStore");
jest.mock("../src/storage/redisClient");

describe("Core System", () => {
  let router: Router;
  let pluginManager: PluginManager;
  let mockSessionStore: SessionStore;
  let mockRedis: RedisClient;
  
  beforeEach(() => {
    pluginManager = new PluginManager();
    mockSessionStore = {
      saveSession: jest.fn(),
      getSession: jest.fn()
    } as any;
    
    mockRedis = {
      isConnected: jest.fn().mockReturnValue(true)
    } as any;
    
    router = new Router(pluginManager, mockSessionStore, mockRedis);
  });

  test("should route message to plugins", async () => {
    const mockPlugin = {
      processMessage: jest.fn()
    };
    
    pluginManager.register(mockPlugin as any);
    
    const msg: MessageContext = {
      platform: "telegram",
      chatId: "123",
      text: "test message",
      senderId: "user123",
      isGroup: false,
      timestamp: new Date()
    };
    
    await router.routeMessage(msg);
    
    expect(mockPlugin.processMessage).toHaveBeenCalledWith(msg);
    expect(mockSessionStore.saveSession).toHaveBeenCalled();
  });

  test("should skip system messages in auto-forward", async () => {
    const mockSendFn = jest.fn();
    const forwarder = {
      forwardMessage: jest.fn()
    };
    
    const autoForwardPlugin = new (require("../src/plugins/autoForwardPlugin").AutoForwardPlugin)(
      forwarder,
      mockSendFn
    );
    
    pluginManager.register(autoForwardPlugin);
    
    // Messaggio di sistema
    let msg: MessageContext & Partial<any> = {
      platform: "telegram",
      chatId: "123",
      text: "/start",
      senderId: "user123",
      isGroup: false,
      timestamp: new Date()
    };
    
    await router.routeMessage(msg);
    expect(forwarder.forwardMessage).not.toHaveBeenCalled();
    
    // Messaggio normale
    msg.text = "Ciao!";
    await router.routeMessage(msg);
    expect(forwarder.forwardMessage).toHaveBeenCalled();
  });

  test("should handle media context", async () => {
    const mockPlugin = {
      processMessage: jest.fn()
    };
    
    pluginManager.register(mockPlugin as any);
    
    const msg: MessageContext & Partial<any> = {
      platform: "whatsapp",
      chatId: "456",
      text: "Guarda questa foto!",
      senderId: "user456",
      isGroup: true,
      timestamp: new Date(),
      mediaUrl: "/media/photo.jpg",
      mediaType: "image",
      caption: "Vacanze"
    };
    
    await router.routeMessage(msg);
    
    expect(mockPlugin.processMessage).toHaveBeenCalledWith(msg);
    expect(mockSessionStore.saveSession).toHaveBeenCalledWith({
      platform: "whatsapp",
      chatId: "456",
      lastMessage: "Guarda questa foto!",
      lastMediaId: "/media/photo.jpg",
      meta expect.objectContaining({
        sender: "user456",
        isGroup: true
      })
    });
  });
});
```

## `README.md`
```markdown
# 🤖 Userbot Centralizzato Telegram & WhatsApp

[![Test Suite](https://github.com/yourusername/userbot/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/userbot/actions)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://yourusername.github.io/userbot/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Userbot avanzato per integrazione cross-platform tra Telegram e WhatsApp con supporto completo per media, routing multiplo e architettura plugin-based.

![Architettura](docs/architecture-diagram.png)

## ✨ Funzionalità Principali

- **Routing Intelligente**: Inoltra messaggi tra chat private e gruppi su piattaforme diverse
- **Supporto Media Completo**: Immagini, documenti, audio e video con elaborazione automatica
- **Architettura Plugin**: Estendi le funzionalità senza modificare il core
- **Persistenza Avanzata**: 
  - Redis per caching ad alte prestazioni
  - PostgreSQL per sessioni persistenti
  - MongoDB per logging storico
- **Gestione Media Sicura**: Download, elaborazione e pulizia automatica
- **Documentazione Completa**: Generata automaticamente con Typedoc + manuali dettagliati

## 🚀 Installazione Rapida

```bash
git clone https://github.com/yourusername/userbot.git
cd userbot
cp .env.example .env
docker-compose up --build -d
```

## 📂 Struttura Repository

```
├─ docs/                  # Documentazione manuale e generata
├─ src/
│  ├─ core/               # Logica centrale di routing e forwarding
│  ├─ telegram_adapter/   # Integrazione Telegram (Telegraf)
│  ├─ whatsapp_adapter/   # Integrazione WhatsApp (Baileys)
│  ├─ plugins/            # Sistema plugin estensibile
│  └─ storage/            # Gestione database e caching
├─ tests/                 # Test unitari e di integrazione
├─ media/                 # File media (montato come volume Docker)
└─ tmp/                   # File temporanei
```

## ⚙️ Configurazione Avanzata

### Routing Cross-Platform
Configura le regole di inoltro in `src/index.ts`:
```ts
forwarder.addRule({
  fromPlatform: "telegram",
  toPlatform: "whatsapp",
  chatMap: { 
    "-1001234567890": ["1234567890@g.us"]  // Gruppo Telegram → Gruppo WhatsApp
  },
  mediaAllowed: true  // Consenti inoltro media
});
```

### Personalizzazione Plugin
Crea plugin personalizzati in `src/plugins/`:
```ts
// src/plugins/customPlugin.ts
export class CustomPlugin implements Plugin {
  async processMessage(context: MessageContext) {
    if (context.text.includes("meteo")) {
      context.text = await getWeatherForecast();
    }
  }
}
```

## 📚 Documentazione

La documentazione completa è disponibile su [GitHub Pages](https://yourusername.github.io/userbot/):

- [Architettura di Sistema](docs/architecture.md)
- [Guida all'Installazione](docs/setup.md)
- [Sviluppo Plugin](docs/plugins.md)
- [Gestione Media](docs/media-handling.md)
- [Integrazione Redis](docs/redis-integration.md)
- [API Reference](docs/api/)

Per generare la documentazione localmente:
```bash
npm install
npm run docs
```

## 🧪 Testing

Esegui la suite di test:
```bash
npm test
```

## 📜 Licenza

Distribuito sotto licenza MIT. Vedi il file [LICENSE](LICENSE) per dettagli.

---

**Note Produzione**:  
- Usa password complesse per Redis e database  
- Configura HTTPS per endpoint pubblici  
- Imposta limiti di rate limiting per prevenire abusi  
- Monitora l'utilizzo dello storage media

**Contributi**:  
I contributi sono i benvenuti! Apri una issue o una pull request per miglioramenti.
```
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

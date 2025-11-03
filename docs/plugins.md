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

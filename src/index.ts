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
✨ Userbot Centralizzato Avviato ✨
- Telegram Client: ${tgClient ? 'Connesso' : 'Errore'}
- WhatsApp Client: ${waClient ? 'Connesso' : 'Errore'}
- Plugin Attivi: ${pluginManager.getPluginCount()}
- Redis: ${redis.isConnected() ? 'Connesso' : 'Disconnesso'}

Configurazione inoltro:
${JSON.stringify(forwarder['rules'], null, 2)}

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
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        const errorMsg = `[ERRORE] Elaborazione fallita per ${context.platform}:${context.chatId}\n${errorMessage}`;
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

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

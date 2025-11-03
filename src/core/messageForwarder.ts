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
          forwardedText += `\n[Media non consentiti per questa regola]`
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

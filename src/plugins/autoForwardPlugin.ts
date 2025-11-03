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

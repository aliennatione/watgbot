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
    context.text = `👋 Benvenuto! Sono un userbot avanzato che integra Telegram e WhatsApp.\n\nPer aiuto usa /help`;
    this.welcomedUsers.add(context.senderId);
  }
}

export class CommandPlugin implements Plugin {
  name = "commands";
  
  private pluginCount = 0;
  
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
🤖 Stato sistema:
- Plugin attivi: ${this.pluginCount}
- Sessioni attive: in elaborazione
- Media elaborati oggi: in elaborazione
        `;
        break;
        
      default:
        context.text = `⚠️ Comando non riconosciuto. Usa /help per la lista comandi.`;
    }
  }
  
  onInit(): Promise<void> {
    // In un vero sistema, recupereremmo questo dal PluginManager
    this.pluginCount = 3; 
    return Promise.resolve();
  }
}

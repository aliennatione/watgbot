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

import { Telegraf, Context, session } from "telegraf";
import { promises as fs } from "fs";
import { MessageContext, MediaContext } from "../core/router";
import { MediaManager } from "../core/mediaManager";
import { RedisClient } from "../storage/redisClient";

interface SessionData {
  step?: string;
  data?: Record<string, any>;
}

interface CustomContext extends Context {
  session?: SessionData;
}

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
    if (!ctx.chat || !ctx.from || !ctx.message || !('text' in ctx.message)) {
      console.warn("[TELEGRAM] Skipping message due to missing chat, from, or text property.");
      return;
    }

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
    if (!ctx.chat || !ctx.from || !ctx.message) {
      console.warn("[TELEGRAM] Skipping media message due to missing chat, from, or message property.");
      return;
    }

    // Gestione file più grandi
    let file: any;
    if ('photo' in ctx.message && mediaType === "image") {
      file = ctx.message.photo;
    } else if ('document' in ctx.message && mediaType === "document") {
      file = ctx.message.document;
    } else if (('audio' in ctx.message || 'voice' in ctx.message) && mediaType === "audio") {
      file = (ctx.message as any).audio || (ctx.message as any).voice;
    } else if ('video' in ctx.message && mediaType === "video") {
      file = ctx.message.video;
    } else if ('sticker' in ctx.message && mediaType === "sticker") {
      file = ctx.message.sticker;
    } else {
      console.warn(`[TELEGRAM] No matching media property found for media type: ${mediaType}`);
      return;
    }

    if (!file) {
      console.warn(`[TELEGRAM] No file found for media type: ${mediaType}`);
      return;
    }

    const fileId = Array.isArray(file) ? file[file.length - 1].file_id : file.file_id;
    
    try {
      // Scarica il file da Telegram
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const caption = 'caption' in ctx.message ? ctx.message.caption : undefined;
      const mediaInfo = await this.mediaManager.downloadMedia(
        fileLink.toString(),
        caption || `telegram_${mediaType}_${Date.now()}`
      );
      
      // Elabora immagini per compatibilità
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
        text: caption || "[Media senza descrizione]",
        senderId: ctx.from.id.toString(),
        isGroup: ctx.chat.type !== "private",
        timestamp: new Date(),
        mediaUrl,
        mediaType,
        caption: caption,
        mimeType: mediaInfo.mimeType,
        size: mediaInfo.size
      };
      
      await this.router.routeMessage(context);
      
    } catch (error) {
      console.error(`[TELEGRAM] Errore elaborazione media:`, error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      await ctx.reply(`⚠️ Errore elaborazione media: ${errorMessage}`);
    }
  }

  private handlePhoto = (ctx: CustomContext) => this.handleMedia(ctx, "image");
  private handleDocument = (ctx: CustomContext) => this.handleMedia(ctx, "document");
  private handleAudio = (ctx: CustomContext) => this.handleMedia(ctx, "audio");
  private handleVideo = (ctx: CustomContext) => this.handleMedia(ctx, "video");
  private handleVoice = (ctx: CustomContext) => this.handleMedia(ctx, "audio");

  private async handleStart(ctx: CustomContext): Promise<void> {
    await ctx.reply(`Ciao! Sono un userbot avanzato per Telegram e WhatsApp.\nUsa /help per vedere i comandi disponibili.`);
  }

  private async handleHelp(ctx: CustomContext): Promise<void> {
    const helpText = `
Comandi disponibili:
/start - Messaggio di benvenuto
/help - Questo messaggio

Questo bot fa parte di un sistema multi-piattaforma che integra:
• Telegram
• WhatsApp

Tutti i messaggi inviati verranno elaborati secondo le regole configurate.
    `;
    await ctx.reply(helpText);
  }
}

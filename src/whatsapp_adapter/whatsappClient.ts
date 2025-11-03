import {
  WAConnection,
  MessageType,
  MessageOptions,
  downloadContentFromMessage,
  getMediaKeys
} from "@whiskeysockets/baileys";
import { RedisClient } from "../storage/redisClient";
import { MediaManager } from "../core/mediaManager";
import { MessageContext, MediaContext } from "../core/router";

export class WhatsAppClient {
  private conn: WAConnection;
  private mediaManager: MediaManager;
  private redis: RedisClient;
  private qrCodePath: string;

  constructor(
    private router: any,
    mediaManager: MediaManager,
    redis: RedisClient
  ) {
    this.mediaManager = mediaManager;
    this.redis = redis;
    this.qrCodePath = process.env.WHATSAPP_QR_OUTPUT_PATH || "/tmp/whatsapp-qr.png";
    
    this.conn = new WAConnection();
    
    // Eventi connessione
    this.conn.on("connection-verified", () => {
      console.log("[WHATSAPP] Connessione verificata e stabile");
    });
    
    this.conn.on("qr", async (qr: string) => {
      console.log("[WHATSAPP] QR Code generato, scan per connetterti");
      // In produzione: salva QR o invia notifica
      require('fs').writeFileSync(this.qrCodePath, qr);
    });
    
    // Gestione messaggi
    this.conn.on("message-new", this.handleNewMessage.bind(this));
  }

  async start(): Promise<void> {
    const sessionName = process.env.WHATSAPP_SESSION_NAME || "default";
    const session = await this.redis.hgetall(`whatsapp:session:${sessionName}`);
    
    if (Object.keys(session).length > 0) {
      console.log("[WHATSAPP] Ripristino sessione esistente");
      this.conn.loadAuthInfo(session);
    }
    
    await this.conn.connect();
    
    // Salva sessione dopo connessione
    this.conn.on("open", async () => {
      const authInfo = this.conn.base64EncodedAuthInfo();
      await this.redis.hset(`whatsapp:session:${sessionName}`, "auth", JSON.stringify(authInfo));
      console.log("[WHATSAPP] Sessione salvata in Redis");
    });
  }

  stop(): void {
    this.conn.close();
  }

  async sendMessage(chatId: string, text: string, media?: MediaContext): Promise<void> {
    try {
      if (media && media.mediaUrl) {
        const mediaBuffer = await this.downloadExternalMedia(media.mediaUrl);
        
        if (media.mediaType === "image") {
          await this.conn.sendMessage(chatId, mediaBuffer, MessageType.image, {
            caption: media.caption || text
          } as MessageOptions);
        } else if (media.mediaType === "document") {
          await this.conn.sendMessage(chatId, mediaBuffer, MessageType.document, {
            filename: media.caption || "documento",
            mimetype: media.mimeType || "application/octet-stream"
          } as MessageOptions);
        } else {
          // Fallback a messaggio testuale con link
          await this.conn.sendMessage(chatId, `${text}\n[Media: ${media.mediaUrl}]`, MessageType.text);
        }
      } else {
        await this.conn.sendMessage(chatId, text, MessageType.text);
      }
    } catch (error) {
      console.error(`[WHATSAPP] Invio fallito a ${chatId}:`, error);
      throw error;
    }
  }

  private async downloadExternalMedia(url: string): Promise<Buffer> {
    // Usa MediaManager per download sicuro
    const mediaInfo = await this.mediaManager.downloadMedia(
      url,
      `whatsapp_${Date.now()}${url.substr(url.lastIndexOf('.'))}`
    );
    
    const buffer = await require('fs').promises.readFile(mediaInfo.path);
    
    // Pulisci file temporaneo
    await require('fs').promises.unlink(mediaInfo.path);
    
    return buffer;
  }

  private async handleNewMessage(msg: any): Promise<void> {
    if (!msg.message) return;
    
    // Ignora messaggi di stato (lettura, digitazione, ecc.)
    if (msg.message.protocolMessage || msg.message.senderKeyDistributionMessage) return;
    
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    // Gestione messaggi testuali
    if (msg.message.conversation) {
      this.processTextMessage({
        chatId,
        text: msg.message.conversation,
        senderId,
        isGroup
      });
      return;
    }
    
    // Gestione media
    const mediaTypes = ["imageMessage", "documentMessage", "audioMessage", "videoMessage", "stickerMessage"];
    for (const type of mediaTypes) {
      if (msg.message[type]) {
        await this.processMediaMessage(msg, type as keyof typeof msg.message);
        return;
      }
    }
  }

  private processTextMessage({
    chatId,
    text,
    senderId,
    isGroup,
  }: {
    chatId: string;
    text: string;
    senderId: string;
    isGroup: boolean;
  }): void {
    const context: MessageContext = {
      platform: "whatsapp",
      chatId,
      text,
      senderId,
      isGroup,
      timestamp: new Date(),
    };

    this.router.routeMessage(context);
  }

  private async processMediaMessage(msg: any, mediaType: string): Promise<void> {
    try {
      // Estrai informazioni media
      const mediaMessage = msg.message[mediaType];
      const stream = await downloadContentFromMessage(mediaMessage, mediaType as any);
      
      // Salva stream su file
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      
      const buffer = Buffer.concat(chunks);
      const mimeType = mediaMessage.mimetype || "application/octet-stream";
      const fileName = mediaMessage.fileName || `whatsapp_${mediaType}_${Date.now()}`;
      
      // Determina tipo media per il nostro sistema
      let normalizedType: MediaContext["mediaType"] = "document";
      if (mimeType.startsWith("image/")) normalizedType = "image";
      else if (mimeType.startsWith("audio/")) normalizedType = "audio";
      else if (mimeType.startsWith("video/")) normalizedType = "video";
      
      // Salva su filesystem temporaneo
      const tempPath = `/tmp/${fileName.replace(/\s+/g, '_')}`;
      await require('fs').promises.writeFile(tempPath, buffer);
      
      // Processa con MediaManager
      const mediaInfo = await this.mediaManager.persistMedia({
        path: tempPath,
        mimeType,
        originalName: fileName,
        size: buffer.length,
        mediaType: normalizedType
      });
      
      const context: MessageContext & MediaContext = {
        platform: "whatsapp",
        chatId: msg.key.remoteJid,
        text: mediaMessage.caption || "[Media senza descrizione]",
        senderId: msg.key.participant || msg.key.remoteJid,
        isGroup: msg.key.remoteJid.endsWith("@g.us"),
        timestamp: new Date(),
        mediaUrl: mediaInfo,
        mediaType: normalizedType,
        caption: mediaMessage.caption,
        mimeType,
        size: buffer.length
      };
      
      await this.router.routeMessage(context);
      
    } catch (error) {
      console.error("[WHATSAPP] Errore elaborazione media:", error);
    }
  }
}

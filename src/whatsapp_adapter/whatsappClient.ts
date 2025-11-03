import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, MediaType, downloadContentFromMessage } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { RedisClient } from "../storage/redisClient";
import { MediaManager } from "../core/mediaManager";
import { MessageContext, MediaContext } from "../core/router";

export class WhatsAppClient {
  private conn: any; // Type will be inferred from makeWASocket
  private mediaManager: MediaManager;
  private redis: RedisClient;
  private qrCodePath: string;
  private authState: any;
  private saveCreds: (() => Promise<void>) | undefined;

  constructor(
    private router: any,
    mediaManager: MediaManager,
    redis: RedisClient
  ) {
    this.mediaManager = mediaManager;
    this.redis = redis;
    this.qrCodePath = process.env.WHATSAPP_QR_OUTPUT_PATH || "/tmp/whatsapp-qr.png";
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    this.authState = state;
    this.saveCreds = saveCreds;

    this.conn = makeWASocket({
      auth: this.authState,
      printQRInTerminal: false,
    });

    this.conn.ev.on('creds.update', this.saveCreds);

    this.conn.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('[WHATSAPP] Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        if (shouldReconnect) {
          this.start();
        }
      } else if (connection === 'open') {
        console.log('[WHATSAPP] Opened connection');
      }
      if (qr) {
        require('fs').writeFileSync(this.qrCodePath, qr);
        console.log('[WHATSAPP] QR Code generated, scan to connect');
      }
    });

    this.conn.ev.on('messages.upsert', async (m: any) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === 'notify') {
        await this.handleNewMessage(msg);
      }
    });
  }

  stop(): void {
    this.conn.end();
  }

  async sendMessage(chatId: string, text: string, media?: MediaContext): Promise<void> {
    try {
      if (media && media.mediaUrl) {
        const mediaBuffer = await this.downloadExternalMedia(media.mediaUrl);
        
        if (media.mediaType === "image") {
          await this.conn.sendMessage(chatId, { image: mediaBuffer, caption: media.caption || text });
        } else if (media.mediaType === "document") {
          await this.conn.sendMessage(chatId, { document: mediaBuffer, fileName: media.caption || "documento", mimetype: media.mimeType || "application/octet-stream" });
        } else {
          // Fallback a messaggio testuale con link
          await this.conn.sendMessage(chatId, { text: `${text}\n[Media: ${media.mediaUrl}]` });
        }
      } else {
        await this.conn.sendMessage(chatId, { text: text });
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

    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const senderId = msg.key.participant || msg.key.remoteJid;

    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // Gestione messaggi testuali
    if (text) {
      this.processTextMessage({
        chatId,
        text,
        senderId,
        isGroup
      });
      return;
    }

    // Gestione media
    const mediaTypes = ["imageMessage", "documentMessage", "audioMessage", "videoMessage", "stickerMessage"];
    for (const type of mediaTypes) {
      if (msg.message[type]) {
        await this.processMediaMessage(msg, type);
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

      let baileysMediaType: MediaType;
      if (mediaType === "imageMessage") baileysMediaType = "image";
      else if (mediaType === "videoMessage") baileysMediaType = "video";
      else if (mediaType === "audioMessage") baileysMediaType = "audio";
      else if (mediaType === "documentMessage") baileysMediaType = "document";
      else if (mediaType === "stickerMessage") baileysMediaType = "sticker";
      else throw new Error(`Unknown media type: ${mediaType}`);

      const stream = await downloadContentFromMessage(mediaMessage, baileysMediaType);
      
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
    

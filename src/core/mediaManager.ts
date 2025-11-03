import { createWriteStream, promises as fs } from "fs";
import { join, extname } from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import sharp from "sharp";
import { RedisClient } from "../storage/redisClient";

export interface MediaConfig {
  storagePath: string;
  tempPath: string;
  maxSizeMB: number;
  retentionDays: number;
}

export interface MediaInfo {
  path: string;
  mimeType: string;
  originalName: string;
  size: number;
  mediaType: "image" | "document" | "audio" | "video" | "other";
}

export class MediaManager {
  private config: MediaConfig;
  private redis: RedisClient;

  constructor(config: MediaConfig, redis: RedisClient) {
    this.config = {
      ...config,
      maxSizeMB: config.maxSizeMB || 50,
      retentionDays: config.retentionDays || 7
    };
    this.redis = redis;
    
    // Crea directory se non esistono
    [config.storagePath, config.tempPath].forEach(dir => {
      fs.mkdir(dir, { recursive: true }).catch(console.error);
    });
  }

  async downloadMedia(url: string, originalName: string): Promise<MediaInfo> {
    // Verifica dimensioni prima del download
    const headResponse = await axios.head(url);
    const contentLength = parseInt(headResponse.headers['content-length'] || '0');
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxSizeBytes) {
      throw new Error(`File too large (${(contentLength / 1024 / 1024).toFixed(1)}MB > ${this.config.maxSizeMB}MB)`);
    }

    // Genera nome univoco
    const ext = extname(originalName) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const tempPath = join(this.config.tempPath, filename);
    
    // Scarica il file
    const writer = createWriteStream(tempPath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });
    
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Determina tipo MIME e categoria
    const mimeType = headResponse.headers['content-type'] || 'application/octet-stream';
    const mediaType = this.determineMediaType(mimeType, ext);
    
    return {
      path: tempPath,
      mimeType,
      originalName,
      size: contentLength,
      mediaType
    };
  }

  private determineMediaType(mimeType: string, ext: string): MediaInfo['mediaType'] {
    if (mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return "image";
    }
    if (mimeType.startsWith('audio/') || ['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
      return "audio";
    }
    if (mimeType.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      return "video";
    }
    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].includes(ext)) {
      return "document";
    }
    return "other";
  }

  async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Ridimensiona e comprimi per cross-platform compatibility
      return await sharp(buffer)
        .resize(1280, 720, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error("[MEDIA] Image processing failed, returning original:", error);
      return buffer;
    }
  }

  async persistMedia(mediaInfo: MediaInfo): Promise<string> {
    const finalName = `${Date.now()}_${mediaInfo.originalName.replace(/\s+/g, '_')}`;
    const destPath = join(this.config.storagePath, finalName);
    
    // Sposta da temp a storage permanente
    await fs.rename(mediaInfo.path, destPath);
    
    // Imposta cleanup automatico
    await this.redis.setex(`media:cleanup:${finalName}`, 
      this.config.retentionDays * 86400,
      JSON.stringify({ path: destPath, added: new Date().toISOString() })
    );
    
    return `/media/${finalName}`;
  }

  async cleanupOldMedia(): Promise<number> {
    let cleaned = 0;
    const keys = await this.redis.getClient().keys('media:cleanup:*');
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const { path } = JSON.parse(data);
        try {
          await fs.unlink(path);
          cleaned++;
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`[MEDIA] Cleanup failed for ${path}:`, error);
          }
        }
      }
      await this.redis.del(key);
    }
    
    console.log(`[MEDIA] Cleaned up ${cleaned} old media files`);
    return cleaned;
  }
}

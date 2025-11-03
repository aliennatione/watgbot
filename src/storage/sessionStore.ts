import { DataSource, Entity, Column, PrimaryColumn, Repository } from "typeorm";
import { Session } from "../core/router";

@Entity()
export class ChatSession {
  @PrimaryColumn()
  id!: string; // formato: "platform:chatId"

  @Column()
  platform!: "telegram" | "whatsapp";

  @Column()
  chatId!: string;

  @Column({ nullable: true })
  lastMessage?: string;

  @Column({ nullable: true })
  lastMediaId?: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastActive!: Date;

  @Column({ type: "jsonb", default: {} })
  meta!: Record<string, any>;
}

export class SessionStore {
  private dataSource!: DataSource;
  private sessionRepository!: Repository<ChatSession>;

  constructor(private redisClient: any) {
    this.dataSource = new DataSource({
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [ChatSession],
      synchronize: true,
      logging: false
    });
  }

  async init(): Promise<void> {
    await this.dataSource.initialize();
    this.sessionRepository = this.dataSource.getRepository(ChatSession);
    console.log("[DB] PostgreSQL session store initialized");
  }

  async saveSession(session: Session): Promise<void> {
    const id = `${session.platform}:${session.chatId}`;
    let entity = await this.sessionRepository.findOneBy({ id });
    
    if (!entity) {
      entity = this.sessionRepository.create({
        id,
        platform: session.platform,
        chatId: session.chatId,
        lastActive: new Date()
      });
    }
    
    entity.lastMessage = session.lastMessage;
    entity.lastMediaId = session.lastMediaId;
    entity.meta = { ...entity.meta, ...session.metadata };
    entity.lastActive = new Date();
    
    await this.sessionRepository.save(entity);
    
    // Cache in Redis con TTL 24h
    await this.redisClient.setex(
      `session:${id}`,
      86400,
      JSON.stringify(entity)
    );
  }

  async getSession(platform: string, chatId: string): Promise<Session | null> {
    const id = `${platform}:${chatId}`;
    const cacheKey = `session:${id}`;
    
    // Prova prima in Redis
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback a PostgreSQL
    const entity = await this.sessionRepository.findOneBy({ id });
    if (entity) {
      // Aggiorna cache
      await this.redisClient.setex(cacheKey, 86400, JSON.stringify(entity));
      return {
        platform: entity.platform,
        chatId: entity.chatId,
        lastMessage: entity.lastMessage,
        lastMediaId: entity.lastMediaId,
        metadata: entity.meta
      };
    }
    
    return null;
  }

  async cleanupOldSessions(days = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where("lastActive < :cutoffDate", { cutoffDate })
      .execute();
      
    console.log(`[SESSION] Removed ${result.affected} old sessions`);
    return result.affected || 0;
  }
}

import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { ServerOptions } from "socket.io";

/** Socket.IO over Redis so several API instances share rooms; without REDIS_URL it stays in-memory. */
export class RedisIoAdapter extends IoAdapter {
  private adapter: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly origin: string,
    private readonly redisUrl?: string,
  ) {
    super(app);
  }

  async connect() {
    if (!this.redisUrl) return;
    const pub = createClient({ url: this.redisUrl });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.adapter = createAdapter(pub, sub);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, { ...options, cors: { origin: this.origin, credentials: true } } as ServerOptions);
    if (this.adapter) server.adapter(this.adapter);
    return server;
  }
}

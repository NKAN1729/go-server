import { Redis } from "ioredis";
import type { RedisGameEvent } from "@go-server/shared-types";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });

export function gameChannel(gameId: string): string {
  return `game:${gameId}`;
}

export async function publishGameEvent(event: RedisGameEvent): Promise<void> {
  await redis.publish(gameChannel(event.gameId), JSON.stringify(event));
}

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

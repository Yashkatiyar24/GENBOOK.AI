import { createClient, RedisClientType } from 'redis';
import logger from './logger.js';

let client: RedisClientType | null = null;

export async function getCache(): Promise<RedisClientType | null> {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = createClient({ url });
  client.on('error', (err) => logger.error('Redis error', { err }));
  await client.connect();
  return client;
}

export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const c = await getCache();
  if (!c) return fn();
  const hit = await c.get(key);
  if (typeof hit === 'string') return JSON.parse(hit) as T;
  const val = await fn();
  await c.set(key, JSON.stringify(val), { EX: ttlSeconds });
  return val;
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import { connectRedis } from "./redis.js";
import { registerRoutes } from "./routes.js";

const PORT = Number(process.env["PORT"] ?? 3001);
const HOST = process.env["HOST"] ?? "0.0.0.0";

async function main(): Promise<void> {
  const app = Fastify({ logger: { level: process.env["LOG_LEVEL"] ?? "info" } });
  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await registerRoutes(app);
  try {
    await connectRedis();
    app.log.info("Redis connected");
  } catch (err) {
    app.log.warn({ err }, "Redis not available — running without pub/sub");
  }
  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => { console.error(err); process.exit(1); });

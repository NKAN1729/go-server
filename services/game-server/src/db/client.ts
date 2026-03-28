import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env["DATABASE_URL"] ??
  "postgresql://goserver:goserver_dev@localhost:5432/goserver";

const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
export type Db = typeof db;

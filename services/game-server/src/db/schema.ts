import { pgEnum, pgTable, varchar, integer, jsonb, timestamp, serial } from "drizzle-orm/pg-core";

export const gameStatusEnum = pgEnum("game_status", ["waiting", "active", "ended"]);
export const colorEnum = pgEnum("color", ["black", "white"]);

export const games = pgTable("games", {
  id:                 varchar("id", { length: 21 }).primaryKey(),
  boardSize:          integer("board_size").notNull(),
  status:             gameStatusEnum("status").notNull().default("waiting"),
  blackPlayerId:      varchar("black_player_id", { length: 64 }),
  whitePlayerId:      varchar("white_player_id", { length: 64 }),
  joinToken:          varchar("join_token", { length: 32 }).notNull().unique(),
  stateJson:          jsonb("state_json").notNull(),
  timeControlSeconds: integer("time_control_seconds"),
  versusBot:          integer("versus_bot").notNull().default(0),
  botDifficulty:      varchar("bot_difficulty", { length: 16 }),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export const moves = pgTable("moves", {
  id:         serial("id").primaryKey(),
  gameId:     varchar("game_id", { length: 21 }).notNull().references(() => games.id, { onDelete: "cascade" }),
  moveNumber: integer("move_number").notNull(),
  color:      colorEnum("color").notNull(),
  moveJson:   jsonb("move_json").notNull(),
  playedAt:   timestamp("played_at").notNull().defaultNow(),
});

export type GameRow    = typeof games.$inferSelect;
export type GameInsert = typeof games.$inferInsert;
export type MoveRow    = typeof moves.$inferSelect;
export type MoveInsert = typeof moves.$inferInsert;

export type Color = "black" | "white";
export type Cell = Color | "empty";
export type BoardSize = 9 | 13 | 19;
export interface Point {
  readonly row: number;
  readonly col: number;
}
export type Board = ReadonlyArray<Cell>;
export type GameStatus = "waiting" | "active" | "ended";
export type GameResult =
  | { kind: "score";   winner: Color; blackScore: number; whiteScore: number }
  | { kind: "resign";  winner: Color }
  | { kind: "timeout"; winner: Color }
  | { kind: "draw" };
export interface GameState {
  readonly id: string;
  readonly boardSize: BoardSize;
  readonly board: Board;
  readonly turn: Color;
  readonly status: GameStatus;
  readonly result: GameResult | null;
  readonly capturedBlack: number;
  readonly capturedWhite: number;
  readonly moveNumber: number;
  readonly lastMove: Point | "pass" | null;
  readonly koPoint: Point | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export type MovePayload =
  | { kind: "place"; point: Point }
  | { kind: "pass" }
  | { kind: "resign" };
export type MoveErrorCode =
  | "NOT_YOUR_TURN"
  | "GAME_NOT_ACTIVE"
  | "OCCUPIED"
  | "KO_VIOLATION"
  | "SUICIDE"
  | "OUT_OF_BOUNDS"
  | "PLAYER_NOT_IN_GAME"
  | "INTERNAL_ERROR";
export interface MoveError {
  readonly ok: false;
  readonly code: MoveErrorCode;
  readonly message: string;
}
export interface CreateGameRequest {
  readonly boardSize: BoardSize;
  readonly timeControlSeconds?: number;
  readonly versusBot?: boolean;
  readonly botDifficulty?: BotDifficulty;
}
export interface CreateGameResponse {
  readonly gameId: string;
  readonly joinToken: string;
}
export type WsMessageVersion = 1;
export type WsServerMessage =
  | { version: WsMessageVersion; type: "game_state";    payload: GameState }
  | { version: WsMessageVersion; type: "player_joined"; payload: { color: Color } }
  | { version: WsMessageVersion; type: "player_left";   payload: { color: Color } }
  | { version: WsMessageVersion; type: "move_error";    payload: MoveError }
  | { version: WsMessageVersion; type: "ping" };
export type WsClientMessage =
  | { version: WsMessageVersion; type: "move";      payload: MovePayload }
  | { version: WsMessageVersion; type: "subscribe"; payload: { gameId: string; playerId: string } }
  | { version: WsMessageVersion; type: "pong" };
export type RedisMessageVersion = 1;
export type RedisGameEvent =
  | { version: RedisMessageVersion; type: "move_made";     gameId: string; state: GameState }
  | { version: RedisMessageVersion; type: "player_joined"; gameId: string; color: Color }
  | { version: RedisMessageVersion; type: "game_ended";    gameId: string; result: GameResult };
export interface Player {
  readonly id: string;
  readonly username: string;
  readonly color: Color;
  readonly isBot: boolean;
}
export type BotDifficulty = "beginner" | "easy" | "medium" | "hard" | "expert";
export const BOT_DIFFICULTY_VISITS: Record<BotDifficulty, number> = {
  beginner: 1,
  easy:     50,
  medium:   500,
  hard:     2000,
  expert:   Infinity,
} as const;
export interface BotMoveRequest {
  readonly gameId: string;
  readonly board: Board;
  readonly boardSize: BoardSize;
  readonly turn: Color;
  readonly difficulty: BotDifficulty;
  readonly moveHistory: ReadonlyArray<Point | "pass">;
}
export interface BotMoveResponse {
  readonly move: MovePayload;
}
export interface LobbyEntry {
  readonly playerId: string;
  readonly boardSize: BoardSize;
  readonly timeControlSeconds: number | null;
  readonly createdAt: string;
}
export interface MatchFoundEvent {
  readonly version: RedisMessageVersion;
  readonly type: "match_found";
  readonly gameId: string;
  readonly blackPlayerId: string;
  readonly whitePlayerId: string;
}

import postgres from "postgres";

const connectionString =
  process.env["DATABASE_URL"] ??
  "postgresql://goserver:goserver_dev@localhost:5432/goserver";

const sql = postgres(connectionString);

async function migrate(): Promise<void> {
  console.log("Running migrations...");

  await sql`
    DO $$ BEGIN
      CREATE TYPE game_status AS ENUM ('waiting', 'active', 'ended');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE color AS ENUM ('black', 'white');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id                   VARCHAR(21)  PRIMARY KEY,
      board_size           INTEGER      NOT NULL,
      status               game_status  NOT NULL DEFAULT 'waiting',
      black_player_id      VARCHAR(64),
      white_player_id      VARCHAR(64),
      join_token           VARCHAR(32)  NOT NULL UNIQUE,
      state_json           JSONB        NOT NULL,
      time_control_seconds INTEGER,
      versus_bot           INTEGER      NOT NULL DEFAULT 0,
      bot_difficulty       VARCHAR(16),
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS moves (
      id          SERIAL      PRIMARY KEY,
      game_id     VARCHAR(21) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      move_number INTEGER     NOT NULL,
      color       color       NOT NULL,
      move_json   JSONB       NOT NULL,
      played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS moves_game_id_idx ON moves(game_id)
  `;

  console.log("Migrations complete.");
  await sql.end();
}

migrate().catch((err) => { console.error(err); process.exit(1); });

-- Newsletter subscribers for Best DIY Mini Splits
-- Applied via: wrangler d1 execute bdms-subscribers --file=db/schema.sql --remote

CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  source     TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_created_at
  ON subscribers(created_at DESC);

-- Self-hosted pageview analytics
-- Applied via: wrangler d1 execute bdms-subscribers --file=db/pageviews.sql --remote

CREATE TABLE IF NOT EXISTS pageviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  viewed_at  INTEGER NOT NULL,
  path       TEXT    NOT NULL,
  referrer   TEXT,
  country    TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_pageviews_viewed_at ON pageviews(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_path      ON pageviews(path);

-- Run this in your Supabase SQL Editor (https://qxikwyjelqdcwgmbyfdj.supabase.co)
-- after creating the prop house schema tables via Prisma.

CREATE TABLE IF NOT EXISTS reply (
  id              BIGSERIAL PRIMARY KEY,
  "proposalId"    INTEGER NOT NULL,
  content         TEXT NOT NULL,
  address         TEXT NOT NULL,
  "communityAddress" TEXT NOT NULL DEFAULT '',
  "blockTag"      INTEGER NOT NULL DEFAULT 0,
  signature       TEXT NOT NULL DEFAULT '',
  "signedMessage" TEXT NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reply ENABLE ROW LEVEL SECURITY;

-- Allow public reads
CREATE POLICY "Allow public read" ON reply
  FOR SELECT USING (true);

-- Allow authenticated insert
CREATE POLICY "Allow anon insert" ON reply
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups by proposal
CREATE INDEX IF NOT EXISTS idx_reply_proposal_id ON reply ("proposalId");
CREATE INDEX IF NOT EXISTS idx_reply_created ON reply ("createdAt");

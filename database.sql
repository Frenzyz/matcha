-- Add mode column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'chat';

-- Create index for chat mode
CREATE INDEX IF NOT EXISTS idx_chats_mode ON chats(mode);

-- Update existing chats
UPDATE chats SET mode = 'chat' WHERE mode IS NULL;
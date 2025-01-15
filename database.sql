-- Add user_budgets table
    CREATE TABLE IF NOT EXISTS user_budgets (
      user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      monthly_budget INTEGER DEFAULT 1000,
      rollover_amount INTEGER DEFAULT 0,
      transactions JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS policies for user_budgets
    CREATE POLICY "Users can view their own budget"
    ON user_budgets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own budget"
    ON user_budgets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own budget"
    ON user_budgets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

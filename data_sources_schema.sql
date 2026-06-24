-- Run this in the Supabase SQL Editor if you need to update or recreate the data_sources table

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  sheet_url text, -- Nullable now because Excel and Meta Ads use parsed_data instead!
  parsed_data jsonb, -- Stores Excel uploads and Meta Ads campaign data
  layout_config jsonb, -- Stores the dashboard layout preferences (e.g. viewAsTable)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data sources" ON data_sources FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Users can insert own data sources" ON data_sources FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update own data sources" ON data_sources FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete own data sources" ON data_sources FOR DELETE USING ( auth.uid() = user_id );

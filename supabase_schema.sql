-- Run this in your Supabase SQL Editor

-- 1. Create tables
CREATE TABLE paintings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) DEFAULT 'Masterpiece',
    original_image_url TEXT,
    template_image_url TEXT,
    palette_image_url TEXT,
    reference_image_url TEXT,
    painted_canvas_url TEXT,
    palette_json JSONB,
    metrics_json JSONB,
    completed BOOLEAN DEFAULT false,
    submitted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lumis_usage (
    id VARCHAR(255) PRIMARY KEY, -- userId_date format
    user_id UUID NOT NULL,
    date VARCHAR(10) NOT NULL,
    count INTEGER DEFAULT 0
);

ALTER TABLE lumis_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own usage" ON lumis_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE monthly_draws (
    id SERIAL PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- e.g., '2026-07'
    painting_id UUID REFERENCES paintings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_display_name VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    votes INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT false
);

CREATE TABLE draw_votes (
    id SERIAL PRIMARY KEY,
    draw_id INTEGER REFERENCES monthly_draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    UNIQUE(draw_id, user_id)
);

-- 2. Setup Row Level Security (RLS)
ALTER TABLE paintings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_votes ENABLE ROW LEVEL SECURITY;

-- Policies for paintings
CREATE POLICY "Users can view their own paintings" ON paintings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view submitted paintings" ON paintings
  FOR SELECT USING (submitted = true);

CREATE POLICY "Users can insert their own paintings" ON paintings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paintings" ON paintings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own paintings" ON paintings
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for monthly_draws (Public can view, users can insert their own)
CREATE POLICY "Anyone can view monthly draws" ON monthly_draws
  FOR SELECT USING (true);

CREATE POLICY "Users can submit to monthly draws" ON monthly_draws
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for draw_votes
CREATE POLICY "Anyone can view votes" ON draw_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote" ON draw_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Create Storage Bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('paintings', 'paintings', true);

CREATE POLICY "Public can view paintings bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'paintings');

CREATE POLICY "Users can upload to paintings bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'paintings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update paintings bucket objects" ON storage.objects
  FOR UPDATE USING (bucket_id = 'paintings' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'paintings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete paintings bucket objects" ON storage.objects
  FOR DELETE USING (bucket_id = 'paintings' AND auth.uid()::text = (storage.foldername(name))[1]);

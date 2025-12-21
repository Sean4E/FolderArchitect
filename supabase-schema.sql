-- Folder Architect - Supabase Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ============================================
-- 1. TEMPLATES TABLE
-- ============================================
CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    structure JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_updated_at ON templates(updated_at);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- Each user can only see/modify their own templates
-- ============================================
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Users can read their own templates
CREATE POLICY "Users can read own templates" ON templates
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert own templates" ON templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON templates
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON templates
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. REAL-TIME SUBSCRIPTIONS
-- Enable real-time for templates table
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE templates;

-- ============================================
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. UPSERT FUNCTION FOR CONFLICT RESOLUTION
-- Newer timestamp wins
-- ============================================
CREATE OR REPLACE FUNCTION upsert_template(
    p_id TEXT,
    p_user_id UUID,
    p_name TEXT,
    p_description TEXT,
    p_structure JSONB,
    p_updated_at TIMESTAMPTZ
)
RETURNS templates AS $$
DECLARE
    result templates;
BEGIN
    INSERT INTO templates (id, user_id, name, description, structure, updated_at)
    VALUES (p_id, p_user_id, p_name, p_description, p_structure, p_updated_at)
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        structure = EXCLUDED.structure,
        updated_at = EXCLUDED.updated_at
    WHERE templates.updated_at < EXCLUDED.updated_at
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

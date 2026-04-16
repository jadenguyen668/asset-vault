-- ============================================================
-- MIGRATION: Drop and recreate all tables with correct schema
-- Run this in Supabase SQL Editor
-- WARNING: This will delete all existing data!
-- ============================================================

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL DEFAULT '',
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Projects ────────────────────────────────────────────────
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- ── Collections ─────────────────────────────────────────────
CREATE TABLE collections (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage collections" ON collections FOR ALL USING (true) WITH CHECK (true);

-- ── Characters ──────────────────────────────────────────────
CREATE TABLE characters (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    asset_type TEXT NOT NULL DEFAULT 'spine',
    mime_type TEXT,
    name TEXT NOT NULL,
    json_name TEXT NOT NULL,
    spine_version TEXT NOT NULL DEFAULT '',
    major_version INT NOT NULL DEFAULT 3,
    minor_version INT NOT NULL DEFAULT 8,
    json_path TEXT,
    atlas_path TEXT,
    png_paths TEXT[],
    json_text TEXT NOT NULL DEFAULT '',
    atlas_text TEXT NOT NULL DEFAULT '',
    bone_count INT NOT NULL DEFAULT 0,
    slot_count INT NOT NULL DEFAULT 0,
    anim_count INT NOT NULL DEFAULT 0,
    anim_names TEXT[] NOT NULL DEFAULT '{}',
    skin_count INT NOT NULL DEFAULT 0,
    file_size BIGINT NOT NULL DEFAULT 0,
    json_size BIGINT NOT NULL DEFAULT 0,
    atlas_size BIGINT NOT NULL DEFAULT 0,
    png_sizes JSONB NOT NULL DEFAULT '[]',
    thumbnail TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    preview_config JSONB DEFAULT '{}'::jsonb,
    allow_download BOOLEAN NOT NULL DEFAULT true,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    collection_ids BIGINT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage characters" ON characters FOR ALL USING (true) WITH CHECK (true);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_json_name ON characters(json_name);
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_characters_status ON characters(status);
CREATE INDEX idx_characters_imported ON characters(imported_at DESC);
CREATE INDEX idx_characters_viewed ON characters(last_viewed_at DESC);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_collections_user ON collections(user_id);

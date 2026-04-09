-- ============================================================
-- Live Asset Viewer — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor to set up the database.
-- ============================================================

-- ── Projects ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
    ON projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── Collections ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collections"
    ON collections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── Characters (Spine Assets) ───────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Asset type
    asset_type TEXT NOT NULL DEFAULT 'spine',  -- 'spine' | '2d' | '3d'
    mime_type TEXT,

    -- Identity
    name TEXT NOT NULL,
    json_name TEXT NOT NULL,                   -- original filename
    spine_version TEXT NOT NULL DEFAULT '',
    major_version INT NOT NULL DEFAULT 3,
    minor_version INT NOT NULL DEFAULT 8,

    -- File storage paths (Supabase Storage)
    -- Binary blobs stored in Storage bucket, not in DB
    json_path TEXT,          -- path in spine-assets bucket
    atlas_path TEXT,
    png_paths TEXT[],         -- array of paths

    -- Parsed text (kept in DB for fast reload without storage download)
    json_text TEXT NOT NULL DEFAULT '',
    atlas_text TEXT NOT NULL DEFAULT '',

    -- Metadata
    bone_count INT NOT NULL DEFAULT 0,
    slot_count INT NOT NULL DEFAULT 0,
    anim_count INT NOT NULL DEFAULT 0,
    anim_names TEXT[] NOT NULL DEFAULT '{}',
    skin_count INT NOT NULL DEFAULT 0,
    file_size BIGINT NOT NULL DEFAULT 0,
    json_size BIGINT NOT NULL DEFAULT 0,
    atlas_size BIGINT NOT NULL DEFAULT 0,
    png_sizes JSONB NOT NULL DEFAULT '[]',    -- [{name, size}]

    -- Thumbnail (base64 data URL, small enough for DB)
    thumbnail TEXT,

    -- Timestamps
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- User metadata
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',      -- draft, review, approved, rejected, etc.

    -- Relations
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    collection_ids BIGINT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own characters"
    ON characters FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_json_name ON characters(json_name);
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_status ON characters(status);
CREATE INDEX IF NOT EXISTS idx_characters_imported ON characters(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_viewed ON characters(last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

-- ── Storage Bucket ──────────────────────────────────────────
-- Run this separately or via Supabase Dashboard → Storage → New Bucket
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('spine-assets', 'spine-assets', false);

-- Storage RLS: users can only access their own folder
-- CREATE POLICY "Users can manage own files"
--     ON storage.objects FOR ALL
--     USING (auth.uid()::text = (storage.foldername(name))[1])
--     WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

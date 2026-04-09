-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL DEFAULT 'spine' CHECK (asset_type IN ('spine', '2d', '3d')),
    mime_type TEXT,
    name TEXT NOT NULL,
    json_name TEXT NOT NULL,
    spine_version TEXT NOT NULL DEFAULT 'N/A',
    major_version INTEGER NOT NULL DEFAULT 0,
    minor_version INTEGER NOT NULL DEFAULT 0,
    json_text TEXT NOT NULL DEFAULT '',
    atlas_text TEXT NOT NULL DEFAULT '',
    bone_count INTEGER NOT NULL DEFAULT 0,
    slot_count INTEGER NOT NULL DEFAULT 0,
    anim_count INTEGER NOT NULL DEFAULT 0,
    anim_names TEXT[] NOT NULL DEFAULT '{}',
    skin_count INTEGER NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    json_size INTEGER NOT NULL DEFAULT 0,
    atlas_size INTEGER NOT NULL DEFAULT 0,
    png_sizes JSONB NOT NULL DEFAULT '[]',
    thumbnail TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under-review', 'in-review', 'approved', 'rejected', 'needs-revision', 'review', 'redo')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    project_id BIGINT,
    collection_ids BIGINT[] NOT NULL DEFAULT '{}',
    json_path TEXT,
    atlas_path TEXT,
    png_paths TEXT[] NOT NULL DEFAULT '{}',
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_json_name ON characters(json_name);
CREATE INDEX idx_characters_visibility ON characters(visibility);
CREATE INDEX idx_characters_project_id ON characters(project_id);
CREATE INDEX idx_characters_status ON characters(status);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SELECT: admin sees all, user sees own + public, viewer sees public only
CREATE POLICY "characters_select" ON characters FOR SELECT USING (
    get_user_role() = 'admin'
    OR user_id = auth.uid()
    OR (visibility = 'public' AND auth.role() = 'authenticated')
);

-- INSERT: admin and user can create
CREATE POLICY "characters_insert" ON characters FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'user')
    AND user_id = auth.uid()
);

-- UPDATE: admin can update any, user can update own
CREATE POLICY "characters_update" ON characters FOR UPDATE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'user' AND user_id = auth.uid())
);

-- DELETE: admin can delete any, user can delete own
CREATE POLICY "characters_delete" ON characters FOR DELETE USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'user' AND user_id = auth.uid())
);

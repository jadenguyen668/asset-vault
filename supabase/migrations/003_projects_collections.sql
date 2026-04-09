-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "projects_insert" ON projects FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'user') AND user_id = auth.uid());
CREATE POLICY "projects_update" ON projects FOR UPDATE
    USING (get_user_role() = 'admin' OR (get_user_role() = 'user' AND user_id = auth.uid()));
CREATE POLICY "projects_delete" ON projects FOR DELETE
    USING (get_user_role() = 'admin' OR (get_user_role() = 'user' AND user_id = auth.uid()));

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📁',
    color TEXT NOT NULL DEFAULT '#7c5cfc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select" ON collections FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "collections_insert" ON collections FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'user') AND user_id = auth.uid());
CREATE POLICY "collections_update" ON collections FOR UPDATE
    USING (get_user_role() = 'admin' OR (get_user_role() = 'user' AND user_id = auth.uid()));
CREATE POLICY "collections_delete" ON collections FOR DELETE
    USING (get_user_role() = 'admin' OR (get_user_role() = 'user' AND user_id = auth.uid()));

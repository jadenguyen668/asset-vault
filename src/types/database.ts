export type UserRole = 'admin' | 'user' | 'viewer';
export type AssetVisibility = 'public' | 'private';
export type AssetType = 'spine' | '2d' | '3d';
export type AssetStatus = 'draft' | 'under-review' | 'in-review' | 'approved' | 'rejected' | 'needs-revision' | 'review' | 'redo';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: number;
  user_id: string;
  asset_type: AssetType;
  mime_type: string | null;
  name: string;
  json_name: string;
  spine_version: string;
  major_version: number;
  minor_version: number;
  json_text: string;
  atlas_text: string;
  bone_count: number;
  slot_count: number;
  anim_count: number;
  anim_names: string[];
  skin_count: number;
  file_size: number;
  json_size: number;
  atlas_size: number;
  png_sizes: { name: string; size: number }[];
  thumbnail: string | null;
  tags: string[];
  notes: string;
  status: AssetStatus;
  project_id: number | null;
  collection_ids: number[];
  allow_download: boolean;
  preview_config?: Record<string, any> | null;
  json_path: string | null;
  atlas_path: string | null;
  png_paths: string[];
  imported_at: string;
  last_viewed_at: string;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    display_name: string | null;
  } | null;
}

export interface Project {
  id: number;
  user_id: string;
  name: string;
  code: string;
  color: string;
  created_at: string;
}

export interface Collection {
  id: number;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

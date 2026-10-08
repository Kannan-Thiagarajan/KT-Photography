export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'client';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
export type Album = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  cover_image_path: string | null;
  created_at: string;
  updated_at: string;
};
export type Photo = {
  id: string;
  album_id: string;
  storage_path: string;
  thumbnail_path: string;
  filename: string;
  file_size: number;
  width: number;
  height: number;
  display_order: number;
  preview_url?: string;
  created_at: string;
};
export type Package = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  included_hours: number;
  features: string[];
  best_for: string[];
  badge: string | null;
  image_path: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type ActionResult = { error?: string; success?: string; id?: string };

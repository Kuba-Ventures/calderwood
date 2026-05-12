-- Add practice display name. Used for dashboard headings, PDF cover, and
-- emails. Optional because legacy intake rows may not have it yet.

alter table practices
  add column if not exists practice_name text;

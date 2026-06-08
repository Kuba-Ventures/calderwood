-- Account page persistence: practices needs a phone column so the (now
-- Supabase-backed) Account page can save a contact number instead of stashing
-- it in browser localStorage.

alter table practices
  add column if not exists phone text;

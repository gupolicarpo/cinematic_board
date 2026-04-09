-- ============================================================
--  CINEMATIC BOARD — Supabase Schema
--  Paste this entire file into Supabase SQL Editor and Run.
-- ============================================================

-- Enable UUID helper (already on by default in Supabase)
create extension if not exists "pgcrypto";


-- ── 1. PROFILES ─────────────────────────────────────────────
-- One row per user, created automatically on sign-up.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. PROJECTS ─────────────────────────────────────────────
-- Each project is a full canvas board (nodes + positions).
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null default 'Untitled Project',
  description   text,
  thumbnail_url text,
  nodes         jsonb default '[]'::jsonb,       -- all node objects
  positions     jsonb default '{}'::jsonb,       -- { nodeId: {x,y} }
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-update updated_at on every save
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();


-- ── 3. BIBLE ENTRIES ────────────────────────────────────────
-- Characters, Objects, Locations (can belong to a project or be global).
create table if not exists public.bible_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  kind        text not null check (kind in ('character','object','location')),
  name        text not null,
  tag         text,
  description text,
  notes       text,
  img_url     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists bible_set_updated_at on public.bible_entries;
create trigger bible_set_updated_at
  before update on public.bible_entries
  for each row execute function public.set_updated_at();


-- ── 4. ASSETS ───────────────────────────────────────────────
-- Metadata for uploaded files (actual files live in Supabase Storage).
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  type        text not null check (type in ('images','videos','audio','text')),
  name        text not null,
  storage_path text,                -- path inside the Supabase Storage bucket
  url         text,                 -- public URL returned by storage
  content     text,                 -- for text assets (scene prompts, scripts, etc.)
  size        bigint,
  created_at  timestamptz default now()
);


-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────
-- Users can ONLY see and edit their own data.

alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.bible_entries  enable row level security;
alter table public.assets         enable row level security;

-- Profiles: each user manages only their own row
create policy "profiles: own row only"
  on public.profiles for all
  using (auth.uid() = id);

-- Projects
create policy "projects: own rows only"
  on public.projects for all
  using (auth.uid() = user_id);

-- Bible entries
create policy "bible: own rows only"
  on public.bible_entries for all
  using (auth.uid() = user_id);

-- Assets
create policy "assets: own rows only"
  on public.assets for all
  using (auth.uid() = user_id);


-- ── 6. STORAGE BUCKET ───────────────────────────────────────
-- Run this to create the file storage bucket for uploads.
insert into storage.buckets (id, name, public)
values ('cinematic-assets', 'cinematic-assets', false)
on conflict do nothing;

-- Storage policy: users can only access their own folder (user_id/...)
create policy "storage: own folder only"
  on storage.objects for all
  using (
    bucket_id = 'cinematic-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

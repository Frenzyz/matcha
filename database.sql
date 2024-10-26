-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  student_id text,
  email text unique,
  theme_color text default 'emerald',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  setup_completed boolean default false
);

-- Create user_preferences table
create table if not exists public.user_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  major text,
  interests text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create calendar_events table
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  google_event_id text,
  title text not null,
  description text,
  location text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  type text check (type in ('career', 'academic', 'wellness')),
  attendees integer default 0,
  is_recurring boolean default false,
  recurrence_rule text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  source text default 'manual' check (source in ('manual', 'google', 'canvas'))
);

-- Add indexes for faster queries
create index if not exists calendar_events_user_id_idx on calendar_events(user_id);
create index if not exists calendar_events_start_time_idx on calendar_events(start_time);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.calendar_events enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Profiles are viewable by owner" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can view their own preferences" on user_preferences;
drop policy if exists "Users can insert their own preferences" on user_preferences;
drop policy if exists "Users can update their own preferences" on user_preferences;
drop policy if exists "Users can view their own calendar events" on calendar_events;
drop policy if exists "Users can insert their own calendar events" on calendar_events;
drop policy if exists "Users can update their own calendar events" on calendar_events;
drop policy if exists "Users can delete their own calendar events" on calendar_events;

-- Create fresh policies
create policy "Profiles are viewable by owner"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view their own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on user_preferences for update
  using (auth.uid() = user_id);

create policy "Users can view their own calendar events"
  on calendar_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own calendar events"
  on calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calendar events"
  on calendar_events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own calendar events"
  on calendar_events for delete
  using (auth.uid() = user_id);

-- Add function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Add triggers for updated_at
create trigger handle_preferences_updated_at
  before update on user_preferences
  for each row
  execute function handle_updated_at();

create trigger handle_calendar_events_updated_at
  before update on calendar_events
  for each row
  execute function handle_updated_at();

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create or replace function to handle new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, student_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'student_id'
  );
  return new;
end;
$$;

-- Create trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
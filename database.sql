-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  student_id text,
  email text unique,
  canvas_calendar_url text,
  theme_color text default 'emerald',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen timestamp with time zone,
  setup_completed boolean default false
);

-- Create assignments table
create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  course text not null,
  title text not null,
  due_date timestamp with time zone not null,
  progress integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create events table
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  location text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  type text check (type in ('career', 'academic', 'wellness')),
  attendees integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.events enable row level security;

-- Drop existing policies if they exist
do $$
begin
  -- Profiles policies
  execute 'drop policy if exists "Profiles are viewable by owner" on profiles';
  execute 'drop policy if exists "Users can insert their own profile" on profiles';
  execute 'drop policy if exists "Users can update own profile" on profiles';
  
  -- Assignments policies
  execute 'drop policy if exists "Users can view their own assignments" on assignments';
  execute 'drop policy if exists "Users can insert their own assignments" on assignments';
  execute 'drop policy if exists "Users can update their own assignments" on assignments';
  
  -- Events policies
  execute 'drop policy if exists "Events are viewable by everyone" on events';
end$$;

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

create policy "Users can view their own assignments"
  on assignments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own assignments"
  on assignments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assignments"
  on assignments for update
  using (auth.uid() = user_id);

create policy "Events are viewable by everyone"
  on events for select
  using (true);

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
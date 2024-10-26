-- Add scholarships table
create table if not exists public.scholarships (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  amount text not null,
  deadline timestamp with time zone not null,
  eligibility text[],
  majors text[],
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for scholarships
alter table public.scholarships enable row level security;

-- Create policy for viewing scholarships
create policy "Scholarships are viewable by all authenticated users"
  on scholarships for select
  using (auth.role() = 'authenticated');

-- Create index for scholarship search
create index scholarships_majors_idx on scholarships using gin (majors);
create index scholarships_deadline_idx on scholarships(deadline);

-- Add trigger for updated_at
create trigger handle_scholarships_updated_at
  before update on scholarships
  for each row
  execute function handle_updated_at();
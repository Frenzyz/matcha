# Supabase Setup for Matcha

This document explains how to set up Supabase for local development with Matcha.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or later)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Installation

1. Install the Supabase CLI globally:

```bash
npm install -g supabase
```

2. Install project dependencies:

```bash
npm install
```

## Local Development Setup

### Starting Supabase Locally

1. Initialize Supabase (first time only):

```bash
supabase init
```

2. Start the local Supabase services:

```bash
npm run supabase:start
```

This will start Postgres, PostgREST, GoTrue (auth), and other Supabase services locally in Docker containers.

3. Get the local API URL and key:

```bash
supabase status
```

4. Update your `.env.local` file with the local credentials:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

5. Run the application:

```bash
npm run dev
```

## Accessing Supabase Studio

Once Supabase is running locally, you can access the Studio UI at:

```
http://localhost:54323
```

## Authentication Debugging

If you encounter authentication issues, use the built-in SupabaseDebug component (available in development mode) to:

1. Test the connection to Supabase
2. Test login with your credentials
3. Create a test user

## Stopping Supabase

When you're done developing, stop the local Supabase services with:

```bash
npm run supabase:stop
```

## Database Migrations

### Creating Migrations

```bash
supabase migration new <migration_name>
```

### Applying Migrations

```bash
supabase db reset
```

## Troubleshooting

### Common Issues

1. If you see "Invalid login credentials" errors:
   - Ensure you're not hashing passwords client-side (Supabase handles this)
   - Try creating a new user with the Supabase debug component
   - Check if email confirmations are required in your setup

2. Connection issues:
   - Verify Docker is running
   - Check if the Supabase services are running with `supabase status`
   - Ensure your environment variables are correctly set

### Logs

To view logs from your local Supabase instance:

```bash
supabase logs
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction) 
# Environment Setup for MRA VBC Opps with Supabase Auth

## Required Environment Variables

Create a `.env.local` file in the project root with:

```
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon/public key
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters  # JWT secret for verification

# Database
DATABASE_URL=postgresql://postgres:[password]@[project].supabase.co:5432/postgres
```

## Getting Supabase Credentials

1. **SUPABASE_URL**: Project Settings → API → Project URL
2. **SUPABASE_KEY**: Project Settings → API → Project API Keys → `anon` key
3. **SUPABASE_JWT_SECRET**: Project Settings → API → JWT Settings → Secret (the actual secret, not the token)
4. **DATABASE_URL**: Project Settings → Database → Connection Pooling (Supabase)

## Setup Steps

1. **Run migrations**:
   ```bash
   # Migrations automatically run on Vercel deploy
   # Or manually in Supabase SQL Editor: run 010, 011, 012, 013 in order
   ```

2. **Create seed users in Supabase Auth**:
   ```bash
   python api/setup_seed_users.py
   ```

3. **Verify setup**:
   - Login at `/projects/mra-vbc-opps/auth/login`
   - Test credentials: `admin1@vbc.com` / `Saludhealth`

## Notes

- JWT verification uses HS256 with `SUPABASE_JWT_SECRET`
- Supabase Auth tokens are valid for 1 hour by default
- RLS policies enforce row-level access based on `auth.jwt()` email
- Never commit `.env.local` - use `.env.local.example` for template

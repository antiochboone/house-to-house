# House to House — Account Setup Walkthrough

Three free accounts, all created under a **church email address** (e.g.
`hello@antiochboone.com` or a dedicated `tech@…` — anything the church, not one
person, controls). Total time: ~15 minutes. Do them in this order.

> Why church-owned: the tool survives staff transitions, and if other churches
> ever use it, the infrastructure clearly belongs to the ministry.

---

## 1. GitHub (code hosting) — ~3 min

1. Go to **github.com/signup** and sign up with the church email.
2. Pick a username like `antiochboone`.
3. Once in, click **+ → New repository**:
   - Name: `house-to-house`
   - Visibility: **Private**
   - Do NOT initialize with a README (we already have code).
4. Tell Claude the repository URL (e.g. `https://github.com/antiochboone/house-to-house`)
   — Claude will connect the local repository and walk you through the one-time
   push authentication.

## 2. Supabase (database + sign-in) — ~7 min

1. Go to **supabase.com** → Start your project → sign up with the church email
   (choose "Sign up with email", not GitHub, so the accounts stay independent —
   or use GitHub sign-in with the church GitHub from step 1; either is fine).
2. Create a **New project**:
   - Organization: default is fine
   - Name: `house-to-house`
   - Database password: generate a strong one and **save it in the church's
     password manager** (you rarely need it, but never lose it)
   - Region: **East US (North Virginia)** — closest to Boone
3. When the project finishes provisioning:
   - Go to **Project Settings → API** (or "API Keys")
   - Copy **Project URL** and the **anon / publishable key**
   - In the project folder on your computer, copy the file
     `house-to-house/.env.local.example` to `house-to-house/.env.local` and
     paste the two values in. (Claude can do this part if you paste the two
     values into the chat — they're safe to share; the anon key is public by
     design.)
4. Load the database schema:
   - In Supabase, open **SQL Editor → New query**
   - Open the file `house-to-house/supabase/schema.sql`, copy ALL of it,
     paste, and click **Run**. You should see "Success. No rows returned."
5. Configure auth:
   - **Authentication → URL Configuration**: set Site URL to
     `http://localhost:3000` for now (we'll add the real domain at deploy).
6. First sign-in (after Claude confirms the app is wired up):
   - Sign in at the app with your own email via the magic link
   - Then in **SQL Editor**, run the "make yourself staff" snippet at the
     bottom of `schema.sql` with your email filled in.

## 3. Vercel (hosting) — ~3 min, can wait until deploy day

1. Go to **vercel.com/signup** → **Continue with GitHub** → use the church
   GitHub account. (This links them, which is exactly what we want — Vercel
   auto-deploys whatever we push.)
2. That's it for now — importing the repository happens at deploy time with
   Claude walking you through it.

---

## What Claude handles after each step

- **After GitHub:** connects the local repo, pushes all history.
- **After Supabase (paste the URL + anon key):** writes `.env.local`, restarts
  the app, verifies magic-link sign-in end-to-end, then swaps the app from
  demo data to the real database and builds the add-people/add-groups flows so
  you can start entering the real Antioch Boone.
- **After Vercel:** imports the repo, sets the env vars, deploys, updates the
  Supabase Site URL, and hands you a live link to put in Subsplash.

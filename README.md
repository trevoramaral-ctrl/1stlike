# First Like

The member app. Anyone can create an account, sign in, and the app remembers
them: their handle, their daily checklist, their streak, and their follower
growth graph. Each subscriber's data is private to them, enforced by the
database itself.

Stack: React + Vite, Supabase (accounts + data), Netlify (hosting).
Same rails as humanmink, different project.

---

## Setup, three steps

### 1. Create the Supabase project

Go to supabase.com, create a **new project** called `first-like`.
Keep it separate from the humanmink project.

When it finishes building, open **Project Settings -> API** and copy two values:

- **Project URL**
- **anon public** key

### 2. Create the database tables

In the Supabase dashboard, open **SQL Editor -> New query**, paste the entire
contents of `supabase/schema.sql`, and hit Run.

That creates the `profiles` table, turns on row-level security so each
subscriber can only ever read and write their own row, and adds a trigger that
creates a blank profile automatically whenever someone signs up.

### 3. Add your keys and run it

```bash
cp .env.example .env
# paste your Project URL and anon key into .env
npm install
npm run dev
```

Open the address it prints. Create an account, sign out, sign back in, and
you should land on your dashboard with everything still there.

---

## Deploying to Netlify

Push this folder to a Git repo, then in Netlify: **Add new site -> Import an
existing project**, pick the repo. The build settings come from `netlify.toml`
automatically.

Before the first deploy, add the two environment variables in Netlify under
**Site settings -> Environment variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then point your domain at it.

---

## A note on email confirmation

By default Supabase emails a confirmation link on sign-up. While you're
testing, you can turn that off under **Authentication -> Providers -> Email**
so accounts work instantly. Turn it back on before real customers arrive.

---

## What's built, what's next

**Built now**
- Email and password accounts
- Per-subscriber private data (handle, niche, checklist, streak, follower history)
- The daily checklist with progress and streak
- The follower growth graph

**Next**
- Stripe checkout, so an account only unlocks the full app after payment
  (the `is_paid` column on `profiles` is already there, waiting to be flipped)
- The Hunt tools (tag stacks, comment openers) running on your own
  Anthropic API key through a Netlify function
- Automatic Instagram follower sync via the Instagram Graph API

---

## Files worth knowing

```
supabase/schema.sql          the database, run this once
src/lib/supabase.js          connects to your project
src/lib/store.js             loads and saves a subscriber's row
src/auth.jsx                 who is signed in
src/components/AuthScreen.jsx   sign up / sign in
src/components/Dashboard.jsx    the logged-in home
src/styles.css               all the styling
```

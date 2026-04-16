# Syntric AI OS — Setup Guide

Everything you need to get the AI OS running, start to finish. Work through each section in order. Check the boxes as you go.

---

## 1. Run SQL Migrations

You already ran `supabase-schema.sql`. Four more migrations need to run **in order** in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

| # | File | What it creates |
|---|------|----------------|
| 1 | `supabase/migrations/005_embeddings.sql` | pgvector extension, `embeddings` table, `search_embeddings()` RPC |
| 2 | `supabase/migrations/006_widget_chat.sql` | `widget_conversations`, `widget_messages`, `widget_rate_limits` |
| 3 | `supabase/migrations/007_gmail.sql` | `gmail_accounts`, `emails`, `email_attachments` + updates embeddings constraint |
| 4 | `supabase/migrations/008_fireflies.sql` | `transcripts` table |
| 5 | `supabase/migrations/009_knowledgebase.sql` | `knowledgebase_articles`, `widget_leads`, `widget_escalations` + updates embeddings constraint |
| 6 | `supabase/migrations/009_knowledgebase_seed.sql` | 20 seed articles for the widget knowledgebase |
| 7 | `supabase/migrations/010_widget_leads_rls.sql` | RLS policies for authenticated admin access to `widget_leads` and `widget_escalations` |
| 8 | `supabase/migrations/011_knowledgebase_admin_rls.sql` | RLS policies for authenticated CRUD on `knowledgebase_articles` (KB Admin UI) |

**Important:** Run them one at a time, in order. 007 depends on 005 (it alters the embeddings constraint). 009 depends on 006 (widget_leads references widget_conversations). 010 depends on 009 (it adds policies to tables created in 009). 011 depends on 009 (it adds policies to the knowledgebase_articles table created in 009).

- [ ] Run 005_embeddings.sql
- [ ] Run 006_widget_chat.sql
- [ ] Run 007_gmail.sql
- [ ] Run 008_fireflies.sql
- [ ] Run 009_knowledgebase.sql
- [ ] Run 009_knowledgebase_seed.sql
- [ ] Run 010_widget_leads_rls.sql
- [ ] Run 011_knowledgebase_admin_rls.sql

---

## 2. Create Supabase Storage Bucket

The document generation system uploads PDFs to Supabase Storage.

1. Supabase Dashboard > **Storage** > **New Bucket**
2. Name: `documents`
3. Set to **Private** (the app uses signed URLs for access)

- [ ] Storage bucket created

---

## 3. Create Supabase Auth User

1. Supabase Dashboard > **Authentication** > **Users** > **Add User**
2. Create your admin account with email + password
3. This is the account you'll log in with at `/login`

- [ ] Auth user created

---

## 4. Get Your Supabase Keys

You should already have a Supabase project. Grab 3 values:

**Where:** Supabase Dashboard > Settings > API

| Env Var | Value |
|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (safe for client) |
| `SUPABASE_SECRET_KEY` | Secret key (keep secret, server-only) |

- [ ] Copied all 3 Supabase keys

---

## 5. Anthropic (AI Chat — Claude)

Powers the admin AI chat, Telegram bot, document generation, and transcript analysis.

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Console > API Keys > **Create Key**

| Env Var | Value |
|---------|-------|
| `ANTHROPIC_API_KEY` | Your API key |

Cost: Pay-per-token. Admin chat uses Sonnet (~$3/M input, $15/M output tokens). Widget chat defaults to Haiku 4.5 (~10x cheaper).

**Optional:** To override the widget chat model, set `WIDGET_CHAT_MODEL` (e.g. `claude-sonnet-4-20250514`). Defaults to `claude-haiku-4-5-20251001`.

- [ ] Anthropic account created
- [ ] API key copied

---

## 6. OpenAI (Embeddings Only)

Used only for generating text embeddings for semantic search (Cmd+K search).

1. Go to https://platform.openai.com
2. Sign up / log in
3. API Keys > **Create new secret key**

| Env Var | Value |
|---------|-------|
| `OPENAI_API_KEY` | Your API key |

**Note:** This key is missing from `.env.local` but the code needs it. You'll add it manually.

Cost: Very cheap (~$0.02/M tokens)

- [ ] OpenAI account created
- [ ] API key copied

---

## 7. Resend (Transactional Email)

Sends contact form notifications and document delivery emails.

1. Go to https://resend.com
2. Sign up / log in
3. Dashboard > API Keys > **Create**
4. Dashboard > Domains > **Add Domain** > add `syntriclabs.com`
5. Add the DNS records Resend gives you (go to your domain registrar to do this)
6. Wait for domain verification to complete

| Env Var | Value |
|---------|-------|
| `RESEND_API_KEY` | Your API key |

Cost: Free tier = 100 emails/day

- [ ] Resend account created
- [ ] API key copied
- [ ] Domain verification started
- [ ] DNS records added
- [ ] Domain verified

---

## 8. Telegram Bot

Lets you interact with the CRM from your phone — query clients, generate documents, manage deals.

1. Open Telegram, message **@BotFather**
2. Send `/newbot`, follow the prompts, copy the **bot token** it gives you
3. Message **@userinfobot** — it replies with your **numeric user ID**

| Env Var | Value |
|---------|-------|
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Generate with `openssl rand -hex 32` |
| `TELEGRAM_AUTHORIZED_USER_ID` | Your numeric user ID |

**Post-deploy step (do this after Vercel deploy):**
```bash
curl -X POST https://your-domain.com/api/telegram/setup
```

Cost: Free

- [ ] Bot created with BotFather
- [ ] Bot token copied
- [ ] User ID retrieved
- [ ] Webhook secret generated

---

## 9. Google Cloud (Gmail Integration)

OAuth2 flow to sync your Gmail inbox, send emails from the admin panel, auto-match emails to CRM clients.

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. **Enable Gmail API:** APIs & Services > Library > search "Gmail API" > Enable
4. **Configure OAuth consent screen:** APIs & Services > OAuth consent screen
   - User type: External (or Internal if using Google Workspace)
   - Fill in app name, support email, authorized domains
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
5. **Create OAuth credentials:** APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/gmail/callback` (for local dev)
     - `https://your-domain.com/api/gmail/callback` (for production)

| Env Var | Value |
|---------|-------|
| `GOOGLE_CLIENT_ID` | From OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From OAuth credentials |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/gmail/callback` (update for prod) |
| `GMAIL_TOKEN_ENCRYPTION_KEY` | Generate with `openssl rand -hex 32` |

Cost: Free

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Client ID and secret copied
- [ ] Encryption key generated

---

## 10. Fireflies.ai (Meeting Transcripts) — Optional

Ingests meeting transcripts via webhook, Claude analyzes them for summaries/action items.

1. Go to https://fireflies.ai
2. Sign up / log in
3. Settings > Developer > copy your **API Key**
4. Settings > Developer > Webhooks > Add webhook:
   - URL: `https://your-domain.com/api/fireflies/webhook`
   - Set and copy the **webhook secret**

| Env Var | Value |
|---------|-------|
| `FIREFLIES_API_KEY` | Your API key |
| `FIREFLIES_WEBHOOK_SECRET` | The secret you set |

Cost: Free tier available

- [ ] Fireflies account created
- [ ] API key copied
- [ ] Webhook configured (do after Vercel deploy)

---

## 11. Generate Secrets

Run each of these in your terminal and save the output:

```bash
# Gmail token encryption key
openssl rand -hex 32

# Telegram webhook secret
openssl rand -hex 32

# Vercel cron secret
openssl rand -hex 32
```

| Env Var | Source |
|---------|--------|
| `GMAIL_TOKEN_ENCRYPTION_KEY` | First output |
| `TELEGRAM_WEBHOOK_SECRET` | Second output |
| `CRON_SECRET` | Third output |

- [ ] All 3 secrets generated and saved

---

## 12. Fill In Your `.env.local`

Open `.env.local` in the project root and fill in all the values you've collected. It already has the correct structure — just add your keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=                       # <-- ADD THIS (not in example file)
# WIDGET_CHAT_MODEL=claude-sonnet-4-20250514  # Optional, defaults to haiku

# Email
RESEND_API_KEY=
ADMIN_EMAIL=chandler@syntriclabs.com

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_AUTHORIZED_USER_ID=

# Gmail OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=

# Cron
CRON_SECRET=

# Fireflies (optional)
FIREFLIES_API_KEY=
FIREFLIES_WEBHOOK_SECRET=

# Legacy (can leave as-is or blank)
NEXT_PUBLIC_RELEVANCE_AI_SHARE_ID=
VAPI_API_KEY=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
```

- [ ] `.env.local` created with all values filled in

---

## 13. Install & Run Locally

```bash
cd "/Users/Chandler/Desktop/Code Projects/syntric/Claude Workspaces/syntric-labs"
npm install
npm run dev
```

### Verify these work:

- [ ] Marketing site loads at `http://localhost:3000`
- [ ] Login works at `http://localhost:3000/login`
- [ ] Admin panel loads at `http://localhost:3000/admin`
- [ ] Contact form submits and appears in `/admin/submissions`

---

## 14. Deploy to Vercel & Post-Deploy Steps

After deploying:

1. **Add all env vars** in Vercel Dashboard > Settings > Environment Variables
2. **Update `GOOGLE_REDIRECT_URI`** to `https://your-domain.com/api/gmail/callback`
3. **Register Telegram webhook:**
   ```bash
   curl -X POST https://your-domain.com/api/telegram/setup
   ```
4. **Configure Fireflies webhook** URL to `https://your-domain.com/api/fireflies/webhook`
5. **Set `CRON_SECRET`** in Vercel env vars (Gmail syncs every 5 min via `vercel.json`)
6. **Connect Gmail:** Visit `/admin/settings` > Connect Gmail > complete OAuth flow
7. **Backfill data (optional):**
   ```bash
   # Generate embeddings for existing CRM data
   curl -X POST https://your-domain.com/api/embeddings/sync

   # Import existing Fireflies transcripts
   curl -X POST https://your-domain.com/api/fireflies/backfill

   # Embed knowledgebase articles for the chat widget
   curl -X POST https://your-domain.com/api/knowledgebase/seed \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

- [ ] Deployed to Vercel
- [ ] All env vars added
- [ ] Google redirect URI updated for prod
- [ ] Telegram webhook registered
- [ ] Gmail connected
- [ ] Embeddings synced
- [ ] Knowledgebase embedded

---

## Quick Reference: All Accounts Needed

| Service | Env Vars | Priority |
|---------|----------|----------|
| Supabase | 3 keys | Required (already done) |
| Anthropic | 1 key | Required — core AI |
| OpenAI | 1 key | Required — search |
| Resend | 1 key + domain verify | Required — email |
| Telegram | 3 values | Required — mobile interface |
| Google Cloud | 4 values | Required — email sync |
| Fireflies | 2 values | Optional — meeting transcripts |

**Total: 15 env vars + 3 generated secrets**
